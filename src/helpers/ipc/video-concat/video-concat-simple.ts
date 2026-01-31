import { ipcMain, BrowserWindow } from "electron";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";

// Função para encontrar o caminho correto do FFmpeg
function getFFmpegPath(): string | null {
  console.log("🔍 [Video Concat] Procurando FFmpeg...");
  console.log("🔍 [Video Concat] ffmpeg-static retornou:", ffmpegStatic);
  console.log("🔍 [Video Concat] Platform:", process.platform);
  console.log(
    "🔍 [Video Concat] process.resourcesPath:",
    process.resourcesPath,
  );
  console.log("🔍 [Video Concat] __dirname:", __dirname);

  // Primeiro, tentar o caminho que ffmpeg-static retornou
  if (ffmpegStatic) {
    console.log("🔍 [Video Concat] Testando ffmpeg-static:", ffmpegStatic);
    if (fs.existsSync(ffmpegStatic)) {
      console.log("✅ [Video Concat] FFmpeg encontrado via ffmpeg-static");
      return ffmpegStatic;
    }

    // Se não existir, pode estar em app.asar.unpacked
    const unpackedPath = ffmpegStatic.replace("app.asar", "app.asar.unpacked");
    console.log("🔍 [Video Concat] Testando unpacked:", unpackedPath);
    if (fs.existsSync(unpackedPath)) {
      console.log("✅ [Video Concat] FFmpeg encontrado em app.asar.unpacked");
      return unpackedPath;
    }
  }

  // Determinar extensão do executável baseado na plataforma
  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "ffmpeg.exe" : "ffmpeg";

  const possiblePaths = [
    // PRIMEIRO: Caminho onde copiamos o ffmpeg.exe no postPackage hook
    process.resourcesPath ? path.join(process.resourcesPath, exeName) : null,
    // Caminhos para app empacotado (ffmpeg-static)
    process.resourcesPath
      ? path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "node_modules",
          "ffmpeg-static",
          exeName,
        )
      : null,
    process.resourcesPath
      ? path.join(
          process.resourcesPath,
          "node_modules",
          "ffmpeg-static",
          exeName,
        )
      : null,
    // Caminhos para desenvolvimento
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
    // PATH do sistema
    exeName,
  ].filter(Boolean) as string[];

  console.log("🔍 [Video Concat] Testando caminhos:", possiblePaths);

  for (const testPath of possiblePaths) {
    console.log("🔍 [Video Concat] Testando:", testPath);
    if (fs.existsSync(testPath)) {
      console.log("✅ [Video Concat] FFmpeg encontrado:", testPath);
      return testPath;
    }
  }

  console.error("❌ [Video Concat] FFmpeg não encontrado em nenhum caminho");
  return null;
}

// Não definir ffmpegPath aqui - será chamado dinamicamente quando necessário
// para garantir que os caminhos corretos sejam usados após o app inicializar

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

// Interface para configuração S3
interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  folderPrefix?: string;
  isConfigured: boolean;
  isEnabled?: boolean; // Propriedade opcional do renderer
}

// Função para gerar URL S3 a partir da chave (RECOMENDADA)
async function generateS3UrlFromKey(
  videoKey: string,
  s3Config: S3Config,
): Promise<string | null> {
  try {
    console.log("=================================================");
    console.log("🔄 GERANDO URL S3 A PARTIR DA CHAVE");
    console.log("=================================================");
    console.log("🔍 Chave do vídeo:", videoKey);
    console.log("🔍 Tipo da chave:", typeof videoKey);
    console.log("🔍 Comprimento da chave:", videoKey?.length || 0);

    if (!videoKey || videoKey.trim().length === 0) {
      console.error("❌ Chave do vídeo não fornecida ou vazia");
      console.error("❌ Tipo:", typeof videoKey);
      console.error("❌ Valor:", JSON.stringify(videoKey));
      console.error(
        "❌ Esta função requer uma chave S3 válida (ex: 'assets/intro.mp4')",
      );
      return null;
    }

    // Importar módulos necessários
    console.log("📦 Importando módulos S3...");
    const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

    console.log("📦 Usando configuração S3 fornecida...");

    console.log("🔍 Configuração S3 COMPLETA:", {
      isConfigured: s3Config.isConfigured,
      bucketName: s3Config.bucketName,
      region: s3Config.region,
      folderPrefix: s3Config.folderPrefix,
      hasAccessKey: !!s3Config.accessKeyId,
      accessKeyLength: s3Config.accessKeyId?.length || 0,
      hasSecretKey: !!s3Config.secretAccessKey,
      secretKeyLength: s3Config.secretAccessKey?.length || 0,
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
        accessKeyId: s3Config.accessKeyId
          ? "***" + s3Config.accessKeyId.slice(-4)
          : "undefined",
        secretAccessKey: s3Config.secretAccessKey
          ? "***" + s3Config.secretAccessKey.slice(-4)
          : "undefined",
        bucketName: s3Config.bucketName || "undefined",
        region: s3Config.region || "undefined",
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

    // Usar a chave diretamente (já está no formato correto: assets/intro.mp4)
    console.log("🔍 Gerando URL para bucket:", s3Config.bucketName);
    console.log("🔍 Chave do objeto:", videoKey);
    console.log("🔍 Região:", s3Config.region);

    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: videoKey,
    });

    console.log("🔄 Gerando URL assinada com getSignedUrl...");

    // Gerar nova URL com validade de 2 horas
    const newUrl = await getSignedUrl(client, command, { expiresIn: 7200 });

    console.log("=================================================");
    console.log("✅ URL S3 GERADA COM SUCESSO!");
    console.log("=================================================");
    console.log(
      "🔍 URL (primeiros 150 chars):",
      newUrl.substring(0, 150) + "...",
    );
    console.log("🔍 Tamanho da URL:", newUrl.length, "caracteres");
    return newUrl;
  } catch (error) {
    console.error("=================================================");
    console.error("❌ ERRO AO GERAR URL S3");
    console.error("=================================================");
    console.error("❌ Erro completo:", error);

    if (error instanceof Error) {
      console.error("❌ Mensagem:", error.message);
      console.error("❌ Nome:", error.name);
      console.error("❌ Stack trace:", error.stack);
    }

    // Tentar extrair mais informações do erro AWS
    if (typeof error === "object" && error !== null) {
      const awsError = error as any;
      if (awsError.$metadata) {
        console.error("❌ AWS Metadata:", awsError.$metadata);
      }
      if (awsError.Code) {
        console.error("❌ AWS Error Code:", awsError.Code);
      }
      if (awsError.message) {
        console.error("❌ AWS Message:", awsError.message);
      }
    }

    console.error("=================================================");
    return null;
  }
}

// Função para regenerar URL S3 expirada (LEGADO - usa extração de chave da URL)
async function regenerateS3Url(expiredUrl: string): Promise<string | null> {
  try {
    console.log("🔄 Regenerando URL S3 expirada...");
    console.log("🔍 URL expirada:", expiredUrl.substring(0, 150) + "...");

    // Extrair informações da URL expirada
    const urlObj = new URL(expiredUrl);
    console.log("🔍 URL parsed:", {
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search.substring(0, 50) + "...",
    });

    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);
    console.log("🔍 Path parts:", pathParts);

    // CORREÇÃO: Extrair a chave completa incluindo a pasta
    // Formato esperado: bucket.s3.region.amazonaws.com/assets/intro.mp4
    // A chave deve ser: assets/intro.mp4 (não apenas intro.mp4)
    let videoKey = "";

    if (pathParts.length >= 1) {
      // Se tiver bucket no hostname (bucket.s3.region.amazonaws.com/folder/file.mp4)
      if (urlObj.hostname.includes(".s3.")) {
        // Toda a pathname é a chave (removendo a primeira barra)
        videoKey = pathParts.join("/");
      }
      // Se tiver bucket no path (s3.amazonaws.com/bucket/folder/file.mp4)
      else if (urlObj.hostname.startsWith("s3.")) {
        // Remover o nome do bucket (primeiro elemento) e pegar o resto
        videoKey = pathParts.slice(1).join("/");
      }
      // Outros formatos
      else {
        videoKey = pathParts.join("/");
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

    // A chave já está completa (ex: assets/intro.mp4)
    // NÃO adicionar folderPrefix novamente
    console.log("🔍 Chave do objeto S3:", videoKey);

    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: videoKey,
    });

    console.log("🔄 Gerando URL assinada...");
    console.log("🔍 Bucket:", s3Config.bucketName);
    console.log("🔍 Key:", videoKey);
    console.log("🔍 Region:", s3Config.region);

    // Gerar nova URL com validade de 2 horas
    const newUrl = await getSignedUrl(client, command, { expiresIn: 7200 });
    console.log("✅ Nova URL S3 gerada com sucesso!");
    console.log(
      "🔍 Nova URL (primeiros 150 chars):",
      newUrl.substring(0, 150) + "...",
    );
    return newUrl;
  } catch (error) {
    console.error("❌ Erro ao regenerar URL S3:", error);
    if (error instanceof Error) {
      console.error("❌ Stack trace:", error.stack);
    }
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

  // Handler de TESTE para validar configuração S3
  ipcMain.handle("video-concat:test-s3-config", async (_event) => {
    try {
      console.log("🧪 TESTE DE CONFIGURAÇÃO S3");
      console.log("=================================================");

      const { useS3ConfigStore } = require("../../../../store/store-s3-config");
      const s3Config = useS3ConfigStore.getState().config;

      const diagnostics = {
        isConfigured: s3Config.isConfigured,
        isEnabled: s3Config.isEnabled,
        bucketName: s3Config.bucketName,
        region: s3Config.region,
        folderPrefix: s3Config.folderPrefix,
        hasAccessKey: !!s3Config.accessKeyId,
        accessKeyId: s3Config.accessKeyId
          ? `${s3Config.accessKeyId.substring(0, 8)}...`
          : "não definido",
        accessKeyLength: s3Config.accessKeyId?.length || 0,
        hasSecretKey: !!s3Config.secretAccessKey,
        secretKeyLength: s3Config.secretAccessKey?.length || 0,
      };

      console.log("📊 Diagnóstico S3:", diagnostics);
      console.log("=================================================");

      return { success: true, diagnostics };
    } catch (error) {
      console.error("❌ Erro ao diagnosticar S3:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Handler de TESTE para gerar URL a partir de uma chave
  ipcMain.handle(
    "video-concat:test-generate-url",
    async (_event, videoKey: string, s3Config: S3Config) => {
      try {
        console.log("🧪 TESTE DE GERAÇÃO DE URL");
        console.log("=================================================");
        console.log("🔑 Chave fornecida:", videoKey);

        const url = await generateS3UrlFromKey(videoKey, s3Config);

        if (url) {
          return {
            success: true,
            url: url.substring(0, 150) + "...",
            urlLength: url.length,
          };
        } else {
          return {
            success: false,
            error: "Falha ao gerar URL (retornou null)",
          };
        }
      } catch (error) {
        console.error("❌ Erro no teste de geração:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

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
        introVideoKey?: string; // Nova propriedade para chave S3
        outroVideoKey?: string; // Nova propriedade para chave S3
        s3Config?: S3Config; // Configuração S3 do renderer
      },
    ) => {
      return new Promise(async (resolve, reject) => {
        const {
          recordedVideoPath,
          outputPath,
          introVideoUrl,
          outroVideoUrl,
          introVideoKey,
          outroVideoKey,
          s3Config,
        } = options;

        console.log("📦 Opções recebidas no handler:");
        console.log("  - recordedVideoPath:", recordedVideoPath);
        console.log(
          "  - introVideoUrl:",
          introVideoUrl ? "✅ fornecida" : "❌ não fornecida",
        );
        console.log(
          "  - outroVideoUrl:",
          outroVideoUrl ? "✅ fornecida" : "❌ não fornecida",
        );
        console.log("  - introVideoKey:", introVideoKey || "não fornecida");
        console.log("  - outroVideoKey:", outroVideoKey || "não fornecida");
        console.log(
          "  - s3Config:",
          s3Config ? "✅ fornecida" : "❌ não fornecida",
        );

        if (s3Config) {
          console.log("  - s3Config detalhes:", {
            isConfigured: s3Config.isConfigured,
            bucketName: s3Config.bucketName,
            region: s3Config.region,
            hasAccessKey: !!s3Config.accessKeyId,
            hasSecretKey: !!s3Config.secretAccessKey,
          });
        }

        // IMPORTANTE: s3Config é OPCIONAL para este método
        // Só é necessário se precisarmos regenerar URLs expiradas
        // Como agora usamos as URLs diretamente, não é mais obrigatório

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
        console.log("🔑 Chave S3 Intro:", introVideoKey || "não fornecida");
        console.log(
          "🎭 Vídeo de Encerramento:",
          extractVideoName(outroVideoUrl),
        );
        console.log("🔑 Chave S3 Outro:", outroVideoKey || "não fornecida");
        console.log("📁 Vídeo Gravado:", recordedVideoPath);

        // Regenerar URLs S3 se temos as chaves e configuração
        console.log("🔄 Verificando se precisamos regenerar URLs S3...");
        let validIntroUrl = introVideoUrl;
        let validOutroUrl = outroVideoUrl;

        // Se temos s3Config E as chaves dos vídeos, regenerar URLs para garantir que não estão expiradas
        if (
          s3Config &&
          s3Config.isConfigured &&
          introVideoKey &&
          outroVideoKey
        ) {
          console.log(
            "🔑 Temos chaves S3 e configuração - regenerando URLs...",
          );

          try {
            const newIntroUrl = await generateS3UrlFromKey(
              introVideoKey,
              s3Config,
            );
            if (newIntroUrl) {
              validIntroUrl = newIntroUrl;
              console.log("✅ URL de introdução regenerada com sucesso");
            } else {
              console.warn(
                "⚠️ Falha ao regenerar URL de introdução, usando URL original",
              );
            }
          } catch (error) {
            console.warn("⚠️ Erro ao regenerar URL de introdução:", error);
            console.log("⚠️ Usando URL original (pode estar expirada)");
          }

          try {
            const newOutroUrl = await generateS3UrlFromKey(
              outroVideoKey,
              s3Config,
            );
            if (newOutroUrl) {
              validOutroUrl = newOutroUrl;
              console.log("✅ URL de encerramento regenerada com sucesso");
            } else {
              console.warn(
                "⚠️ Falha ao regenerar URL de encerramento, usando URL original",
              );
            }
          } catch (error) {
            console.warn("⚠️ Erro ao regenerar URL de encerramento:", error);
            console.log("⚠️ Usando URL original (pode estar expirada)");
          }
        } else {
          console.log(
            "ℹ️ Sem chaves S3 ou configuração - usando URLs originais",
          );
          if (!s3Config) console.log("  - s3Config não fornecida");
          if (s3Config && !s3Config.isConfigured)
            console.log("  - s3Config não está configurada");
          if (!introVideoKey) console.log("  - introVideoKey não fornecida");
          if (!outroVideoKey) console.log("  - outroVideoKey não fornecida");
        }

        console.log("✅ URLs prontas para download");

        // Obter caminho do FFmpeg dinamicamente
        const ffmpegPath = getFFmpegPath();
        console.log("🎬 [Video Concat] FFmpeg path obtido:", ffmpegPath);

        if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
          console.error("❌ [Video Concat] FFmpeg não disponível");
          console.error("❌ [Video Concat] ffmpegPath:", ffmpegPath);
          console.error(
            "❌ [Video Concat] fs.existsSync:",
            ffmpegPath ? fs.existsSync(ffmpegPath) : "N/A",
          );
          reject(
            new Error(
              "FFmpeg não disponível. Verifique os logs do console para mais detalhes.",
            ),
          );
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

        // Função para baixar arquivo do S3 com retry automático
        const downloadS3File = async (
          url: string,
          destPath: string,
          videoKey?: string,
          originalUrl?: string,
          retryCount: number = 0,
        ): Promise<void> => {
          const https = require("https");
          const fs = require("fs");
          const MAX_RETRIES = 2;

          return new Promise(async (resolveDownload, rejectDownload) => {
            console.log(
              `📥 Tentativa ${retryCount + 1}/${MAX_RETRIES + 1} de download...`,
            );
            console.log(
              `📥 URL (primeiros 150 chars):`,
              url.substring(0, 150) + "...",
            );

            const file = fs.createWriteStream(destPath);

            https
              .get(url, async (response: any) => {
                if (
                  response.statusCode === 302 ||
                  response.statusCode === 301
                ) {
                  // Seguir redirect
                  console.log(
                    "🔄 Seguindo redirect para:",
                    response.headers.location.substring(0, 150) + "...",
                  );
                  file.close();
                  fs.unlinkSync(destPath);
                  return downloadS3File(
                    response.headers.location,
                    destPath,
                    videoKey,
                    originalUrl || url,
                    retryCount,
                  )
                    .then(resolveDownload)
                    .catch(rejectDownload);
                }

                // Se receber 403 (Forbidden), tentar regenerar URL
                if (response.statusCode === 403) {
                  console.error(
                    `❌ Erro 403 Forbidden - URL expirada ou sem permissão`,
                  );
                  file.close();
                  if (fs.existsSync(destPath)) {
                    fs.unlinkSync(destPath);
                  }

                  // Tentar regenerar URL se ainda temos retries
                  if (retryCount < MAX_RETRIES) {
                    console.log(
                      `🔄 Tentando regenerar URL S3 (tentativa ${retryCount + 1}/${MAX_RETRIES})...`,
                    );
                    mainWindow.webContents.send(
                      "video-concat:progress",
                      `⚠️ URL expirada, regenerando... (tentativa ${retryCount + 1}/${MAX_RETRIES})`,
                    );

                    let newUrl: string | null = null;

                    // PRIORIDADE 1: Se temos videoKey e s3Config, usar generateS3UrlFromKey
                    if (videoKey && s3Config && s3Config.isConfigured) {
                      console.log(
                        "🔑 Usando chave S3 para regenerar:",
                        videoKey,
                      );
                      try {
                        newUrl = await generateS3UrlFromKey(videoKey, s3Config);
                      } catch (error) {
                        console.error("❌ Erro ao gerar URL com chave:", error);
                      }
                    }

                    // FALLBACK: Tentar extrair chave da URL
                    if (!newUrl) {
                      console.log("🔄 Tentando extrair chave da URL...");
                      newUrl = await regenerateS3Url(originalUrl || url);
                    }

                    if (newUrl) {
                      console.log(
                        "✅ URL regenerada, tentando download novamente...",
                      );
                      return downloadS3File(
                        newUrl,
                        destPath,
                        videoKey,
                        originalUrl || url,
                        retryCount + 1,
                      )
                        .then(resolveDownload)
                        .catch(rejectDownload);
                    } else {
                      console.error("❌ Falha ao regenerar URL");
                      return rejectDownload(
                        new Error(
                          `Download falhou: 403 Forbidden (URL expirada e não foi possível regenerar)`,
                        ),
                      );
                    }
                  } else {
                    return rejectDownload(
                      new Error(
                        `Download falhou: 403 Forbidden (máximo de tentativas atingido)`,
                      ),
                    );
                  }
                }

                if (response.statusCode !== 200) {
                  console.error(
                    `❌ Download falhou com status ${response.statusCode}: ${response.statusMessage}`,
                  );
                  file.close();
                  if (fs.existsSync(destPath)) {
                    fs.unlinkSync(destPath);
                  }
                  return rejectDownload(
                    new Error(
                      `Download falhou: ${response.statusCode} ${response.statusMessage}`,
                    ),
                  );
                }

                const totalBytes = parseInt(
                  response.headers["content-length"],
                  10,
                );
                let downloadedBytes = 0;

                console.log(
                  `📥 Iniciando download - Tamanho total: ${(totalBytes / 1024 / 1024).toFixed(2)}MB`,
                );

                response.on("data", (chunk: Buffer) => {
                  downloadedBytes += chunk.length;
                  const percent = totalBytes
                    ? ((downloadedBytes / totalBytes) * 100).toFixed(1)
                    : "?";
                  mainWindow.webContents.send(
                    "video-concat:progress",
                    `📥 Baixando: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB)`,
                  );
                });

                response.pipe(file);

                file.on("finish", () => {
                  file.close();
                  console.log(`✅ Download concluído: ${destPath}`);
                  resolveDownload();
                });

                file.on("error", (err: Error) => {
                  console.error(`❌ Erro ao escrever arquivo:`, err);
                  fs.unlink(destPath, () => {});
                  rejectDownload(err);
                });
              })
              .on("error", (err: Error) => {
                console.error(`❌ Erro na requisição HTTPS:`, err);
                fs.unlink(destPath, () => {});
                rejectDownload(err);
              });
          });
        };

        try {
          // ETAPA 0: Baixar vídeos do S3
          const tempIntroS3 = path.join(tempDir, "temp_intro_s3.mp4");
          const tempOutroS3 = path.join(tempDir, "temp_outro_s3.mp4");

          console.log("📥 ETAPA 0/5: Baixando vídeos do S3...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "📥 Etapa 0/5: Baixando introdução do S3...",
          );

          await downloadS3File(validIntroUrl, tempIntroS3, introVideoKey);
          console.log("✅ Introdução baixada:", tempIntroS3);

          mainWindow.webContents.send(
            "video-concat:progress",
            "📥 Etapa 0/5: Baixando encerramento do S3...",
          );

          await downloadS3File(validOutroUrl, tempOutroS3, outroVideoKey);
          console.log("✅ Encerramento baixado:", tempOutroS3);

          // Configurações padrão de normalização para TODOS os vídeos
          const normalizeSettings = [
            "-c:v",
            "libx264",
            "-preset",
            "medium", // Melhor compressão e qualidade
            "-crf",
            "18", // Alta qualidade visual
            "-pix_fmt",
            "yuv420p",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30",
            "-c:a",
            "aac",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-b:a",
            "192k", // Melhor qualidade de áudio
            "-movflags",
            "+faststart",
          ];

          // ETAPA 1: Normalizar vídeo de introdução
          console.log("🔄 ETAPA 1/5: Normalizando introdução...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 1/5: Normalizando introdução...",
          );

          const introArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-i",
            tempIntroS3, // Usar arquivo local baixado
            ...normalizeSettings,
            "-y",
            tempIntro,
          ];

          await execFFmpeg(introArgs, "Normalizar Introdução");

          // ETAPA 2: Normalizar vídeo gravado
          console.log("🔄 ETAPA 2/5: Normalizando vídeo gravado...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 2/5: Normalizando gravação...",
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
          console.log("🔄 ETAPA 3/5: Normalizando encerramento...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 3/5: Normalizando encerramento...",
          );

          const outroArgs = [
            "-hide_banner",
            "-threads",
            "0",
            "-i",
            tempOutroS3, // Usar arquivo local baixado
            ...normalizeSettings,
            "-y",
            tempOutro,
          ];

          await execFFmpeg(outroArgs, "Normalizar Encerramento");

          // ETAPA 4: Concatenar usando file list (método demuxer)
          console.log("🔄 ETAPA 4/5: Concatenando com demuxer...");
          mainWindow.webContents.send(
            "video-concat:progress",
            "🔄 Etapa 4/5: Concatenando arquivos...",
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
          [
            tempIntro,
            tempRecorded,
            tempOutro,
            tempIntroS3,
            tempOutroS3,
            listFile,
          ].forEach((file) => {
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
