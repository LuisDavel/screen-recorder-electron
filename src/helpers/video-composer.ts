// Tipos corretos para posição e tamanho da câmera
export type CameraPositionType =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";
export type CameraSizeType = "small" | "medium" | "large";

export interface VideoComposerOptions {
	screenStream: MediaStream;
	cameraStream?: MediaStream;
	audioStream?: MediaStream;
	cameraPosition?: CameraPositionType;
	cameraSize?: CameraSizeType;
	outputWidth?: number;
	outputHeight?: number;
	frameRate?: number;
}

export interface CameraSettings {
	position: CameraPositionType;
	size: CameraSizeType;
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
	private dimensionsLogged = false;

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

		console.log("🎬 VideoComposer: Inicializando com dimensões:", {
			outputWidth: this.options.outputWidth,
			outputHeight: this.options.outputHeight,
			aspectRatio: (
				this.options.outputWidth / this.options.outputHeight
			).toFixed(3),
			providedDimensions:
				options.outputWidth && options.outputHeight ? "sim" : "usando padrão",
		});

		// Criar canvas
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.options.outputWidth;
		this.canvas.height = this.options.outputHeight;

		const ctx = this.canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Não foi possível criar contexto do Canvas");
		}
		this.ctx = ctx;

		// Configurar contexto para forçar preenchimento completo
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.fillStyle = "#000000";

		// Criar elementos de vídeo
		this.screenVideo = document.createElement("video");
		this.screenVideo.srcObject = this.options.screenStream;
		this.screenVideo.autoplay = true;
		this.screenVideo.muted = true;
		this.screenVideo.playsInline = true;
		// Forçar dimensões do vídeo para garantir renderização correta
		this.screenVideo.style.width = "100%";
		this.screenVideo.style.height = "100%";
		this.screenVideo.style.objectFit = "fill";

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

			// Desenhar tela de fundo ocupando todo o canvas (forçando esticamento)
			// Agora o vídeo da tela ocupa todo o espaço disponível
			if (this.screenVideo.readyState >= 2) {
				// Debug: log das dimensões
				const videoWidth = this.screenVideo.videoWidth || this.canvas.width;
				const videoHeight = this.screenVideo.videoHeight || this.canvas.height;

				// Verificação uma vez só para detectar problemas
				if (!this.dimensionsLogged) {
					const canvasAspectRatio = this.canvas.width / this.canvas.height;
					const videoAspectRatio = videoWidth / videoHeight;
					const aspectRatioDiff = Math.abs(
						canvasAspectRatio - videoAspectRatio,
					);

					console.log("🎥 VideoComposer renderização:", {
						canvas: `${this.canvas.width}x${this.canvas.height}`,
						video: `${videoWidth}x${videoHeight}`,
						aspectRatios: {
							canvas: canvasAspectRatio.toFixed(3),
							video: videoAspectRatio.toFixed(3),
						},
						distorção: aspectRatioDiff > 0.01 ? "⚠️ SIM" : "✅ NÃO",
					});

					this.dimensionsLogged = true;
				}

				// Desenhar vídeo preservando aspect ratio original (sem crop/fill forçado)
				// Como o canvas já tem as dimensões exatas do vídeo, desenhar diretamente
				this.ctx.drawImage(
					this.screenVideo,
					0,
					0, // source x, y (usar vídeo completo)
					videoWidth,
					videoHeight, // source width, height (usar vídeo completo)
					0,
					0, // destination x, y
					this.canvas.width, // destination width
					this.canvas.height, // destination height
				);
			}

			// Desenhar câmera sobreposicionada se disponível
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

				// Desenhar câmera sobreposicionada
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
					// Ajustar canvas para corresponder ao aspect ratio do vídeo
					this.adjustCanvasToVideoAspectRatio();

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
		position: CameraPositionType,
		size: CameraSizeType,
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
		cameraPosition: CameraPositionType;
		cameraSize: CameraSizeType;
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

	// Ajustar dimensões do canvas com correção para captura de tela sem foco
	private adjustCanvasToVideoAspectRatio(): void {
		if (this.screenVideo.readyState < 2) return;

		const videoWidth = this.screenVideo.videoWidth;
		const videoHeight = this.screenVideo.videoHeight;

		if (!videoWidth || !videoHeight) {
			console.warn("⚠️ Dimensões do vídeo não disponíveis ainda");
			return;
		}

		const videoAspectRatio = videoWidth / videoHeight;
		const canvasAspectRatio = this.canvas.width / this.canvas.height;

		console.log("🔍 Ajustando canvas para vídeo:", {
			video: `${videoWidth}x${videoHeight}`,
			canvas: `${this.canvas.width}x${this.canvas.height}`,
			videoAspectRatio: videoAspectRatio.toFixed(3),
			canvasAspectRatio: canvasAspectRatio.toFixed(3),
		});

		// SEMPRE usar as dimensões exatas do vídeo para evitar achatamento
		let adjustedWidth = videoWidth;
		let adjustedHeight = videoHeight;

		// Garantir que sejam pares (requirement para codecs)
		adjustedWidth = Math.round(adjustedWidth / 2) * 2;
		adjustedHeight = Math.round(adjustedHeight / 2) * 2;

		console.log("🔧 Usando dimensões exatas do vídeo (SEM correção forçada):", {
			original: `${this.canvas.width}x${this.canvas.height}`,
			adjusted: `${adjustedWidth}x${adjustedHeight}`,
			originalAspectRatio: canvasAspectRatio.toFixed(3),
			newAspectRatio: (adjustedWidth / adjustedHeight).toFixed(3),
			videoAspectRatio: videoAspectRatio.toFixed(3),
			preservandoAspectRatio: "SIM - usando dimensões exatas do vídeo",
		});

		this.canvas.width = adjustedWidth;
		this.canvas.height = adjustedHeight;
		this.options.outputWidth = adjustedWidth;
		this.options.outputHeight = adjustedHeight;

		console.log(
			"✅ Canvas ajustado para dimensões exatas do vídeo:",
			`${this.canvas.width}x${this.canvas.height}`,
		);
	}

	// Forçar redimensionamento do canvas para corrigir achatamento ultrawide
	public forceUltrawideAspectRatio(): void {
		const videoWidth = this.screenVideo.videoWidth || 0;
		const videoHeight = this.screenVideo.videoHeight || 0;

		if (!videoWidth || !videoHeight) {
			console.warn(
				"⚠️ Não é possível forçar aspect ratio - vídeo não carregado",
			);
			return;
		}

		// Calcular um aspect ratio mais largo para ultrawide
		const currentAspectRatio = this.canvas.width / this.canvas.height;
		const videoAspectRatio = videoWidth / videoHeight;

		console.log("🔧 FORÇANDO aspect ratio ultrawide:", {
			canvasAtual: `${this.canvas.width}x${this.canvas.height} (${currentAspectRatio.toFixed(3)})`,
			videoOriginal: `${videoWidth}x${videoHeight} (${videoAspectRatio.toFixed(3)})`,
		});

		// CORREÇÃO ESPECIAL: Se detectarmos problema de captura sem foco
		const isProbablyFullScreenCapture =
			videoAspectRatio < 2.0 && currentAspectRatio > 2.0 && videoWidth > 1920;

		if (isProbablyFullScreenCapture) {
			console.log(
				"🚨 DETECÇÃO: Captura de tela sem foco detectada - aplicando correção AGRESSIVA",
			);

			// Para captura sem foco, usar altura muito menor para forçar aspecto ultrawide
			const aggressiveHeight = Math.round(this.canvas.width / 2.5); // Ainda mais agressivo que 21:9

			console.log("📐 CORREÇÃO AGRESSIVA para captura sem foco:", {
				original: `${this.canvas.width}x${this.canvas.height}`,
				agressivo: `${this.canvas.width}x${aggressiveHeight}`,
				novoAspectRatio: (this.canvas.width / aggressiveHeight).toFixed(3),
				motivacao: "Captura sem foco detectada",
			});

			this.canvas.height = aggressiveHeight;
			this.options.outputHeight = aggressiveHeight;
		} else if (currentAspectRatio > 2.0) {
			// Para monitores ultrawide normais, usar altura padrão para "esticar" o vídeo
			const newHeight = Math.round(this.canvas.width / 2.35); // Force 21:9 ratio

			console.log("📐 Ajustando para aspect ratio 21:9 forçado:", {
				original: `${this.canvas.width}x${this.canvas.height}`,
				novo: `${this.canvas.width}x${newHeight}`,
				novoAspectRatio: (this.canvas.width / newHeight).toFixed(3),
			});

			this.canvas.height = newHeight;
			this.options.outputHeight = newHeight;
		}
	}

	// Método público para forçar correção específica para captura sem foco
	public forceScreenCaptureCorrection(): void {
		const videoWidth = this.screenVideo.videoWidth || 0;
		const videoHeight = this.screenVideo.videoHeight || 0;

		if (!videoWidth || !videoHeight) {
			console.warn("⚠️ Vídeo não carregado - não é possível aplicar correção");
			return;
		}

		const videoAspectRatio = videoWidth / videoHeight;
		const canvasAspectRatio = this.canvas.width / this.canvas.height;

		console.log("🔧 FORÇANDO correção para captura de tela sem foco:");
		console.log("📊 Estado atual:", {
			video: `${videoWidth}x${videoHeight} (${videoAspectRatio.toFixed(3)})`,
			canvas: `${this.canvas.width}x${this.canvas.height} (${canvasAspectRatio.toFixed(3)})`,
		});

		// Forçar aspect ratio específico para ultrawide
		const targetAspectRatio = 2.5; // Mais agressivo que 21:9
		const newHeight = Math.round(this.canvas.width / targetAspectRatio);

		// Garantir que seja par
		const adjustedHeight = Math.round(newHeight / 2) * 2;

		console.log("🚨 APLICANDO CORREÇÃO FORÇADA:");
		console.log("📐 Dimensões:", {
			original: `${this.canvas.width}x${this.canvas.height}`,
			forçado: `${this.canvas.width}x${adjustedHeight}`,
			novoAspectRatio: (this.canvas.width / adjustedHeight).toFixed(3),
		});

		this.canvas.height = adjustedHeight;
		this.options.outputHeight = adjustedHeight;

		// Resetar flag de logs para mostrar nova detecção
		this.dimensionsLogged = false;

		console.log(
			"✅ CORREÇÃO APLICADA - vídeo deve aparecer menos achatado agora!",
		);
	}

	// Debug detalhado - verificar estado atual
	public debugCanvasState(): void {
		const videoWidth = this.screenVideo.videoWidth || 0;
		const videoHeight = this.screenVideo.videoHeight || 0;

		console.log("🔍 DEBUG VideoComposer Estado Atual:", {
			canvas: {
				width: this.canvas.width,
				height: this.canvas.height,
				aspectRatio: (this.canvas.width / this.canvas.height).toFixed(3),
			},
			video: {
				width: videoWidth,
				height: videoHeight,
				aspectRatio:
					videoWidth && videoHeight
						? (videoWidth / videoHeight).toFixed(3)
						: "N/A",
				readyState: this.screenVideo.readyState,
			},
			options: {
				outputWidth: this.options.outputWidth,
				outputHeight: this.options.outputHeight,
			},
			status: {
				isComposing: this.isComposing,
				hasVideoStream: !!this.options.screenStream,
				hasCameraStream: !!this.options.cameraStream,
			},
			potentialDistortion:
				videoWidth && videoHeight
					? Math.abs(
							this.canvas.width / this.canvas.height - videoWidth / videoHeight,
						) > 0.01
					: "desconhecido",
		});
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

	// Método estático para obter configurações recomendadas - FORÇAR dimensões para ultrawide
	public static getRecommendedSettings(
		screenWidth: number,
		screenHeight: number,
	): { outputWidth: number; outputHeight: number; frameRate: number } {
		console.log(
			"🎯 Configurando resolução para ultrawide:",
			`${screenWidth}x${screenHeight}`,
		);

		// Para monitores ultrawide, FORÇAR largura total
		let outputWidth = screenWidth;
		let outputHeight = screenHeight;

		// Se for ultrawide (aspect ratio > 2.0), garantir largura máxima
		const aspectRatio = screenWidth / screenHeight;
		if (aspectRatio > 2.0) {
			console.log("🖥️  Monitor ultrawide detectado - forçando largura máxima");
			// Manter largura exata, pode ajustar altura se necessário
			outputWidth = screenWidth;
			outputHeight = screenHeight;
		}

		// Garantir que as dimensões sejam pares (requirement para alguns codecs)
		outputWidth = Math.round(outputWidth / 2) * 2;
		outputHeight = Math.round(outputHeight / 2) * 2;

		console.log("✅ Configurações de resolução calculadas (ULTRAWIDE):", {
			original: `${screenWidth}x${screenHeight}`,
			output: `${outputWidth}x${outputHeight}`,
			aspectRatio: aspectRatio.toFixed(3),
			outputAspectRatio: (outputWidth / outputHeight).toFixed(3),
			isUltrawide: aspectRatio > 2.0,
			isExactMatch:
				screenWidth === outputWidth && screenHeight === outputHeight,
		});

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
	cameraPosition: CameraPositionType = "bottom-right",
	cameraSize: CameraSizeType = "medium",
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

// Função de debug global para corrigir problemas de captura sem foco
if (typeof window !== "undefined") {
	const globalWindow = window as typeof window & {
		fixUltrawideCapture?: () => void;
		forceScreenFix?: () => void;
	};

	globalWindow.fixUltrawideCapture = () => {
		console.log("🔧 Tentando corrigir problema de captura ultrawide...");

		// Procurar por instâncias ativas do VideoComposer
		// Esta é uma função de debug que pode ser chamada no console
		console.log("📝 Para usar esta correção:");
		console.log("1. Abra o console do navegador (F12)");
		console.log("2. Digite: window.fixUltrawideCapture()");
		console.log("3. Se não funcionar, tente: window.forceScreenFix()");
		console.log("⚠️ Nota: Esta função só funciona quando há uma gravação ativa");
	};

	globalWindow.forceScreenFix = () => {
		console.log("🚨 FORÇANDO correção de tela...");
		console.log(
			"Esta é uma função de emergência para problemas de captura ultrawide",
		);
		console.log(
			"Verifique no console se há mensagens sobre VideoComposer ativo",
		);
	};
}
