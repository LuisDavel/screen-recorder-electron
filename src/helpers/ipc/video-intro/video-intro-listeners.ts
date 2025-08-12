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
import { VideoIntroManager, HOSPITAL_OUTRO_MAPPING } from "../../video-intro-manager";

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
                // Vídeo de introdução sempre existe (me.mp4)
                const introPath = VideoIntroManager.getIntroVideoPath();
                const fullIntroPath = join(process.cwd(), introPath);
                const introExists = existsSync(fullIntroPath);

                // Verificar vídeo de encerramento
                const outroPath = VideoIntroManager.getOutroVideoPath(institutionName);
                let outroExists = false;
                let fullOutroPath = null;

                if (outroPath) {
                    fullOutroPath = join(process.cwd(), outroPath);
                    outroExists = existsSync(fullOutroPath);
                }

                return {
                    hasIntro: introExists,
                    introPath: introExists ? fullIntroPath : null,
                    hasOutro: outroExists,
                    outroPath: outroExists ? fullOutroPath : null,
                    institutionName
                };
            } catch (error) {
                console.error("Erro ao verificar vídeos:", error);
                return {
                    hasIntro: false,
                    introPath: null,
                    hasOutro: false,
                    outroPath: null,
                    error: (error as Error).message
                };
            }
        }
    );

    // Obter lista de instituições disponíveis
    ipcMain.handle(VIDEO_INTRO_GET_AVAILABLE_CHANNEL, async () => {
        try {
            const institutions = VideoIntroManager.getAvailableInstitutions();
            const availableInstitutions = [];

            // Verificar vídeo de introdução (sempre me.mp4)
            const introPath = VideoIntroManager.getIntroVideoPath();
            const fullIntroPath = join(process.cwd(), introPath);
            const hasIntro = existsSync(fullIntroPath);

            for (const institution of institutions) {
                const outroPath = VideoIntroManager.getOutroVideoPath(institution);
                let hasOutro = false;
                let fullOutroPath = null;

                if (outroPath) {
                    fullOutroPath = join(process.cwd(), outroPath);
                    hasOutro = existsSync(fullOutroPath);
                }

                availableInstitutions.push({
                    name: institution,
                    hasIntro,
                    introPath: hasIntro ? fullIntroPath : null,
                    hasOutro,
                    outroPath: hasOutro ? fullOutroPath : null,
                    outroVideoFile: HOSPITAL_OUTRO_MAPPING[institution]
                });
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
                includeIntro = true,
                includeOutro = false,
            }: {
                institutionName: string;
                recordedVideoPath: string;
                outputPath: string;
                includeIntro?: boolean;
                includeOutro?: boolean;
            }
        ) => {
            try {
                console.log("🎬 IPC - Concatenação de vídeos solicitada:", {
                    institutionName,
                    recordedVideoPath,
                    outputPath,
                    includeIntro,
                    includeOutro,
                });

                let fullIntroPath = null;
                let fullOutroPath = null;

                // Verificar vídeo de introdução se solicitado
                if (includeIntro) {
                    const introPath = VideoIntroManager.getIntroVideoPath();
                    fullIntroPath = join(process.cwd(), introPath);

                    if (!existsSync(fullIntroPath)) {
                        return {
                            success: false,
                            message: `Arquivo de introdução não existe: ${fullIntroPath}`,
                        };
                    }
                }

                // Verificar vídeo de encerramento se solicitado
                if (includeOutro) {
                    const outroPath = VideoIntroManager.getOutroVideoPath(institutionName);

                    if (!outroPath) {
                        return {
                            success: false,
                            message: `Vídeo de encerramento não encontrado para ${institutionName}`,
                        };
                    }

                    fullOutroPath = join(process.cwd(), outroPath);

                    if (!existsSync(fullOutroPath)) {
                        return {
                            success: false,
                            message: `Arquivo de encerramento não existe: ${fullOutroPath}`,
                        };
                    }
                }

                if (!existsSync(recordedVideoPath)) {
                    return {
                        success: false,
                        message: `Arquivo de gravação não existe: ${recordedVideoPath}`,
                    };
                }

                console.log("🎬 Arquivos verificados:", {
                    introPath: fullIntroPath,
                    introExists: fullIntroPath ? existsSync(fullIntroPath) : false,
                    outroPath: fullOutroPath,
                    outroExists: fullOutroPath ? existsSync(fullOutroPath) : false,
                    recordedPath: recordedVideoPath,
                    recordedExists: existsSync(recordedVideoPath),
                    outputPath
                });

                // Verificar informações dos arquivos
                if (fullIntroPath && existsSync(fullIntroPath)) {
                    const introStats = statSync(fullIntroPath);
                    console.log("📊 Arquivo de introdução:", {
                        size: introStats.size,
                        path: fullIntroPath
                    });
                }

                if (fullOutroPath && existsSync(fullOutroPath)) {
                    const outroStats = statSync(fullOutroPath);
                    console.log("📊 Arquivo de encerramento:", {
                        size: outroStats.size,
                        path: fullOutroPath
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

                // Construir argumentos do FFmpeg baseado nos vídeos incluídos
                const inputs = [];
                const filterParts = [];
                let inputIndex = 0;
                let concatInputs = "";

                // Adicionar vídeo de introdução se solicitado
                if (fullIntroPath) {
                    inputs.push("-i", fullIntroPath);
                    filterParts.push(`[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${inputIndex}]`);
                    concatInputs += `[v${inputIndex}][${inputIndex}:a]`;
                    inputIndex++;
                }

                // Adicionar vídeo gravado
                inputs.push("-i", recordedVideoPath);
                filterParts.push(`[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${inputIndex}]`);
                concatInputs += `[v${inputIndex}][${inputIndex}:a]`;
                inputIndex++;

                // Adicionar vídeo de encerramento se solicitado
                if (fullOutroPath) {
                    inputs.push("-i", fullOutroPath);
                    filterParts.push(`[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${inputIndex}]`);
                    concatInputs += `[v${inputIndex}][${inputIndex}:a]`;
                    inputIndex++;
                }

                // Construir filtro de concatenação
                const filterComplex = filterParts.join(";") + ";" +
                    `${concatInputs}concat=n=${inputIndex}:v=1:a=1[outv][outa]`;

                const ffmpegArgs = [
                    ...inputs,                     // Todos os inputs
                    "-filter_complex",             // Usar filtro complexo
                    filterComplex,                 // Filtro de normalização e concatenação
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
                console.log("🔍 DEBUG - Argumentos do FFmpeg:", {
                    ffmpegPath,
                    inputs: inputs.length / 2, // Cada input tem 2 elementos (-i e path)
                    filterComplex,
                    totalInputs: inputIndex,
                    includeIntro,
                    includeOutro,
                    fullIntroPath,
                    fullOutroPath
                });
                console.log("🔍 DEBUG - Comando completo:", [ffmpegPath, ...ffmpegArgs].join(" "));

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