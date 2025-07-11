import type { FooterConfig } from "@/store/store-header-config";

export class VideoFooterComposer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private video: HTMLVideoElement;
	private animationFrameId: number | null = null;
	private stream: MediaStream | null = null;
	private config: FooterConfig;

	constructor(config: FooterConfig) {
		this.config = config;

		// Create canvas element
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d", { alpha: false })!;

		// Configurar contexto para forçar preenchimento completo
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.fillStyle = "#000000";

		// Create video element for source stream
		this.video = document.createElement("video");
		this.video.autoplay = true;
		this.video.muted = true;
		// Forçar dimensões do vídeo para garantir renderização correta
		this.video.style.width = "100%";
		this.video.style.height = "100%";
		this.video.style.objectFit = "fill";

		console.log("VideoFooterComposer initialized", config);
	}

	public async composeWithFooter(
		inputStream: MediaStream,
		width: number,
		height: number,
	): Promise<MediaStream> {
		console.log("VideoFooterComposer: Iniciando composição com footer", {
			requestedDimensions: { width, height },
			footerConfig: this.config,
			inputStreamTracks: inputStream.getTracks().length,
			audioTracks: inputStream.getAudioTracks().length,
		});

		if (!this.config.isEnabled) {
			console.log("Footer disabled, returning original stream");
			return inputStream;
		}

		const footerHeight = this.config.height;
		const totalHeight = height + footerHeight;

		// Set canvas dimensions
		this.canvas.width = width;
		this.canvas.height = totalHeight;

		console.log("VideoFooterComposer: Canvas configurado", {
			canvasWidth: this.canvas.width,
			canvasHeight: this.canvas.height,
			originalHeight: height,
			footerHeight,
			totalHeight,
		});

		// Set video source
		this.video.srcObject = inputStream;

		// Wait for video to be ready with proper error handling
		console.log("🔍 DEBUG: Configurando vídeo source para footer");
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Timeout aguardando vídeo ficar pronto"));
			}, 5000);

			const onLoadedMetadata = () => {
				console.log("🔍 DEBUG: Metadados do vídeo carregados");
				clearTimeout(timeout);
				this.video.removeEventListener("loadedmetadata", onLoadedMetadata);
				this.video.removeEventListener("error", onError);
				resolve();
			};

			const onError = (error: Event) => {
				console.error("🔍 DEBUG: Erro no vídeo:", error);
				clearTimeout(timeout);
				this.video.removeEventListener("loadedmetadata", onLoadedMetadata);
				this.video.removeEventListener("error", onError);
				reject(error);
			};

			this.video.addEventListener("loadedmetadata", onLoadedMetadata);
			this.video.addEventListener("error", onError);

			// Try to play the video
			this.video.play().catch((error) => {
				console.warn("🔍 DEBUG: Aviso ao reproduzir vídeo:", error);
				// Don't reject here, as autoplay issues are common but don't prevent processing
			});
		});

		// Additional check for video dimensions
		if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
			console.log("🔍 DEBUG: Aguardando dimensões do vídeo para footer...");
			await new Promise<void>((resolve) => {
				const checkDimensions = () => {
					console.log("🔍 DEBUG: Verificando dimensões:", {
						videoWidth: this.video.videoWidth,
						videoHeight: this.video.videoHeight,
						readyState: this.video.readyState,
					});
					if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
						console.log("🔍 DEBUG: Dimensões do vídeo prontas!");
						resolve();
					} else {
						setTimeout(checkDimensions, 10);
					}
				};
				checkDimensions();
			});
		}

		console.log("VideoFooterComposer: Vídeo fonte configurado e reproduzindo", {
			videoDimensions: {
				width: this.video.videoWidth,
				height: this.video.videoHeight,
			},
			canvasDimensions: {
				width: this.canvas.width,
				height: this.canvas.height,
			},
		});

		// Start composition loop
		this.startComposition();

		// Create the output stream with video from canvas
		const canvasStream = this.canvas.captureStream(30);
		const videoTracks = canvasStream.getVideoTracks();
		const audioTracks = inputStream.getAudioTracks();

		// Combine video from canvas with audio from source
		this.stream = new MediaStream([...videoTracks, ...audioTracks]);

		console.log("VideoFooterComposer: Stream de saída criado", {
			outputStreamTracks: this.stream.getTracks().length,
			videoTracks: videoTracks.length,
			audioTracks: audioTracks.length,
		});

		return this.stream;
	}

	private startComposition() {
		console.log("🔍 DEBUG: VideoFooterComposer: Iniciando loop de composição");
		let frameCount = 0;

		const draw = () => {
			frameCount++;
			if (frameCount % 300 === 0) {
				// Log a cada 10 segundos (30fps * 10s = 300 frames)
				console.log("🔍 DEBUG: Footer renderizando frame", frameCount);
			}
			if (!this.config.isEnabled) {
				console.log(
					"VideoFooterComposer: Footer desabilitado, desenhando apenas vídeo",
				);
				// If footer is disabled, just draw the video
				this.ctx.drawImage(
					this.video,
					0,
					0,
					this.canvas.width,
					this.canvas.height,
				);
			} else {
				// Clear canvas
				this.ctx.fillStyle = "#000000";
				this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

				// Calculate original content height (total height - footer height)
				const originalContentHeight = this.canvas.height - this.config.height;

				// Draw original video in the upper portion
				// Use the FULL source video dimensions and scale to fit the available space
				this.ctx.drawImage(
					this.video,
					0,
					0, // source x, y
					this.video.videoWidth || this.canvas.width, // source width (full video width)
					this.video.videoHeight || this.canvas.height, // source height (full video height)
					0,
					0, // destination x, y
					this.canvas.width, // destination width
					originalContentHeight, // destination height (compressed to fit above footer)
				);

				// Draw footer area (empty space) at the bottom
				this.ctx.fillStyle = "rgba(31, 41, 55, 0.95)"; // Dark background similar to header
				this.ctx.fillRect(
					0,
					originalContentHeight,
					this.canvas.width,
					this.config.height,
				);

				// Optional: Add subtle border between content and footer
				this.ctx.strokeStyle = "rgba(107, 114, 128, 0.5)";
				this.ctx.lineWidth = 1;
				this.ctx.beginPath();
				this.ctx.moveTo(0, originalContentHeight);
				this.ctx.lineTo(this.canvas.width, originalContentHeight);
				this.ctx.stroke();
			}

			this.animationFrameId = requestAnimationFrame(draw);
		};

		draw();
	}

	public stop(): void {
		console.log("VideoFooterComposer: Parando compositor");

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.video.srcObject) {
			const tracks = (this.video.srcObject as MediaStream).getTracks();
			tracks.forEach((track) => track.stop());
			this.video.srcObject = null;
		}

		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}

		console.log("VideoFooterComposer: Compositor parado");
	}

	public updateFooterConfig(newConfig: FooterConfig) {
		this.config = newConfig;
	}
}
