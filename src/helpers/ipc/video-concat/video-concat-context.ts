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
      testRobust: () =>
        ipcRenderer.invoke("video-concat:auto-concatenate-robust", {
          recordedVideoPath: "/tmp/test.mp4",
          outputPath: "/tmp/test-output.mp4",
        }),

      // Debug de caminhos do FFmpeg
      debugPaths: () => ipcRenderer.invoke("video-concat:debug-paths"),

      // Debug específico de 3 vídeos
      debugThreeVideos: () =>
        ipcRenderer.invoke("video-concat:debug-three-videos"),

      // Testar apenas o primeiro vídeo
      testFirstVideo: (options?: { outputPath?: string }) =>
        ipcRenderer.invoke("video-concat:test-first-video", options || {}),

      // MÉTODOS OTIMIZADOS PARA VELOCIDADE MÁXIMA
      // Concatenação ultra-rápida (recomendado para produção)
      fastConcatenate: (options: {
        recordedVideoPath: string;
        outputPath?: string;
        introVideoUrl?: string;
        outroVideoUrl?: string;
      }) => ipcRenderer.invoke("video-concat:fast-concatenate", options),

      // Método apenas copy (instantâneo, sem recodificação)
      ultraFastCopy: (options: {
        recordedVideoPath: string;
        outputPath?: string;
        introVideoUrl?: string;
        outroVideoUrl?: string;
      }) => ipcRenderer.invoke("video-concat:ultra-fast-copy", options),

      // DIAGNÓSTICO: Testar acesso FFmpeg a URLs S3
      testS3Access: (options: { videoUrl: string; testName: string }) =>
        ipcRenderer.invoke("video-concat:test-s3-access", options),

      // MÉTODO SIMPLES (mais confiável para resolução de problemas)
      simpleConcatenate: (options: {
        recordedVideoPath: string;
        outputPath?: string;
        introVideoUrl?: string;
        outroVideoUrl?: string;
        introVideoKey?: string;
        outroVideoKey?: string;
        s3Config?: any;
      }) => ipcRenderer.invoke("video-concat:simple-concatenate", options),
    });

    console.log("✅ Video concat context exposto com sucesso");
  } catch (error) {
    console.error("❌ Erro ao expor video concat context:", error);
    throw error;
  }
}
