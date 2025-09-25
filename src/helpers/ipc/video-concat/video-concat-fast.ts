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

  const possiblePaths = [
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      "ffmpeg-static",
      "ffmpeg",
    ),
    path.join(
      process.resourcesPath || process.cwd(),
      "node_modules",
      "ffmpeg-static",
      "ffmpeg",
    ),
    "ffmpeg",
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

export function registerFastVideoConcatListeners(mainWindow: BrowserWindow) {
  console.log("🚀 Registrando listeners OTIMIZADOS para video concat...");

  // Handler OTIMIZADO - Método sequencial para vídeos 4K
  ipcMain.handle(
    "video-concat:fast-concatenate",
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

        const remoteVideoUrl1 = introVideoUrl;
        const remoteVideoUrl2 = outroVideoUrl;

        // LOG DETALHADO DAS REQUISIÇÕES S3
        console.log("🎬 ========================================");
        console.log("🎬     CONCATENAÇÃO SEQUENCIAL S3");
        console.log("🎬 ========================================");
        console.log("📹 Vídeo de Introdução:");
        console.log(`   📄 Nome: ${extractVideoName(introVideoUrl)}`);
        console.log(`   🔗 URL: ${introVideoUrl.substring(0, 100)}...`);
        console.log("🎭 Vídeo de Encerramento:");
        console.log(`   📄 Nome: ${extractVideoName(outroVideoUrl)}`);
        console.log(`   🔗 URL: ${outroVideoUrl.substring(0, 100)}...`);
        console.log("📁 Vídeo Gravado:");
        console.log(`   📄 Caminho: ${recordedVideoPath}`);
        console.log("🚀 Iniciando concatenação sequencial otimizada...");

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
          finalOutputPath = path.join(dir, `${name}-FAST-CONCAT.mp4`);
        }

        console.log("📁 Output:", finalOutputPath);

        // ESTRATÉGIA SEQUENCIAL para vídeos 4K pesados
        console.log("🔄 Usando estratégia SEQUENCIAL para vídeos 4K...");

        const tempDir = path.dirname(finalOutputPath);
        const tempIntro = path.join(tempDir, "temp_intro_processed.mp4");
        const tempOutro = path.join(tempDir, "temp_outro_processed.mp4");
        const tempStep1 = path.join(tempDir, "temp_intro_recorded.mp4");

        // Função auxiliar para executar FFmpeg com Promise
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

              // Mostrar progresso no console
              if (output.includes("frame=") || output.includes("time=")) {
                console.log(`📊 ${stepName}:`, output.trim().split("\n").pop());
              }

              // Enviar progresso para UI
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
          // ETAPA 1: Pré-processar e baixar vídeo de introdução
          console.log("🔄 ETAPA 1/4: Processando vídeo de introdução...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 1/4: Processando introdução...",
          );

          const introArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-timeout",
            "60000000", // 60 segundos para download
            "-reconnect",
            "1",
            "-reconnect_at_eof",
            "1",
            "-user_agent",
            "FFmpeg/ElectronApp",

            "-i",
            remoteVideoUrl1,

            // NORMALIZAÇÃO COMPLETA para compatibilidade
            "-vf",
            "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30",
            "-af",
            "aresample=48000:async=1",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-profile:v",
            "main",
            "-level",
            "3.1",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",

            "-y",
            tempIntro,
          ];

          await execFFmpeg(introArgs, "Processar Introdução");

          // ETAPA 2: Pré-processar vídeo de encerramento
          console.log("🔄 ETAPA 2/4: Processando vídeo de encerramento...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 2/4: Processando encerramento...",
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
            remoteVideoUrl2,

            "-vf",
            "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "28",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",

            "-y",
            tempOutro,
          ];

          await execFFmpeg(outroArgs, "Processar Encerramento");

          // ETAPA 3: Concatenar introdução + vídeo gravado
          console.log("🔄 ETAPA 3/4: Concatenando introdução + gravação...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 3/4: Concatenando intro + gravação...",
          );

          const step1Args = [
            "-hide_banner",
            "-threads",
            "0",
            "-i",
            tempIntro,
            "-i",
            recordedVideoPath,

            "-filter_complex",
            "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]",
            "-map",
            "[outv]",
            "-map",
            "[outa]",

            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "28",
            "-c:a",
            "aac",
            "-b:a",
            "128k",

            "-y",
            tempStep1,
          ];

          await execFFmpeg(step1Args, "Concat Intro+Gravação");

          // ETAPA 4: Adicionar vídeo de encerramento
          console.log("🔄 ETAPA 4/4: Adicionando encerramento...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 4/4: Finalizando...",
          );

          const finalArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-i",
            tempStep1,
            "-i",
            tempOutro,

            "-filter_complex",
            "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]",
            "-map",
            "[outv]",
            "-map",
            "[outa]",

            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "28",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",

            "-y",
            finalOutputPath,
          ];

          await execFFmpeg(finalArgs, "Finalizar Concatenação");

          // Sucesso - limpar arquivos temporários
          console.log("✅ Concatenação SEQUENCIAL concluída!");
          const stats = fs.statSync(finalOutputPath);
          console.log(
            "📊 Tamanho:",
            (stats.size / 1024 / 1024).toFixed(2),
            "MB",
          );

          resolve({
            success: true,
            outputPath: finalOutputPath,
            message: "Vídeo concatenado com estratégia SEQUENCIAL otimizada!",
            fileSize: stats.size,
            method: "sequential-4k-optimized",
          });
        } catch (sequentialError) {
          console.error("❌ Erro na estratégia sequencial:", sequentialError);
          reject(sequentialError);
        } finally {
          // Limpar arquivos temporários
          [tempIntro, tempOutro, tempStep1].forEach((file) => {
            if (fs.existsSync(file)) {
              try {
                fs.unlinkSync(file);
                console.log(`🗑️ Removido arquivo temporário: ${file}`);
              } catch (cleanupError) {
                console.warn(`⚠️ Erro ao limpar ${file}:`, cleanupError);
              }
            }
          });
        }
      });
    },
  );

  console.log("✅ Handlers OTIMIZADOS registrados!");
}
