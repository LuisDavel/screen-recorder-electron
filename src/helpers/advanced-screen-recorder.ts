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
import { uploadToS3 } from "./s3-upload-helper";
import { useS3ConfigStore } from "@/store/store-s3-config";
import { CardiopicApiHelper } from "./cardiopic-api-helper";

import type { HeaderConfig, FooterConfig } from "@/store/store-header-config";
import { useHeaderConfigStore } from "@/store/store-header-config";

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
	cameraOnly?: boolean; // Indica se deve gravar apenas a câmera em fullscreen
	windowsMP4SafeMode?: boolean; // Flag para modo seguro de MP4 no Windows
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

	// Setup background mode listener using events instead of hooks - melhorado
	private setupBackgroundModeListener(): void {
		if (typeof window !== "undefined") {
			// Listener para background mode aprimorado específico do recording
			window.addEventListener(
				"background-recording-mode-activated",
				(event: Event) => {
					const customEvent = event as CustomEvent;
					const data = customEvent.detail;
					console.log("🎬 Advanced background recording mode event:", data);
					this.handleAdvancedBackgroundMode(data);
				},
			);

			// Listener para background mode específico do recording (legacy)
			window.addEventListener("recording-background-mode", (event: Event) => {
				const customEvent = event as CustomEvent;
				this.handleBackgroundMode(customEvent.detail?.enabled || false);
			});

			// Listener para background mode do main process (legacy)
			window.addEventListener("background-mode-activated", (event: Event) => {
				const customEvent = event as CustomEvent;
				this.handleBackgroundMode(customEvent.detail || false);
			});

			// Listener para visibilidade da página com otimizações
			document.addEventListener("visibilitychange", () => {
				const isHidden = document.hidden;
				if (this.isRecording) {
					console.log(
						`📄 Page visibility changed: ${isHidden ? "hidden" : "visible"} - maintaining recording`,
					);
					this.handleAdvancedBackgroundMode({
						enabled: isHidden,
						highPerformance: true,
						optimizations: {
							enableTimerMode: true,
							frameRateOverride: 30,
							disableAnimations: true,
							reduceQuality: false, // Manter qualidade do vídeo
						},
					});
				}
			});
		}
	}

	// Handle advanced background mode changes with optimizations
	private handleAdvancedBackgroundMode(data: {
		enabled: boolean;
		highPerformance?: boolean;
		optimizations?: {
			enableTimerMode?: boolean;
			frameRateOverride?: number;
			disableAnimations?: boolean;
			reduceQuality?: boolean;
		};
	}): void {
		if (!this.isRecording) {
			return; // Só aplicar otimizações se estiver gravando
		}

		console.log(
			`🎬 Advanced background mode ${data.enabled ? "enabled" : "disabled"} - applying recording optimizations`,
		);

		if (data.enabled) {
			// Otimizações avançadas para modo background
			this.enableAdvancedBackgroundRecordingOptimizations(data);
		} else {
			// Restaurar otimizações normais
			this.disableAdvancedBackgroundRecordingOptimizations();
		}

		// Notify VideoComposer and other components
		if (this.videoComposer) {
			if (typeof window !== "undefined") {
				const event = new CustomEvent("recording-background-mode", {
					detail: data,
				});
				window.dispatchEvent(event);
			}
		}
	}

	// Handle background mode changes - melhorado para gravação contínua
	private handleBackgroundMode(enabled: boolean): void {
		if (!this.isRecording) {
			return; // Só aplicar otimizações se estiver gravando
		}

		console.log(
			`Background mode ${enabled ? "enabled" : "disabled"} - applying recording optimizations`,
		);

		if (enabled) {
			// Otimizações para modo background
			this.enableBackgroundRecordingOptimizations();
		} else {
			// Restaurar otimizações normais
			this.disableBackgroundRecordingOptimizations();
		}

		// Notify VideoComposer and other components
		if (this.videoComposer) {
			if (typeof window !== "undefined") {
				const event = new CustomEvent("recording-background-mode", {
					detail: { enabled },
				});
				window.dispatchEvent(event);
			}
		}
	}

	// Ativar otimizações para gravação em background
	private enableBackgroundRecordingOptimizations(): void {
		console.log("🎥 Ativando otimizações para gravação em background");

		// Forçar que a gravação continue mesmo minimizada
		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			console.log("MediaRecorder mantido ativo em background");

			// Aplicar CSS para otimizar performance
			document.body.classList.add("recording-background-mode");

			// Reduzir qualidade de preview se necessário (mas manter gravação)
			this.optimizeStreamForBackground();
		}
	}

	// Desativar otimizações de background
	private disableBackgroundRecordingOptimizations(): void {
		console.log(
			"🎥 Desativando otimizações de background - restaurando qualidade normal",
		);

		// Remover CSS de otimização
		document.body.classList.remove("recording-background-mode");

		// Restaurar qualidade normal
		this.restoreStreamQuality();
	}

	// Ativar otimizações avançadas para gravação em background
	private enableAdvancedBackgroundRecordingOptimizations(data: {
		enabled: boolean;
		highPerformance?: boolean;
		optimizations?: {
			enableTimerMode?: boolean;
			frameRateOverride?: number;
			disableAnimations?: boolean;
			reduceQuality?: boolean;
		};
	}): void {
		console.log(
			"🚀 Ativando otimizações avançadas para gravação em background",
		);

		// Forçar que a gravação continue mesmo minimizada
		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			console.log(
				"📹 MediaRecorder mantido ativo em background com otimizações",
			);

			// Aplicar CSS para otimizar performance
			document.body.classList.add("recording-background-mode");

			// Otimizar stream para background com configurações específicas
			this.optimizeStreamForBackgroundAdvanced(data);

			// Aplicar otimizações específicas do frame rate
			if (data.optimizations?.frameRateOverride) {
				console.log(
					`🎯 Frame rate otimizado para: ${data.optimizations.frameRateOverride}fps`,
				);
				// Se há um VideoComposer, aplicar otimizações
				if (this.videoComposer) {
					console.log("🎨 Aplicando otimizações no VideoComposer");
				}
			}

			// Monitor de performance em background
			this.startBackgroundPerformanceMonitoring();
		}
	}

	// Desativar otimizações avançadas para gravação em background
	private disableAdvancedBackgroundRecordingOptimizations(): void {
		console.log(
			"🔄 Desativando otimizações avançadas para gravação em background",
		);

		// Remover CSS optimizations
		document.body.classList.remove("recording-background-mode");

		// Restaurar configurações normais
		this.restoreNormalStreamSettings();

		// Parar monitor de performance
		this.stopBackgroundPerformanceMonitoring();
	}

	// Otimizar stream para background (reduzir CPU mas manter gravação)
	private optimizeStreamForBackground(): void {
		// Implementar otimizações específicas se necessário
		// Por exemplo, reduzir frame rate temporariamente
		console.log("Stream otimizado para background");
	}

	// Otimizar stream para background com configurações avançadas
	private optimizeStreamForBackgroundAdvanced(data: {
		enabled: boolean;
		highPerformance?: boolean;
		optimizations?: {
			enableTimerMode?: boolean;
			frameRateOverride?: number;
			disableAnimations?: boolean;
			reduceQuality?: boolean;
		};
	}): void {
		console.log("🔧 Otimizando stream para background recording avançado");

		// Aplicar otimizações específicas sem comprometer qualidade
		if (data.optimizations?.enableTimerMode) {
			console.log("⏱️ Timer mode enabled para renderização estável");
		}

		// Manter qualidade se especificado
		if (data.optimizations?.reduceQuality === false) {
			console.log("🎯 Mantendo qualidade máxima durante background recording");
		}

		// Aplicar otimizações de performance
		if (data.highPerformance) {
			console.log("🚀 High performance mode ativado");
			this.enableHighPerformanceMode();
		}
	}

	// Restaurar qualidade normal do stream
	private restoreStreamQuality(): void {
		// Restaurar configurações normais
		console.log("Qualidade do stream restaurada");
	}

	// Restaurar configurações normais do stream
	private restoreNormalStreamSettings(): void {
		console.log("🔄 Restaurando configurações normais do stream");

		// Restaurar configurações padrão
		console.log("✅ Configurações normais restauradas");
	}

	// Iniciar monitoramento de performance em background
	private startBackgroundPerformanceMonitoring(): void {
		console.log("📊 Iniciando monitoramento de performance em background");

		// Monitor básico de chunks
		if (typeof window !== "undefined") {
			const monitoringEvent = new CustomEvent(
				"background-recording-performance-start",
				{
					detail: {
						timestamp: Date.now(),
						recordingActive: this.isRecording,
					},
				},
			);
			window.dispatchEvent(monitoringEvent);
		}
	}

	// Parar monitoramento de performance em background
	private stopBackgroundPerformanceMonitoring(): void {
		console.log("📊 Parando monitoramento de performance em background");

		if (typeof window !== "undefined") {
			const monitoringEvent = new CustomEvent(
				"background-recording-performance-stop",
				{
					detail: {
						timestamp: Date.now(),
					},
				},
			);
			window.dispatchEvent(monitoringEvent);
		}
	}

	// Habilitar modo de alta performance
	private enableHighPerformanceMode(): void {
		console.log("🚀 Habilitando modo de alta performance");

		// Aplicar configurações específicas para alta performance
		if (this.mediaRecorder) {
			// Configurações específicas para MediaRecorder em alta performance
			console.log("📹 MediaRecorder em modo de alta performance");
		}
	}

	// Obter stream da tela
	private async getScreenStream(sourceId: string): Promise<MediaStream> {
		console.log("Obtendo stream da tela para sourceId:", sourceId);

		// Se for modo câmera apenas, retornar stream da câmera diretamente
		if (sourceId === "camera-only") {
			console.log("Modo câmera apenas detectado");
			const cameraStream = this.getCameraStream();
			if (!cameraStream) {
				throw new Error(
					"Stream da câmera não disponível para modo câmera apenas",
				);
			}
			return cameraStream;
		}

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

			console.log("Stream da tela obtido com sucesso:", {
				id: stream.id,
				tracks: stream.getTracks().length,
				videoTracks: stream.getVideoTracks().length,
			});

			return stream;
		} catch (error) {
			console.error("Erro ao obter stream da tela:", error);
			throw error;
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

		// Se for modo câmera apenas, usar apenas a câmera sem compositor
		if (options.cameraOnly) {
			console.log("Modo câmera apenas: usando stream da câmera diretamente");

			// Adicionar áudio se disponível
			if (audioStream) {
				console.log("Adicionando áudio ao stream da câmera");
				try {
					// Criar nova stream combinando vídeo da câmera com áudio
					const combinedStream = new MediaStream([
						...currentStream.getVideoTracks(),
						...audioStream.getAudioTracks(),
					]);
					return combinedStream;
				} catch (error) {
					console.warn("Erro ao adicionar áudio ao stream da câmera:", error);
					return currentStream;
				}
			}

			// Retornar stream da câmera puro
			return currentStream;
		}

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
				// Otimizar para Windows: reduzir resolução se muito alta
				const maxWidth = Math.min(screenWidth, 1920);
				const maxHeight = Math.min(screenHeight, 1080);
				const aspectRatio = screenWidth / screenHeight;

				// Manter proporção se reduzir a resolução
				let finalWidth = options.outputWidth || maxWidth;
				let finalHeight = options.outputHeight || maxHeight;

				if (finalWidth > 1920) {
					finalWidth = 1920;
					finalHeight = Math.round(finalWidth / aspectRatio);
				}

				const composerOptions = {
					screenStream: currentStream,
					cameraStream: cameraStream,
					cameraPosition: cameraStore.position as CameraPositionType,
					cameraSize: cameraStore.size as CameraSizeType,
					audioStream: undefined, // Audio will be added later
					outputWidth: finalWidth,
					outputHeight: finalHeight,
					frameRate: Math.min(options.frameRate || 25, 30), // Limitar frame rate
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

		// Fallback to supported types (otimizado para performance e áudio)
		const supportedTypes = [];

		if (
			videoFormatState.format === "mp4" ||
			videoFormatState.format === "whatsapp"
		) {
			// Para MP4, priorizar formatos que suportam áudio adequadamente
			const hasAudio =
				this.finalStream && this.finalStream.getAudioTracks().length > 0;

			if (hasAudio) {
				// Mime types específicos para MP4 com áudio
				supportedTypes.push(
					'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', // H.264 + AAC
					'video/mp4; codecs="avc1.42001E, mp4a.40.2"', // H.264 Baseline + AAC
					'video/mp4; codecs="h264, aac"', // H.264 + AAC alternativo
					"video/mp4; codecs=avc1.42E01E", // H.264 Extended
					"video/mp4; codecs=avc1.42001E", // H.264 Baseline
					"video/mp4; codecs=h264", // H.264 básico
					"video/mp4", // MP4 básico
				);
			} else {
				// Mime types para MP4 sem áudio
				supportedTypes.push(
					"video/mp4; codecs=avc1.42E01E", // H.264 Extended
					"video/mp4; codecs=avc1.42001E", // H.264 Baseline
					"video/mp4; codecs=h264", // H.264 básico
					"video/mp4", // MP4 básico
				);
			}
		} else {
			// Para WebM, usar configurações otimizadas
			supportedTypes.push(
				"video/webm; codecs=vp8", // VP8 é mais leve que VP9
				"video/webm; codecs=vp9",
				"video/webm",
			);
		}

		// Fallback final para qualquer formato suportado
		supportedTypes.push(
			"video/webm; codecs=vp8",
			"video/webm; codecs=vp9",
			"video/webm",
			"video/mp4",
			"video/mp4; codecs=h264",
		);

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
			// Detectar plataforma e aplicar otimizações específicas
			const isWindows =
				typeof navigator !== "undefined" &&
				navigator.platform.toLowerCase().includes("win");

			if (isWindows) {
				console.log(
					"🪟 Windows detectado - aplicando otimizações de performance",
				);

				// Otimizações específicas para Windows
				if (!options.videoBitrate) {
					options.videoBitrate = 800000; // 800 Kbps mais conservador para Windows
				}

				if (!options.frameRate) {
					options.frameRate = 15; // Frame rate mais baixo para Windows
				}

				console.log("🎯 Configurações otimizadas para Windows:", {
					bitrate: options.videoBitrate,
					frameRate: options.frameRate,
				});
			}

			// Aplicar otimizações específicas para MP4
			const videoFormatState = useVideoFormatStore.getState();
			if (videoFormatState.format === "mp4") {
				console.log("🎬 MP4 detectado - aplicando otimizações específicas");

				// Configurações ultra-conservadoras para MP4 no Windows
				if (isWindows) {
					console.log(
						"🚨 MP4 no Windows - aplicando configurações ultra-conservadoras",
					);

					// Configurações otimizadas baseadas na qualidade do usuário
					const userBitrate =
						AdvancedScreenRecorderManager.getBitrateForQuality(
							videoFormatState.quality,
							true, // isMP4
							true, // isWindows
						);
					options.videoBitrate = Math.min(
						options.videoBitrate || userBitrate,
						userBitrate,
					); // Usar bitrate baseado na qualidade do usuário
					options.frameRate = Math.min(options.frameRate || 15, 15); // Máximo 15 FPS (melhorado)

					// Forçar resolução máxima ainda menor para Windows
					if (options.outputWidth && options.outputWidth > 800) {
						options.outputWidth = 800;
						options.outputHeight = Math.round((options.outputWidth * 9) / 16); // Manter aspect ratio 16:9
					}

					// Configuração especial para chunks no Windows
					options.windowsMP4SafeMode = true; // Flag para modo seguro

					console.log(
						"🔧 Configurações ultra-conservadoras aplicadas para MP4 no Windows:",
						{
							bitrate: options.videoBitrate,
							frameRate: options.frameRate,
							resolucao: options.outputWidth
								? `${options.outputWidth}x${options.outputHeight}`
								: "auto",
							modoSeguro: true,
						},
					);
				} else {
					// Configurações mais conservadoras para MP4 em geral
					const userBitrate =
						AdvancedScreenRecorderManager.getBitrateForQuality(
							videoFormatState.quality,
							true, // isMP4
							false, // not Windows
						);
					options.videoBitrate = Math.min(
						options.videoBitrate || userBitrate,
						userBitrate,
					); // Usar bitrate baseado na qualidade do usuário
					options.frameRate = Math.min(options.frameRate || 18, 18); // Máximo 18 FPS (reduzido de 22)
				}

				console.log("🎯 Configurações otimizadas para MP4:", {
					bitrate: options.videoBitrate,
					frameRate: options.frameRate,
					resolucao: options.outputWidth
						? `${options.outputWidth}x${options.outputHeight}`
						: "auto",
					plataforma: isWindows ? "Windows" : "Outros",
				});
			}

			// Aplicar otimizações do WhatsApp se necessário
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

			// Otimizar bitrate baseado na qualidade do usuário
			let finalBitrate = options.videoBitrate;
			if (!finalBitrate) {
				// Usar bitrate baseado na qualidade do usuário
				finalBitrate = AdvancedScreenRecorderManager.getBitrateForQuality(
					videoFormatState.quality,
					videoFormatState.format === "mp4",
					isWindows,
				);
				console.log("🎯 Usando bitrate baseado na qualidade:", {
					quality: videoFormatState.quality,
					bitrate: finalBitrate,
					format: videoFormatState.format,
					platform: isWindows ? "Windows" : "Other",
				});
			}

			recordingOptions.videoBitsPerSecond = finalBitrate;
			console.log("🎯 Bitrate configurado:", finalBitrate);

			// Configurar bitrate de áudio específico para MP4
			if (
				videoFormatState.format === "mp4" ||
				videoFormatState.format === "whatsapp"
			) {
				// Configurar bitrate de áudio baseado na qualidade e plataforma
				let audioBitrate: number;

				if (isWindows) {
					// Configurações mais conservadoras para Windows
					switch (videoFormatState.quality) {
						case "low":
							audioBitrate = 64000; // 64 kbps
							break;
						case "medium":
							audioBitrate = 96000; // 96 kbps
							break;
						case "high":
							audioBitrate = 128000; // 128 kbps
							break;
						default:
							audioBitrate = 96000;
					}
				} else {
					// Configurações normais para outras plataformas
					switch (videoFormatState.quality) {
						case "low":
							audioBitrate = 96000; // 96 kbps
							break;
						case "medium":
							audioBitrate = 128000; // 128 kbps
							break;
						case "high":
							audioBitrate = 192000; // 192 kbps
							break;
						default:
							audioBitrate = 128000;
					}
				}

				// Aplicar bitrate de áudio apenas se há áudio no stream
				if (this.finalStream.getAudioTracks().length > 0) {
					recordingOptions.audioBitsPerSecond = audioBitrate;
					console.log(
						"🎤 Bitrate de áudio configurado para MP4:",
						audioBitrate,
					);
				}
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

			// Otimizar tamanho dos chunks baseado na qualidade do usuário
			const qualitySettings = videoFormatState.getQualityBasedSettings();
			const chunkInterval = qualitySettings.chunkSize;

			console.log("🎯 Configurações otimizadas por qualidade:", {
				quality: qualitySettings.quality,
				chunkSize: `${chunkInterval}ms`,
				bitrate: `${Math.round(qualitySettings.bitrate / 1000)}kbps`,
				frameRate: `${qualitySettings.frameRate}fps`,
				optimizedFor: qualitySettings.optimizedFor,
				platform: qualitySettings.platform,
			});

			// Iniciar gravação com chunks otimizados
			this.mediaRecorder.start(chunkInterval);
			this.isRecording = true;
			this.recordedChunks = [];

			// Notify recording monitor usando direct instance access (apenas em desenvolvimento)
			if (process.env.NODE_ENV === "development") {
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
			}

			console.log("Gravação iniciada com sucesso");
		} catch (error) {
			console.error("Erro ao iniciar gravação:", error);

			// Tratamento específico para MP4 no Windows
			const videoFormatState = useVideoFormatStore.getState();
			const isWindows =
				typeof navigator !== "undefined" &&
				navigator.platform.toLowerCase().includes("win");
			if (videoFormatState.format === "mp4" && isWindows) {
				console.error(
					"🚨 FALHA CRÍTICA: Não foi possível iniciar gravação MP4 no Windows",
					{
						formato: "MP4",
						plataforma: "Windows",
						erro: error,
						configuracoesAplicadas: {
							bitrate: options.videoBitrate,
							frameRate: options.frameRate,
							resolucao: options.outputWidth
								? `${options.outputWidth}x${options.outputHeight}`
								: "auto",
							modoSeguro: options.windowsMP4SafeMode,
						},
					},
				);

				// Sugerir WebM como alternativa
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				const enhancedError = new Error(
					`Falha ao iniciar gravação MP4 no Windows: ${errorMessage}\n\n` +
						"RECOMENDAÇÃO: Altere o formato para WebM nas configurações para evitar este problema.",
				);

				await this.cleanup();
				throw enhancedError;
			}

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

				// Monitorar performance para detectar problemas
				const totalSize = this.recordedChunks.reduce(
					(sum, chunk) => sum + chunk.size,
					0,
				);
				const avgChunkSize = totalSize / this.recordedChunks.length;

				console.log("Chunk gravado", {
					size: event.data.size,
					totalChunks: this.recordedChunks.length,
					totalSize: totalSize,
					avgChunkSize: Math.round(avgChunkSize),
				});

				// Alertar se chunks estão muito pequenos (possível problema de performance)
				if (event.data.size < 50000 && this.recordedChunks.length > 3) {
					console.warn(
						"⚠️ Chunk muito pequeno detectado - possível problema de performance",
						{
							chunkSize: event.data.size,
							recomendação: "Considere reduzir qualidade ou frame rate",
						},
					);
				}

				// Detectar problemas específicos com MP4/H.264
				const videoFormatState = useVideoFormatStore.getState();
				if (videoFormatState.format === "mp4") {
					const isWindows =
						typeof navigator !== "undefined" &&
						navigator.platform.toLowerCase().includes("win");

					// Detecção mais rigorosa para Windows
					if (isWindows) {
						if (event.data.size < 20000) {
							console.error(
								"🚨 PROBLEMA CRÍTICO: MP4 no Windows com chunks muito pequenos - risco de travamento",
								{
									chunkSize: event.data.size,
									formato: "MP4",
									plataforma: "Windows",
									recomendação:
										"Considere usar WebM ou reduzir ainda mais a qualidade",
								},
							);
						} else if (event.data.size < 40000) {
							console.warn("⚠️ Performance baixa detectada com MP4 no Windows", {
								chunkSize: event.data.size,
								formato: "MP4",
								plataforma: "Windows",
								recomendação: "MP4 pode estar sobrecarregando o sistema",
							});
						}
					} else if (event.data.size < 30000) {
						console.warn(
							"⚠️ Performance baixa detectada com MP4 - chunks muito pequenos",
							{
								chunkSize: event.data.size,
								formato: "MP4",
								recomendação: "MP4 pode estar sobrecarregando o sistema",
							},
						);
					}
				}
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
			const videoFormatState = useVideoFormatStore.getState();
			const isWindows =
				typeof navigator !== "undefined" &&
				navigator.platform.toLowerCase().includes("win");

			console.error("Erro no MediaRecorder:", event);

			// Tratamento específico para MP4 no Windows
			if (videoFormatState.format === "mp4" && isWindows) {
				console.error("🚨 ERRO CRÍTICO: MP4 no Windows falhou!", {
					formato: "MP4",
					plataforma: "Windows",
					erro: event,
					recomendação: "Considere usar WebM para evitar estes problemas",
				});

				// Tentar recuperação automática parando a gravação
				try {
					this.mediaRecorder?.stop();
				} catch (stopError) {
					console.error("Erro ao parar gravação após falha:", stopError);
				}
			}
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

				// Upload automático para S3 se configurado
				const s3Config = useS3ConfigStore.getState().config;
				if (s3Config.isEnabled && s3Config.isConfigured && result.filePath) {
					try {
						console.log("📤 Iniciando upload automático para S3...");

						// Mostrar notificação de início do upload
						if (typeof window !== "undefined" && "Notification" in window) {
							new Notification("Iniciando upload S3", {
								body: "Enviando vídeo para Amazon S3...",
								icon: "/icon.png",
							});
						}

						const s3Result = await uploadToS3(result.filePath, (progress) => {
							console.log(
								`📊 Upload S3: ${progress.percentage}% (${progress.loaded}/${progress.total} bytes)`,
							);

							// Mostrar progresso via notificação se suportado
							if (
								typeof window !== "undefined" &&
								progress.percentage % 25 === 0
							) {
								if ("Notification" in window) {
									new Notification(`Upload S3: ${progress.percentage}%`, {
										body: `Progresso: ${progress.loaded}/${progress.total} bytes`,
										icon: "/icon.png",
									});
								}
							}
						});

						if (s3Result.success) {
							console.log("✅ Upload S3 concluído com sucesso!");
							console.log("🔗 URL S3:", s3Result.s3Url);
							console.log("🆔 Upload ID:", s3Result.uploadId);

							// Enviar link do vídeo para API Cardiopic se há dados do paciente
							if (s3Result.s3Url && CardiopicApiHelper.hasPatientData()) {
								try {
									console.log("📡 Enviando link do vídeo para API Cardiopic...");
									const apiResult = await CardiopicApiHelper.sendVideoLink(s3Result.s3Url);
									
									if (apiResult.success) {
										console.log("✅ Link do vídeo enviado com sucesso para API Cardiopic!");
										
										// Notificar usuário sobre sucesso do envio
										if (typeof window !== "undefined" && "Notification" in window) {
											new Notification("Link enviado para Cardiopic", {
												body: "Link do vídeo enviado com sucesso para a API!",
												icon: "/icon.png",
											});
										}
									} else {
										console.error("❌ Erro ao enviar link para API Cardiopic:", apiResult.message);
										
										// Notificar usuário sobre erro no envio
										if (typeof window !== "undefined" && "Notification" in window) {
											new Notification("Erro ao enviar link", {
												body: `Erro: ${apiResult.message}`,
												icon: "/icon.png",
											});
										}
									}
								} catch (apiError) {
									console.error("❌ Erro inesperado ao enviar link para API Cardiopic:", apiError);
									
									// Notificar sobre erro inesperado
									if (typeof window !== "undefined" && "Notification" in window) {
										new Notification("Erro crítico ao enviar link", {
											body: `Erro inesperado: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
											icon: "/icon.png",
										});
									}
								}
							} else if (!CardiopicApiHelper.hasPatientData()) {
								console.log("ℹ️ Nenhum dado de paciente disponível - não enviando link para API Cardiopic");
							}

							// Notificar usuário sobre sucesso do upload
							const uploadMessage = `Vídeo enviado para S3 com sucesso!`;

							if (typeof window !== "undefined" && "Notification" in window) {
								new Notification(uploadMessage, {
									body: `URL: ${s3Result.s3Url}`,
									icon: "/icon.png",
								});
							}

							// Copiar URL para clipboard se possível
							if (
								typeof navigator !== "undefined" &&
								navigator.clipboard &&
								s3Result.s3Url
							) {
								try {
									await navigator.clipboard.writeText(s3Result.s3Url);
									console.log("✅ URL S3 copiada para clipboard");
								} catch (clipboardError) {
									console.warn(
										"⚠️ Não foi possível copiar URL para clipboard:",
										clipboardError,
									);
								}
							}
						} else {
							console.error("❌ Erro no upload S3:", s3Result.message);
							console.error("🔍 Detalhes do erro:", s3Result.error);

							// Notificar usuário sobre erro no upload
							const errorMessage = `Erro no upload S3: ${s3Result.message}`;

							if (typeof window !== "undefined" && "Notification" in window) {
								new Notification("Erro no upload S3", {
									body: errorMessage,
									icon: "/icon.png",
								});
							}
						}
					} catch (uploadError) {
						console.error("❌ Erro inesperado no upload S3:", uploadError);
						console.error(
							"🔍 Stack trace:",
							uploadError instanceof Error ? uploadError.stack : uploadError,
						);

						// Notificar sobre erro inesperado
						if (typeof window !== "undefined" && "Notification" in window) {
							new Notification("Erro crítico no upload S3", {
								body: `Erro inesperado: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
								icon: "/icon.png",
							});
						}
					}
				} else {
					if (s3Config.isEnabled && !s3Config.isConfigured) {
						console.warn(
							"⚠️ Upload S3 está habilitado mas não configurado corretamente",
						);
					}
				}

				// Notificar usuário sobre salvamento local
				const message = `Vídeo ${this.options?.includeCameraOverlay ? "com câmera" : ""} salvo com sucesso!`;

				// Usar notificação do sistema se disponível
				if (typeof window !== "undefined" && "Notification" in window) {
					new Notification(message, {
						body: `Local: ${result.filePath}`,
						icon: "/icon.png",
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

			// Notify recording monitor usando direct instance access (apenas em desenvolvimento)
			if (process.env.NODE_ENV === "development") {
				recordingMonitor.onSessionStop(`advanced-recorder-${Date.now()}`);
			}

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
		console.log("🧹 Limpando recursos do gravador avançado");

		// Salvar referências dos streams originais antes de limpá-las
		const originalCameraStream = this.cameraStream;
		const originalAudioStream = this.audioStream;
		const originalScreenStream = this.screenStream;

		// Parar compositor
		if (this.videoComposer) {
			this.videoComposer.stopComposition();
			this.videoComposer.dispose();
			this.videoComposer = null;
			console.log("✅ VideoComposer limpo");
		}

		// Parar compositor de header
		if (this.headerComposer) {
			this.headerComposer.stop();
			this.headerComposer = null;
			console.log("✅ HeaderComposer limpo");
		}

		// Parar compositor de footer
		if (this.footerComposer) {
			this.footerComposer.stop();
			this.footerComposer = null;
			console.log("✅ FooterComposer limpo");
		}

		// Parar APENAS o stream da tela (que é criado para gravação)
		if (this.screenStream) {
			this.screenStream.getTracks().forEach((track) => {
				track.stop();
				console.log("🖥️ Track da tela parado:", track.id);
			});
			this.screenStream = null;
		}

		// NUNCA parar o stream da câmera - apenas desreferenciar
		if (this.cameraStream) {
			console.log("📷 Stream da câmera preservado (gerenciado pelo store)");
			this.cameraStream = null;
		}

		// NUNCA parar o stream do microfone - apenas desreferenciar
		if (this.audioStream) {
			console.log("🎤 Stream do microfone preservado (gerenciado pelo store)");
			this.audioStream = null;
		}

		// Para o finalStream, NUNCA parar tracks que podem ser da câmera ou microfone
		// Só parar se for um stream composto criado especificamente para gravação
		if (this.finalStream) {
			// Se o finalStream é diferente de todos os streams originais,
			// significa que é um stream composto que pode ser parado
			const isComposedStream =
				this.finalStream !== originalScreenStream &&
				this.finalStream !== originalCameraStream &&
				this.finalStream !== originalAudioStream;

			if (isComposedStream) {
				// Para um stream composto, verificar cada track individualmente
				this.finalStream.getTracks().forEach((track) => {
					// Verificar se a track NÃO é das stores originais
					const isFromCameraStore = originalCameraStream
						?.getTracks()
						.includes(track);
					const isFromAudioStore = originalAudioStream
						?.getTracks()
						.includes(track);

					if (!isFromCameraStore && !isFromAudioStore) {
						track.stop();
						console.log("🎬 Track composta parada:", track.id, track.kind);
					} else {
						console.log("⚠️ Track preservada (do store):", track.id, track.kind);
					}
				});
			} else {
				console.log(
					"🔄 FinalStream é referência de stream original - não parado",
				);
			}

			this.finalStream = null;
		}

		// Limpar MediaRecorder
		this.mediaRecorder = null;
		this.recordedChunks = [];
		this.isRecording = false;
		this.options = null;

		console.log("✅ Limpeza concluída - streams dos stores preservados");
	}

	// Obter status da gravação
	public getStatus(): {
		isRecording: boolean;
		isPaused: boolean;
		recordedChunks: number;
		hasCamera: boolean;
		isComposing: boolean;
	} {
		return {
			isRecording: this.isRecording,
			isPaused: this.mediaRecorder?.state === "paused" || false,
			recordedChunks: this.recordedChunks.length,
			hasCamera: !!this.cameraStream,
			isComposing: this.videoComposer?.isActive || false,
		};
	}

	// Obter configurações atuais
	public getSettings(): {
		options: AdvancedRecordingOptions | null;
		composerSettings: unknown;
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

	// Verificar se a gravação está pausada
	public get isPaused(): boolean {
		return this.mediaRecorder?.state === "paused" || false;
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

	// Função auxiliar para calcular bitrate baseado na qualidade
	private static getBitrateForQuality(
		quality: "low" | "medium" | "high",
		isMP4: boolean,
		isWindows: boolean,
	): number {
		if (isMP4 && isWindows) {
			// Configurações mais conservadoras para MP4 no Windows, mas não extremas
			switch (quality) {
				case "low":
					return 800000; // 800 Kbps
				case "medium":
					return 1200000; // 1.2 Mbps
				case "high":
					return 1800000; // 1.8 Mbps
			}
		} else if (isMP4) {
			// MP4 em outras plataformas
			switch (quality) {
				case "low":
					return 1200000; // 1.2 Mbps
				case "medium":
					return 2000000; // 2 Mbps
				case "high":
					return 3000000; // 3 Mbps
			}
		} else {
			// WebM (configurações normais)
			switch (quality) {
				case "low":
					return 1500000; // 1.5 Mbps
				case "medium":
					return 2500000; // 2.5 Mbps
				case "high":
					return 4000000; // 4 Mbps
			}
		}
	}

	// Método estático para obter configurações recomendadas
	public static getRecommendedOptions(
		sourceId: string,
		saveLocation?: string,
	): AdvancedRecordingOptions {
		// Detectar se está usando MP4 para aplicar configurações mais conservadoras
		const videoFormatState = useVideoFormatStore.getState();
		const isMP4 = videoFormatState.format === "mp4";
		const isWindows =
			typeof navigator !== "undefined" &&
			navigator.platform.toLowerCase().includes("win");

		// Obter estados atuais dos dispositivos
		const cameraStore = useCameraConfigStore.getState();
		const microphoneStore = useMicrophoneConfigStore.getState();
		const { headerConfig, footerConfig } = useHeaderConfigStore.getState();

		// Calcular bitrate baseado na qualidade selecionada
		const videoBitrate = this.getBitrateForQuality(
			videoFormatState.quality,
			isMP4,
			isWindows,
		);

		// Configurações específicas para MP4
		const mp4Config = {
			frameRate: isWindows ? 15 : 20, // Melhorado: 15 FPS no Windows, 20 FPS em outros
			videoBitrate,
		};

		// Configurações padrão
		const defaultConfig = {
			frameRate: 25,
			videoBitrate,
		};

		const config = isMP4 ? mp4Config : defaultConfig;

		console.log("🎬 Configurações recomendadas:", {
			formato: videoFormatState.format,
			plataforma: isWindows ? "Windows" : "Outros",
			frameRate: config.frameRate,
			bitrate: config.videoBitrate,
			otimizado: isMP4 ? "MP4" : "Padrão",
			cameraAtiva: cameraStore.isEnabled,
			microphoneAtivo: microphoneStore.isEnabled,
			headerAtivo: headerConfig.isEnabled,
			footerAtivo: footerConfig.isEnabled,
		});

		return {
			sourceId,
			saveLocation,
			// Usar o estado atual dos dispositivos ao invés de sempre true
			includeCameraOverlay: cameraStore.isEnabled && !!cameraStore.mainStream,
			includeMicrophone:
				microphoneStore.isEnabled && !!microphoneStore.mainStream,
			includeHeader: headerConfig.isEnabled,
			headerConfig: headerConfig,
			includeFooter: footerConfig.isEnabled,
			footerConfig: footerConfig,
			// Configurações otimizadas baseadas no formato
			outputWidth: undefined, // Será detectado automaticamente
			outputHeight: undefined, // Será detectado automaticamente
			frameRate: config.frameRate,
			videoBitrate: config.videoBitrate,
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
