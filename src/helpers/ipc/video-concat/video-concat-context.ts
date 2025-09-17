import { contextBridge, ipcRenderer } from "electron";

export function exposeVideoConcatContext() {
    try {
        contextBridge.exposeInMainWorld("videoConcatAPI", {
            // Concatenar vídeos automaticamente após gravação
            autoConcatenate: (options: {
                recordedVideoPath: string;
                outputPath?: string;
            }) => ipcRenderer.invoke("video-concat:auto-concatenate", options),

            // Concatenar vídeos automaticamente após gravação (método alternativo)
            autoConcatenateAlt: (options: {
                recordedVideoPath: string;
                outputPath?: string;
            }) => ipcRenderer.invoke("video-concat:auto-concatenate-alt", options),

            // Concatenar vídeos automaticamente após gravação (método robusto)
            autoConcatenateRobust: (options: {
                recordedVideoPath: string;
                outputPath?: string;
            }) => ipcRenderer.invoke("video-concat:auto-concatenate-robust", options),

            // Concatenar vídeos manualmente
            concatenateVideos: (options: {
                remoteVideoUrl: string;
                localVideoPath: string;
                outputPath: string;
            }) => ipcRenderer.invoke("video-concat:concatenate", options),

            // Verificar se FFmpeg está disponível
            checkFFmpeg: () => ipcRenderer.invoke("video-concat:check-ffmpeg"),

            // Escutar progresso da concatenação
            onProgress: (callback: (progress: string) => void) => {
                ipcRenderer.on("video-concat:progress", (_event, progress) => {
                    callback(progress);
                });
            },

            // Remover listener de progresso
            removeProgressListener: () => {
                ipcRenderer.removeAllListeners("video-concat:progress");
            },

            // Função de teste
            test: () => ipcRenderer.invoke("video-concat:test"),

            // Teste direto do handler robusto
            testRobust: () => ipcRenderer.invoke("video-concat:auto-concatenate-robust", {
                recordedVideoPath: "/tmp/test.mp4",
                outputPath: "/tmp/test-output.mp4"
            }),

            // Debug de caminhos do FFmpeg
            debugPaths: () => ipcRenderer.invoke("video-concat:debug-paths"),

            // Debug específico de 3 vídeos
            debugThreeVideos: () => ipcRenderer.invoke("video-concat:debug-three-videos")
        });

        console.log("✅ Video concat context exposto com sucesso");
    } catch (error) {
        console.error("❌ Erro ao expor video concat context:", error);
        throw error;
    }
}