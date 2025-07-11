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

		// Set canvas dimensions to match original video (footer will overlay)
		this.canvas.width = width;
		this.canvas.height = height;

		console.log("VideoFooterComposer: Canvas configurado", {
			canvasWidth: this.canvas.width,
			canvasHeight: this.canvas.height,
			footerHeight: this.config.height,
			mode: "overlay",
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

				// Draw original video at full size (footer will overlay on top)
				this.ctx.drawImage(
					this.video,
					0,
					0, // source x, y
					this.video.videoWidth || this.canvas.width, // source width
					this.video.videoHeight || this.canvas.height, // source height
					0,
					0, // destination x, y
					this.canvas.width, // destination width (full canvas width)
					this.canvas.height, // destination height (full canvas height)
				);

				// Draw footer overlay at the bottom
				const footerY = this.canvas.height - this.config.height;
				this.ctx.fillStyle = "rgba(31, 41, 55, 0.95)"; // Dark background similar to header
				this.ctx.fillRect(0, footerY, this.canvas.width, this.config.height);

				// Optional: Add subtle border at top of footer
				this.ctx.strokeStyle = "rgba(107, 114, 128, 0.5)";
				this.ctx.lineWidth = 1;
				this.ctx.beginPath();
				this.ctx.moveTo(0, footerY);
				this.ctx.lineTo(this.canvas.width, footerY);
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
