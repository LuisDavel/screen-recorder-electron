import { ipcMain, BrowserWindow } from "electron";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ProductionLogger } from "../../production-logger";
import {
  S3_VIDEOS_LIST_CHANNEL,
  S3_VIDEOS_GET_URL_CHANNEL,
} from "./s3-videos-channels";

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  folderPrefix?: string;
}

interface S3Video {
  key: string;
  name: string;
  displayName: string;
  lastModified?: Date;
  size?: number;
}

interface S3VideosResult {
  success: boolean;
  message: string;
  videos?: S3Video[];
  error?: string;
}

interface S3UrlResult {
  success: boolean;
  message: string;
  url?: string;
  error?: string;
}

// Mapeamento dos nomes dos vídeos
const VIDEO_NAMES_MAP: { [key: string]: string } = {
  huc: "HUC - Hospital da Universidade de Coimbra",
  intro: "Vídeo de Introdução",
  hsjb: "HSJB - Hospital São João Batista",
  cliniimagem: "CliniImagem - Centro de Diagnóstico",
  hsj: "HSJ - Hospital São João",
};

export function addS3VideosEventListeners(mainWindow: BrowserWindow) {
  ProductionLogger.log("INFO", "Registrando listeners S3 videos...");

  // Listar vídeos disponíveis
  ipcMain.handle(
    S3_VIDEOS_LIST_CHANNEL,
    async (event, s3Config: S3Config): Promise<S3VideosResult> => {
      try {
        ProductionLogger.log("INFO", "Listando vídeos S3", {
          bucketName: s3Config.bucketName,
          folderPrefix: s3Config.folderPrefix,
        });

        // Validar configuração
        if (
          !s3Config.accessKeyId ||
          !s3Config.secretAccessKey ||
          !s3Config.bucketName
        ) {
          const error = "Configuração S3 incompleta";
          ProductionLogger.log("ERROR", error);
          return {
            success: false,
            message: error,
          };
        }

        // Criar cliente S3 com timeout otimizado
        const client = new S3Client({
          credentials: {
            accessKeyId: s3Config.accessKeyId,
            secretAccessKey: s3Config.secretAccessKey,
          },
          region: s3Config.region,
          requestHandler: {
            requestTimeout: 10000, // 10 segundos
            connectionTimeout: 5000, // 5 segundos
          },
        });

        // Listar objetos do bucket com limite reduzido para melhor performance
        const command = new ListObjectsV2Command({
          Bucket: s3Config.bucketName,
          Prefix: s3Config.folderPrefix ? `${s3Config.folderPrefix}/` : "",
          MaxKeys: 50, // Reduzido para evitar timeout
        });

        const response = await client.send(command);

        if (!response.Contents) {
          return {
            success: true,
            message: "Nenhum vídeo encontrado no bucket",
            videos: [],
          };
        }

        // Filtrar apenas arquivos de vídeo e mapear para o formato esperado
        const videos: S3Video[] = response.Contents.filter((obj) => {
          if (!obj.Key) return false;

          // Filtrar apenas arquivos de vídeo
          const videoExtensions = [".mp4", ".webm", ".avi", ".mov", ".mkv"];
          const hasVideoExtension = videoExtensions.some((ext) =>
            obj.Key!.toLowerCase().endsWith(ext),
          );

          if (!hasVideoExtension) return false;

          // Verificar se é um dos vídeos esperados (huc, intro, hsjb, cliniimagem, hsj)
          const filename = obj.Key!.split("/").pop()!;
          const nameWithoutExt = filename
            .replace(/\.[^/.]+$/, "")
            .toLowerCase();

          return Object.keys(VIDEO_NAMES_MAP).includes(nameWithoutExt);
        })
          .map((obj) => {
            const filename = obj.Key!.split("/").pop()!;
            const nameWithoutExt = filename
              .replace(/\.[^/.]+$/, "")
              .toLowerCase();

            return {
              key: obj.Key!,
              name: nameWithoutExt,
              displayName: VIDEO_NAMES_MAP[nameWithoutExt] || filename,
              lastModified: obj.LastModified,
              size: obj.Size,
            };
          })
          .sort((a, b) => a.displayName.localeCompare(b.displayName));

        ProductionLogger.log("INFO", "Vídeos S3 encontrados", {
          count: videos.length,
          videos: videos.map((v) => ({
            name: v.name,
            displayName: v.displayName,
          })),
        });

        return {
          success: true,
          message: `${videos.length} vídeo(s) encontrado(s)`,
          videos,
        };
      } catch (error) {
        ProductionLogger.log("ERROR", "Erro ao listar vídeos S3", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        return {
          success: false,
          message: `Erro ao listar vídeos: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  // Obter URL assinada para um vídeo específico
  ipcMain.handle(
    S3_VIDEOS_GET_URL_CHANNEL,
    async (
      event,
      s3Config: S3Config,
      videoKey: string,
    ): Promise<S3UrlResult> => {
      try {
        ProductionLogger.log("INFO", "Gerando URL assinada para vídeo", {
          videoKey,
          bucketName: s3Config.bucketName,
        });

        // Validar configuração
        if (
          !s3Config.accessKeyId ||
          !s3Config.secretAccessKey ||
          !s3Config.bucketName ||
          !videoKey
        ) {
          const error = "Configuração S3 ou chave do vídeo incompleta";
          ProductionLogger.log("ERROR", error);
          return {
            success: false,
            message: error,
          };
        }

        // Criar cliente S3 com timeout otimizado
        const client = new S3Client({
          credentials: {
            accessKeyId: s3Config.accessKeyId,
            secretAccessKey: s3Config.secretAccessKey,
          },
          region: s3Config.region,
          requestHandler: {
            requestTimeout: 10000, // 10 segundos
            connectionTimeout: 5000, // 5 segundos
          },
        });

        // Criar comando para obter o objeto
        const command = new GetObjectCommand({
          Bucket: s3Config.bucketName,
          Key: videoKey,
        });

        // Gerar URL assinada válida por 1 hora
        const url = await getSignedUrl(client, command, { expiresIn: 3600 });

        ProductionLogger.log("INFO", "URL assinada gerada com sucesso", {
          videoKey,
          urlLength: url.length,
        });

        return {
          success: true,
          message: "URL gerada com sucesso",
          url,
        };
      } catch (error) {
        ProductionLogger.log("ERROR", "Erro ao gerar URL assinada", {
          error: error instanceof Error ? error.message : String(error),
          videoKey,
          stack: error instanceof Error ? error.stack : undefined,
        });

        return {
          success: false,
          message: `Erro ao gerar URL: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  ProductionLogger.log("INFO", "Listeners S3 videos registrados com sucesso!");

  // Verificar se os handlers foram registrados
  ProductionLogger.log("INFO", "Verificando handlers S3 videos registrados...");
  ProductionLogger.log("INFO", "Handler list registrado", {
    exists: ipcMain.listenerCount(S3_VIDEOS_LIST_CHANNEL) > 0,
  });
  ProductionLogger.log("INFO", "Handler get-url registrado", {
    exists: ipcMain.listenerCount(S3_VIDEOS_GET_URL_CHANNEL) > 0,
  });
}
