import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VideoFormat = "webm" | "mp4";

export interface VideoFormatConfig {
	format: VideoFormat;
	codec: string;
	bitrate?: number;
	quality: "low" | "medium" | "high";
}

interface VideoFormatState {
	format: VideoFormat;
	codec: string;
	bitrate?: number;
	quality: "low" | "medium" | "high";

	// Actions
	setFormat: (format: VideoFormat) => void;
	setCodec: (codec: string) => void;
	setBitrate: (bitrate?: number) => void;
	setQuality: (quality: "low" | "medium" | "high") => void;
	resetConfig: () => void;
	getConfig: () => VideoFormatConfig;

	// Helper methods
	getSupportedCodecs: () => string[];
	getRecommendedCodec: (format: VideoFormat) => string;
	getMimeType: () => string;
}

const defaultState = {
	format: "webm" as VideoFormat,
	codec: "vp9",
	bitrate: undefined,
	quality: "medium" as const,
};

export const useVideoFormatStore = create<VideoFormatState>()(
	persist(
		(set, get) => ({
			...defaultState,

			setFormat: (format) => {
				const recommendedCodec = get().getRecommendedCodec(format);
				set({ format, codec: recommendedCodec });
			},

			setCodec: (codec) => set({ codec }),

			setBitrate: (bitrate) => set({ bitrate }),

			setQuality: (quality) => set({ quality }),

			resetConfig: () => set(defaultState),

			getConfig: () => {
				const state = get();
				return {
					format: state.format,
					codec: state.codec,
					bitrate: state.bitrate,
					quality: state.quality,
				};
			},

			getSupportedCodecs: () => {
				const { format } = get();
				let codecs: string[] = [];

				if (format === "webm") {
					codecs = ["vp9", "vp8", "av01"];
				} else {
					// Try various MP4 codec formats that are commonly supported
					codecs = [
						"h264",
						"avc1",
						"avc1.42E01E",
						"avc1.42001E",
						"avc1.4D401E",
						"avc1.640028",
					];
				}

				// Filter only supported codecs
				const supportedCodecs = codecs.filter((codec) => {
					const mimeType =
						format === "webm"
							? `video/webm; codecs=${codec}`
							: `video/mp4; codecs=${codec}`;

					const isSupported =
						typeof MediaRecorder !== "undefined" &&
						MediaRecorder.isTypeSupported(mimeType);
					console.log(
						`🔍 Testando codec ${codec}:`,
						mimeType,
						"=",
						isSupported,
					);
					return isSupported;
				});

				// If no specific codec is supported, try the basic format
				if (supportedCodecs.length === 0) {
					const basicMimeType = format === "webm" ? "video/webm" : "video/mp4";
					const basicSupported =
						typeof MediaRecorder !== "undefined" &&
						MediaRecorder.isTypeSupported(basicMimeType);
					console.log(
						`🔍 Testando formato básico:`,
						basicMimeType,
						"=",
						basicSupported,
					);

					if (basicSupported) {
						return [format === "webm" ? "vp9" : "h264"];
					}
				}

				return supportedCodecs;
			},

			getRecommendedCodec: (format: VideoFormat) => {
				const supportedCodecs = get().getSupportedCodecs();

				if (format === "webm") {
					// Prefer VP9 > VP8 for WebM
					if (supportedCodecs.includes("vp9")) return "vp9";
					if (supportedCodecs.includes("vp8")) return "vp8";
					if (supportedCodecs.includes("av01")) return "av01";
				} else {
					// Prefer H264 for MP4
					if (supportedCodecs.includes("h264")) return "h264";
					if (supportedCodecs.includes("avc1")) return "avc1";
				}

				return supportedCodecs[0] || (format === "webm" ? "vp9" : "h264");
			},

			getMimeType: () => {
				const { format, codec } = get();

				let mimeType: string;
				if (format === "webm") {
					mimeType = `video/webm; codecs=${codec}`;
				} else {
					mimeType = `video/mp4; codecs=${codec}`;
				}

				// Check if the specific codec is supported
				const isSupported =
					typeof MediaRecorder !== "undefined" &&
					MediaRecorder.isTypeSupported(mimeType);

				if (!isSupported) {
					// Fall back to basic format without codec specification
					const basicMimeType = format === "webm" ? "video/webm" : "video/mp4";
					const basicSupported =
						typeof MediaRecorder !== "undefined" &&
						MediaRecorder.isTypeSupported(basicMimeType);

					console.log(
						`⚠️ Codec específico não suportado (${mimeType}), usando formato básico (${basicMimeType}):`,
						basicSupported,
					);

					if (basicSupported) {
						return basicMimeType;
					}
				}

				return mimeType;
			},
		}),
		{
			name: "video-format-config-storage",
			partialize: (state) => ({
				format: state.format,
				codec: state.codec,
				bitrate: state.bitrate,
				quality: state.quality,
			}),
		},
	),
);
