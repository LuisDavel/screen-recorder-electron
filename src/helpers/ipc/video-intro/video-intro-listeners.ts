import { ipcMain, BrowserWindow } from "electron";
import { existsSync, statSync, writeFileSync, unlinkSync } from "fs";
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
    console.log("🔍 DEBUG: Iniciando findSystemFFmpeg");

    const systemPaths = [
        "/opt/homebrew/bin/ffmpeg", // Homebrew Apple Silicon
        "/usr/local/bin/ffmpeg",    // Homebrew Intel
        "ffmpeg"                    // PATH
    ];

    console.log("🔍 DEBUG: Caminhos a testar:", systemPaths);

    for (const path of systemPaths) {
        console.log(`🔍 DEBUG: Testando caminho: ${path}`);
        const works = await testFFmpegPath(path);
        console.log(`🔍 DEBUG: Resultado do teste para ${path}:`, works);

        if (works) {
            console.log(`✅ DEBUG: FFmpeg encontrado e funcionando: ${path}`);
            return path;
        } else {
            console.log(`❌ DEBUG: Caminho não funciona: ${path}`);
        }
    }

    console.log("❌ DEBUG: Nenhum caminho funcionou, retornando null");
    return null;
}

export function addVideoIntroEventListeners(mainWindow: BrowserWindow) {
    // Verificar se existe vídeo de introdução para uma instituição
    ipcMain.handle(
        VIDEO_INTRO_CHECK_INTRO_CHANNEL,
        async (event, institutionName: string) => {
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
                return { hasIntro: false, path: null, error: error.message };
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
                error: error.message,
                institutions: []
            };
        }
    });

    // Concatenar vídeo de introdução com gravação
    ipcMain.handle(
        VIDEO_INTRO_CONCATENATE_CHANNEL,
        async (
            event,
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
                console.log("🎬 DEBUG: Procurando FFmpeg do sistema...");
                console.log("🎬 DEBUG: Função findSystemFFmpeg existe:", typeof findSystemFFmpeg);

                const ffmpegPath = await findSystemFFmpeg();
                console.log("🎬 DEBUG: Resultado de findSystemFFmpeg:", ffmpegPath);

                if (!ffmpegPath) {
                    console.error("❌ FFmpeg não encontrado em nenhum caminho do sistema");
                    return {
                        success: false,
                        message: "FFmpeg não encontrado. Instale com: brew install ffmpeg",
                    };
                }

                console.log("🎬 DEBUG: Usando FFmpeg final:", ffmpegPath);
                console.log("🎬 DEBUG: Tipo do ffmpegPath:", typeof ffmpegPath);

                // FORÇAR uso do FFmpeg do sistema (debug)
                const forcedFFmpegPath = "/opt/homebrew/bin/ffmpeg";
                console.log("🎬 DEBUG: FORÇANDO uso do FFmpeg:", forcedFFmpegPath);

                // Verificar se o caminho forçado existe
                if (!existsSync(forcedFFmpegPath)) {
                    console.error("❌ DEBUG: Caminho forçado não existe:", forcedFFmpegPath);
                    return {
                        success: false,
                        message: "FFmpeg não encontrado no caminho esperado: " + forcedFFmpegPath,
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

                console.log("🎬 Executando FFmpeg com filtro concat:", {
                    ffmpegPath: forcedFFmpegPath,
                    args: ffmpegArgs,
                    ffmpegExists: existsSync(forcedFFmpegPath)
                });

                // Verificação final antes de executar
                if (!existsSync(forcedFFmpegPath)) {
                    console.error("❌ Arquivo FFmpeg não existe:", forcedFFmpegPath);
                    return {
                        success: false,
                        message: `Arquivo FFmpeg não encontrado: ${forcedFFmpegPath}`,
                    };
                }

                let stdout, stderr;
                try {
                    console.log("🎬 Iniciando execução do FFmpeg...");
                    const result = await execFileAsync(forcedFFmpegPath, ffmpegArgs, {
                        timeout: 60000, // 60 segundos timeout
                        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                    });
                    stdout = result.stdout;
                    stderr = result.stderr;
                    console.log("✅ FFmpeg executado com sucesso");
                } catch (error) {
                    console.error("❌ Erro na concatenação:", {
                        error: error.message,
                        code: error.code,
                        path: error.path,
                        spawnargs: error.spawnargs
                    });
                    return {
                        success: false,
                        message: `Erro na concatenação: ${error.message}. Código: ${error.code}`,
                    };
                }

                console.log("FFmpeg stdout:", stdout);
                if (stderr) {
                    console.log("FFmpeg stderr:", stderr);
                }

                // Verificar se o arquivo de saída foi criado
                console.log("🔍 Verificando se arquivo de saída foi criado:", outputPath);
                const outputExists = existsSync(outputPath);
                console.log("🔍 Arquivo de saída existe:", outputExists);

                if (outputExists) {
                    const stats = statSync(outputPath);
                    console.log("📊 Tamanho do arquivo final:", stats.size, "bytes");

                    return {
                        success: true,
                        message: "Vídeos concatenados com sucesso",
                        outputPath,
                    };
                } else {
                    console.error("❌ Arquivo de saída não foi criado pelo FFmpeg");
                    return {
                        success: false,
                        message: "Arquivo de saída não foi criado pelo FFmpeg",
                    };
                }
            } catch (error) {
                console.error("Erro ao concatenar vídeos:", error);
                return {
                    success: false,
                    message: `Erro ao concatenar vídeos: ${error.message}`,
                };
            }
        }
    );
}