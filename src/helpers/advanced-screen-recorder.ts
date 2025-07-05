import { Buffer } from "buffer";
import { VideoComposer, createVideoComposer } from "./video-composer";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";
import { saveRecording, saveToLocation } from "./screen_recorder_helpers";
import { recordingMonitor } from "./recording-monitor";
import { VideoHeaderComposer } from "./video-header-composer";

import type { HeaderConfig } from "@/store/store-header-config";

export interface AdvancedRecordingOptions {
  sourceId: string;
  saveLocation?: string;
  includeCameraOverlay?: boolean;
  includeHeader?: boolean;
  headerConfig?: HeaderConfig;
  outputWidth?: number;
  outputHeight?: number;
  frameRate?: number;
  videoBitrate?: number;
}

export class AdvancedScreenRecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private screenStream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private videoComposer: VideoComposer | null = null;
  private headerComposer: VideoHeaderComposer | null = null;
  private finalStream: MediaStream | null = null;
  private isRecording = false;
  private options: AdvancedRecordingOptions | null = null;

  constructor() {
    console.log("AdvancedScreenRecorderManager inicializado");
    this.setupBackgroundModeListener();
  }

  // Setup background mode listener using events instead of hooks
  private setupBackgroundModeListener(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("recording-background-mode", (event: any) => {
        this.handleBackgroundMode(event.detail?.enabled || false);
      });
    }
  }

  // Handle background mode changes
  private handleBackgroundMode(enabled: boolean): void {
    if (this.videoComposer) {
      console.log(
        `Background mode ${enabled ? "enabled" : "disabled"} - VideoComposer will adapt`,
      );

      // Emit event for VideoComposer to handle
      if (typeof window !== "undefined") {
        const event = new CustomEvent("recording-background-mode", {
          detail: { enabled },
        });
        window.dispatchEvent(event);
      }
    }
  }

  // Obter stream da tela
  private async getScreenStream(sourceId: string): Promise<MediaStream> {
    console.log("Obtendo stream da tela para fonte:", sourceId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        } as MediaTrackConstraints,
      });

      console.log("Stream da tela obtido com sucesso", {
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      return stream;
    } catch (error) {
      console.error("Erro ao obter stream da tela:", error);
      throw new Error(
        `Falha ao capturar tela: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Obter stream da câmera do store
  private getCameraStream(): MediaStream | null {
    const cameraStore = useCameraConfigStore.getState();

    if (!cameraStore.isEnabled || !cameraStore.mainStream) {
      console.log("Câmera não habilitada ou stream não disponível");
      return null;
    }

    console.log("Stream da câmera obtido do store", {
      isEnabled: cameraStore.isEnabled,
      hasStream: !!cameraStore.mainStream,
      position: cameraStore.position,
      size: cameraStore.size,
    });

    return cameraStore.mainStream;
  }

  // Obter stream do microfone do store
  private getMicrophoneStream(): MediaStream | null {
    const microphoneStore = useMicrophoneConfigStore.getState();

    if (!microphoneStore.isEnabled || !microphoneStore.mainStream) {
      console.log("Microfone não habilitado ou stream não disponível");
      return null;
    }

    console.log("Stream do microfone obtido do store", {
      isEnabled: microphoneStore.isEnabled,
      hasStream: !!microphoneStore.mainStream,
      gain: microphoneStore.gain,
      noiseReduction: microphoneStore.noiseReduction,
      echoCancellation: microphoneStore.echoCancellation,
    });

    return microphoneStore.mainStream;
  }

  // Configurar compositor de vídeo
  private async setupVideoComposer(
    screenStream: MediaStream,
    cameraStream: MediaStream | null,
    audioStream: MediaStream | null,
    options: AdvancedRecordingOptions,
  ): Promise<MediaStream> {
    console.log("Configurando compositor de vídeo");

    let currentStream = screenStream;

    // First, apply camera overlay if needed
    if (cameraStream && options.includeCameraOverlay) {
      try {
        const cameraStore = useCameraConfigStore.getState();

        this.videoComposer = await createVideoComposer(
          currentStream,
          cameraStream,
          cameraStore.position,
          cameraStore.size,
          null, // Audio will be added later
        );

        currentStream = this.videoComposer.startComposition();

        console.log("Compositor de câmera configurado com sucesso");
      } catch (error) {
        console.error("Erro ao configurar compositor de câmera:", error);
      }
    }

    // Then, apply header if needed
    if (options.includeHeader && options.headerConfig?.isEnabled) {
      try {
        console.log("Aplicando header ao vídeo");

        this.headerComposer = new VideoHeaderComposer(options.headerConfig);

        // Get video track settings for dimensions
        const videoTrack = currentStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const width = settings.width || 1920;
        const height = settings.height || 1080;

        currentStream = await this.headerComposer.composeWithHeader(
          currentStream,
          width,
          height,
        );

        console.log("Header aplicado com sucesso");
      } catch (error) {
        console.error("Erro ao aplicar header:", error);
      }
    }

    // Finally, add audio if available
    if (audioStream) {
      const videoTracks = currentStream.getVideoTracks();
      const audioTracks = audioStream.getAudioTracks();
      currentStream = new MediaStream([...videoTracks, ...audioTracks]);
      console.log("Áudio adicionado ao stream");
    }

    return currentStream;
  }

  // Obter codecs suportados
  private getSupportedMimeType(): string {
    const supportedTypes = [
      "video/webm; codecs=vp9",
      "video/webm; codecs=vp8",
      "video/webm",
      "video/mp4; codecs=h264",
      "video/mp4",
    ];

    for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log("Codec selecionado:", type);
        return type;
      }
    }

    throw new Error("Nenhum codec de vídeo suportado encontrado");
  }

  // Iniciar gravação
  public async startRecording(
    options: AdvancedRecordingOptions,
  ): Promise<void> {
    if (this.isRecording) {
      throw new Error("Gravação já está em andamento");
    }

    console.log("Iniciando gravação avançada", options);
    this.options = options;

    try {
      // Obter stream da tela
      this.screenStream = await this.getScreenStream(options.sourceId);

      // Obter stream da câmera se necessário
      this.cameraStream = options.includeCameraOverlay
        ? this.getCameraStream()
        : null;

      // Obter stream do microfone
      this.audioStream = this.getMicrophoneStream();

      // Configurar compositor
      this.finalStream = await this.setupVideoComposer(
        this.screenStream,
        this.cameraStream,
        this.audioStream,
        options,
      );

      // Configurar MediaRecorder
      const mimeType = this.getSupportedMimeType();
      const recordingOptions: MediaRecorderOptions = {
        mimeType,
      };

      // Adicionar bitrate se especificado
      if (options.videoBitrate) {
        recordingOptions.videoBitsPerSecond = options.videoBitrate;
      }

      this.mediaRecorder = new MediaRecorder(
        this.finalStream,
        recordingOptions,
      );

      console.log("MediaRecorder configurado", {
        mimeType,
        videoBitrate: options.videoBitrate,
        streamTracks: this.finalStream.getTracks().length,
      });

      // Configurar event listeners
      this.setupRecorderListeners();

      // Iniciar gravação
      this.mediaRecorder.start(1000); // Chunk a cada segundo
      this.isRecording = true;
      this.recordedChunks = [];

      // Notify recording monitor using direct instance access
      recordingMonitor.onSessionStart({
        id: `advanced-recorder-${Date.now()}`,
        startTime: new Date(),
        isActive: true,
        hasCamera: !!this.cameraStream,
        hasMicrophone: !!this.audioStream,
        isPaused: false,
        windowHidden: false,
        backgroundOptimized: false,
      });

      console.log("Gravação iniciada com sucesso");
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      await this.cleanup();
      throw error;
    }
  }

  // Configurar listeners do MediaRecorder
  private setupRecorderListeners(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
        console.log("Chunk gravado", {
          size: event.data.size,
          totalChunks: this.recordedChunks.length,
        });
      }
    };

    this.mediaRecorder.onstart = () => {
      console.log("MediaRecorder iniciado");
    };

    this.mediaRecorder.onpause = () => {
      console.log("MediaRecorder pausado");
    };

    this.mediaRecorder.onresume = () => {
      console.log("MediaRecorder retomado");
    };

    this.mediaRecorder.onerror = (event) => {
      console.error("Erro no MediaRecorder:", event);
    };

    this.mediaRecorder.onstop = async () => {
      console.log("MediaRecorder parado, processando vídeo...");
      await this.processRecording();
    };
  }

  // Processar gravação quando parar
  private async processRecording(): Promise<void> {
    if (this.recordedChunks.length === 0) {
      console.error("Nenhum chunk de vídeo foi gravado!");
      throw new Error("Nenhum dado de vídeo foi capturado");
    }

    try {
      console.log("Processando gravação", {
        chunks: this.recordedChunks.length,
        totalSize: this.recordedChunks.reduce(
          (sum, chunk) => sum + chunk.size,
          0,
        ),
      });

      // Criar blob final
      const blob = new Blob(this.recordedChunks, { type: "video/webm" });
      console.log("Blob criado", { size: blob.size });

      // Converter para buffer
      const buffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const videoBuffer = Buffer.from(uint8Array);

      // Salvar vídeo
      let result;
      if (this.options?.saveLocation) {
        console.log("Salvando em local específico:", this.options.saveLocation);
        result = await saveToLocation(videoBuffer, this.options.saveLocation);
      } else {
        console.log("Salvando com seletor de arquivo");
        result = await saveRecording(videoBuffer);
      }

      console.log("Resultado do salvamento:", result);

      if (result.success) {
        console.log("Vídeo salvo com sucesso!");

        // Notificar usuário
        const message = `Vídeo ${this.options?.includeCameraOverlay ? "com câmera" : ""} salvo com sucesso!`;

        // Usar notificação do sistema se disponível
        if (typeof window !== "undefined" && "Notification" in window) {
          new Notification(message, {
            body: `Local: ${result.filePath}`,
            icon: "/icon.png", // Assumindo que há um ícone
          });
        } else {
          alert(`${message}\nLocal: ${result.filePath}`);
        }
      } else {
        throw new Error(result.message || "Erro desconhecido ao salvar");
      }
    } catch (error) {
      console.error("Erro ao processar gravação:", error);
      throw error;
    }
  }

  // Parar gravação
  public async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      console.warn("Nenhuma gravação em andamento");
      return;
    }

    console.log("Parando gravação avançada");

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
        console.log("MediaRecorder parado");
      }

      this.isRecording = false;

      // Notify recording monitor using direct instance access
      recordingMonitor.onSessionStop(`advanced-recorder-${Date.now()}`);

      // Aguardar processamento
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Erro ao parar gravação:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Pausar gravação
  public pauseRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn("Nenhuma gravação ativa para pausar");
      return;
    }

    if (this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      console.log("Gravação pausada");
    }
  }

  // Retomar gravação
  public resumeRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn("Nenhuma gravação ativa para retomar");
      return;
    }

    if (this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      console.log("Gravação retomada");
    }
  }

  // Limpar recursos
  private async cleanup(): Promise<void> {
    console.log("Limpando recursos do gravador avançado");

    // Parar compositor
    if (this.videoComposer) {
      this.videoComposer.stopComposition();
      this.videoComposer.dispose();
      this.videoComposer = null;
    }

    // Parar compositor de header
    if (this.headerComposer) {
      this.headerComposer.stop();
      this.headerComposer = null;
    }

    // Parar streams
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Track da tela parado");
      });
      this.screenStream = null;
    }

    // Não parar o stream da câmera pois ele é gerenciado pelo store
    this.cameraStream = null;

    // Limpar final stream se for diferente do screen stream
    if (this.finalStream && this.finalStream !== this.screenStream) {
      this.finalStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Track do stream final parado");
      });
    }
    this.finalStream = null;

    // Limpar MediaRecorder
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.options = null;

    console.log("Limpeza concluída");
  }

  // Obter status da gravação
  public getStatus(): {
    isRecording: boolean;
    recordedChunks: number;
    hasCamera: boolean;
    isComposing: boolean;
  } {
    return {
      isRecording: this.isRecording,
      recordedChunks: this.recordedChunks.length,
      hasCamera: !!this.cameraStream,
      isComposing: this.videoComposer?.isActive || false,
    };
  }

  // Obter configurações atuais
  public getSettings(): {
    options: AdvancedRecordingOptions | null;
    composerSettings: any;
  } {
    return {
      options: this.options,
      composerSettings: this.videoComposer?.getSettings() || null,
    };
  }

  // Verificar se está gravando
  public get recording(): boolean {
    return this.isRecording;
  }

  // Atualizar configurações da câmera durante gravação
  public updateCameraSettings(): void {
    if (!this.videoComposer) return;

    const cameraStore = useCameraConfigStore.getState();
    this.videoComposer.updateCameraSettings(
      cameraStore.position,
      cameraStore.size,
    );

    console.log("Configurações da câmera atualizadas durante gravação");
  }

  // Método estático para verificar suporte
  public static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      VideoComposer.isSupported()
    );
  }

  // Método estático para obter configurações recomendadas
  public static getRecommendedOptions(
    sourceId: string,
    saveLocation?: string,
  ): AdvancedRecordingOptions {
    const screen = window.screen;
    const recommendedSettings = VideoComposer.getRecommendedSettings(
      screen.width,
      screen.height,
    );

    return {
      sourceId,
      saveLocation,
      includeCameraOverlay: true,
      ...recommendedSettings,
      videoBitrate: 2500000, // 2.5 Mbps
    };
  }
}

// Instância singleton para uso global
export const advancedRecorder = new AdvancedScreenRecorderManager();

// Função utilitária para gravação rápida
export async function startAdvancedRecording(
  sourceId: string,
  saveLocation?: string,
  includeCameraOverlay: boolean = true,
): Promise<void> {
  const options = AdvancedScreenRecorderManager.getRecommendedOptions(
    sourceId,
    saveLocation,
  );

  options.includeCameraOverlay = includeCameraOverlay;

  return advancedRecorder.startRecording(options);
}

// Função utilitária para parar gravação
export async function stopAdvancedRecording(): Promise<void> {
  return advancedRecorder.stopRecording();
}
