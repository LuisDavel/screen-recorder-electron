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
	includeMicrophone?: boolean;
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
						// Manter resolução original da tela
						maxWidth: 4096,
						maxHeight: 4096,
						// Garantir qualidade máxima
						minFrameRate: 30,
						maxFrameRate: 60,
					},
				} as any,
			});

			// Obter dimensões reais da tela capturada
			const videoTrack = stream.getVideoTracks()[0];
			const settings = videoTrack.getSettings();

			console.log("Stream da tela obtido com sucesso", {
				tracks: stream.getTracks().length,
				videoTracks: stream.getVideoTracks().length,
				resolution: `${settings.width}x${settings.height}`,
				aspectRatio:
					settings.width && settings.height
						? (settings.width / settings.height).toFixed(2)
						: "unknown",
				frameRate: settings.frameRate,
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
	private getMicrophoneStream(
		includeMicrophone: boolean = true,
	): MediaStream | null {
		if (!includeMicrophone) {
			console.log("Microfone desabilitado pelo usuário");
			return null;
		}

		const microphoneStore = useMicrophoneConfigStore.getState();

		if (!microphoneStore.isEnabled || !microphoneStore.mainStream) {
			console.log("Microfone não habilitado ou stream não disponível", {
				isEnabled: microphoneStore.isEnabled,
				hasMainStream: !!microphoneStore.mainStream,
			});
			return null;
		}

		const stream = microphoneStore.mainStream;
		const audioTracks = stream.getAudioTracks();

		// Verificar se as tracks de áudio estão ativas
		const activeAudioTracks = audioTracks.filter(
			(track) => track.readyState === "live" && track.enabled,
		);

		if (activeAudioTracks.length === 0) {
			console.warn(
				"Nenhuma track de áudio ativa encontrada, tentando reinicializar microfone",
			);
			// Tentar reinicializar o stream do microfone
			microphoneStore.initializeMainStream();
			return null;
		}

		console.log("Stream do microfone obtido do store", {
			isEnabled: microphoneStore.isEnabled,
			hasStream: !!microphoneStore.mainStream,
			gain: microphoneStore.gain,
			noiseReduction: microphoneStore.noiseReduction,
			echoCancellation: microphoneStore.echoCancellation,
			audioTracks: audioTracks.length,
			activeAudioTracks: activeAudioTracks.length,
			audioTrackDetails: audioTracks.map((track) => ({
				id: track.id,
				label: track.label,
				enabled: track.enabled,
				readyState: track.readyState,
				muted: track.muted,
			})),
		});

		return stream;
	}

	// Configurar compositor de vídeo
	private async setupVideoComposer(
		screenStream: MediaStream,
		cameraStream: MediaStream | null,
		audioStream: MediaStream | null,
		options: AdvancedRecordingOptions,
	): Promise<MediaStream> {
		let currentStream = screenStream;

		// First, apply camera overlay if needed
		if (cameraStream && options.includeCameraOverlay) {
			try {
				const cameraStore = useCameraConfigStore.getState();

				this.videoComposer = await createVideoComposer(
					currentStream,
					cameraStream,
					cameraStore.position as any,
					cameraStore.size as any,
					null, // Audio will be added later
				);

				currentStream = this.videoComposer.startComposition();

				console.log("Compositor de câmera configurado com sucesso");
			} catch (error) {
				console.error("Erro ao configurar compositor de câmera:", error);
			}
		}

		// Then, apply header if needed
		console.log("Verificando se deve aplicar header:", {
			includeHeader: options.includeHeader,
			headerEnabled: options.headerConfig?.isEnabled,
			headerConfig: options.headerConfig,
		});

		if (options.includeHeader && options.headerConfig?.isEnabled) {
			try {
				console.log("Aplicando header ao vídeo");

				this.headerComposer = new VideoHeaderComposer(options.headerConfig);

				// Get correct dimensions for header composition
				let width: number;
				let height: number;

				if (this.videoComposer) {
					// If we have a video composer, use its output dimensions
					const composerSettings = this.videoComposer.getSettings();
					width = composerSettings.outputWidth;
					height = composerSettings.outputHeight;
					console.log("Usando dimensões do VideoComposer:", { width, height });
				} else {
					// Otherwise, get from the original screen stream
					const screenTrack = this.screenStream?.getVideoTracks()[0];
					const screenSettings = screenTrack?.getSettings();
					width = screenSettings?.width || 1920;
					height = screenSettings?.height || 1080;
					console.log("Usando dimensões da tela original:", { width, height });
				}

				console.log("Dimensões finais do vídeo para header:", {
					width,
					height,
				});
				console.log("Configurações do header:", options.headerConfig);

				currentStream = await this.headerComposer.composeWithHeader(
					currentStream,
					width,
					height,
				);

				console.log("Header aplicado com sucesso, novo stream:", currentStream);
			} catch (error) {
				console.error("Erro ao aplicar header:", error);
			}
		} else {
			console.log("Header não será aplicado - condições não atendidas");
		}

		// Finally, add audio if available
		if (audioStream) {
			const videoTracks = currentStream.getVideoTracks();
			const audioTracks = audioStream.getAudioTracks();
			currentStream = new MediaStream([...videoTracks, ...audioTracks]);
			console.log("Áudio adicionado ao stream", {
				videoTracks: videoTracks.length,
				audioTracks: audioTracks.length,
				totalTracks: currentStream.getTracks().length,
				audioTrackDetails: audioTracks.map((track) => ({
					id: track.id,
					label: track.label,
					enabled: track.enabled,
					readyState: track.readyState,
					muted: track.muted,
				})),
			});
		} else {
			console.log("Nenhum áudio disponível para adicionar ao stream");
		}

		console.log("Stream final configurado", {
			totalTracks: currentStream.getTracks().length,
			videoTracks: currentStream.getVideoTracks().length,
			audioTracks: currentStream.getAudioTracks().length,
		});

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
			this.audioStream = this.getMicrophoneStream(options.includeMicrophone);

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
				videoTracks: this.finalStream.getVideoTracks().length,
				audioTracks: this.finalStream.getAudioTracks().length,
				audioTrackDetails: this.finalStream.getAudioTracks().map((track) => ({
					id: track.id,
					label: track.label,
					enabled: track.enabled,
					readyState: track.readyState,
					muted: track.muted,
				})),
				finalStreamDetails: {
					active: this.finalStream.active,
					id: this.finalStream.id,
				},
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
			console.log("VideoComposer limpo");
		}

		// Parar compositor de header
		if (this.headerComposer) {
			this.headerComposer.stop();
			this.headerComposer = null;
			console.log("HeaderComposer limpo");
		}

		// Parar streams
		if (this.screenStream) {
			this.screenStream.getTracks().forEach((track) => {
				track.stop();
				console.log("Track da tela parado:", track.id);
			});
			this.screenStream = null;
		}

		// Não parar o stream da câmera pois ele é gerenciado pelo store
		this.cameraStream = null;

		// IMPORTANTE: Não parar o stream do microfone aqui pois ele é gerenciado pelo store
		// e precisa continuar ativo para próximas gravações
		this.audioStream = null;
		console.log("Stream de áudio desvinculado (não parado)");

		// Limpar final stream se for diferente do screen stream
		if (this.finalStream && this.finalStream !== this.screenStream) {
			// Só parar tracks que não sejam do microfone ou câmera (que são gerenciados pelos stores)
			this.finalStream.getVideoTracks().forEach((track) => {
				// Só parar se não for track original da tela (que já foi parado acima)
				if (
					this.screenStream &&
					!this.screenStream.getVideoTracks().includes(track)
				) {
					track.stop();
					console.log("Track de vídeo final parado:", track.id);
				}
			});
		}
		this.finalStream = null;

		// Limpar MediaRecorder
		this.mediaRecorder = null;
		this.recordedChunks = [];
		this.isRecording = false;
		this.options = null;

		console.log(
			"Limpeza concluída - streams do microfone e câmera preservados",
		);
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
			cameraStore.position as any,
			cameraStore.size as any,
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
		return {
			sourceId,
			saveLocation,
			includeCameraOverlay: true,
			includeMicrophone: true,
			includeHeader: false,
			headerConfig: undefined,
			// Remover configurações fixas de resolução - será detectado automaticamente
			outputWidth: undefined,
			outputHeight: undefined,
			frameRate: 30,
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
