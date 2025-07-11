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
			overlayMode: "Footer será sobreposto ao vídeo 100%",
		});

		// Set canvas dimensions to match original video (overlay mode)
		this.canvas.width = width;
		this.canvas.height = height;

		console.log("VideoFooterComposer: Canvas configurado", {
			canvasWidth: this.canvas.width,
			canvasHeight: this.canvas.height,
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
				aspectRatio: (this.video.videoWidth / this.video.videoHeight).toFixed(
					3,
				),
			},
			canvasDimensions: {
				width: this.canvas.width,
				height: this.canvas.height,
				aspectRatio: (this.canvas.width / this.canvas.height).toFixed(3),
			},
			isSequentialComposition: "Footer aplicado após Header",
			forcingFullCoverage: "100% - footer como overlay",
		});

		// Canvas mantém dimensões originais - footer sobrepõe o vídeo
		// IMPORTANTE: Não chamar adjustCanvasToVideoAspectRatio() para manter 100% coverage
		// this.adjustCanvasToVideoAspectRatio();

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
				// If footer is disabled, draw the video filling 100% of canvas
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

				// Get video dimensions for logging
				const videoWidth = this.video.videoWidth || this.canvas.width;
				const videoHeight = this.video.videoHeight || this.canvas.height;

				// Verificação uma vez só para detectar problemas
				if (!this.dimensionsLogged) {
					console.log("🎬 FooterComposer renderização (100% coverage):", {
						canvas: `${this.canvas.width}x${this.canvas.height}`,
						video: `${videoWidth}x${videoHeight}`,
						footerHeight: this.config.height,
						mode: "fill 100% of canvas",
					});

					this.dimensionsLogged = true;
				}

				// Fill entire canvas with video (100% coverage)
				const drawWidth = this.canvas.width;
				const drawHeight = this.canvas.height;
				const drawX = 0;
				const drawY = 0;

				// Draw video filling 100% of the canvas
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

				// Draw footer overlay at the bottom
				this.drawFooter();
			}

			this.animationFrameId = requestAnimationFrame(draw);
		};

		draw();
	}

	private drawFooter() {
		const footerHeight = this.config.height;
		const footerY = this.canvas.height - footerHeight;

		// Draw footer background at bottom - just a simple bar, no text
		this.ctx.fillStyle = "rgba(17, 24, 39, 0.9)"; // gray-900 with opacity
		this.ctx.fillRect(0, footerY, this.canvas.width, footerHeight);

		// No text or information - just a simple footer bar
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

	// Método para verificar se o footer está funcionando corretamente
	public debugFooterStatus() {
		console.log("🔍 FooterComposer Debug Status:", {
			canvasDimensions: `${this.canvas.width}x${this.canvas.height}`,
			videoDimensions: this.video
				? `${this.video.videoWidth}x${this.video.videoHeight}`
				: "N/A",
			videoReadyState: this.video ? this.video.readyState : "N/A",
			footerEnabled: this.config.isEnabled,
			footerHeight: this.config.height,
			streamActive: this.stream ? this.stream.active : false,
			isComposing: this.animationFrameId !== null,
		});
	}
}
