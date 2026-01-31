import { ipcMain, BrowserWindow } from "electron";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { readFile } from "fs/promises";
import { basename } from "path";
import {
  S3_UPLOAD_FILE_CHANNEL,
  S3_UPLOAD_TEST_CONNECTION_CHANNEL,
  S3_UPLOAD_PROGRESS_CHANNEL,
  S3_UPLOAD_COMPLETE_CHANNEL,
  S3_UPLOAD_ERROR_CHANNEL,
} from "./s3-upload-channels";
import { ProductionLogger } from "../../production-logger";

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  folderPrefix?: string;
}

interface HeaderData {
  externalId?: string;
  id?: number;
}

interface S3UploadResult {
  success: boolean;
  message: string;
  s3Url?: string;
  uploadId?: string;
  error?: string;
}

interface S3UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function addS3UploadEventListeners(mainWindow: BrowserWindow) {
  ProductionLogger.log("INFO", "Registrando listeners S3 upload...");

  // Upload de arquivo
  ProductionLogger.log("INFO", "Registrando handler para upload de arquivo...");
  ipcMain.handle(
    S3_UPLOAD_FILE_CHANNEL,
    async (
      event,
      filePath: string,
      s3Config: S3Config,
      headerData?: HeaderData,
    ): Promise<S3UploadResult> => {
      try {
        ProductionLogger.log("INFO", "Iniciando upload S3 do arquivo", {
          filePath,
        });

        // Validar configuração
        if (
          !s3Config.accessKeyId ||
          !s3Config.secretAccessKey ||
          !s3Config.bucketName
        ) {
          const error = "Configuração S3 incompleta";
          ProductionLogger.log("ERROR", error, {
            s3Config: {
              ...s3Config,
              accessKeyId: "***",
              secretAccessKey: "***",
            },
          });
          return {
            success: false,
            message: error,
          };
        }

        // Criar cliente S3
        const client = new S3Client({
          credentials: {
            accessKeyId: s3Config.accessKeyId,
            secretAccessKey: s3Config.secretAccessKey,
          },
          region: s3Config.region,
        });

        // Ler o arquivo
        const fileBuffer = await readFile(filePath);
        const fileName = basename(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

        // Criar nome do arquivo baseado nos dados do header
        let videoFileName: string;

        // Validar se externalId não é um valor placeholder ou padrão
        const isValidExternalId = (externalId?: string): boolean => {
          if (!externalId) return false;

          const invalidValues = [
            "Código/ID",
            "Código ou ID do sistema externo",
            "Não informado",
            "N/A",
            "",
          ];

          return !invalidValues.includes(externalId.trim());
        };

        // Se tiver idExterno válido ou id (NumeroAcesso), usar o formato: idExterno-NumeroAcesso-Timestamp
        const hasValidExternalId =
          headerData && isValidExternalId(headerData.externalId);
        const hasValidId =
          headerData && headerData.id !== undefined && headerData.id !== 0;

        if (hasValidExternalId || hasValidId) {
          const parts: string[] = [];

          if (hasValidExternalId && headerData.externalId) {
            parts.push(headerData.externalId);
          }

          if (hasValidId && headerData.id) {
            parts.push(String(headerData.id));
          }

          parts.push(timestamp);

          // Extrair extensão do arquivo original
          const fileExtension = fileName.split(".").pop();
          videoFileName = `${parts.join("-")}.${fileExtension}`;

          ProductionLogger.log(
            "INFO",
            "Nome do arquivo gerado com dados do header",
            {
              externalId: headerData?.externalId,
              id: headerData?.id,
              videoFileName,
            },
          );
        } else {
          // Caso contrário, usar apenas timestamp como antes
          videoFileName = `${timestamp}-${fileName}`;
          ProductionLogger.log(
            "INFO",
            "Nome do arquivo gerado apenas com timestamp (header vazio ou placeholder)",
            {
              videoFileName,
            },
          );
        }

        // Criar chave do arquivo no S3
        const key = s3Config.folderPrefix
          ? `${s3Config.folderPrefix}/${videoFileName}`
          : videoFileName;

        ProductionLogger.log("INFO", "Chave S3 gerada", {
          key,
          fileName,
          fileSize: fileBuffer.length,
        });

        // Para arquivos pequenos (< 5MB), usar upload simples
        if (fileBuffer.length < 5 * 1024 * 1024) {
          ProductionLogger.log(
            "INFO",
            "Usando upload simples para arquivo pequeno",
          );
          const result = await simpleUpload(
            client,
            s3Config,
            fileBuffer,
            key,
            fileName,
          );
          ProductionLogger.log("INFO", "Upload simples concluído", {
            success: result.success,
            s3Url: result.s3Url,
          });
          mainWindow.webContents.send(S3_UPLOAD_COMPLETE_CHANNEL, result);
          return result;
        }

        // Para arquivos grandes, usar upload multipart
        ProductionLogger.log(
          "INFO",
          "Usando upload multipart para arquivo grande",
        );
        const result = await multipartUpload(
          client,
          s3Config,
          fileBuffer,
          key,
          fileName,
          (progress) => {
            ProductionLogger.log("INFO", "Progresso upload", {
              percentage: progress.percentage,
            });
            mainWindow.webContents.send(S3_UPLOAD_PROGRESS_CHANNEL, progress);
          },
        );

        ProductionLogger.log("INFO", "Upload multipart concluído", {
          success: result.success,
          s3Url: result.s3Url,
        });
        mainWindow.webContents.send(S3_UPLOAD_COMPLETE_CHANNEL, result);
        return result;
      } catch (error) {
        ProductionLogger.log("ERROR", "Erro no upload S3", {
          error: error instanceof Error ? error.message : String(error),
          filePath,
          stack: error instanceof Error ? error.stack : undefined,
        });
        const errorResult: S3UploadResult = {
          success: false,
          message: `Erro no upload: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.message : String(error),
        };
        mainWindow.webContents.send(S3_UPLOAD_ERROR_CHANNEL, errorResult.error);
        return errorResult;
      }
    },
  );

  // Teste de conexão
  ProductionLogger.log("INFO", "Registrando handler para teste de conexão...");
  ProductionLogger.log("INFO", "Canal usado para teste", {
    channel: S3_UPLOAD_TEST_CONNECTION_CHANNEL,
  });

  ipcMain.handle(
    S3_UPLOAD_TEST_CONNECTION_CHANNEL,
    async (event, s3Config: S3Config): Promise<S3UploadResult> => {
      try {
        ProductionLogger.log("INFO", "Testando conexão S3", {
          region: s3Config.region,
          bucketName: s3Config.bucketName,
        });

        // Validar configuração
        if (
          !s3Config.accessKeyId ||
          !s3Config.secretAccessKey ||
          !s3Config.bucketName
        ) {
          const error = "Configuração S3 incompleta";
          ProductionLogger.log("ERROR", error, {
            s3Config: {
              ...s3Config,
              accessKeyId: "***",
              secretAccessKey: "***",
            },
          });
          return {
            success: false,
            message: error,
          };
        }

        // Criar cliente S3
        const client = new S3Client({
          credentials: {
            accessKeyId: s3Config.accessKeyId,
            secretAccessKey: s3Config.secretAccessKey,
          },
          region: s3Config.region,
        });

        // Testar acesso ao bucket
        const command = new HeadBucketCommand({ Bucket: s3Config.bucketName });
        await client.send(command);

        ProductionLogger.log("INFO", "Conexão S3 testada com sucesso", {
          bucketName: s3Config.bucketName,
        });
        return {
          success: true,
          message: "Conexão com S3 estabelecida com sucesso",
        };
      } catch (error) {
        ProductionLogger.log("ERROR", "Erro ao testar conexão S3", {
          error: error instanceof Error ? error.message : String(error),
          bucketName: s3Config.bucketName,
          region: s3Config.region,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return {
          success: false,
          message: `Erro na conexão: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  ProductionLogger.log("INFO", "Listeners S3 registrados com sucesso!");

  // Verificar se os handlers foram registrados
  ProductionLogger.log("INFO", "Verificando handlers registrados...");
  ProductionLogger.log("INFO", "Handler upload registrado", {
    exists: ipcMain.listenerCount(S3_UPLOAD_FILE_CHANNEL) > 0,
  });
  ProductionLogger.log("INFO", "Handler test-connection registrado", {
    exists: ipcMain.listenerCount(S3_UPLOAD_TEST_CONNECTION_CHANNEL) > 0,
  });
}

// Upload simples para arquivos pequenos
async function simpleUpload(
  client: S3Client,
  s3Config: S3Config,
  fileBuffer: Buffer,
  key: string,
  fileName: string,
): Promise<S3UploadResult> {
  ProductionLogger.log("INFO", "Iniciando upload simples", {
    key,
    fileName,
    fileSize: fileBuffer.length,
  });

  const command = new PutObjectCommand({
    Bucket: s3Config.bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: getContentType(fileName),
    Metadata: {
      originalName: fileName,
      uploadTime: new Date().toISOString(),
      source: "electron-video-recorder",
    },
  });

  const result = await client.send(command);
  const s3Url = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${key}`;
  ProductionLogger.log("INFO", "Upload simples concluído", {
    s3Url,
    ETag: result.ETag,
  });

  return {
    success: true,
    message: "Upload concluído com sucesso",
    s3Url,
    uploadId: result.ETag,
  };
}

// Upload multipart para arquivos grandes
async function multipartUpload(
  client: S3Client,
  s3Config: S3Config,
  fileBuffer: Buffer,
  key: string,
  fileName: string,
  onProgress: (progress: S3UploadProgress) => void,
): Promise<S3UploadResult> {
  ProductionLogger.log("INFO", "Iniciando upload multipart", {
    key,
    fileName,
    fileSize: fileBuffer.length,
  });

  const upload = new Upload({
    client,
    params: {
      Bucket: s3Config.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(fileName),
      Metadata: {
        originalName: fileName,
        uploadTime: new Date().toISOString(),
        source: "electron-video-recorder",
      },
    },
  });

  // Listener para progresso
  upload.on("httpUploadProgress", (progress) => {
    if (progress.loaded && progress.total) {
      const percentage = Math.round((progress.loaded / progress.total) * 100);
      onProgress({
        loaded: progress.loaded,
        total: progress.total,
        percentage,
      });
      ProductionLogger.log("INFO", "Progresso upload multipart", {
        percentage,
      });
    }
  });

  const result = await upload.done();
  const s3Url = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${key}`;

  ProductionLogger.log("INFO", "Upload multipart concluído", {
    s3Url,
    ETag: result.ETag,
  });

  return {
    success: true,
    message: "Upload concluído com sucesso",
    s3Url,
    uploadId: result.ETag,
  };
}

// Determina o content-type baseado na extensão do arquivo
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();

  switch (ext) {
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "avi":
      return "video/x-msvideo";
    case "mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}
