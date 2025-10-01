import { ipcMain, BrowserWindow } from "electron";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";

// Função para encontrar o caminho correto do FFmpeg
function getFFmpegPath(): string | null {
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }

  // Determinar extensão do executável baseado na plataforma
  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "ffmpeg.exe" : "ffmpeg";

  const possiblePaths = [
    path.join(process.cwd(), "node_modules", "ffmpeg-static", exeName),
    path.join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      "ffmpeg-static",
      exeName,
    ),
    path.join(
      process.resourcesPath || process.cwd(),
      "node_modules",
      "ffmpeg-static",
      exeName,
    ),
    exeName,
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  return null;
}

const ffmpegPath = getFFmpegPath();

// Função para extrair nome do vídeo da URL S3
function extractVideoName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const fileName = pathParts[pathParts.length - 1];
    return decodeURIComponent(fileName);
  } catch {
    return "Nome não identificado";
  }
}

// Função para regenerar URL S3 expirada
async function regenerateS3Url(expiredUrl: string): Promise<string | null> {
  try {
    console.log("🔄 Regenerando URL S3 expirada...", expiredUrl);

    // Extrair informações da URL expirada
    const urlObj = new URL(expiredUrl);
    console.log("🔍 URL parsed:", {
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search,
    });

    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);
    console.log("🔍 Path parts:", pathParts);

    // Para URLs S3, a chave pode estar em diferentes posições dependendo do formato
    let videoKey = "";

    if (pathParts.length >= 2) {
      // Formato: bucket.s3.region.amazonaws.com/folder/file.mp4
      // ou s3.amazonaws.com/bucket/folder/file.mp4
      if (
        urlObj.hostname.includes(".s3.") ||
        urlObj.hostname.startsWith("s3.")
      ) {
        videoKey = pathParts.slice(-1)[0]; // Último elemento é o arquivo
      } else {
        videoKey = pathParts.slice(-1)[0]; // Último elemento é o arquivo
      }
    }

    console.log("🔍 Video key extraída:", videoKey);

    if (!videoKey || videoKey.length === 0) {
      console.error("❌ Não foi possível extrair a chave do vídeo da URL");
      console.error("❌ URL pathname:", urlObj.pathname);
      console.error("❌ Path parts:", pathParts);
      return null;
    }

    // Importar módulos necessários
    const { useS3ConfigStore } = require("../../../../store/store-s3-config");
    const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

    const s3Config = useS3ConfigStore.getState().config;
    console.log("🔍 Configuração S3:", {
      isConfigured: s3Config.isConfigured,
      bucketName: s3Config.bucketName,
      region: s3Config.region,
      folderPrefix: s3Config.folderPrefix,
      hasAccessKey: !!s3Config.accessKeyId,
      hasSecretKey: !!s3Config.secretAccessKey,
    });

    if (!s3Config.isConfigured) {
      console.error("❌ Configuração S3 não está válida");
      return null;
    }

    if (
      !s3Config.accessKeyId ||
      !s3Config.secretAccessKey ||
      !s3Config.bucketName
    ) {
      console.error("❌ Credenciais S3 incompletas:", {
        hasAccessKey: !!s3Config.accessKeyId,
        hasSecretKey: !!s3Config.secretAccessKey,
        hasBucket: !!s3Config.bucketName,
      });
      return null;
    }

    // Criar cliente S3
    console.log("🔄 Criando cliente S3...");
    const client = new S3Client({
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      region: s3Config.region,
    });

    // Construir chave completa
    const fullKey = s3Config.folderPrefix
      ? `${s3Config.folderPrefix}/${videoKey}`
      : videoKey;
    console.log("🔍 Chave completa do objeto:", fullKey);

    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: fullKey,
    });

    console.log("🔄 Gerando URL assinada...");
    // Gerar nova URL com validade de 2 horas
    const newUrl = await getSignedUrl(client, command, { expiresIn: 7200 });
    console.log(
      "✅ Nova URL S3 gerada com sucesso:",
      newUrl.substring(0, 100) + "...",
    );
    return newUrl;
  } catch (error) {
    console.error("❌ Erro ao regenerar URL S3:", error);
    return null;
  }
}

// Função para validar URL S3
async function validateS3Url(url: string): Promise<boolean> {
  try {
    console.log("🔍 Validando URL S3...");
    const response = await fetch(url, { method: "HEAD", timeout: 10000 });
    const isValid = response.ok;
    console.log(
      `${isValid ? "✅" : "❌"} URL S3 ${isValid ? "válida" : "inválida"} (${response.status})`,
    );
    return isValid;
  } catch (error) {
    console.log(
      "❌ URL S3 inválida:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

export function registerSimpleVideoConcatListeners(mainWindow: BrowserWindow) {
  console.log("🚀 Registrando listeners SIMPLES para video concat...");

  // Handler SIMPLES - Método demuxer (file list) confiável
  ipcMain.handle(
    "video-concat:simple-concatenate",
    async (
      _event,
      options: {
        recordedVideoPath: string;
        outputPath?: string;
        introVideoUrl?: string;
        outroVideoUrl?: string;
      },
    ) => {
      return new Promise(async (resolve, reject) => {
        const { recordedVideoPath, outputPath, introVideoUrl, outroVideoUrl } =
          options;

        // APENAS URLs S3 - sem vídeos demo
        if (!introVideoUrl || !outroVideoUrl) {
          reject(
            new Error(
              "URLs de vídeos S3 são obrigatórias. Configure os vídeos de introdução e encerramento nas configurações.",
            ),
          );
          return;
        }

        console.log("🎬 ========================================");
        console.log("🎬     CONCATENAÇÃO SIMPLES (DEMUXER)");
        console.log("🎬 ========================================");
        console.log("📹 Vídeo de Introdução:", extractVideoName(introVideoUrl));
        console.log(
          "🎭 Vídeo de Encerramento:",
          extractVideoName(outroVideoUrl),
        );
        console.log("📁 Vídeo Gravado:", recordedVideoPath);

        // VALIDAÇÃO E REGENERAÇÃO DE URLs S3
        console.log("🔍 Validando URLs S3...");
        mainWindow.webContents.send(
          "video-concat:progress",
          "🔍 Validando URLs S3...",
        );

        let validIntroUrl = introVideoUrl;
        let validOutroUrl = outroVideoUrl;

        // Validar URL de introdução
        const introValid = await validateS3Url(introVideoUrl);
        if (!introValid) {
          console.log("⚠️ URL de introdução inválida, tentando regenerar...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "⚠️ Regenerando URL de introdução...",
          );
          const newIntroUrl = await regenerateS3Url(introVideoUrl);
          if (newIntroUrl) {
            validIntroUrl = newIntroUrl;
            console.log("✅ URL de introdução regenerada com sucesso");
          } else {
            console.log(
              "⚠️ Falha na regeneração, tentando continuar com URL original...",
            );
            mainWindow.webContents.send(
              "video-concat:progress",
              "⚠️ Usando URL original (pode falhar)...",
            );
            validIntroUrl = introVideoUrl; // Fallback para URL original
          }
        }

        // Validar URL de encerramento
        const outroValid = await validateS3Url(outroVideoUrl);
        if (!outroValid) {
          console.log("⚠️ URL de encerramento inválida, tentando regenerar...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "⚠️ Regenerando URL de encerramento...",
          );
          const newOutroUrl = await regenerateS3Url(outroVideoUrl);
          if (newOutroUrl) {
            validOutroUrl = newOutroUrl;
            console.log("✅ URL de encerramento regenerada com sucesso");
          } else {
            console.log(
              "⚠️ Falha na regeneração, tentando continuar com URL original...",
            );
            mainWindow.webContents.send(
              "video-concat:progress",
              "⚠️ Usando URL original (pode falhar)...",
            );
            validOutroUrl = outroVideoUrl; // Fallback para URL original
          }
        }

        console.log("✅ URLs S3 validadas e prontas para uso");

        if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
          reject(new Error("FFmpeg não disponível"));
          return;
        }

        if (!fs.existsSync(recordedVideoPath)) {
          reject(
            new Error(`Arquivo gravado não encontrado: ${recordedVideoPath}`),
          );
          return;
        }

        // Gerar caminho de saída
        let finalOutputPath = outputPath;
        if (!finalOutputPath) {
          const dir = path.dirname(recordedVideoPath);
          const name = path.basename(
            recordedVideoPath,
            path.extname(recordedVideoPath),
          );
          finalOutputPath = path.join(dir, `${name}-SIMPLE-CONCAT.mp4`);
        }

        const tempDir = path.dirname(finalOutputPath);
        const tempIntro = path.join(tempDir, "temp_intro_normalized.mp4");
        const tempOutro = path.join(tempDir, "temp_outro_normalized.mp4");
        const tempRecorded = path.join(tempDir, "temp_recorded_normalized.mp4");
        const listFile = path.join(tempDir, "concat_list.txt");

        // Função auxiliar para executar FFmpeg
        const execFFmpeg = (
          args: string[],
          stepName: string,
        ): Promise<void> => {
          return new Promise((resolveExec, rejectExec) => {
            console.log(`🎬 ${stepName}: ${ffmpegPath} ${args.join(" ")}`);

            const process = spawn(ffmpegPath!, args);
            let stderr = "";

            process.stderr?.on("data", (data: Buffer) => {
              const output = data.toString();
              stderr += output;

              if (output.includes("frame=") || output.includes("time=")) {
                console.log(`📊 ${stepName}:`, output.trim().split("\n").pop());
              }

              mainWindow.webContents.send(
                "video-concat:progress",
                `${stepName}: ${output}`,
              );
            });

            process.on("close", (code: number | null) => {
              console.log(`🏁 ${stepName} finalizado com código: ${code}`);

              if (code === 0) {
                resolveExec();
              } else {
                console.error(`❌ Erro ${stepName}:`, stderr.slice(-500));
                rejectExec(
                  new Error(`${stepName} falhou: ${stderr.slice(-200)}`),
                );
              }
            });

            process.on("error", (error: Error) => {
              console.error(`❌ Erro processo ${stepName}:`, error);
              rejectExec(new Error(`Erro ${stepName}: ${error.message}`));
            });
          });
        };

        try {
          // Configurações padrão de normalização para TODOS os vídeos
          const normalizeSettings = [
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-vf",
            "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30",
            "-c:a",
            "aac",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
          ];

          // ETAPA 1: Normalizar vídeo de introdução
          console.log("🔄 ETAPA 1/4: Normalizando introdução...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 1/4: Normalizando introdução...",
          );

          const introArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-timeout",
            "60000000",
            "-reconnect",
            "1",
            "-reconnect_at_eof",
            "1",
            "-user_agent",
            "FFmpeg/ElectronApp",
            "-i",
            validIntroUrl,
            ...normalizeSettings,
            "-y",
            tempIntro,
          ];

          await execFFmpeg(introArgs, "Normalizar Introdução");

          // ETAPA 2: Normalizar vídeo gravado
          console.log("🔄 ETAPA 2/4: Normalizando vídeo gravado...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 2/4: Normalizando gravação...",
          );

          const recordedArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-i",
            recordedVideoPath,
            ...normalizeSettings,
            "-y",
            tempRecorded,
          ];

          await execFFmpeg(recordedArgs, "Normalizar Gravado");

          // ETAPA 3: Normalizar vídeo de encerramento
          console.log("🔄 ETAPA 3/4: Normalizando encerramento...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 3/4: Normalizando encerramento...",
          );

          const outroArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-timeout",
            "60000000",
            "-reconnect",
            "1",
            "-reconnect_at_eof",
            "1",
            "-user_agent",
            "FFmpeg/ElectronApp",
            "-i",
            validOutroUrl,
            ...normalizeSettings,
            "-y",
            tempOutro,
          ];

          await execFFmpeg(outroArgs, "Normalizar Encerramento");

          // ETAPA 4: Concatenar usando file list (método demuxer)
          console.log("🔄 ETAPA 4/4: Concatenando com demuxer...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 4/4: Concatenando arquivos...",
          );

          // Criar lista de arquivos
          const listContent = [
            `file '${tempIntro}'`,
            `file '${tempRecorded}'`,
            `file '${tempOutro}'`,
          ].join("\n");

          fs.writeFileSync(listFile, listContent);

          const concatArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            listFile,
            "-c",
            "copy", // Usar copy pois todos estão normalizados
            "-y",
            finalOutputPath,
          ];

          await execFFmpeg(concatArgs, "Concatenar Final");

          // Sucesso
          console.log("✅ Concatenação SIMPLES concluída!");
          const stats = fs.statSync(finalOutputPath);
          console.log(
            "📊 Tamanho:",
            (stats.size / 1024 / 1024).toFixed(2),
            "MB",
          );

          resolve({
            success: true,
            outputPath: finalOutputPath,
            message: "Vídeo concatenado com método SIMPLES (demuxer)!",
            fileSize: stats.size,
            method: "simple-demuxer",
          });
        } catch (error) {
          console.error("❌ Erro na concatenação simples:", error);
          reject(error);
        } finally {
          // Limpar arquivos temporários
          [tempIntro, tempRecorded, tempOutro, listFile].forEach((file) => {
            if (fs.existsSync(file)) {
              try {
                fs.unlinkSync(file);
                console.log(`🗑️ Removido: ${file}`);
              } catch (cleanupError) {
                console.warn(`⚠️ Erro ao limpar ${file}:`, cleanupError);
              }
            }
          });
        }
      });
    },
  );

  console.log("✅ Handlers SIMPLES registrados!");
}
