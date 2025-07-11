import type { HeaderConfig } from "@/store/store-header-config";

export class VideoHeaderComposer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private video: HTMLVideoElement;
	private animationFrameId: number | null = null;
	private stream: MediaStream | null = null;
	private headerConfig: HeaderConfig;
	private dimensionsLogged = false;

	constructor(headerConfig: HeaderConfig) {
		this.headerConfig = headerConfig;

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
	}

	async composeWithHeader(
		sourceStream: MediaStream,
		width: number,
		height: number,
	): Promise<MediaStream> {
		console.log("VideoHeaderComposer: Iniciando composição com header", {
			requestedDimensions: { width, height },
			headerConfig: this.headerConfig,
			sourceStreamTracks: sourceStream.getTracks().length,
			audioTracks: sourceStream.getAudioTracks().length,
		});

		// Set canvas dimensions to match original video (overlay mode)
		this.canvas.width = width;
		this.canvas.height = height;

		console.log("VideoHeaderComposer: Canvas configurado", {
			canvasWidth: this.canvas.width,
			canvasHeight: this.canvas.height,
		});

		// Set video source
		this.video.srcObject = sourceStream;
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

		console.log("VideoHeaderComposer: Vídeo fonte configurado e reproduzindo", {
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
		});

		// Canvas mantém dimensões originais - header sobrepõe o vídeo
		// this.adjustCanvasToVideoAspectRatio();

		// Start composition loop
		this.startComposition();

		// Create the output stream with video from canvas
		const canvasStream = this.canvas.captureStream(30);
		const videoTracks = canvasStream.getVideoTracks();
		const audioTracks = sourceStream.getAudioTracks();

		// Combine video from canvas with audio from source
		this.stream = new MediaStream([...videoTracks, ...audioTracks]);

		console.log("VideoHeaderComposer: Stream de saída criado", {
			outputStreamTracks: this.stream.getTracks().length,
			videoTracks: videoTracks.length,
			audioTracks: audioTracks.length,
		});

		return this.stream;
	}

	// Ajustar dimensões do canvas para corresponder EXATAMENTE ao vídeo
	private adjustCanvasToVideoAspectRatio(): void {
		if (this.video.readyState < 2) return;

		const videoWidth = this.video.videoWidth;
		const videoHeight = this.video.videoHeight;

		if (!videoWidth || !videoHeight) {
			console.warn(
				"⚠️ HeaderComposer: Dimensões do vídeo não disponíveis ainda",
			);
			return;
		}

		console.log("🔍 HeaderComposer: Ajustando canvas para vídeo:", {
			video: `${videoWidth}x${videoHeight}`,
			canvas: `${this.canvas.width}x${this.canvas.height}`,
			videoAspectRatio: (videoWidth / videoHeight).toFixed(3),
			canvasAspectRatio: (this.canvas.width / this.canvas.height).toFixed(3),
		});

		// SEMPRE ajustar o canvas para corresponder EXATAMENTE às dimensões do vídeo
		// Isso garante que não haverá distorção
		let adjustedWidth = videoWidth;
		let adjustedHeight = videoHeight;

		// Garantir que sejam pares (requirement para codecs)
		adjustedWidth = Math.round(adjustedWidth / 2) * 2;
		adjustedHeight = Math.round(adjustedHeight / 2) * 2;

		console.log(
			"🔧 HeaderComposer: FORÇANDO ajuste do canvas para dimensões exatas do vídeo:",
			{
				original: `${this.canvas.width}x${this.canvas.height}`,
				adjusted: `${adjustedWidth}x${adjustedHeight}`,
				originalAspectRatio: (this.canvas.width / this.canvas.height).toFixed(
					3,
				),
				newAspectRatio: (adjustedWidth / adjustedHeight).toFixed(3),
				videoAspectRatio: (videoWidth / videoHeight).toFixed(3),
			},
		);

		// Aplicar as novas dimensões
		this.canvas.width = adjustedWidth;
		this.canvas.height = adjustedHeight;

		console.log(
			"✅ HeaderComposer: Canvas ajustado com sucesso para:",
			`${this.canvas.width}x${this.canvas.height}`,
		);
	}

	private startComposition() {
		console.log("VideoHeaderComposer: Iniciando loop de composição");

		const draw = () => {
			if (!this.headerConfig.isEnabled) {
				console.log(
					"VideoHeaderComposer: Header desabilitado, desenhando apenas vídeo",
				);
				// If header is disabled, draw the video filling 100% of canvas
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
					console.log("🎬 HeaderComposer renderização (100% coverage):", {
						canvas: `${this.canvas.width}x${this.canvas.height}`,
						video: `${videoWidth}x${videoHeight}`,
						headerHeight: this.headerConfig.height,
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

				// Draw header overlay at the top
				this.drawHeader();
			}

			this.animationFrameId = requestAnimationFrame(draw);
		};

		draw();
	}

	private drawHeader() {
		const headerHeight = this.headerConfig.height;

		// Draw header background at top
		this.ctx.fillStyle = "rgba(17, 24, 39, 0.95)"; // gray-900 with opacity
		this.ctx.fillRect(0, 0, this.canvas.width, headerHeight);

		// Set text properties
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.textBaseline = "middle";

		const padding = 24;
		const columnWidth = this.canvas.width / 12;

		// First row - main information
		let y = headerHeight / 4;
		this.drawTextColumn(
			"Exame",
			this.headerConfig.examName || "Não informado",
			0,
			y,
			4,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"Data",
			this.formatDate(this.headerConfig.examDate) || "Não informada",
			4,
			y,
			2,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"ID",
			this.headerConfig.externalId || "Não informado",
			6,
			y,
			2,
			columnWidth,
			padding,
		);

		// Second row - patient information
		y = (headerHeight * 2) / 4;
		this.drawTextColumn(
			"Paciente",
			this.headerConfig.patientName || "Não informado",
			0,
			y,
			4,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"Sexo",
			this.headerConfig.patientSex || "Não informado",
			4,
			y,
			2,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"Idade",
			this.headerConfig.patientAge || "Não informado",
			6,
			y,
			2,
			columnWidth,
			padding,
		);

		// Third row - medical information
		y = (headerHeight * 3) / 4;
		this.ctx.font = "11px system-ui, -apple-system, sans-serif";

		this.drawInlineInfo(
			"Instituição:",
			this.headerConfig.institutionName || "Não informada",
			0,
			y,
			4,
			columnWidth,
			padding,
		);

		this.drawInlineInfo(
			"Médico:",
			this.headerConfig.requestingDoctor || "Não informado",
			4,
			y,
			3,
			columnWidth,
			padding,
		);

		this.drawInlineInfo(
			"CRM:",
			this.headerConfig.crm || "Não informado",
			7,
			y,
			2,
			columnWidth,
			padding,
		);
	}

	private drawTextColumn(
		label: string,
		value: string,
		colStart: number,
		y: number,
		colSpan: number,
		columnWidth: number,
		padding: number,
	) {
		const x = colStart * columnWidth + padding;
		const maxWidth = colSpan * columnWidth - padding * 2;

		// Draw label
		this.ctx.font = "11px system-ui, -apple-system, sans-serif";
		this.ctx.fillStyle = "#9CA3AF"; // gray-400
		this.ctx.fillText(label, x, y - 10);

		// Draw value
		this.ctx.font = "13px system-ui, -apple-system, sans-serif";
		this.ctx.fillStyle = "#FFFFFF";

		// Truncate text if too long
		const truncatedValue = this.truncateText(value, maxWidth);
		this.ctx.fillText(truncatedValue, x, y + 5);
	}

	private drawInlineInfo(
		label: string,
		value: string,
		colStart: number,
		y: number,
		colSpan: number,
		columnWidth: number,
		padding: number,
	) {
		const x = colStart * columnWidth + padding;
		const maxWidth = colSpan * columnWidth - padding * 2;

		// Draw label
		this.ctx.fillStyle = "#9CA3AF"; // gray-400
		const labelWidth = this.ctx.measureText(label).width;
		this.ctx.fillText(label, x, y);

		// Draw value
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.font = "11px system-ui, -apple-system, sans-serif";

		const valueX = x + labelWidth + 5;
		const truncatedValue = this.truncateText(value, maxWidth - labelWidth - 5);
		this.ctx.fillText(truncatedValue, valueX, y);
	}

	private truncateText(text: string, maxWidth: number): string {
		const metrics = this.ctx.measureText(text);
		if (metrics.width <= maxWidth) {
			return text;
		}

		let truncated = text;
		while (
			this.ctx.measureText(truncated + "...").width > maxWidth &&
			truncated.length > 0
		) {
			truncated = truncated.slice(0, -1);
		}

		return truncated + "...";
	}

	private formatDate(dateString: string): string {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			const day = date.getDate().toString().padStart(2, "0");
			const month = (date.getMonth() + 1).toString().padStart(2, "0");
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		} catch {
			return dateString;
		}
	}

	stop() {
		console.log("VideoHeaderComposer: Parando compositor");

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

		console.log("VideoHeaderComposer: Compositor parado");
	}

	updateHeaderConfig(newConfig: HeaderConfig) {
		this.headerConfig = newConfig;
	}
}
