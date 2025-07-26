import type { FooterConfig } from "@/store/store-header-config";
import type { CameraConfig } from "@/store/store-camera-config";

export class VideoFooterComposer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private video: HTMLVideoElement;
	private cameraVideo: HTMLVideoElement;
	private animationFrameId: number | null = null;
	private stream: MediaStream | null = null;
	private config: FooterConfig;
	private cameraConfig: CameraConfig | null = null;

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
		this.video.style.width = "100%";
		this.video.style.height = "100%";
		this.video.style.objectFit = "fill";

		// Create video element for camera stream
		this.cameraVideo = document.createElement("video");
		this.cameraVideo.autoplay = true;
		this.cameraVideo.muted = true;
		this.cameraVideo.style.width = "100%";
		this.cameraVideo.style.height = "100%";
		this.cameraVideo.style.objectFit = "cover";

		console.log("VideoFooterComposer initialized", config);
	}

	public async composeWithFooter(
		inputStream: MediaStream,
		width: number,
		height: number,
		cameraConfig?: CameraConfig,
	): Promise<MediaStream> {
		console.log("VideoFooterComposer: Iniciando composição com footer", {
			requestedDimensions: { width, height },
			footerConfig: this.config,
			cameraConfig: cameraConfig ? { isEnabled: cameraConfig.isEnabled, position: cameraConfig.position, size: cameraConfig.size } : null,
			inputStreamTracks: inputStream.getTracks().length,
			audioTracks: inputStream.getAudioTracks().length,
		});

		// Store camera config
		this.cameraConfig = cameraConfig || null;

		if (!this.config.isEnabled) {
			console.log("Footer disabled, returning original stream");
			return inputStream;
		}

		// Set canvas dimensions to match input (footer will overlay, not extend)
		this.canvas.width = width;
		this.canvas.height = height;

		console.log("VideoFooterComposer: Canvas configurado", {
			canvasWidth: this.canvas.width,
			canvasHeight: this.canvas.height,
			footerHeight: this.config.height,
		});

		// Set video source
		this.video.srcObject = inputStream;

		// Set camera video source if available
		if (this.cameraConfig?.isEnabled && this.cameraConfig.mainStream) {
			console.log("🎥 Setting up camera video source:", {
				hasStream: !!this.cameraConfig.mainStream,
				streamId: this.cameraConfig.mainStream.id,
				tracks: this.cameraConfig.mainStream.getTracks().length
			});

			this.cameraVideo.srcObject = this.cameraConfig.mainStream;

			try {
				await this.cameraVideo.play();
				console.log("🎥 Camera video playing successfully");
			} catch (error) {
				console.warn("🎥 Camera video play warning:", error);
			}

			// Wait for camera video metadata
			if (this.cameraVideo.videoWidth === 0 || this.cameraVideo.videoHeight === 0) {
				await new Promise<void>((resolve) => {
					const checkCameraDimensions = () => {
						if (this.cameraVideo.videoWidth > 0 && this.cameraVideo.videoHeight > 0) {
							console.log("🎥 Camera video dimensions ready:", {
								width: this.cameraVideo.videoWidth,
								height: this.cameraVideo.videoHeight
							});
							resolve();
						} else {
							setTimeout(checkCameraDimensions, 10);
						}
					};
					checkCameraDimensions();
				});
			}
		} else {
			console.log("🎥 Camera not enabled or no stream available:", {
				isEnabled: this.cameraConfig?.isEnabled,
				hasStream: !!this.cameraConfig?.mainStream
			});
		}

		// Set video source and wait for it to be ready
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
				aspectRatio: (this.video.videoWidth / this.video.videoHeight).toFixed(3),
			},
			canvasDimensions: {
				width: this.canvas.width,
				height: this.canvas.height,
				aspectRatio: (this.canvas.width / this.canvas.height).toFixed(3),
			},
		});

		// Adjust canvas to match video aspect ratio (same as header)
		this.adjustCanvasToVideoAspectRatio();

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
				// If footer is disabled, just draw the video
				this.ctx.drawImage(
					this.video,
					0,
					0,
					this.canvas.width,
					this.canvas.height,
				);

				// Still draw camera even if footer is disabled
				this.drawCamera();
			} else {
				// Clear canvas
				this.ctx.fillStyle = "#000000";
				this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

				// Draw the full video first (same approach as header composer)
				const videoWidth = this.video.videoWidth || this.canvas.width;
				const videoHeight = this.video.videoHeight || this.canvas.height;

				// Calculate crop/fill to maintain aspect ratio (same logic as header)
				const canvasAspectRatio = this.canvas.width / this.canvas.height;
				const videoAspectRatio = videoWidth / videoHeight;

				let srcX = 0,
					srcY = 0,
					srcWidth = videoWidth,
					srcHeight = videoHeight;

				// Apply crop/fill if aspect ratios differ
				if (Math.abs(canvasAspectRatio - videoAspectRatio) > 0.01) {
					if (canvasAspectRatio > videoAspectRatio) {
						// Canvas wider - crop video height
						const targetHeight = videoWidth / canvasAspectRatio;
						srcY = (videoHeight - targetHeight) / 2;
						srcHeight = targetHeight;
					} else {
						// Canvas taller - crop video width
						const targetWidth = videoHeight * canvasAspectRatio;
						srcX = (videoWidth - targetWidth) / 2;
						srcWidth = targetWidth;
					}
				}

				// Draw the video filling the entire canvas
				this.ctx.drawImage(
					this.video,
					srcX,
					srcY,
					srcWidth,
					srcHeight,
					0,
					0,
					this.canvas.width,
					this.canvas.height,
				);

				// Draw footer overlay at the bottom (overlaying the video)
				const footerY = this.canvas.height - this.config.height;
				this.ctx.fillStyle = "rgba(17, 24, 39)"; // Same as header background
				this.ctx.fillRect(0, footerY, this.canvas.width, this.config.height);

				// Add subtle border at top of footer
				this.ctx.strokeStyle = "rgba(107, 114, 128, 0.5)";
				this.ctx.lineWidth = 1;
				this.ctx.beginPath();
				this.ctx.moveTo(0, footerY);
				this.ctx.lineTo(this.canvas.width, footerY);
				this.ctx.stroke();

				// Draw footer content (placeholder for now)
				this.drawFooter(footerY);

				// Draw camera on top of footer if enabled
				this.drawCamera();
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

		// Stop camera video
		if (this.cameraVideo.srcObject) {
			this.cameraVideo.srcObject = null;
		}

		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}

		console.log("VideoFooterComposer: Compositor parado");
	}

	// Adjust canvas dimensions to match video aspect ratio (same logic as header)
	private adjustCanvasToVideoAspectRatio(): void {
		if (this.video.readyState < 2) return;

		const videoWidth = this.video.videoWidth;
		const videoHeight = this.video.videoHeight;

		if (!videoWidth || !videoHeight) {
			console.warn("⚠️ FooterComposer: Dimensões do vídeo não disponíveis ainda");
			return;
		}

		console.log("🔍 FooterComposer: Ajustando canvas para vídeo:", {
			video: `${videoWidth}x${videoHeight}`,
			canvas: `${this.canvas.width}x${this.canvas.height}`,
			videoAspectRatio: (videoWidth / videoHeight).toFixed(3),
			canvasAspectRatio: (this.canvas.width / this.canvas.height).toFixed(3),
		});

		// Always adjust canvas to match video dimensions exactly
		let adjustedWidth = videoWidth;
		let adjustedHeight = videoHeight;

		// Ensure even dimensions (codec requirement)
		adjustedWidth = Math.round(adjustedWidth / 2) * 2;
		adjustedHeight = Math.round(adjustedHeight / 2) * 2;

		console.log("🔧 FooterComposer: Ajustando canvas para dimensões exatas do vídeo:", {
			original: `${this.canvas.width}x${this.canvas.height}`,
			adjusted: `${adjustedWidth}x${adjustedHeight}`,
			originalAspectRatio: (this.canvas.width / this.canvas.height).toFixed(3),
			newAspectRatio: (adjustedWidth / adjustedHeight).toFixed(3),
			videoAspectRatio: (videoWidth / videoHeight).toFixed(3),
		});

		// Apply new dimensions
		this.canvas.width = adjustedWidth;
		this.canvas.height = adjustedHeight;

		console.log("✅ FooterComposer: Canvas ajustado com sucesso para:", `${this.canvas.width}x${this.canvas.height}`);
	}

	private drawFooter(footerY: number) {
		// Set text properties
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.textBaseline = "middle";
		this.ctx.font = "12px system-ui, -apple-system, sans-serif";

		const padding = 24;
		const centerY = footerY + this.config.height / 2;

		// Optional: Add timestamp or other info
		const timestamp = new Date().toLocaleTimeString();
		this.ctx.font = "10px system-ui, -apple-system, sans-serif";
		this.ctx.fillStyle = "#9CA3AF"; // gray-400

		const timestampWidth = this.ctx.measureText(timestamp).width;
		this.ctx.fillText(timestamp, this.canvas.width - timestampWidth - padding, centerY);
	}

	private drawCamera() {
		if (!this.cameraConfig?.isEnabled || !this.cameraConfig.mainStream) {
			return;
		}

		// Wait for camera video to be ready
		if (this.cameraVideo.readyState < 2) {
			console.log("🎥 Camera video not ready yet, readyState:", this.cameraVideo.readyState);
			return;
		}

		// Calculate camera dimensions based on size setting
		const baseSizes = {
			small: { width: 120, height: 90 },
			medium: { width: 160, height: 120 },
			large: { width: 200, height: 150 }
		};

		const cameraSize = baseSizes[this.cameraConfig.size] || baseSizes.medium;
		const padding = 16;

		// Calculate position based on position setting
		let cameraX: number, cameraY: number;

		switch (this.cameraConfig.position) {
			case "top-left":
				cameraX = padding;
				cameraY = padding;
				break;
			case "top-right":
				cameraX = this.canvas.width - cameraSize.width - padding;
				cameraY = padding;
				break;
			case "bottom-left":
				cameraX = padding;
				cameraY = this.canvas.height - cameraSize.height - padding;
				break;
			case "bottom-right":
			default:
				cameraX = this.canvas.width - cameraSize.width - padding;
				cameraY = this.canvas.height - cameraSize.height - padding;
				break;
		}

		console.log("🎥 Drawing camera at:", {
			position: this.cameraConfig.position,
			x: cameraX,
			y: cameraY,
			size: cameraSize,
			videoReadyState: this.cameraVideo.readyState,
			videoWidth: this.cameraVideo.videoWidth,
			videoHeight: this.cameraVideo.videoHeight
		});

		// Save context state
		this.ctx.save();

		// Draw camera background/border with more opacity to ensure visibility
		this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
		this.ctx.fillRect(cameraX - 3, cameraY - 3, cameraSize.width + 6, cameraSize.height + 6);

		// Draw camera video with proper aspect ratio handling
		const videoAspectRatio = this.cameraVideo.videoWidth / this.cameraVideo.videoHeight;
		const cameraAspectRatio = cameraSize.width / cameraSize.height;

		let srcX = 0, srcY = 0, srcWidth = this.cameraVideo.videoWidth, srcHeight = this.cameraVideo.videoHeight;

		// Crop video to fit camera frame (similar to object-fit: cover)
		if (Math.abs(videoAspectRatio - cameraAspectRatio) > 0.01) {
			if (videoAspectRatio > cameraAspectRatio) {
				// Video wider - crop width
				const targetWidth = this.cameraVideo.videoHeight * cameraAspectRatio;
				srcX = (this.cameraVideo.videoWidth - targetWidth) / 2;
				srcWidth = targetWidth;
			} else {
				// Video taller - crop height
				const targetHeight = this.cameraVideo.videoWidth / cameraAspectRatio;
				srcY = (this.cameraVideo.videoHeight - targetHeight) / 2;
				srcHeight = targetHeight;
			}
		}

		// Draw camera video
		this.ctx.drawImage(
			this.cameraVideo,
			srcX, srcY, srcWidth, srcHeight,  // source
			cameraX, cameraY, cameraSize.width, cameraSize.height  // destination
		);

		// Draw border on top
		this.ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
		this.ctx.lineWidth = 2;
		this.ctx.strokeRect(cameraX, cameraY, cameraSize.width, cameraSize.height);

		// Restore context state
		this.ctx.restore();
	}

	public updateFooterConfig(newConfig: FooterConfig) {
		this.config = newConfig;
	}

	public updateCameraConfig(newCameraConfig: CameraConfig) {
		this.cameraConfig = newCameraConfig;

		// Update camera video source if needed
		if (newCameraConfig.isEnabled && newCameraConfig.mainStream) {
			this.cameraVideo.srcObject = newCameraConfig.mainStream;
			this.cameraVideo.play().catch(console.warn);
		} else {
			this.cameraVideo.srcObject = null;
		}
	}
}
