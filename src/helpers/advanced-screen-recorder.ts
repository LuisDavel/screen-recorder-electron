import { Buffer } from "buffer";
import {
	VideoComposer,
	type CameraPositionType,
	type CameraSizeType,
} from "./video-composer";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";
import { useVideoFormatStore } from "@/store/store-video-format";
import { saveRecording, saveToLocation } from "./screen_recorder_helpers";
import { recordingMonitor } from "./recording-monitor";
import { VideoHeaderComposer } from "./video-header-composer";
import { VideoFooterComposer } from "./video-footer-composer";

import type { HeaderConfig, FooterConfig } from "@/store/store-header-config";

export interface AdvancedRecordingOptions {
	sourceId: string;
	saveLocation?: string;
	includeCameraOverlay?: boolean;
	includeMicrophone?: boolean;
	includeHeader?: boolean;
	headerConfig?: HeaderConfig;
	includeFooter?: boolean;
	footerConfig?: FooterConfig;
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
	private footerComposer: VideoFooterComposer | null = null;
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

			// Detectar se é captura de tela completa (sem foco de aplicação)
			const isFullScreenCapture =
				sourceId.includes("screen:") ||
				(settings.width && settings.height && settings.width > 2000);

			console.log("Stream da tela obtido com sucesso", {
				sourceId,
				tracks: stream.getTracks().length,
				videoTracks: stream.getVideoTracks().length,
				resolution: `${settings.width}x${settings.height}`,
				aspectRatio:
					settings.width && settings.height
						? (settings.width / settings.height).toFixed(2)
						: "unknown",
				frameRate: settings.frameRate,
				isFullScreenCapture,
				isUltrawide:
					settings.width && settings.height
						? settings.width / settings.height > 2.0
						: false,
			});

			// Se for captura de tela completa e detectarmos aspect ratio incorreto, alertar
			if (isFullScreenCapture && settings.width && settings.height) {
				const aspectRatio = settings.width / settings.height;
				if (aspectRatio < 2.0 && settings.width > 2000) {
					console.warn(
						"⚠️ DETECÇÃO: Possível problema com captura de tela ultrawide",
						{
							dimensõesCapturadas: `${settings.width}x${settings.height}`,
							aspectRatioDetectado: aspectRatio.toFixed(3),
							expectedUltrawide: "~2.35",
							recomendação: "Forçar correção de aspect ratio",
						},
					);
				}
			}

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

				// Obter dimensões do stream da tela para configurar o VideoComposer
				const screenTrack = screenStream.getVideoTracks()[0];
				const screenSettings = screenTrack.getSettings();
				const screenWidth = screenSettings.width || 1920;
				const screenHeight = screenSettings.height || 1080;

				console.log("Configurando VideoComposer com dimensões preservadas:", {
					screenWidth,
					screenHeight,
					aspectRatio: (screenWidth / screenHeight).toFixed(3),
				});

				// Criar compositor com dimensões específicas se fornecidas nas opções
				const composerOptions = {
					screenStream: currentStream,
					cameraStream: cameraStream,
					cameraPosition: cameraStore.position as CameraPositionType,
					cameraSize: cameraStore.size as CameraSizeType,
					audioStream: undefined, // Audio will be added later
					outputWidth: options.outputWidth || screenWidth,
					outputHeight: options.outputHeight || screenHeight,
					frameRate: options.frameRate || 30,
				};

				this.videoComposer = new VideoComposer(composerOptions);

				currentStream = this.videoComposer.startComposition();

				console.log("Compositor de câmera configurado com sucesso", {
					outputWidth: composerOptions.outputWidth,
					outputHeight: composerOptions.outputHeight,
					aspectRatio: (
						composerOptions.outputWidth / composerOptions.outputHeight
					).toFixed(3),
				});
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

		// Apply footer if needed
		console.log("🔍 DEBUG: Verificando se deve aplicar footer:", {
			includeFooter: options.includeFooter,
			footerEnabled: options.footerConfig?.isEnabled,
			footerConfig: options.footerConfig,
			hasFooterComposer: !!this.footerComposer,
		});

		if (options.includeFooter && options.footerConfig?.isEnabled) {
			try {
				console.log("Aplicando footer ao vídeo");

				this.footerComposer = new VideoFooterComposer(options.footerConfig);

				// Get correct dimensions from the current stream (after header is applied)
				let width: number;
				let height: number;

				// Get dimensions from the current stream video track
				const currentVideoTrack = currentStream.getVideoTracks()[0];
				if (currentVideoTrack) {
					const trackSettings = currentVideoTrack.getSettings();
					width = trackSettings.width || 1920;
					height = trackSettings.height || 1080;
					console.log("Usando dimensões do stream atual para footer:", {
						width,
						height,
						trackId: currentVideoTrack.id,
					});
				} else {
					// Fallback para dimensões do VideoComposer ou tela original
					if (this.videoComposer) {
						const composerSettings = this.videoComposer.getSettings();
						width = composerSettings.outputWidth;
						height = composerSettings.outputHeight;
					} else {
						const screenTrack = this.screenStream?.getVideoTracks()[0];
						const screenSettings = screenTrack?.getSettings();
						width = screenSettings?.width || 1920;
						height = screenSettings?.height || 1080;
					}
					console.log("Usando dimensões fallback para footer:", {
						width,
						height,
					});
				}

				console.log("Dimensões finais do vídeo para footer:", {
					width,
					height,
				});
				console.log("Configurações do footer:", options.footerConfig);

				currentStream = await this.footerComposer.composeWithFooter(
					currentStream,
					width,
					height,
				);

				console.log("🔍 DEBUG: Footer aplicado com sucesso, novo stream:", {
					streamId: currentStream.id,
					videoTracks: currentStream.getVideoTracks().length,
					audioTracks: currentStream.getAudioTracks().length,
					videoTrackSettings: currentStream.getVideoTracks()[0]?.getSettings(),
				});
			} catch (error) {
				console.error("Erro ao aplicar footer:", error);
			}
		} else {
			console.log("Footer não será aplicado - condições não atendidas");
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
		const videoFormatState = useVideoFormatStore.getState();
		const desiredMimeType = videoFormatState.getMimeType();

		console.log("🔍 DEBUG: Verificando suporte de formato:", {
			formatoSelecionado: videoFormatState.format,
			codecSelecionado: videoFormatState.codec,
			mimeTypeDesejado: desiredMimeType,
		});

		// Try the user-selected format first
		const isSupported = MediaRecorder.isTypeSupported(desiredMimeType);
		console.log("🔍 DEBUG: Suporte do formato selecionado:", {
			mimeType: desiredMimeType,
			suportado: isSupported,
		});

		if (isSupported) {
			console.log("✅ Codec selecionado pelo usuário:", desiredMimeType);
			return desiredMimeType;
		}

		console.warn("⚠️ Formato selecionado não suportado, tentando fallback");

		// Fallback to supported types
		const supportedTypes = [
			"video/webm; codecs=vp9",
			"video/webm; codecs=vp8",
			"video/webm",
			"video/mp4; codecs=h264",
			"video/mp4",
		];

		for (const type of supportedTypes) {
			const supported = MediaRecorder.isTypeSupported(type);
			console.log("🔍 DEBUG: Testando fallback:", {
				mimeType: type,
				suportado: supported,
			});

			if (supported) {
				console.log("✅ Codec fallback selecionado:", type);
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
			// Aplicar otimizações do WhatsApp se necessário
			const videoFormatState = useVideoFormatStore.getState();
			if (videoFormatState.format === "whatsapp") {
				const whatsappSettings =
					videoFormatState.getWhatsAppOptimizedSettings();
				console.log("🎬 Aplicando otimizações do WhatsApp:", whatsappSettings);

				// Sobrescrever configurações com otimizações do WhatsApp
				options.videoBitrate = whatsappSettings.bitrate;
				options.outputWidth = whatsappSettings.maxResolution.width;
				options.outputHeight = whatsappSettings.maxResolution.height;

				console.log("📱 Configurações aplicadas para WhatsApp:", {
					bitrate: options.videoBitrate,
					resolucao: `${options.outputWidth}x${options.outputHeight}`,
					tamanhoAlvo: `${whatsappSettings.targetFileSize}MB`,
				});
			}

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

			// Adicionar bitrate se especificado (incluindo otimizações do WhatsApp)
			if (options.videoBitrate) {
				recordingOptions.videoBitsPerSecond = options.videoBitrate;
				console.log("🎯 Bitrate configurado:", options.videoBitrate);
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

			// Criar blob final usando o formato selecionado
			const videoFormatState = useVideoFormatStore.getState();
			const mimeType = videoFormatState.getMimeType();
			const selectedFormat = videoFormatState.format;

			console.log("🔍 DEBUG: Criando blob com formato:", {
				formatoSelecionado: selectedFormat,
				mimeType: mimeType,
				chunksCount: this.recordedChunks.length,
				totalSize: this.recordedChunks.reduce(
					(sum, chunk) => sum + chunk.size,
					0,
				),
			});

			const blob = new Blob(this.recordedChunks, { type: mimeType });
			console.log("✅ Blob criado:", {
				size: blob.size,
				type: blob.type,
				mimeType: mimeType,
				formatoOriginal: selectedFormat,
			});

			// Converter para buffer
			const buffer = await blob.arrayBuffer();
			const uint8Array = new Uint8Array(buffer);
			const videoBuffer = Buffer.from(uint8Array);

			// Salvar vídeo
			let result;
			const format = useVideoFormatStore.getState().format;

			console.log("🔍 DEBUG: Salvando vídeo:", {
				formato: format,
				tamanhoBuffer: videoBuffer.length,
				localEspecifico: this.options?.saveLocation,
			});

			if (this.options?.saveLocation) {
				console.log(
					"📁 Salvando em local específico:",
					this.options.saveLocation,
					"formato:",
					format,
				);
				result = await saveToLocation(
					videoBuffer,
					this.options.saveLocation,
					format,
				);
			} else {
				console.log("📁 Salvando com seletor de arquivo, formato:", format);
				result = await saveRecording(videoBuffer, format);
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

		// Parar compositor de footer
		if (this.footerComposer) {
			this.footerComposer.stop();
			this.footerComposer = null;
			console.log("FooterComposer limpo");
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
			cameraStore.position as CameraPositionType,
			cameraStore.size as CameraSizeType,
		);

		console.log("Configurações da câmera atualizadas durante gravação");
	}

	// Método estático para verificar suporte
	public static isSupported(): boolean {
		return (
			typeof navigator !== "undefined" &&
			!!navigator.mediaDevices &&
			!!navigator.mediaDevices.getUserMedia &&
			typeof window !== "undefined" &&
			!!window.MediaRecorder
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
			includeFooter: false,
			footerConfig: undefined,
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
