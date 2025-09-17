import { ipcMain, BrowserWindow } from "electron";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";

// Função para encontrar o caminho correto do FFmpeg
function getFFmpegPath(): string | null {
    console.log('🔍 ffmpeg-static retornou:', ffmpegStatic);

    // Se ffmpeg-static retornou um caminho válido, usar ele
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
        console.log('✅ FFmpeg encontrado via ffmpeg-static:', ffmpegStatic);
        return ffmpegStatic;
    }

    // Caminhos alternativos para procurar o FFmpeg
    const possiblePaths = [
        // Caminho direto no node_modules
        path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
        // Caminho no diretório do app (para produção)
        path.join(__dirname, '..', '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
        // Caminho relativo ao processo atual
        path.join(process.resourcesPath || process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
        // FFmpeg do sistema (se instalado)
        'ffmpeg'
    ];

    console.log('🔍 Procurando FFmpeg nos caminhos:', possiblePaths);

    for (const testPath of possiblePaths) {
        console.log('🔍 Testando caminho:', testPath);
        if (fs.existsSync(testPath)) {
            console.log('✅ FFmpeg encontrado em:', testPath);
            return testPath;
        }
    }

    console.error('❌ FFmpeg não encontrado em nenhum caminho');
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
        ipcMain.handle("video-concat:auto-concatenate-robust", async (_event, options: {
            recordedVideoPath: string;
            outputPath?: string;
        }) => {
            return new Promise(async (resolve, reject) => {
                const { recordedVideoPath, outputPath } = options;

                // URLs dos vídeos remotos
                const remoteVideoUrl1 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4';
                const remoteVideoUrl2 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

                console.log('🎬 Iniciando concatenação ROBUSTA com 3 vídeos...');
                console.log('📍 FFmpeg path:', ffmpegPath);
                console.log('🌐 Vídeo remoto 1 (início):', remoteVideoUrl1);
                console.log('📁 Vídeo gravado (meio):', recordedVideoPath);
                console.log('🌐 Vídeo remoto 2 (fim):', remoteVideoUrl2);

                // Verificar se todas as URLs estão definidas
                if (!remoteVideoUrl1) {
                    const error = 'URL do vídeo remoto 1 não está definida';
                    console.error('❌', error);
                    reject(new Error(error));
                    return;
                }

                if (!remoteVideoUrl2) {
                    const error = 'URL do vídeo remoto 2 não está definida';
                    console.error('❌', error);
                    reject(new Error(error));
                    return;
                }

                // Verificar se FFmpeg está disponível
                if (!ffmpegPath) {
                    const error = 'FFmpeg não está disponível (ffmpeg-static retornou null)';
                    console.error('❌', error);
                    reject(new Error(error));
                    return;
                }

                // Verificar se o executável FFmpeg existe
                if (!fs.existsSync(ffmpegPath)) {
                    const error = `FFmpeg não encontrado no caminho: ${ffmpegPath}`;
                    console.error('❌', error);
                    reject(new Error(error));
                    return;
                }

                // Verificar se o arquivo gravado existe
                if (!fs.existsSync(recordedVideoPath)) {
                    const error = `Arquivo gravado não encontrado: ${recordedVideoPath}`;
                    console.error('❌', error);
                    reject(new Error(error));
                    return;
                }

                // Gerar caminho de saída se não fornecido
                let finalOutputPath = outputPath;
                if (!finalOutputPath) {
                    const dir = path.dirname(recordedVideoPath);
                    const name = path.basename(recordedVideoPath, path.extname(recordedVideoPath));
                    finalOutputPath = path.join(dir, `${name}-FINAL-3VIDEOS.mp4`);
                }

                console.log('📁 CAMINHO FINAL:', finalOutputPath);

                // Método ROBUSTO: Normalizar e concatenar 3 vídeos (preservando duração)
                const ffmpegArgs = [
                    '-i', remoteVideoUrl1,     // Input 0: vídeo remoto 1 (início)
                    '-i', recordedVideoPath,   // Input 1: vídeo gravado (meio)
                    '-i', remoteVideoUrl2,     // Input 2: vídeo remoto 2 (fim)
                    '-filter_complex',
                    // Normalizar todos os 3 vídeos SEM forçar FPS (preserva duração original)
                    '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setpts=PTS-STARTPTS[v0];' +
                    '[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setpts=PTS-STARTPTS[v1];' +
                    '[2:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setpts=PTS-STARTPTS[v2];' +
                    '[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS[a0];' +
                    '[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS[a1];' +
                    '[2:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS[a2];' +
                    '[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[outv][outa]',
                    '-map', '[outv]',
                    '-map', '[outa]',
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-preset', 'medium',
                    '-crf', '23',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    '-avoid_negative_ts', 'make_zero',
                    '-fflags', '+genpts',
                    '-vsync', 'cfr',
                    '-y',
                    finalOutputPath
                ];

                console.log('🔧 Comando FFmpeg completo:');
                console.log('🔧 Executável:', ffmpegPath);
                console.log('🔧 Argumentos:', ffmpegArgs);
                console.log('🔧 Comando completo:', `${ffmpegPath} ${ffmpegArgs.join(' ')}`);

                // Função para tentar concatenação com fallback
                const tryFFmpegConcatenation = (args: string[], method: string): Promise<unknown> => {
                    return new Promise((resolveFFmpeg, rejectFFmpeg) => {
                        console.log(`🎬 Tentando método: ${method}`);
                        console.log(`🔧 Args do método ${method}:`, args);
                        console.log(`🔧 Número de inputs: ${args.filter(arg => arg === '-i').length}`);

                        const ffmpegProcess: ChildProcess = spawn(ffmpegPath!, args);
                        let stderr = '';
                        let hasError = false;

                        // Capturar progresso
                        ffmpegProcess.stderr?.on('data', (data: Buffer) => {
                            const output = data.toString();
                            stderr += output;

                            // Enviar progresso para o renderer
                            mainWindow.webContents.send('video-concat:progress', output);

                            if (output.includes('frame=') || output.includes('time=')) {
                                console.log('📊 Progresso:', output.trim());
                            }
                        });

                        // Quando terminar
                        ffmpegProcess.on('close', (code: number | null) => {
                            console.log(`🏁 FFmpeg (${method}) finalizado com código:`, code);

                            if (code === 0 && !hasError) {
                                if (fs.existsSync(finalOutputPath)) {
                                    const stats = fs.statSync(finalOutputPath);
                                    console.log('✅ Concatenação concluída!');
                                    console.log('📊 Tamanho:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

                                    resolveFFmpeg({
                                        success: true,
                                        outputPath: finalOutputPath,
                                        message: `Vídeo concatenado com sucesso usando ${method}!`,
                                        fileSize: stats.size,
                                        method: method
                                    });
                                } else {
                                    rejectFFmpeg(new Error(`Arquivo não foi criado (${method})`));
                                }
                            } else {
                                console.error(`❌ Erro FFmpeg (${method}):`, stderr.slice(-500));
                                rejectFFmpeg(new Error(`FFmpeg falhou (${method}): ${stderr.slice(-200)}`));
                            }
                        });

                        // Tratar erros
                        ffmpegProcess.on('error', (error: Error) => {
                            hasError = true;
                            console.error(`❌ Erro processo (${method}):`, error);
                            rejectFFmpeg(new Error(`Erro (${method}): ${error.message}`));
                        });
                    });
                };

                // Tentar método robusto primeiro
                try {
                    const result = await tryFFmpegConcatenation(ffmpegArgs, 'Robusto com Normalização');
                    resolve(result);
                } catch (error) {
                    console.log('⚠️ Método robusto falhou, tentando método simples...');

                    // Método simples como fallback (3 vídeos)
                    const simpleArgs = [
                        '-i', remoteVideoUrl1,
                        '-i', recordedVideoPath,
                        '-i', remoteVideoUrl2,
                        '-filter_complex', '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]',
                        '-map', '[outv]',
                        '-map', '[outa]',
                        '-c:v', 'libx264',
                        '-c:a', 'aac',
                        '-preset', 'ultrafast',
                        '-y',
                        finalOutputPath
                    ];

                    try {
                        const result = await tryFFmpegConcatenation(simpleArgs, 'Simples');
                        resolve(result);
                    } catch (simpleError) {
                        console.log('⚠️ Método simples falhou, tentando método de cópia...');

                        // Método de cópia como último recurso (3 vídeos)
                        const copyArgs = [
                            '-i', remoteVideoUrl1,
                            '-i', recordedVideoPath,
                            '-i', remoteVideoUrl2,
                            '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1[outv]; [0:a][1:a][2:a]concat=n=3:a=1[outa]',
                            '-map', '[outv]',
                            '-map', '[outa]',
                            '-c:v', 'copy',
                            '-c:a', 'copy',
                            '-y',
                            finalOutputPath
                        ];

                        try {
                            const result = await tryFFmpegConcatenation(copyArgs, 'Cópia');
                            resolve(result);
                        } catch (copyError) {
                            reject(new Error(`Todos os métodos falharam. Último erro: ${copyError}`));
                        }
                    }
                }

                // Remover o código antigo que estava aqui


            });
        });
        console.log("✅ Handler auto-concatenate-robust registrado");

        // Handler para verificar FFmpeg
        console.log("📡 Registrando handler: video-concat:check-ffmpeg");
        ipcMain.handle("video-concat:check-ffmpeg", async () => {
            try {
                console.log('🔍 Verificando FFmpeg...');
                console.log('🔍 FFmpeg path:', ffmpegPath);

                if (!ffmpegPath) {
                    return {
                        available: false,
                        message: 'FFmpeg não está disponível (ffmpeg-static retornou null)',
                        path: null
                    };
                }

                if (!fs.existsSync(ffmpegPath)) {
                    return {
                        available: false,
                        message: `FFmpeg não encontrado no caminho: ${ffmpegPath}`,
                        path: ffmpegPath
                    };
                }

                return new Promise((resolve) => {
                    const testProcess: ChildProcess = spawn(ffmpegPath, ['-version']);

                    testProcess.on('close', (code: number | null) => {
                        resolve({
                            available: code === 0,
                            message: code === 0 ? 'FFmpeg disponível' : 'FFmpeg com erro',
                            path: ffmpegPath
                        });
                    });

                    testProcess.on('error', (error: Error) => {
                        resolve({
                            available: false,
                            message: `Erro ao executar FFmpeg: ${error.message}`,
                            path: ffmpegPath
                        });
                    });
                });
            } catch (error) {
                return {
                    available: false,
                    message: `Erro: ${error}`,
                    path: ffmpegPath
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
                    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
                    path.join(__dirname, '..', '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
                    path.join(process.resourcesPath || process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg')
                ],
                pathsExist: {}
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
        console.log("📡 Registrando handler de debug 3 vídeos: video-concat:debug-three-videos");
        ipcMain.handle("video-concat:debug-three-videos", async () => {
            const remoteVideoUrl1 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4';
            const remoteVideoUrl2 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

            const debugInfo = {
                remoteVideoUrl1,
                remoteVideoUrl2,
                ffmpegAvailable: !!ffmpegPath,
                ffmpegPath,
                testCommand: [
                    '-i', remoteVideoUrl1,
                    '-i', '/tmp/test.mp4',
                    '-i', remoteVideoUrl2,
                    '-filter_complex', '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]',
                    '-map', '[outv]',
                    '-map', '[outa]',
                    '-t', '10', // Apenas 10 segundos para teste
                    '-y',
                    '/tmp/test-3videos-debug.mp4'
                ]
            };

            console.log("🔍 Debug 3 vídeos:", debugInfo);
            return debugInfo;
        });
        console.log("✅ Handler de debug 3 vídeos registrado");

        console.log("✅ Video concat listeners registrados com sucesso");

        // Verificar se os handlers foram realmente registrados
        console.log("🔍 Verificando handlers registrados:");
        console.log("🔍 auto-concatenate-robust:", ipcMain.listenerCount("video-concat:auto-concatenate-robust") > 0);
        console.log("🔍 check-ffmpeg:", ipcMain.listenerCount("video-concat:check-ffmpeg") > 0);
        console.log("🔍 test:", ipcMain.listenerCount("video-concat:test") > 0);

        // Listar TODOS os handlers registrados
        console.log("🔍 TODOS os handlers IPC registrados:");
        const allHandlers = (ipcMain as unknown)._events;
        if (allHandlers) {
            Object.keys(allHandlers).forEach(key => {
                if (key.includes('video-concat')) {
                    console.log(`🔍 Handler encontrado: ${key}`);
                }
            });
        }

    } catch (error) {
        console.error("❌ Erro durante registro dos handlers:", error);
        throw error;
    }
}