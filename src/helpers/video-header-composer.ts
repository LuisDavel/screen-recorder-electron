import type { HeaderConfig } from "@/store/store-header-config";

export class VideoHeaderComposer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private video: HTMLVideoElement;
	private animationFrameId: number | null = null;
	private stream: MediaStream | null = null;
	private headerConfig: HeaderConfig;

	constructor(headerConfig: HeaderConfig) {
		this.headerConfig = headerConfig;

		// Create canvas element
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d", { alpha: false })!;

		// Create video element for source stream
		this.video = document.createElement("video");
		this.video.autoplay = true;
		this.video.muted = true;
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

		// Set canvas dimensions
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

	private startComposition() {
		console.log("VideoHeaderComposer: Iniciando loop de composição");

		const draw = () => {
			if (!this.headerConfig.isEnabled) {
				console.log(
					"VideoHeaderComposer: Header desabilitado, desenhando apenas vídeo",
				);
				// If header is disabled, just draw the video
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

				// Calculate video position with header at top, preserving aspect ratio
				const headerHeight = this.headerConfig.height;
				const availableHeight = this.canvas.height - headerHeight;
				const availableWidth = this.canvas.width;

				// Get video dimensions
				const videoWidth = this.video.videoWidth || this.canvas.width;
				const videoHeight = this.video.videoHeight || this.canvas.height;
				const videoAspectRatio = videoWidth / videoHeight;
				const availableAspectRatio = availableWidth / availableHeight;

				let drawWidth: number;
				let drawHeight: number;
				let drawX: number;
				let drawY: number;

				// Calculate dimensions to maintain aspect ratio
				if (videoAspectRatio > availableAspectRatio) {
					// Video is wider than available space - fit by width
					drawWidth = availableWidth;
					drawHeight = availableWidth / videoAspectRatio;
					drawX = 0;
					drawY = headerHeight + (availableHeight - drawHeight) / 2;
				} else {
					// Video is taller than available space - fit by height
					drawWidth = availableHeight * videoAspectRatio;
					drawHeight = availableHeight;
					drawX = (availableWidth - drawWidth) / 2;
					drawY = headerHeight;
				}

				console.log(
					"VideoHeaderComposer: Desenhando vídeo com header (aspect ratio preservado)",
					{
						headerHeight,
						availableWidth,
						availableHeight,
						videoSize: { width: videoWidth, height: videoHeight },
						videoAspectRatio: videoAspectRatio.toFixed(3),
						availableAspectRatio: availableAspectRatio.toFixed(3),
						drawDimensions: {
							x: Math.round(drawX),
							y: Math.round(drawY),
							width: Math.round(drawWidth),
							height: Math.round(drawHeight),
						},
					},
				);

				// Draw video below header with preserved aspect ratio
				this.ctx.drawImage(
					this.video,
					0,
					0,
					videoWidth,
					videoHeight, // source
					drawX,
					drawY,
					drawWidth,
					drawHeight, // destination
				);

				// Draw header
				this.drawHeader();
			}

			this.animationFrameId = requestAnimationFrame(draw);
		};

		draw();
	}

	private drawHeader() {
		const headerHeight = this.headerConfig.height;

		console.log("VideoHeaderComposer: Desenhando header", {
			headerHeight,
			canvasWidth: this.canvas.width,
			examName: this.headerConfig.examName,
		});

		// Draw header background at top
		this.ctx.fillStyle = "rgba(17, 24, 39, 0.95)"; // gray-900 with opacity
		this.ctx.fillRect(0, 0, this.canvas.width, headerHeight);

		// Set text properties
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.textBaseline = "middle";

		const padding = 24;
		const columnWidth = this.canvas.width / 12;
		let y = headerHeight / 2;

		// If height allows for two rows
		if (headerHeight > 60) {
			y = headerHeight / 3;
		}

		// Draw main information row
		this.drawTextColumn(
			"Exame",
			this.headerConfig.examName || "Não informado",
			0,
			y,
			3,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"Data",
			this.formatDate(this.headerConfig.examDate) || "Não informada",
			3,
			y,
			2,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"Paciente",
			this.headerConfig.patientName || "Não informado",
			5,
			y,
			3,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"Sexo / Idade",
			this.getSexAge(),
			8,
			y,
			2,
			columnWidth,
			padding,
		);
		this.drawTextColumn(
			"ID",
			this.headerConfig.externalId || "Não informado",
			10,
			y,
			2,
			columnWidth,
			padding,
		);

		// Draw second row if height allows
		if (headerHeight > 60) {
			y = (headerHeight * 2) / 3;

			// Smaller font for second row
			this.ctx.font = "11px system-ui, -apple-system, sans-serif";

			// Institution
			this.drawInlineInfo(
				"Instituição:",
				this.headerConfig.institutionName || "Não informada",
				0,
				y,
				4,
				columnWidth,
				padding,
			);

			// Doctor
			this.drawInlineInfo(
				"Médico:",
				this.headerConfig.requestingDoctor || "Não informado",
				4,
				y,
				4,
				columnWidth,
				padding,
			);

			// CRM
			this.drawInlineInfo(
				"CRM:",
				this.headerConfig.crm || "Não informado",
				8,
				y,
				4,
				columnWidth,
				padding,
			);
		}
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

	private getSexAge(): string {
		if (this.headerConfig.patientSex && this.headerConfig.patientAge) {
			return `${this.headerConfig.patientSex} / ${this.headerConfig.patientAge}`;
		}
		return (
			this.headerConfig.patientSex ||
			this.headerConfig.patientAge ||
			"Não informado"
		);
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
