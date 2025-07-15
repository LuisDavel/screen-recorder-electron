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
	cameraOnly?: boolean;
	optimizeForPlatform?: boolean;
}

interface PlatformConfig {
	isWindows: boolean;
	isMac: boolean;
	chunkSize: number;
	maxResolution: { width: number; height: number };
	defaultFrameRate: number;
	defaultBitrate: { webm: number; mp4: number };
	backgroundMonitoringInterval: number;
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
	private platformConfig: PlatformConfig;
	private backgroundMonitoringInterval: NodeJS.Timeout | null = null;
	private lastVisibilityState: boolean = false;
	private lastChunkCount: number = 0;

	constructor() {
		this.platformConfig = this.initializePlatformConfig();
		this.setupEventListeners();
	}

	private initializePlatformConfig(): PlatformConfig {
		const userAgent =
			typeof navigator !== "undefined" ? navigator.userAgent : "";
		const platform = typeof navigator !== "undefined" ? navigator.platform : "";

		const isWindows = /Win/.test(platform) || /Windows/.test(userAgent);
		const isMac = /Mac/.test(platform) || /macOS/.test(userAgent);

		return {
			isWindows,
			isMac,
			chunkSize: isWindows ? 800 : isMac ? 1200 : 1000,
			maxResolution: {
				width: isWindows ? 1280 : isMac ? 1920 : 1920,
				height: isWindows ? 720 : isMac ? 1080 : 1080,
			},
			defaultFrameRate: isWindows ? 20 : isMac ? 30 : 25,
			defaultBitrate: {
				webm: isWindows ? 1500000 : isMac ? 2500000 : 2000000,
				mp4: isWindows ? 1000000 : isMac ? 2000000 : 1500000,
			},
			backgroundMonitoringInterval: isWindows ? 8000 : isMac ? 5000 : 6000,
		};
	}

	private setupEventListeners(): void {
		if (typeof window === "undefined") return;

		window.addEventListener("recording-background-mode", (event: Event) => {
			const customEvent = event as CustomEvent;
			this.handleBackgroundMode(customEvent.detail?.enabled || false);
		});

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", () => {
				if (this.isRecording) {
					this.handleBackgroundMode(document.hidden);
				}
			});
		}

		window.addEventListener("blur", () => {
			if (this.isRecording) {
				setTimeout(() => {
					if (document.hidden && this.isRecording) {
						this.handleBackgroundMode(true);
					}
				}, 200);
			}
		});

		window.addEventListener("focus", () => {
			if (this.isRecording) {
				setTimeout(() => {
					if (!document.hidden && this.isRecording) {
						this.handleBackgroundMode(false);
					}
				}, 200);
			}
		});
	}

	private handleBackgroundMode(enabled: boolean): void {
		if (this.videoComposer) {
			const event = new CustomEvent("recording-background-mode", {
				detail: { enabled },
			});
			window.dispatchEvent(event);
		}

		if (enabled && this.isRecording) {
			this.startBackgroundMonitoring();
		} else if (!enabled && this.isRecording) {
			this.stopBackgroundMonitoring();
		}
	}

	private startBackgroundMonitoring(): void {
		this.showNotification(
			"Gravação em Segundo Plano",
			"A gravação continua funcionando mesmo com a janela minimizada.",
		);

		if (this.backgroundMonitoringInterval) {
			clearInterval(this.backgroundMonitoringInterval);
		}

		this.backgroundMonitoringInterval = setInterval(() => {
			if (!this.isRecording) {
				this.stopBackgroundMonitoring();
				return;
			}

			if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
				const currentChunks = this.recordedChunks.length;

				if (currentChunks === this.lastChunkCount) {
					this.showNotification(
						"Possível Problema na Gravação",
						"Retorne à janela para verificar.",
					);
				}

				this.lastChunkCount = currentChunks;
			}
		}, this.platformConfig.backgroundMonitoringInterval);
	}

	private stopBackgroundMonitoring(): void {
		if (this.backgroundMonitoringInterval) {
			clearInterval(this.backgroundMonitoringInterval);
			this.backgroundMonitoringInterval = null;
		}
		this.lastChunkCount = 0;
	}

	private showNotification(title: string, body: string): void {
		if (typeof window !== "undefined" && "Notification" in window) {
			if (Notification.permission === "granted") {
				new Notification(title, { body, icon: "/icon.png" });
			} else if (Notification.permission !== "denied") {
				Notification.requestPermission().then((permission) => {
					if (permission === "granted") {
						new Notification(title, { body, icon: "/icon.png" });
					}
				});
			}
		}
	}

	private async getScreenStream(sourceId: string): Promise<MediaStream> {
		if (sourceId === "camera-only") {
			const cameraStream = this.getCameraStream();
			if (!cameraStream) {
				throw new Error(
					"Stream da câmera não disponível para modo câmera apenas",
				);
			}
			return cameraStream;
		}

		if (sourceId && sourceId !== "generic") {
			return await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: sourceId,
					},
				} as MediaTrackConstraints & {
					mandatory: {
						chromeMediaSource: string;
						chromeMediaSourceId: string;
					};
				},
			});
		}

		return await navigator.mediaDevices.getDisplayMedia({
			video: {
				width: { ideal: this.platformConfig.maxResolution.width },
				height: { ideal: this.platformConfig.maxResolution.height },
				frameRate: { ideal: this.platformConfig.defaultFrameRate },
			},
			audio: false,
		});
	}

	private getCameraStream(): MediaStream | null {
		const cameraStore = useCameraConfigStore.getState();
		return cameraStore.isEnabled && cameraStore.mainStream
			? cameraStore.mainStream
			: null;
	}

	private getMicrophoneStream(
		includeMicrophone: boolean = true,
	): MediaStream | null {
		if (!includeMicrophone) return null;

		const microphoneStore = useMicrophoneConfigStore.getState();

		if (!microphoneStore.isEnabled || !microphoneStore.mainStream) {
			return null;
		}

		const stream = microphoneStore.mainStream;
		const activeAudioTracks = stream
			.getAudioTracks()
			.filter((track) => track.readyState === "live" && track.enabled);

		if (activeAudioTracks.length === 0) {
			microphoneStore.initializeMainStream();
			return null;
		}

		return stream;
	}

	private async setupVideoComposer(
		screenStream: MediaStream,
		cameraStream: MediaStream | null,
		audioStream: MediaStream | null,
		options: AdvancedRecordingOptions,
	): Promise<MediaStream> {
		let currentStream = screenStream;

		// Modo câmera apenas
		if (options.cameraOnly) {
			if (audioStream) {
				try {
					const combinedStream = new MediaStream([
						...currentStream.getVideoTracks(),
						...audioStream.getAudioTracks(),
					]);
					return combinedStream;
				} catch {
					return currentStream;
				}
			}
			return currentStream;
		}

		// Sobreposição de câmera
		if (cameraStream && options.includeCameraOverlay) {
			try {
				const cameraStore = useCameraConfigStore.getState();
				const screenTrack = screenStream.getVideoTracks()[0];
				const screenSettings = screenTrack.getSettings();

				let finalWidth = Math.min(
					screenSettings.width || this.platformConfig.maxResolution.width,
					this.platformConfig.maxResolution.width,
				);
				let finalHeight = Math.min(
					screenSettings.height || this.platformConfig.maxResolution.height,
					this.platformConfig.maxResolution.height,
				);

				if (options.outputWidth && options.outputHeight) {
					finalWidth = options.outputWidth;
					finalHeight = options.outputHeight;
				}

				const composerOptions = {
					screenStream: currentStream,
					cameraStream: cameraStream,
					cameraPosition: cameraStore.position as CameraPositionType,
					cameraSize: cameraStore.size as CameraSizeType,
					audioStream: undefined,
					outputWidth: finalWidth,
					outputHeight: finalHeight,
					frameRate: options.frameRate || this.platformConfig.defaultFrameRate,
				};

				this.videoComposer = new VideoComposer(composerOptions);
				currentStream = this.videoComposer.startComposition();
			} catch {
				// Continuar sem compositor em caso de erro
			}
		}

		// Header
		if (options.includeHeader && options.headerConfig?.isEnabled) {
			try {
				this.headerComposer = new VideoHeaderComposer(options.headerConfig);

				const currentTrack = currentStream.getVideoTracks()[0];
				const settings = currentTrack?.getSettings();
				const width =
					settings?.width || this.platformConfig.maxResolution.width;
				const height =
					settings?.height || this.platformConfig.maxResolution.height;

				currentStream = await this.headerComposer.composeWithHeader(
					currentStream,
					width,
					height,
				);
			} catch {
				// Continuar sem header em caso de erro
			}
		}

		// Footer
		if (options.includeFooter && options.footerConfig?.isEnabled) {
			try {
				this.footerComposer = new VideoFooterComposer(options.footerConfig);

				const currentTrack = currentStream.getVideoTracks()[0];
				const settings = currentTrack?.getSettings();
				const width =
					settings?.width || this.platformConfig.maxResolution.width;
				const height =
					settings?.height || this.platformConfig.maxResolution.height;

				currentStream = await this.footerComposer.composeWithFooter(
					currentStream,
					width,
					height,
				);
			} catch {
				// Continuar sem footer em caso de erro
			}
		}

		// Adicionar áudio
		if (audioStream) {
			const videoTracks = currentStream.getVideoTracks();
			const audioTracks = audioStream.getAudioTracks();
			currentStream = new MediaStream([...videoTracks, ...audioTracks]);
		}

		return currentStream;
	}

	private getSupportedMimeType(): string {
		const videoFormatState = useVideoFormatStore.getState();
		const desiredMimeType = videoFormatState.getMimeType();

		if (MediaRecorder.isTypeSupported(desiredMimeType)) {
			return desiredMimeType;
		}

		const supportedTypes = [
			"video/webm; codecs=vp8",
			"video/webm; codecs=vp9",
			"video/webm",
			"video/mp4",
			"video/mp4; codecs=h264",
		];

		for (const type of supportedTypes) {
			if (MediaRecorder.isTypeSupported(type)) {
				return type;
			}
		}

		throw new Error("Nenhum codec de vídeo suportado encontrado");
	}

	public async startRecording(
		options: AdvancedRecordingOptions,
	): Promise<void> {
		if (this.isRecording) {
			throw new Error("Gravação já está em andamento");
		}

		this.options = options;

		try {
			const videoFormatState = useVideoFormatStore.getState();

			// Aplicar configurações otimizadas por plataforma
			if (options.optimizeForPlatform !== false) {
				const format = videoFormatState.format;
				const platformBitrate =
					this.platformConfig.defaultBitrate[
						format as keyof typeof this.platformConfig.defaultBitrate
					] || this.platformConfig.defaultBitrate.webm;

				options.videoBitrate = options.videoBitrate || platformBitrate;
				options.frameRate =
					options.frameRate || this.platformConfig.defaultFrameRate;

				if (!options.outputWidth || !options.outputHeight) {
					options.outputWidth = this.platformConfig.maxResolution.width;
					options.outputHeight = this.platformConfig.maxResolution.height;
				}
			}

			// Configurações específicas para WhatsApp
			if (videoFormatState.format === "whatsapp") {
				const whatsappSettings =
					videoFormatState.getWhatsAppOptimizedSettings();
				options.videoBitrate = whatsappSettings.bitrate;
				options.outputWidth = whatsappSettings.maxResolution.width;
				options.outputHeight = whatsappSettings.maxResolution.height;
			}

			// Obter streams
			this.screenStream = await this.getScreenStream(options.sourceId);
			this.cameraStream = options.includeCameraOverlay
				? this.getCameraStream()
				: null;
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
				videoBitsPerSecond: options.videoBitrate,
			};

			this.mediaRecorder = new MediaRecorder(
				this.finalStream,
				recordingOptions,
			);
			this.setupRecorderListeners();

			// Iniciar gravação
			this.mediaRecorder.start(this.platformConfig.chunkSize);
			this.isRecording = true;
			this.recordedChunks = [];

			// Notificar monitor de gravação
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
		} catch (error) {
			await this.cleanup();
			throw error;
		}
	}

	private setupRecorderListeners(): void {
		if (!this.mediaRecorder) return;

		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				this.recordedChunks.push(event.data);
			}
		};

		this.mediaRecorder.onstart = () => {};
		this.mediaRecorder.onpause = () => {};
		this.mediaRecorder.onresume = () => {};
		this.mediaRecorder.onerror = () => {};
		this.mediaRecorder.onstop = async () => {
			await this.processRecording();
		};
	}

	private async processRecording(): Promise<void> {
		if (this.recordedChunks.length === 0) {
			throw new Error("Nenhum dado de vídeo foi capturado");
		}

		const videoFormatState = useVideoFormatStore.getState();
		const mimeType = videoFormatState.getMimeType();

		const blob = new Blob(this.recordedChunks, { type: mimeType });
		const buffer = await blob.arrayBuffer();
		const videoBuffer = Buffer.from(new Uint8Array(buffer));

		let result;
		const format = videoFormatState.format;

		if (this.options?.saveLocation) {
			result = await saveToLocation(
				videoBuffer,
				this.options.saveLocation,
				format,
			);
		} else {
			result = await saveRecording(videoBuffer, format);
		}

		if (result.success) {
			// Upload S3 se configurado
			const s3Config = useS3ConfigStore.getState().config;
			if (s3Config.isEnabled && s3Config.isConfigured && result.filePath) {
				try {
					this.showNotification(
						"Iniciando upload S3",
						"Enviando vídeo para Amazon S3...",
					);

					const s3Result = await uploadToS3(result.filePath, () => {});

					if (s3Result.success) {
						this.showNotification(
							"Upload S3 concluído",
							`URL: ${s3Result.s3Url}`,
						);

						if (
							typeof navigator !== "undefined" &&
							navigator.clipboard &&
							s3Result.s3Url
						) {
							try {
								await navigator.clipboard.writeText(s3Result.s3Url);
							} catch {
								// Ignorar erro de clipboard
							}
						}
					} else {
						this.showNotification(
							"Erro no upload S3",
							s3Result.message || "Erro desconhecido",
						);
					}
				} catch {
					this.showNotification(
						"Erro crítico no upload S3",
						"Erro inesperado durante o upload",
					);
				}
			}

			// Notificar salvamento local
			const message = `Vídeo ${this.options?.includeCameraOverlay ? "com câmera" : ""} salvo com sucesso!`;
			this.showNotification(
				message,
				`Formato: ${format.toUpperCase()}\nLocal: ${result.filePath}`,
			);
		} else {
			throw new Error(result.message || "Erro desconhecido ao salvar");
		}
	}

	public async stopRecording(): Promise<void> {
		if (!this.isRecording) return;

		try {
			if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
				this.mediaRecorder.stop();
			}

			this.isRecording = false;

			if (process.env.NODE_ENV === "development") {
				recordingMonitor.onSessionStop(`advanced-recorder-${Date.now()}`);
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		} finally {
			await this.cleanup();
		}
	}

	public pauseRecording(): void {
		if (!this.isRecording || !this.mediaRecorder) return;

		if (this.mediaRecorder.state === "recording") {
			this.mediaRecorder.pause();
		}
	}

	public resumeRecording(): void {
		if (!this.isRecording || !this.mediaRecorder) return;

		if (this.mediaRecorder.state === "paused") {
			this.mediaRecorder.resume();
		}
	}

	private async cleanup(): Promise<void> {
		this.stopBackgroundMonitoring();

		if (this.videoComposer) {
			this.videoComposer.stopComposition();
			this.videoComposer.dispose();
			this.videoComposer = null;
		}

		if (this.headerComposer) {
			this.headerComposer.stop();
			this.headerComposer = null;
		}

		if (this.footerComposer) {
			this.footerComposer.stop();
			this.footerComposer = null;
		}

		if (this.screenStream) {
			this.screenStream.getTracks().forEach((track) => track.stop());
			this.screenStream = null;
		}

		this.cameraStream = null;
		this.audioStream = null;
		this.finalStream = null;
		this.mediaRecorder = null;
		this.recordedChunks = [];
		this.isRecording = false;
		this.options = null;
		this.lastChunkCount = 0;
	}

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

	public getSettings(): {
		options: AdvancedRecordingOptions | null;
		composerSettings: unknown;
		platformConfig: PlatformConfig;
	} {
		return {
			options: this.options,
			composerSettings: this.videoComposer?.getSettings() || null,
			platformConfig: this.platformConfig,
		};
	}

	public get recording(): boolean {
		return this.isRecording;
	}

	public get isPaused(): boolean {
		return this.mediaRecorder?.state === "paused" || false;
	}

	public updateCameraSettings(): void {
		if (!this.videoComposer) return;

		const cameraStore = useCameraConfigStore.getState();
		this.videoComposer.updateCameraSettings(
			cameraStore.position as CameraPositionType,
			cameraStore.size as CameraSizeType,
		);
	}

	public static isSupported(): boolean {
		return (
			typeof navigator !== "undefined" &&
			!!navigator.mediaDevices &&
			!!navigator.mediaDevices.getUserMedia &&
			typeof window !== "undefined" &&
			!!window.MediaRecorder
		);
	}

	public static getRecommendedOptions(
		sourceId: string,
		saveLocation?: string,
	): AdvancedRecordingOptions {
		const cameraStore = useCameraConfigStore.getState();
		const microphoneStore = useMicrophoneConfigStore.getState();
		const { headerConfig, footerConfig } = useHeaderConfigStore.getState();

		return {
			sourceId,
			saveLocation,
			includeCameraOverlay: cameraStore.isEnabled && !!cameraStore.mainStream,
			includeMicrophone:
				microphoneStore.isEnabled && !!microphoneStore.mainStream,
			includeHeader: headerConfig.isEnabled,
			headerConfig: headerConfig,
			includeFooter: footerConfig.isEnabled,
			footerConfig: footerConfig,
			optimizeForPlatform: true,
		};
	}
}

// Instância singleton
export const advancedRecorder = new AdvancedScreenRecorderManager();

// Funções utilitárias
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

export async function stopAdvancedRecording(): Promise<void> {
	return advancedRecorder.stopRecording();
}
