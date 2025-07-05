import { CameraPosition, CameraSize } from "@/store/store-camera-config";

export interface VideoComposerOptions {
  screenStream: MediaStream;
  cameraStream?: MediaStream;
  audioStream?: MediaStream;
  cameraPosition?: CameraPosition;
  cameraSize?: CameraSize;
  outputWidth?: number;
  outputHeight?: number;
  frameRate?: number;
}

export interface CameraSettings {
  position: CameraPosition;
  size: CameraSize;
  width: number;
  height: number;
  x: number;
  y: number;
}

export class VideoComposer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement;
  private cameraVideo: HTMLVideoElement | null = null;
  private composedStream: MediaStream | null = null;
  private animationId: number | null = null;
  private timerId: NodeJS.Timeout | null = null;
  private isComposing = false;
  private isPageVisible = true;
  private useTimer = false;

  // Configurações padrão
  private options: Required<
    Omit<VideoComposerOptions, "cameraStream" | "audioStream">
  > & {
    cameraStream: MediaStream | null;
    audioStream: MediaStream | null;
  };

  constructor(options: VideoComposerOptions) {
    this.options = {
      screenStream: options.screenStream,
      cameraStream: options.cameraStream || null,
      audioStream: options.audioStream || null,
      cameraPosition: options.cameraPosition || "bottom-right",
      cameraSize: options.cameraSize || "medium",
      outputWidth: options.outputWidth || 1920,
      outputHeight: options.outputHeight || 1080,
      frameRate: options.frameRate || 30,
    };

    // Criar canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.options.outputWidth;
    this.canvas.height = this.options.outputHeight;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Não foi possível criar contexto do Canvas");
    }
    this.ctx = ctx;

    // Criar elementos de vídeo
    this.screenVideo = document.createElement("video");
    this.screenVideo.srcObject = this.options.screenStream;
    this.screenVideo.autoplay = true;
    this.screenVideo.muted = true;
    this.screenVideo.playsInline = true;

    if (this.options.cameraStream) {
      this.cameraVideo = document.createElement("video");
      this.cameraVideo.srcObject = this.options.cameraStream;
      this.cameraVideo.autoplay = true;
      this.cameraVideo.muted = true;
      this.cameraVideo.playsInline = true;
    }

    console.log("VideoComposer inicializado", {
      outputWidth: this.options.outputWidth,
      outputHeight: this.options.outputHeight,
      hasCameraStream: !!this.options.cameraStream,
      hasAudioStream: !!this.options.audioStream,
      cameraPosition: this.options.cameraPosition,
      cameraSize: this.options.cameraSize,
    });

    // Setup page visibility detection
    this.setupVisibilityDetection();

    // Setup background mode listeners
    this.setupBackgroundListeners();
  }

  // Calcular configurações da câmera
  private calculateCameraSettings(): CameraSettings {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Definir tamanhos da câmera baseados no canvas
    const sizeMap = {
      small: { width: canvasWidth * 0.15, height: canvasHeight * 0.15 },
      medium: { width: canvasWidth * 0.2, height: canvasHeight * 0.2 },
      large: { width: canvasWidth * 0.25, height: canvasHeight * 0.25 },
    };

    const { width, height } = sizeMap[this.options.cameraSize];
    const margin = 20;

    // Calcular posição
    let x = 0;
    let y = 0;

    switch (this.options.cameraPosition) {
      case "top-left":
        x = margin;
        y = margin;
        break;
      case "top-right":
        x = canvasWidth - width - margin;
        y = margin;
        break;
      case "bottom-left":
        x = margin;
        y = canvasHeight - height - margin;
        break;
      case "bottom-right":
        x = canvasWidth - width - margin;
        y = canvasHeight - height - margin;
        break;
    }

    return {
      position: this.options.cameraPosition,
      size: this.options.cameraSize,
      width: Math.round(width),
      height: Math.round(height),
      x: Math.round(x),
      y: Math.round(y),
    };
  }

  // Setup page visibility detection
  private setupVisibilityDetection(): void {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.isPageVisible = !document.hidden;

        if (!this.isPageVisible && this.isComposing) {
          console.warn(
            "Page hidden - switching to timer for background rendering",
          );
          this.switchToTimer();
        } else if (this.isPageVisible && this.isComposing && this.useTimer) {
          console.log("Page visible - switching back to requestAnimationFrame");
          this.switchToAnimationFrame();
        }
      });
    }
  }

  // Listen for background mode events from window
  private setupBackgroundListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("recording-background-mode", (event: Event) => {
        const enabled = (event as CustomEvent).detail.enabled;

        if (enabled && this.isComposing) {
          console.log("VideoComposer: Background mode enabled");
          this.switchToTimer();
          this.reduceRenderingOperations();
        } else if (!enabled && this.isComposing && this.useTimer) {
          console.log("VideoComposer: Background mode disabled");
          this.switchToAnimationFrame();
          this.resumeNormalRendering();
        }
      });
    }
  }

  // Reduce rendering operations for background mode
  private reduceRenderingOperations(): void {
    console.log(
      "VideoComposer: Reducing rendering operations for background mode",
    );
    // Reduce frame rate in background
    if (this.useTimer) {
      // Reduce to 15 FPS in background to save resources
      this.options.frameRate = Math.min(this.options.frameRate, 15);
    }
  }

  // Resume normal rendering operations
  private resumeNormalRendering(): void {
    console.log("VideoComposer: Resuming normal rendering operations");
    // Restore original frame rate
    this.options.frameRate = 30; // Reset to default
  }

  // Switch to timer-based rendering
  private switchToTimer(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.useTimer = true;
    this.startTimerRendering();
  }

  // Switch to requestAnimationFrame rendering
  private switchToAnimationFrame(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.useTimer = false;
    this.renderFrame();
  }

  // Timer-based rendering for background operation
  private startTimerRendering(): void {
    if (!this.isComposing || !this.useTimer) return;

    this.renderFrameContent();

    const frameInterval = 1000 / this.options.frameRate; // Convert FPS to interval
    this.timerId = setTimeout(() => {
      this.startTimerRendering();
    }, frameInterval);
  }

  // Extract frame rendering logic
  private renderFrameContent(): void {
    try {
      // Limpar canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Desenhar tela de fundo
      if (this.screenVideo.readyState >= 2) {
        this.ctx.drawImage(
          this.screenVideo,
          0,
          0,
          this.canvas.width,
          this.canvas.height,
        );
      }

      // Desenhar câmera se disponível
      if (this.cameraVideo && this.cameraVideo.readyState >= 2) {
        const cameraSettings = this.calculateCameraSettings();

        // Desenhar borda da câmera
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
          cameraSettings.x - 1,
          cameraSettings.y - 1,
          cameraSettings.width + 2,
          cameraSettings.height + 2,
        );

        // Desenhar câmera
        this.ctx.drawImage(
          this.cameraVideo,
          cameraSettings.x,
          cameraSettings.y,
          cameraSettings.width,
          cameraSettings.height,
        );
      }
    } catch (error) {
      console.error("Erro ao renderizar frame:", error);
    }
  }

  // Renderizar frame
  private renderFrame = () => {
    if (!this.isComposing || this.useTimer) return;

    this.renderFrameContent();

    // Continuar renderização apenas se usando requestAnimationFrame
    if (!this.useTimer) {
      this.animationId = requestAnimationFrame(this.renderFrame);
    }
  };

  // Iniciar composição
  public startComposition(): MediaStream {
    if (this.isComposing) {
      console.warn("Composição já está em andamento");
      return this.composedStream!;
    }

    console.log("Iniciando composição de vídeo");
    this.isComposing = true;

    // Aguardar vídeos carregarem
    const waitForVideos = () => {
      if (this.screenVideo.readyState >= 2) {
        if (!this.cameraVideo || this.cameraVideo.readyState >= 2) {
          // Start appropriate rendering method
          if (this.isPageVisible) {
            this.renderFrame();
          } else {
            console.log("VideoComposer: Starting in background mode");
            this.switchToTimer();
          }
        } else {
          requestAnimationFrame(waitForVideos);
        }
      } else {
        requestAnimationFrame(waitForVideos);
      }
    };

    waitForVideos();

    // Criar stream do canvas
    try {
      const videoStream = this.canvas.captureStream(this.options.frameRate);

      // Combinar vídeo com áudio se disponível
      if (this.options.audioStream) {
        const audioTracks = this.options.audioStream.getAudioTracks();
        const videoTracks = videoStream.getVideoTracks();

        this.composedStream = new MediaStream([...videoTracks, ...audioTracks]);

        console.log("Stream composto criado com áudio", {
          frameRate: this.options.frameRate,
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          totalTracks: this.composedStream.getTracks().length,
        });
      } else {
        this.composedStream = videoStream;
        console.log("Stream composto criado sem áudio", {
          frameRate: this.options.frameRate,
          tracks: this.composedStream.getTracks().length,
        });
      }
    } catch (error) {
      console.error("Erro ao criar stream do canvas:", error);
      throw error;
    }

    return this.composedStream;
  }

  // Parar composição
  public stopComposition(): void {
    console.log("Parando composição de vídeo");
    this.isComposing = false;

    // Clear animation frame
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clear timer
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.useTimer = false;

    if (this.composedStream) {
      this.composedStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Track do stream composto parado");
      });
      this.composedStream = null;
    }
  }

  // Atualizar stream da câmera
  public updateCameraStream(cameraStream: MediaStream | null): void {
    console.log("Atualizando stream da câmera", {
      hasCameraStream: !!cameraStream,
    });

    if (this.cameraVideo) {
      this.cameraVideo.srcObject = null;
    }

    if (cameraStream) {
      if (!this.cameraVideo) {
        this.cameraVideo = document.createElement("video");
        this.cameraVideo.autoplay = true;
        this.cameraVideo.muted = true;
        this.cameraVideo.playsInline = true;
      }
      this.cameraVideo.srcObject = cameraStream;
      this.options.cameraStream = cameraStream;
    } else {
      this.cameraVideo = null;
      this.options.cameraStream = null;
    }
  }

  // Atualizar stream de áudio
  public updateAudioStream(audioStream: MediaStream | null): void {
    console.log("Atualizando stream de áudio", {
      hasAudioStream: !!audioStream,
    });
    this.options.audioStream = audioStream;

    // Se já temos um stream composto, precisamos recriar com o novo áudio
    if (this.composedStream && this.isComposing) {
      const newAudioTracks = audioStream ? audioStream.getAudioTracks() : [];

      // Parar tracks de áudio antigos
      this.composedStream.getAudioTracks().forEach((track) => {
        track.stop();
        this.composedStream?.removeTrack(track);
      });

      // Adicionar novos tracks de áudio
      newAudioTracks.forEach((track) => {
        this.composedStream?.addTrack(track);
      });
    }
  }

  // Atualizar configurações da câmera
  public updateCameraSettings(
    position: CameraPosition,
    size: CameraSize,
  ): void {
    console.log("Atualizando configurações da câmera", { position, size });
    this.options.cameraPosition = position;
    this.options.cameraSize = size;
  }

  // Obter stream composto
  public getComposedStream(): MediaStream | null {
    return this.composedStream;
  }

  // Verificar se está compondo
  public get isActive(): boolean {
    return this.isComposing;
  }

  // Obter configurações atuais
  public getSettings(): {
    outputWidth: number;
    outputHeight: number;
    frameRate: number;
    cameraPosition: CameraPosition;
    cameraSize: CameraSize;
    hasCameraStream: boolean;
    hasAudioStream: boolean;
  } {
    return {
      outputWidth: this.options.outputWidth,
      outputHeight: this.options.outputHeight,
      frameRate: this.options.frameRate,
      cameraPosition: this.options.cameraPosition,
      cameraSize: this.options.cameraSize,
      hasCameraStream: !!this.options.cameraStream,
      hasAudioStream: !!this.options.audioStream,
    };
  }

  // Obter canvas (para debug)
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // Limpar recursos
  public dispose(): void {
    console.log("Limpando recursos do VideoComposer");

    this.stopComposition();

    // Remove visibility event listener
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.setupVisibilityDetection,
      );
    }

    if (this.screenVideo) {
      this.screenVideo.srcObject = null;
    }

    if (this.cameraVideo) {
      this.cameraVideo.srcObject = null;
    }

    // Remover canvas se estiver no DOM
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    console.log("Recursos do VideoComposer limpos");
  }

  // Método estático para verificar suporte
  public static isSupported(): boolean {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      return !!(ctx && canvas.captureStream);
    } catch {
      return false;
    }
  }

  // Método estático para obter configurações recomendadas
  public static getRecommendedSettings(
    screenWidth: number,
    screenHeight: number,
  ): { outputWidth: number; outputHeight: number; frameRate: number } {
    // Calcular resolução baseada na tela
    const aspectRatio = screenWidth / screenHeight;

    let outputWidth: number;
    let outputHeight: number;

    if (screenWidth >= 1920) {
      outputWidth = 1920;
      outputHeight = 1080;
    } else if (screenWidth >= 1280) {
      outputWidth = 1280;
      outputHeight = 720;
    } else {
      outputWidth = screenWidth;
      outputHeight = screenHeight;
    }

    // Ajustar altura para manter aspect ratio
    if (Math.abs(aspectRatio - 16 / 9) > 0.1) {
      outputHeight = Math.round(outputWidth / aspectRatio);
    }

    return {
      outputWidth,
      outputHeight,
      frameRate: 30,
    };
  }
}

// Utilitário para criar compositor com configurações automáticas
export async function createVideoComposer(
  screenStream: MediaStream,
  cameraStream: MediaStream | null,
  cameraPosition: CameraPosition = "bottom-right",
  cameraSize: CameraSize = "medium",
  audioStream: MediaStream | null = null,
): Promise<VideoComposer> {
  if (!VideoComposer.isSupported()) {
    throw new Error("VideoComposer não é suportado neste navegador");
  }

  // Obter configurações da tela
  const screenTrack = screenStream.getVideoTracks()[0];
  const screenSettings = screenTrack.getSettings();

  const recommendedSettings = VideoComposer.getRecommendedSettings(
    screenSettings.width || 1920,
    screenSettings.height || 1080,
  );

  console.log("Criando VideoComposer com configurações:", {
    screenWidth: screenSettings.width,
    screenHeight: screenSettings.height,
    ...recommendedSettings,
    cameraPosition,
    cameraSize,
    hasAudioStream: !!audioStream,
  });

  const composer = new VideoComposer({
    screenStream,
    cameraStream: cameraStream || undefined,
    audioStream: audioStream || undefined,
    cameraPosition,
    cameraSize,
    ...recommendedSettings,
  });

  return composer;
}
