import { ipcMain, BrowserWindow } from "electron";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";

// Função para encontrar o caminho correto do FFmpeg
function getFFmpegPath(): string | null {
  console.log("🔍 ffmpeg-static retornou:", ffmpegStatic);

  // Se ffmpeg-static retornou um caminho válido, usar ele
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    console.log("✅ FFmpeg encontrado via ffmpeg-static:", ffmpegStatic);
    return ffmpegStatic;
  }

  // Caminhos alternativos para procurar o FFmpeg
  const possiblePaths = [
    // Caminho direto no node_modules
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    // Caminho no diretório do app (para produção)
    path.join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      "ffmpeg-static",
      "ffmpeg",
    ),
    // Caminho relativo ao processo atual
    path.join(
      process.resourcesPath || process.cwd(),
      "node_modules",
      "ffmpeg-static",
      "ffmpeg",
    ),
    // FFmpeg do sistema (se instalado)
    "ffmpeg",
  ];

  console.log("🔍 Procurando FFmpeg nos caminhos:", possiblePaths);

  for (const testPath of possiblePaths) {
    console.log("🔍 Testando caminho:", testPath);
    if (fs.existsSync(testPath)) {
      console.log("✅ FFmpeg encontrado em:", testPath);
      return testPath;
    }
  }

  console.error("❌ FFmpeg não encontrado em nenhum caminho");
  return null;
}

// Obter o caminho correto do FFmpeg
const ffmpegPath = getFFmpegPath();

export function registerVideoConcatListeners(mainWindow: BrowserWindow) {
  console.log("📡 INICIANDO registro de video concat listeners...");
  console.log("📡 MainWindow recebido:", !!mainWindow);
  console.log("📡 ipcMain disponível:", !!ipcMain);
  console.log("📡 FFmpeg path detectado:", ffmpegPath);
  console.log("📡 Process cwd:", process.cwd());
  console.log("📡 __dirname:", __dirname);

  try {
    // Handler PRINCIPAL - Método Robusto (ÚNICO)
    console.log("📡 Registrando handler: video-concat:auto-concatenate-robust");
    ipcMain.handle(
      "video-concat:auto-concatenate-robust",
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
          const {
            recordedVideoPath,
            outputPath,
            introVideoUrl,
            outroVideoUrl,
          } = options;

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

          console.log("🎬 Iniciando concatenação ROBUSTA com 3 vídeos...");
          console.log("📍 FFmpeg path:", ffmpegPath);
          console.log("🌐 Vídeo remoto 1 (início):", remoteVideoUrl1);
          console.log(
            "🌐 Vídeo é do S3?",
            introVideoUrl ? "SIM (S3)" : "NÃO (demo)",
          );
          console.log("📁 Vídeo gravado (meio):", recordedVideoPath);
          console.log("🌐 Vídeo remoto 2 (fim):", remoteVideoUrl2);
          console.log(
            "🌐 Vídeo é do S3?",
            outroVideoUrl ? "SIM (S3)" : "NÃO (demo)",
          );

          // Verificar se todas as URLs estão definidas
          if (!remoteVideoUrl1) {
            const error = "URL do vídeo remoto 1 não está definida";
            console.error("❌", error);
            reject(new Error(error));
            return;
          }

          if (!remoteVideoUrl2) {
            const error = "URL do vídeo remoto 2 não está definida";
            console.error("❌", error);
            reject(new Error(error));
            return;
          }

          // Verificar se FFmpeg está disponível
          if (!ffmpegPath) {
            const error =
              "FFmpeg não está disponível (ffmpeg-static retornou null)";
            console.error("❌", error);
            reject(new Error(error));
            return;
          }

          // Verificar se o executável FFmpeg existe
          if (!fs.existsSync(ffmpegPath)) {
            const error = `FFmpeg não encontrado no caminho: ${ffmpegPath}`;
            console.error("❌", error);
            reject(new Error(error));
            return;
          }

          // Verificar se o arquivo gravado existe
          if (!fs.existsSync(recordedVideoPath)) {
            const error = `Arquivo gravado não encontrado: ${recordedVideoPath}`;
            console.error("❌", error);
            reject(new Error(error));
            return;
          }

          // Gerar caminho de saída se não fornecido
          let finalOutputPath = outputPath;
          if (!finalOutputPath) {
            const dir = path.dirname(recordedVideoPath);
            const name = path.basename(
              recordedVideoPath,
              path.extname(recordedVideoPath),
            );
            finalOutputPath = path.join(dir, `${name}-FINAL-3VIDEOS.mp4`);
          }

          console.log("📁 CAMINHO FINAL:", finalOutputPath);

          // Método SEQUENCIAL: Concatenar em duas etapas (mais confiável)
          // Etapa 1: Concatenar primeiro vídeo + vídeo gravado
          const tempOutput = path.join(
            path.dirname(finalOutputPath),
            "temp_concat_step1.mp4",
          );

          // Método DEMUXER: Converte todos para o mesmo formato e depois concatena
          const executeDemuxerConcat = async (): Promise<unknown> => {
            const tempDir = path.dirname(finalOutputPath);
            const temp1 = path.join(tempDir, "normalized_1.mp4");
            const temp2 = path.join(tempDir, "normalized_2.mp4");
            const temp3 = path.join(tempDir, "normalized_3.mp4");
            const listFile = path.join(tempDir, "concat_list.txt");

            try {
              // Passo 1: Normalizar vídeo 1
              console.log("🎬 Normalizando vídeo 1...");
              const norm1Args = [
                "-threads",
                "2", // Limitar threads para não sobrecarregar
                "-i",
                remoteVideoUrl1,
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-preset",
                "veryfast", // Mais rápido, menos CPU
                "-crf",
                "28", // Qualidade menor para processar mais rápido
                "-vf",
                "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
                "-af",
                "aresample=44100",
                "-r",
                "30",
                "-movflags",
                "+faststart", // Otimização para streaming
                "-y",
                temp1,
              ];
              await tryFFmpegConcatenation(norm1Args, "Normalizar Vídeo 1");

              // Passo 2: Normalizar vídeo gravado
              console.log("🎬 Normalizando vídeo gravado...");
              const norm2Args = [
                "-threads",
                "2",
                "-i",
                recordedVideoPath,
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-preset",
                "veryfast",
                "-crf",
                "28",
                "-vf",
                "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
                "-af",
                "aresample=44100",
                "-r",
                "30",
                "-movflags",
                "+faststart",
                "-y",
                temp2,
              ];
              await tryFFmpegConcatenation(
                norm2Args,
                "Normalizar Vídeo Gravado",
              );

              // Passo 3: Normalizar vídeo 3
              console.log("🎬 Normalizando vídeo 3...");
              const norm3Args = [
                "-threads",
                "2",
                "-i",
                remoteVideoUrl2,
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-preset",
                "veryfast",
                "-crf",
                "28",
                "-vf",
                "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
                "-af",
                "aresample=44100",
                "-r",
                "30",
                "-movflags",
                "+faststart",
                "-y",
                temp3,
              ];
              await tryFFmpegConcatenation(norm3Args, "Normalizar Vídeo 3");

              // Passo 4: Criar lista de concatenação
              const listContent = `file '${temp1}'\nfile '${temp2}'\nfile '${temp3}'`;
              fs.writeFileSync(listFile, listContent);

              // Passo 5: Concatenar usando demuxer
              console.log("🎬 Concatenando vídeos normalizados...");
              const concatArgs = [
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                listFile,
                "-c",
                "copy",
                "-y",
                finalOutputPath,
              ];
              const result = await tryFFmpegConcatenation(
                concatArgs,
                "Demuxer Concat",
              );

              return result;
            } finally {
              // Limpar arquivos temporários
              [temp1, temp2, temp3, listFile].forEach((file) => {
                if (fs.existsSync(file)) {
                  fs.unlinkSync(file);
                }
              });
            }
          };

          // Usar método sequencial como método principal
          const ffmpegArgs = [];

          console.log("🔧 Comando FFmpeg completo:");
          console.log("🔧 Executável:", ffmpegPath);
          console.log("🔧 Argumentos:", ffmpegArgs);
          console.log(
            "🔧 Comando completo:",
            `${ffmpegPath} ${ffmpegArgs.join(" ")}`,
          );

          // Função para tentar concatenação com fallback
          const tryFFmpegConcatenation = (
            args: string[],
            method: string,
          ): Promise<unknown> => {
            return new Promise((resolveFFmpeg, rejectFFmpeg) => {
              console.log(`🎬 Tentando método: ${method}`);
              console.log(`🔧 Args do método ${method}:`, args);
              console.log(
                `🔧 Número de inputs: ${args.filter((arg) => arg === "-i").length}`,
              );

              const ffmpegProcess: ChildProcess = spawn(ffmpegPath!, args);
              let stderr = "";
              let hasError = false;

              // Capturar progresso
              ffmpegProcess.stderr?.on("data", (data: Buffer) => {
                const output = data.toString();
                stderr += output;

                // Enviar progresso para o renderer
                mainWindow.webContents.send("video-concat:progress", output);

                if (output.includes("frame=") || output.includes("time=")) {
                  console.log("📊 Progresso:", output.trim());
                }
              });

              // Quando terminar
              ffmpegProcess.on("close", (code: number | null) => {
                console.log(
                  `🏁 FFmpeg (${method}) finalizado com código:`,
                  code,
                );

                if (code === 0 && !hasError) {
                  if (fs.existsSync(finalOutputPath)) {
                    const stats = fs.statSync(finalOutputPath);
                    console.log("✅ Concatenação concluída!");
                    console.log(
                      "📊 Tamanho:",
                      (stats.size / 1024 / 1024).toFixed(2),
                      "MB",
                    );

                    resolveFFmpeg({
                      success: true,
                      outputPath: finalOutputPath,
                      message: `Vídeo concatenado com sucesso usando ${method}!`,
                      fileSize: stats.size,
                      method: method,
                    });
                  } else {
                    rejectFFmpeg(
                      new Error(`Arquivo não foi criado (${method})`),
                    );
                  }
                } else {
                  console.error(
                    `❌ Erro FFmpeg (${method}):`,
                    stderr.slice(-500),
                  );
                  rejectFFmpeg(
                    new Error(
                      `FFmpeg falhou (${method}): ${stderr.slice(-200)}`,
                    ),
                  );
                }
              });

              // Tratar erros
              ffmpegProcess.on("error", (error: Error) => {
                hasError = true;
                console.error(`❌ Erro processo (${method}):`, error);
                rejectFFmpeg(new Error(`Erro (${method}): ${error.message}`));
              });
            });
          };

          // Tentar método demuxer primeiro (mais confiável)
          try {
            const result = await executeDemuxerConcat();
            resolve(result);
          } catch (error) {
            console.log("⚠️ Método demuxer falhou, tentando método direto...");

            // Método usando demuxer (mais compatível)

            // Método simples - apenas concatenar sem normalização
            const preserveArgs = [
              "-threads",
              "2", // Limitar uso de CPU
              "-i",
              remoteVideoUrl1,
              "-i",
              recordedVideoPath,
              "-i",
              remoteVideoUrl2,
              "-filter_complex",
              "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]",
              "-map",
              "[outv]",
              "-map",
              "[outa]",
              "-c:v",
              "libx264",
              "-c:a",
              "aac",
              "-preset",
              "veryfast", // Menos CPU intensivo
              "-crf",
              "28",
              "-movflags",
              "+faststart",
              "-y",
              finalOutputPath,
            ];

            try {
              const result = await tryFFmpegConcatenation(
                preserveArgs,
                "Simples 3 Vídeos",
              );
              resolve(result);
            } catch (preserveError) {
              console.log("⚠️ Método simples falhou, tentando apenas vídeo...");

              // Método apenas vídeo (sem áudio)
              const simpleArgs = [
                "-threads",
                "1", // Mínimo de threads
                "-i",
                remoteVideoUrl1,
                "-i",
                recordedVideoPath,
                "-i",
                remoteVideoUrl2,
                "-filter_complex",
                "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v0];" +
                  "[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v1];" +
                  "[2:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v2];" +
                  "[v0][v1][v2]concat=n=3:v=1:a=0[outv]",
                "-map",
                "[outv]",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "30", // Qualidade ainda menor
                "-an",
                "-y",
                finalOutputPath,
              ];

              try {
                const result = await tryFFmpegConcatenation(
                  simpleArgs,
                  "3 Vídeos Apenas Vídeo",
                );
                resolve(result);
              } catch (simpleError) {
                console.log(
                  "⚠️ Método apenas vídeo falhou, tentando método básico...",
                );

                // Método sequencial simples - processar um por vez
                const tempStep1 = path.join(
                  path.dirname(finalOutputPath),
                  "temp_step1.mp4",
                );

                // Primeiro: Intro + Gravado
                const step1Args = [
                  "-i",
                  remoteVideoUrl1,
                  "-i",
                  recordedVideoPath,
                  "-filter_complex",
                  "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v0];" +
                    "[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v1];" +
                    "[v0][v1]concat=n=2:v=1:a=0[outv]",
                  "-map",
                  "[outv]",
                  "-c:v",
                  "libx264",
                  "-preset",
                  "ultrafast",
                  "-crf",
                  "30",
                  "-an",
                  "-y",
                  tempStep1,
                ];

                await tryFFmpegConcatenation(
                  step1Args,
                  "Etapa 1 - Intro+Gravado",
                );

                // Segundo: Resultado anterior + Outro
                const copyArgs = [
                  "-i",
                  tempStep1,
                  "-i",
                  remoteVideoUrl2,
                  "-filter_complex",
                  "[0:v][1:v]concat=n=2:v=1:a=0[outv]",
                  "-map",
                  "[outv]",
                  "-c:v",
                  "libx264",
                  "-preset",
                  "ultrafast",
                  "-crf",
                  "30",
                  "-an",
                  "-y",
                  finalOutputPath,
                ];

                // Limpar temp file após uso
                const cleanupTemp = () => {
                  if (fs.existsSync(tempStep1)) {
                    fs.unlinkSync(tempStep1);
                  }
                };

                try {
                  const result = await tryFFmpegConcatenation(
                    copyArgs,
                    "Etapa 2 - Adicionar Final",
                  );
                  cleanupTemp();
                  resolve(result);
                } catch (copyError) {
                  cleanupTemp();
                  reject(
                    new Error(
                      `Todos os métodos falharam. Último erro: ${copyError}`,
                    ),
                  );
                }
              }
            }
          }
        });
      },
    );
    console.log("✅ Handler auto-concatenate-robust registrado");

    // Handler para verificar FFmpeg
    console.log("📡 Registrando handler: video-concat:check-ffmpeg");
    ipcMain.handle("video-concat:check-ffmpeg", async () => {
      try {
        console.log("🔍 Verificando FFmpeg...");
        console.log("🔍 FFmpeg path:", ffmpegPath);

        if (!ffmpegPath) {
          return {
            available: false,
            message: "FFmpeg não está disponível (ffmpeg-static retornou null)",
            path: null,
          };
        }

        if (!fs.existsSync(ffmpegPath)) {
          return {
            available: false,
            message: `FFmpeg não encontrado no caminho: ${ffmpegPath}`,
            path: ffmpegPath,
          };
        }

        return new Promise((resolve) => {
          const testProcess: ChildProcess = spawn(ffmpegPath, ["-version"]);

          testProcess.on("close", (code: number | null) => {
            resolve({
              available: code === 0,
              message: code === 0 ? "FFmpeg disponível" : "FFmpeg com erro",
              path: ffmpegPath,
            });
          });

          testProcess.on("error", (error: Error) => {
            resolve({
              available: false,
              message: `Erro ao executar FFmpeg: ${error.message}`,
              path: ffmpegPath,
            });
          });
        });
      } catch (error) {
        return {
          available: false,
          message: `Erro: ${error}`,
          path: ffmpegPath,
        };
      }
    });
    console.log("✅ Handler check-ffmpeg registrado");

    // Handler de teste para verificar se está funcionando
    console.log("📡 Registrando handler de teste: video-concat:test");
    ipcMain.handle("video-concat:test", async () => {
      console.log("🧪 Handler de teste chamado!");
      return { success: true, message: "Handler funcionando!" };
    });
    console.log("✅ Handler de teste registrado");

    // Handler para debug de caminhos do FFmpeg
    console.log("📡 Registrando handler de debug: video-concat:debug-paths");
    ipcMain.handle("video-concat:debug-paths", async () => {
      const debugInfo = {
        ffmpegStaticPath: ffmpegStatic,
        detectedPath: ffmpegPath,
        processCwd: process.cwd(),
        dirname: __dirname,
        resourcesPath: process.resourcesPath,
        possiblePaths: [
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
        ],
        pathsExist: {},
      };

      // Verificar quais caminhos existem
      for (const testPath of debugInfo.possiblePaths) {
        debugInfo.pathsExist[testPath] = fs.existsSync(testPath);
      }

      console.log("🔍 Debug info:", debugInfo);
      return debugInfo;
    });
    console.log("✅ Handler de debug registrado");

    // Handler para debug específico de 3 vídeos
    console.log(
      "📡 Registrando handler de debug 3 vídeos: video-concat:debug-three-videos",
    );
    ipcMain.handle("video-concat:debug-three-videos", async () => {
      const remoteVideoUrl1 =
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4";
      const remoteVideoUrl2 =
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";

      const debugInfo = {
        remoteVideoUrl1,
        remoteVideoUrl2,
        ffmpegAvailable: !!ffmpegPath,
        ffmpegPath,
        testCommand: [
          "-i",
          remoteVideoUrl1,
          "-i",
          "/tmp/test.mp4",
          "-i",
          remoteVideoUrl2,
          "-filter_complex",
          "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]",
          "-map",
          "[outv]",
          "-map",
          "[outa]",
          "-t",
          "10", // Apenas 10 segundos para teste
          "-y",
          "/tmp/test-3videos-debug.mp4",
        ],
      };

      console.log("🔍 Debug 3 vídeos:", debugInfo);
      return debugInfo;
    });
    console.log("✅ Handler de debug 3 vídeos registrado");

    // Handler para testar apenas o primeiro vídeo (diagnóstico)
    console.log(
      "📡 Registrando handler de teste primeiro vídeo: video-concat:test-first-video",
    );
    ipcMain.handle(
      "video-concat:test-first-video",
      async (_event, options: { outputPath?: string }) => {
        return new Promise((resolve, reject) => {
          const remoteVideoUrl1 =
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4";
          const outputPath =
            options.outputPath || "/tmp/test-first-video-only.mp4";

          if (!ffmpegPath) {
            reject(new Error("FFmpeg não disponível"));
            return;
          }

          console.log("🎬 Testando apenas o primeiro vídeo...");
          console.log("🌐 URL:", remoteVideoUrl1);
          console.log("📁 Output:", outputPath);

          // Comando mais simples possível - apenas baixar e recodificar o primeiro vídeo
          const args = [
            "-i",
            remoteVideoUrl1,
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-preset",
            "fast",
            "-y",
            outputPath,
          ];

          console.log("🔧 Comando:", `${ffmpegPath} ${args.join(" ")}`);

          const ffmpegProcess = spawn(ffmpegPath, args);
          let stderr = "";

          ffmpegProcess.stderr?.on("data", (data: Buffer) => {
            const output = data.toString();
            stderr += output;
            console.log("📊 Progresso primeiro vídeo:", output.trim());
          });

          ffmpegProcess.on("close", (code: number | null) => {
            if (code === 0) {
              if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                resolve({
                  success: true,
                  outputPath,
                  message: "Primeiro vídeo processado com sucesso",
                  fileSize: stats.size,
                });
              } else {
                reject(new Error("Arquivo não foi criado"));
              }
            } else {
              reject(new Error(`FFmpeg falhou: ${stderr.slice(-200)}`));
            }
          });

          ffmpegProcess.on("error", (error: Error) => {
            reject(new Error(`Erro: ${error.message}`));
          });
        });
      },
    );
    console.log("✅ Handler de teste primeiro vídeo registrado");

    console.log("✅ Video concat listeners registrados com sucesso");

    // Verificar se os handlers foram realmente registrados
    console.log("🔍 Verificando handlers registrados:");
    console.log(
      "🔍 auto-concatenate-robust:",
      ipcMain.listenerCount("video-concat:auto-concatenate-robust") > 0,
    );
    console.log(
      "🔍 check-ffmpeg:",
      ipcMain.listenerCount("video-concat:check-ffmpeg") > 0,
    );
    console.log("🔍 test:", ipcMain.listenerCount("video-concat:test") > 0);

    // Listar TODOS os handlers registrados
    console.log("🔍 TODOS os handlers IPC registrados:");
    const allHandlers = (ipcMain as unknown)._events;
    if (allHandlers) {
      Object.keys(allHandlers).forEach((key) => {
        if (key.includes("video-concat")) {
          console.log(`🔍 Handler encontrado: ${key}`);
        }
      });
    }
  } catch (error) {
    console.error("❌ Erro durante registro dos handlers:", error);
    throw error;
  }
}
