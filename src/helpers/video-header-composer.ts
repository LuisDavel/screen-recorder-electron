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

		// Ajustar canvas para corresponder ao aspect ratio do vídeo
		this.adjustCanvasToVideoAspectRatio();

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

				// Debug: log das dimensões
				const videoWidth = this.video.videoWidth || this.canvas.width;
				const videoHeight = this.video.videoHeight || this.canvas.height;

				// Verificação uma vez só para detectar problemas
				if (!this.dimensionsLogged) {
					const canvasAspectRatio = this.canvas.width / this.canvas.height;
					const videoAspectRatio = videoWidth / videoHeight;
					const aspectRatioDiff = Math.abs(
						canvasAspectRatio - videoAspectRatio,
					);

					console.log("🎬 HeaderComposer renderização:", {
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

				// Desenhar vídeo FORÇANDO preenchimento total (crop/fill para eliminar achatamento)
				// Calcular dimensões para preencher completamente o canvas
				const canvasAspectRatio = this.canvas.width / this.canvas.height;
				const videoAspectRatio = videoWidth / videoHeight;

				let srcX = 0,
					srcY = 0,
					srcWidth = videoWidth,
					srcHeight = videoHeight;

				// Se o vídeo tem aspect ratio diferente, fazer crop para preencher
				if (Math.abs(canvasAspectRatio - videoAspectRatio) > 0.01) {
					console.log(
						"🔧 HeaderComposer: Aplicando crop/fill para corrigir aspect ratio:",
						{
							canvas: `${this.canvas.width}x${this.canvas.height} (${canvasAspectRatio.toFixed(3)})`,
							video: `${videoWidth}x${videoHeight} (${videoAspectRatio.toFixed(3)})`,
						},
					);

					if (canvasAspectRatio > videoAspectRatio) {
						// Canvas mais largo - cortar altura do vídeo
						const targetHeight = videoWidth / canvasAspectRatio;
						srcY = (videoHeight - targetHeight) / 2;
						srcHeight = targetHeight;
						console.log("📐 HeaderComposer: Cortando altura do vídeo:", {
							srcY,
							srcHeight,
						});
					} else {
						// Canvas mais alto - cortar largura do vídeo
						const targetWidth = videoHeight * canvasAspectRatio;
						srcX = (videoWidth - targetWidth) / 2;
						srcWidth = targetWidth;
						console.log("📐 HeaderComposer: Cortando largura do vídeo:", {
							srcX,
							srcWidth,
						});
					}
				}

				this.ctx.drawImage(
					this.video,
					srcX,
					srcY, // source x, y (com crop)
					srcWidth,
					srcHeight, // source width, height (com crop)
					0,
					0, // destination x, y
					this.canvas.width, // destination width
					this.canvas.height, // destination height
				);

				// Desenhar header sobreposto no topo
				this.drawHeader();
			}

			this.animationFrameId = requestAnimationFrame(draw);
		};

		draw();
	}

	private drawHeader() {
		const headerHeight = this.headerConfig.height;	

		// Draw header background at top
		this.ctx.fillStyle = "rgba(17, 24, 39)"; // gray-900 with opacity
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

		if (headerHeight > 60) {
			y = (headerHeight * 2) / 3;

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
