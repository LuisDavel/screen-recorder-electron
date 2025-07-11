import type { FooterConfig } from "@/store/store-header-config";

export class VideoFooterComposer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private video: HTMLVideoElement;
	private animationFrameId: number | null = null;
	private stream: MediaStream | null = null;
	private config: FooterConfig;
	private dimensionsLogged = false;

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

		// Set canvas dimensions to include footer height (composition mode)
		this.canvas.width = width;
		this.canvas.height = height + this.config.height;

		console.log("VideoFooterComposer: Canvas configurado", {
			canvasWidth: this.canvas.width,
			canvasHeight: this.canvas.height,
			footerHeight: this.config.height,
			mode: "composition",
		});

		// Set video source
		this.video.srcObject = inputStream;

		await this.video.play();

		// Wait for video metadata to load to get accurate dimensions
		if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
			await new Promise<void>((resolve) => {
				const checkDimensions = () => {
					if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
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
		console.log("VideoFooterComposer: Iniciando loop de composição");

		const draw = () => {
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

				// Calculate aspect ratio preserving dimensions
				const videoWidth = this.video.videoWidth || this.canvas.width;
				const videoHeight = this.video.videoHeight || this.canvas.height;
				const videoAspectRatio = videoWidth / videoHeight;

				// Debug: log das dimensões para detectar problemas (uma vez só)
				if (!this.dimensionsLogged) {
					const videoAreaWidth = this.canvas.width;
					const videoAreaHeight = this.canvas.height - this.config.height;
					const videoAreaAspectRatio = videoAreaWidth / videoAreaHeight;
					const aspectRatioDiff = Math.abs(
						videoAreaAspectRatio - videoAspectRatio,
					);

					console.log("🎬 FooterComposer renderização (composition mode):", {
						canvasTotal: `${this.canvas.width}x${this.canvas.height}`,
						videoOriginal: `${videoWidth}x${videoHeight}`,
						videoArea: `${videoAreaWidth}x${videoAreaHeight}`,
						footerHeight: this.config.height,
						aspectRatios: {
							videoArea: videoAreaAspectRatio.toFixed(3),
							video: videoAspectRatio.toFixed(3),
						},
						distorção: aspectRatioDiff > 0.01 ? "⚠️ SIM" : "✅ NÃO",
					});

					this.dimensionsLogged = true;
				}

				// Calculate video area (canvas minus footer space)
				const videoAreaWidth = this.canvas.width;
				const videoAreaHeight = this.canvas.height - this.config.height;
				const videoAreaY = 0; // Start at top

				// Calculate aspect ratio preserving dimensions for video area
				const videoAreaAspectRatio = videoAreaWidth / videoAreaHeight;

				let drawWidth = videoAreaWidth;
				let drawHeight = videoAreaHeight;
				let drawX = 0;
				let drawY = videoAreaY;

				// Maintain aspect ratio - fit video to available area (above footer)
				if (videoAspectRatio > videoAreaAspectRatio) {
					// Video is wider than available area
					drawHeight = videoAreaWidth / videoAspectRatio;
					drawY = videoAreaY + (videoAreaHeight - drawHeight) / 2;
				} else {
					// Video is taller than available area
					drawWidth = videoAreaHeight * videoAspectRatio;
					drawX = (videoAreaWidth - drawWidth) / 2;
				}

				// Ensure footer position doesn't exceed canvas bounds
				const footerBottomY = drawY + drawHeight + this.config.height;
				if (footerBottomY > this.canvas.height) {
					// Adjust video position to make room for footer
					const adjustment = footerBottomY - this.canvas.height;
					drawY = Math.max(0, drawY - adjustment);
				}

				// Draw video maintaining aspect ratio in the area above footer
				this.ctx.drawImage(
					this.video,
					0,
					0, // source x, y
					videoWidth, // source width
					videoHeight, // source height
					drawX,
					drawY, // destination x, y
					drawWidth, // destination width
					drawHeight, // destination height
				);

				// Draw footer at bottom, centered on canvas
				const footerY = this.canvas.height - this.config.height;
				const footerWidth = Math.min(drawWidth, this.canvas.width);
				const footerX = (this.canvas.width - footerWidth) / 2;

				// Draw footer background (centered)
				this.ctx.fillStyle = "rgba(17, 24, 39, 0.95)"; // Same color as header top
				this.ctx.fillRect(footerX, footerY, footerWidth, this.config.height);

				// Add subtle border at top of footer
				this.ctx.strokeStyle = "rgba(107, 114, 128, 0.5)";
				this.ctx.lineWidth = 1;
				this.ctx.beginPath();
				this.ctx.moveTo(footerX, footerY);
				this.ctx.lineTo(footerX + footerWidth, footerY);
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
