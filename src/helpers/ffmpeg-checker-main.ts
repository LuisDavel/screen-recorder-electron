import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegStatic from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export interface FFmpegInfo {
    isAvailable: boolean;
    version?: string;
    error?: string;
}

/**
 * Verifica se o FFmpeg está disponível no sistema (MAIN PROCESS ONLY)
 */
export async function checkFFmpegAvailability(): Promise<FFmpegInfo> {
    console.log("🔍 Verificando FFmpeg usando ffmpeg-static...");

    try {
        // Primeiro tentar usar ffmpeg-static
        if (ffmpegStatic) {
            console.log("🔍 Testando ffmpeg-static:", ffmpegStatic);

            const { stdout } = await execFileAsync(ffmpegStatic, ["-version"]);

            // Extrair versão do output
            const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
            const version = versionMatch ? versionMatch[1] : "unknown";

            console.log("✅ FFmpeg (ffmpeg-static) encontrado:", { path: ffmpegStatic, version });

            return {
                isAvailable: true,
                version: `${version} (ffmpeg-static)`
            };
        } else {
            console.warn("⚠️ ffmpeg-static não está disponível");
        }
    } catch (error) {
        console.log("❌ Erro ao testar ffmpeg-static:", error instanceof Error ? error.message : String(error));
    }

    // Fallback: tentar caminhos tradicionais
    console.log("🔍 Tentando caminhos tradicionais como fallback...");

    const ffmpegPaths = [
        "/opt/homebrew/bin/ffmpeg", // Homebrew no Apple Silicon (M1/M2)
        "/usr/local/bin/ffmpeg",    // Homebrew no Intel Mac
        "ffmpeg",                   // PATH padrão
        "/usr/bin/ffmpeg"          // Sistema
    ];

    for (const ffmpegPath of ffmpegPaths) {
        try {
            console.log(`🔍 Tentando caminho: ${ffmpegPath}`);
            const { stdout } = await execFileAsync(ffmpegPath, ["-version"]);

            // Extrair versão do output
            const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
            const version = versionMatch ? versionMatch[1] : "unknown";

            console.log("✅ FFmpeg encontrado:", { path: ffmpegPath, version });

            return {
                isAvailable: true,
                version: `${version} (${ffmpegPath})`
            };
        } catch (error) {
            console.log(`❌ Falha no caminho ${ffmpegPath}:`, error instanceof Error ? error.message : String(error));
            continue;
        }
    }



    return {
        isAvailable: false,
        error: "FFmpeg não encontrado. Instale ffmpeg-static ou FFmpeg no sistema."
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
        const encoders = stdout.split('\n')
            .filter(line => line.includes('V.....'))
            .map(line => line.trim())
            .slice(0, 10); // Limitar para não sobrecarregar

        const { stdout: decoderOutput } = await execAsync("ffmpeg -decoders");
        const decoders = decoderOutput.split('\n')
            .filter(line => line.includes('V.....'))
            .map(line => line.trim())
            .slice(0, 10); // Limitar para não sobrecarregar

        return { encoders, decoders };
    } catch (error) {
        return {
            encoders: [],
            decoders: [],
            error: error instanceof Error ? error.message : String(error)
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
                    "Ou clique no botão para instalar automaticamente"
                ]
            };
        } catch {
            return {
                canAutoInstall: false,
                instructions: [
                    "Para instalar FFmpeg no macOS:",
                    "1. Instale Homebrew: https://brew.sh",
                    "2. Execute: brew install ffmpeg",
                    "3. Reinicie o aplicativo"
                ]
            };
        }
    } else if (platform === "win32") {
        return {
            canAutoInstall: false,
            instructions: [
                "Para instalar FFmpeg no Windows:",
                "1. Baixe FFmpeg de: https://ffmpeg.org/download.html",
                "2. Extraia e adicione ao PATH do sistema",
                "3. Reinicie o aplicativo"
            ]
        };
    } else {
        return {
            canAutoInstall: false,
            instructions: [
                "Para instalar FFmpeg no Linux:",
                "Ubuntu/Debian: sudo apt install ffmpeg",
                "CentOS/RHEL: sudo yum install ffmpeg",
                "Arch: sudo pacman -S ffmpeg"
            ]
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
                message: "Instalação automática disponível apenas no macOS"
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
                message: `FFmpeg instalado com sucesso! Versão: ${ffmpegCheck.version}`
            };
        } else {
            return {
                success: false,
                message: "FFmpeg foi instalado mas não está funcionando corretamente"
            };
        }
    } catch (error) {
        console.error("Erro ao instalar FFmpeg:", error);
        return {
            success: false,
            message: `Erro na instalação: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}