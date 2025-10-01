import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

// Array para armazenar logs de debug
const debugLogs: string[] = [];

function addDebugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  debugLogs.push(logMessage);
  console.log(logMessage);
}

export function getFFmpegDebugLogs(): string[] {
  return [...debugLogs];
}

export function clearFFmpegDebugLogs(): void {
  debugLogs.length = 0;
}

export interface FFmpegInfo {
  isAvailable: boolean;
  version?: string;
  error?: string;
}

/**
 * Verifica se o FFmpeg está disponível no sistema (MAIN PROCESS ONLY)
 */
export async function checkFFmpegAvailability(): Promise<FFmpegInfo> {
  clearFFmpegDebugLogs(); // Limpar logs anteriores

  addDebugLog("🔍 [FFmpeg Check] Iniciando verificação...");
  addDebugLog(`🔍 [FFmpeg Check] Platform: ${process.platform}`);
  addDebugLog(`🔍 [FFmpeg Check] Architecture: ${process.arch}`);
  addDebugLog(`🔍 [FFmpeg Check] process.cwd(): ${process.cwd()}`);
  addDebugLog(`🔍 [FFmpeg Check] __dirname: ${__dirname}`);
  addDebugLog(
    `🔍 [FFmpeg Check] process.resourcesPath: ${process.resourcesPath || "undefined"}`,
  );

  try {
    // Primeiro tentar usar ffmpeg-static
    if (ffmpegStatic) {
      addDebugLog(`🔍 [FFmpeg Check] ffmpeg-static path: ${ffmpegStatic}`);
      addDebugLog(
        `🔍 [FFmpeg Check] typeof ffmpegStatic: ${typeof ffmpegStatic}`,
      );
      addDebugLog(
        `🔍 [FFmpeg Check] fs.existsSync(ffmpegStatic): ${fs.existsSync(ffmpegStatic)}`,
      );

      // Se o caminho contém app.asar e não existe, procurar em app.asar.unpacked
      let ffmpegPath = ffmpegStatic;

      if (ffmpegPath.includes("app.asar") && !fs.existsSync(ffmpegPath)) {
        addDebugLog(
          `🔍 [FFmpeg Check] Arquivo está dentro do ASAR, procurando em unpacked...`,
        );

        if (process.resourcesPath) {
          // Verificar extraResource primeiro (mais simples)
          const extraResourcePath = path.join(
            process.resourcesPath,
            process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
          );
          addDebugLog(
            `🔍 [FFmpeg Check] Tentando extraResource: ${extraResourcePath}`,
          );

          if (fs.existsSync(extraResourcePath)) {
            addDebugLog(`✅ [FFmpeg Check] Encontrado em extraResource!`);
            ffmpegPath = extraResourcePath;
          } else {
            addDebugLog(
              `❌ [FFmpeg Check] Não existe em extraResource: ${extraResourcePath}`,
            );

            // Tentar app.asar.unpacked
            const unpackedPath = path.join(
              process.resourcesPath,
              "app.asar.unpacked",
              "node_modules",
              "ffmpeg-static",
              process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
            );
            addDebugLog(
              `🔍 [FFmpeg Check] Tentando caminho unpacked: ${unpackedPath}`,
            );

            if (fs.existsSync(unpackedPath)) {
              addDebugLog(`✅ [FFmpeg Check] Encontrado em unpacked!`);
              ffmpegPath = unpackedPath;
            } else {
              addDebugLog(
                `❌ [FFmpeg Check] Não existe em unpacked: ${unpackedPath}`,
              );

              // Listar conteúdo de resources para debug
              try {
                const resourcesContents = fs.readdirSync(process.resourcesPath);
                addDebugLog(
                  `🔍 [FFmpeg Check] Conteúdo de resources: ${resourcesContents.join(", ")}`,
                );
              } catch (err) {
                addDebugLog(
                  `❌ [FFmpeg Check] Erro ao listar resources: ${err}`,
                );
              }
            }
          }
        }
      }

      try {
        addDebugLog(`🔍 [FFmpeg Check] Tentando executar: ${ffmpegPath}`);
        const { stdout, stderr } = await execFileAsync(
          ffmpegPath,
          ["-version"],
          {
            timeout: 5000,
            windowsHide: true,
          },
        );

        addDebugLog(
          `✅ [FFmpeg Check] Executado com sucesso! stdout length: ${stdout.length}`,
        );
        if (stderr)
          addDebugLog(`🔍 [FFmpeg Check] stderr: ${stderr.substring(0, 100)}`);

        // Extrair versão do output
        const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
        const version = versionMatch ? versionMatch[1] : "unknown";

        addDebugLog(
          `✅ [FFmpeg Check] FFmpeg (ffmpeg-static) encontrado! Versão: ${version}`,
        );

        return {
          isAvailable: true,
          version: `${version} (ffmpeg-static)`,
        };
      } catch (execError) {
        const errorMsg =
          execError instanceof Error ? execError.message : String(execError);
        addDebugLog(
          `❌ [FFmpeg Check] Erro ao executar ffmpeg-static: ${errorMsg}`,
        );
        throw execError;
      }
    } else {
      addDebugLog("⚠️ [FFmpeg Check] ffmpeg-static é null/undefined");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    addDebugLog(
      `❌ [FFmpeg Check] Erro na verificação do ffmpeg-static: ${errorMsg}`,
    );
  }

  // Fallback: tentar caminhos tradicionais
  addDebugLog(
    "🔍 [FFmpeg Check] Tentando caminhos tradicionais como fallback...",
  );

  const ffmpegPaths: string[] = [];

  // Adicionar caminhos baseados na plataforma
  if (process.platform === "win32") {
    ffmpegPaths.push(
      "ffmpeg.exe", // PATH do Windows
      "ffmpeg", // PATH sem extensão
      "C:\\ffmpeg\\bin\\ffmpeg.exe", // Local comum
      "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    );
  } else if (process.platform === "darwin") {
    ffmpegPaths.push(
      "/opt/homebrew/bin/ffmpeg", // Homebrew Apple Silicon
      "/usr/local/bin/ffmpeg", // Homebrew Intel Mac
      "ffmpeg", // PATH padrão
      "/usr/bin/ffmpeg", // Sistema
    );
  } else {
    // Linux
    ffmpegPaths.push(
      "ffmpeg", // PATH padrão
      "/usr/bin/ffmpeg", // Sistema
      "/usr/local/bin/ffmpeg", // Local
    );
  }

  for (const ffmpegPath of ffmpegPaths) {
    try {
      addDebugLog(`🔍 [FFmpeg Check] Tentando caminho: ${ffmpegPath}`);
      const { stdout, stderr } = await execFileAsync(ffmpegPath, ["-version"], {
        timeout: 5000,
        windowsHide: true,
      });

      addDebugLog(`✅ [FFmpeg Check] Sucesso com ${ffmpegPath}!`);
      if (stderr)
        addDebugLog(`🔍 [FFmpeg Check] stderr: ${stderr.substring(0, 100)}`);

      // Extrair versão do output
      const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : "unknown";

      addDebugLog(
        `✅ [FFmpeg Check] FFmpeg encontrado: ${ffmpegPath} (${version})`,
      );

      return {
        isAvailable: true,
        version: `${version} (${ffmpegPath})`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addDebugLog(
        `❌ [FFmpeg Check] Falha no caminho ${ffmpegPath}: ${errorMsg}`,
      );
      continue;
    }
  }

  addDebugLog(
    "❌ [FFmpeg Check] FFmpeg não foi encontrado em nenhum caminho testado",
  );
  addDebugLog(`❌ [FFmpeg Check] Caminhos testados: ${ffmpegPaths.join(", ")}`);

  return {
    isAvailable: false,
    error:
      process.platform === "win32"
        ? "FFmpeg não encontrado. Baixe de https://ffmpeg.org/download.html e adicione ao PATH ou extraia em C:\\ffmpeg\\bin\\"
        : "FFmpeg não encontrado. Instale ffmpeg-static ou FFmpeg no sistema.",
  };
}

/**
 * Obtém informações detalhadas sobre codecs suportados pelo FFmpeg (MAIN PROCESS ONLY)
 */
export async function getFFmpegCodecInfo(): Promise<{
  encoders: string[];
  decoders: string[];
  error?: string;
}> {
  try {
    const { stdout } = await execAsync("ffmpeg -encoders");
    const encoders = stdout
      .split("\n")
      .filter((line) => line.includes("V....."))
      .map((line) => line.trim())
      .slice(0, 10); // Limitar para não sobrecarregar

    const { stdout: decoderOutput } = await execAsync("ffmpeg -decoders");
    const decoders = decoderOutput
      .split("\n")
      .filter((line) => line.includes("V....."))
      .map((line) => line.trim())
      .slice(0, 10); // Limitar para não sobrecarregar

    return { encoders, decoders };
  } catch (error) {
    return {
      encoders: [],
      decoders: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Instala FFmpeg usando Homebrew (macOS) ou sugere instalação manual (MAIN PROCESS ONLY)
 */
export async function suggestFFmpegInstallation(): Promise<{
  canAutoInstall: boolean;
  installCommand?: string;
  instructions: string[];
}> {
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS - verificar se Homebrew está disponível
    try {
      await execAsync("which brew");
      return {
        canAutoInstall: true,
        installCommand: "brew install ffmpeg",
        instructions: [
          "FFmpeg pode ser instalado automaticamente usando Homebrew",
          "Execute: brew install ffmpeg",
          "Ou clique no botão para instalar automaticamente",
        ],
      };
    } catch {
      return {
        canAutoInstall: false,
        instructions: [
          "Para instalar FFmpeg no macOS:",
          "1. Instale Homebrew: https://brew.sh",
          "2. Execute: brew install ffmpeg",
          "3. Reinicie o aplicativo",
        ],
      };
    }
  } else if (platform === "win32") {
    return {
      canAutoInstall: false,
      instructions: [
        "Para instalar FFmpeg no Windows:",
        "1. Baixe FFmpeg de: https://ffmpeg.org/download.html",
        "2. Extraia e adicione ao PATH do sistema",
        "3. Reinicie o aplicativo",
      ],
    };
  } else {
    return {
      canAutoInstall: false,
      instructions: [
        "Para instalar FFmpeg no Linux:",
        "Ubuntu/Debian: sudo apt install ffmpeg",
        "CentOS/RHEL: sudo yum install ffmpeg",
        "Arch: sudo pacman -S ffmpeg",
      ],
    };
  }
}

/**
 * Tenta instalar FFmpeg automaticamente (apenas macOS com Homebrew) (MAIN PROCESS ONLY)
 */
export async function autoInstallFFmpeg(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const platform = process.platform;

    if (platform !== "darwin") {
      return {
        success: false,
        message: "Instalação automática disponível apenas no macOS",
      };
    }

    // Verificar se Homebrew está disponível
    await execAsync("which brew");

    console.log("🍺 Instalando FFmpeg via Homebrew...");
    const { stdout, stderr } = await execAsync("brew install ffmpeg");

    console.log("Homebrew stdout:", stdout);
    if (stderr) console.log("Homebrew stderr:", stderr);

    // Verificar se a instalação foi bem-sucedida
    const ffmpegCheck = await checkFFmpegAvailability();

    if (ffmpegCheck.isAvailable) {
      return {
        success: true,
        message: `FFmpeg instalado com sucesso! Versão: ${ffmpegCheck.version}`,
      };
    } else {
      return {
        success: false,
        message: "FFmpeg foi instalado mas não está funcionando corretamente",
      };
    }
  } catch (error) {
    console.error("Erro ao instalar FFmpeg:", error);
    return {
      success: false,
      message: `Erro na instalação: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
