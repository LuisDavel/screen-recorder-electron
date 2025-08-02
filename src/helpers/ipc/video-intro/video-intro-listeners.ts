import { ipcMain, BrowserWindow } from "electron";
import { existsSync, statSync } from "fs";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import {
    VIDEO_INTRO_CONCATENATE_CHANNEL,
    VIDEO_INTRO_GET_AVAILABLE_CHANNEL,
    VIDEO_INTRO_CHECK_INTRO_CHANNEL,
} from "./video-intro-channels";
import { VideoIntroManager, HOSPITAL_INTRO_MAPPING } from "../../video-intro-manager";

const execFileAsync = promisify(execFile);

// Função para testar se um caminho do FFmpeg funciona
async function testFFmpegPath(path: string): Promise<boolean> {
    try {
        await execFileAsync(path, ["-version"], { timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}

// Função para encontrar FFmpeg do sistema
async function findSystemFFmpeg(): Promise<string | null> {
    const systemPaths = [
        "/opt/homebrew/bin/ffmpeg", // Homebrew Apple Silicon
        "/usr/local/bin/ffmpeg",    // Homebrew Intel
        "ffmpeg"                    // PATH
    ];

    for (const path of systemPaths) {
        const works = await testFFmpegPath(path);
        if (works) {
            return path;
        }
    }

    return null;
}

export function addVideoIntroEventListeners(_mainWindow: BrowserWindow) {
    // Verificar se existe vídeo de introdução para uma instituição
    ipcMain.handle(
        VIDEO_INTRO_CHECK_INTRO_CHANNEL,
        async (_event, institutionName: string) => {
            try {
                const introPath = VideoIntroManager.getIntroVideoPath(institutionName);

                if (!introPath) {
                    return { hasIntro: false, path: null };
                }

                const fullPath = join(process.cwd(), introPath);
                const exists = existsSync(fullPath);

                return {
                    hasIntro: exists,
                    path: exists ? fullPath : null,
                    institutionName
                };
            } catch (error) {
                console.error("Erro ao verificar vídeo de introdução:", error);
                return { hasIntro: false, path: null, error: (error as Error).message };
            }
        }
    );

    // Obter lista de instituições disponíveis
    ipcMain.handle(VIDEO_INTRO_GET_AVAILABLE_CHANNEL, async () => {
        try {
            const institutions = VideoIntroManager.getAvailableInstitutions();
            const availableInstitutions = [];

            for (const institution of institutions) {
                const introPath = VideoIntroManager.getIntroVideoPath(institution);
                if (introPath) {
                    const fullPath = join(process.cwd(), introPath);
                    if (existsSync(fullPath)) {
                        availableInstitutions.push({
                            name: institution,
                            videoPath: fullPath,
                            videoFile: HOSPITAL_INTRO_MAPPING[institution]
                        });
                    }
                }
            }

            return {
                success: true,
                institutions: availableInstitutions
            };
        } catch (error) {
            console.error("Erro ao obter instituições disponíveis:", error);
            return {
                success: false,
                error: (error as Error).message,
                institutions: []
            };
        }
    });

    // Concatenar vídeo de introdução com gravação
    ipcMain.handle(
        VIDEO_INTRO_CONCATENATE_CHANNEL,
        async (
            _event,
            {
                institutionName,
                recordedVideoPath,
                outputPath,
            }: {
                institutionName: string;
                recordedVideoPath: string;
                outputPath: string;
            }
        ) => {
            try {
                console.log("🎬 IPC - Concatenação de vídeos solicitada:", {
                    institutionName,
                    recordedVideoPath,
                    outputPath,
                });

                const introPath = VideoIntroManager.getIntroVideoPath(institutionName);

                if (!introPath) {
                    return {
                        success: false,
                        message: `Vídeo de introdução não encontrado para ${institutionName}`,
                    };
                }

                const fullIntroPath = join(process.cwd(), introPath);

                if (!existsSync(fullIntroPath)) {
                    return {
                        success: false,
                        message: `Arquivo de introdução não existe: ${fullIntroPath}`,
                    };
                }

                if (!existsSync(recordedVideoPath)) {
                    return {
                        success: false,
                        message: `Arquivo de gravação não existe: ${recordedVideoPath}`,
                    };
                }

                console.log("🎬 Arquivos verificados:", {
                    introPath: fullIntroPath,
                    introExists: existsSync(fullIntroPath),
                    recordedPath: recordedVideoPath,
                    recordedExists: existsSync(recordedVideoPath),
                    outputPath
                });

                // Verificar informações dos arquivos
                if (existsSync(fullIntroPath)) {
                    const introStats = statSync(fullIntroPath);
                    console.log("📊 Arquivo de introdução:", {
                        size: introStats.size,
                        path: fullIntroPath
                    });
                }

                if (existsSync(recordedVideoPath)) {
                    const recordedStats = statSync(recordedVideoPath);
                    console.log("📊 Arquivo gravado:", {
                        size: recordedStats.size,
                        path: recordedVideoPath
                    });
                }

                // Encontrar FFmpeg do sistema
                const ffmpegPath = await findSystemFFmpeg();

                if (!ffmpegPath) {
                    return {
                        success: false,
                        message: "FFmpeg não encontrado. Instale com: brew install ffmpeg",
                    };
                }

                // Usar filtro concat com normalização de resolução
                // Normaliza ambos os vídeos para 2560x1080 (resolução do vídeo gravado)
                const ffmpegArgs = [
                    "-i", fullIntroPath,           // Input 1: vídeo de introdução
                    "-i", recordedVideoPath,       // Input 2: vídeo gravado
                    "-filter_complex",             // Usar filtro complexo
                    // Normalizar ambos os vídeos para 1920x1080 (Full HD - resolução padrão)
                    "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];" +
                    "[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];" +
                    // Concatenar os vídeos normalizados
                    "[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[outv][outa]",
                    "-map", "[outv]",              // Mapear vídeo de saída
                    "-map", "[outa]",              // Mapear áudio de saída
                    "-c:v", "libx264",             // Codec de vídeo H.264
                    "-c:a", "aac",                 // Codec de áudio AAC
                    "-movflags", "+faststart",     // Otimização para streaming
                    "-preset", "medium",           // Preset de qualidade/velocidade
                    "-crf", "23",                  // Qualidade (0-51, menor = melhor)
                    "-y",                          // Sobrescrever arquivo de saída
                    outputPath                     // Arquivo de saída
                ];

                console.log("🎬 Executando concatenação de vídeos...");

                let stdout, stderr;
                try {
                    const result = await execFileAsync(ffmpegPath, ffmpegArgs, {
                        timeout: 60000, // 60 segundos timeout
                        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                    });
                    stdout = result.stdout;
                    stderr = result.stderr;
                } catch (error) {
                    const execError = error as unknown;
                    console.error("❌ Erro na concatenação:", {
                        error: execError.message,
                        code: execError.code,
                        path: execError.path,
                        spawnargs: execError.spawnargs
                    });
                    return {
                        success: false,
                        message: `Erro na concatenação: ${execError.message}. Código: ${execError.code}`,
                    };
                }

                // Verificar se o arquivo de saída foi criado
                if (existsSync(outputPath)) {
                    return {
                        success: true,
                        message: "Vídeos concatenados com sucesso",
                        outputPath,
                    };
                } else {
                    return {
                        success: false,
                        message: "Arquivo de saída não foi criado",
                    };
                }
            } catch (error) {
                console.error("Erro ao concatenar vídeos:", error);
                return {
                    success: false,
                    message: `Erro ao concatenar vídeos: ${(error as Error).message}`,
                };
            }
        }
    );
}