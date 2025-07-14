import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VideoFormat = "webm" | "mp4" | "whatsapp";

export interface VideoFormatConfig {
  format: VideoFormat;
  codec: string;
  bitrate?: number;
  quality: "low" | "medium" | "high";
  maxResolution?: { width: number; height: number };
  targetFileSize?: number; // in MB
}

interface VideoFormatState {
  format: VideoFormat;
  codec: string;
  bitrate?: number;
  quality: "low" | "medium" | "high";
  maxResolution?: { width: number; height: number };
  targetFileSize?: number;

  // Actions
  setFormat: (format: VideoFormat) => void;
  setCodec: (codec: string) => void;
  setBitrate: (bitrate?: number) => void;
  setQuality: (quality: "low" | "medium" | "high") => void;
  setMaxResolution: (resolution?: { width: number; height: number }) => void;
  setTargetFileSize: (size?: number) => void;
  resetConfig: () => void;
  getConfig: () => VideoFormatConfig;

  // Helper methods
  getSupportedCodecs: () => string[];
  getRecommendedCodec: (format: VideoFormat) => string;
  getMimeType: () => string;
  getWhatsAppOptimizedSettings: () => {
    bitrate: number;
    maxResolution: { width: number; height: number };
    targetFileSize: number;
    mimeType: string;
  };
  getQualityBasedSettings: () => {
    bitrate: number;
    chunkSize: number;
    frameRate: number;
    quality: "low" | "medium" | "high";
    format: VideoFormat;
    platform: string;
    optimizedFor: string;
  };
  getQualityDescription: () => {
    label: string;
    description: string;
    bitrate: string;
    frameRate: string;
    suitableFor: string;
  };
}

const defaultState = {
  format: "webm" as VideoFormat,
  codec: "vp9",
  bitrate: undefined,
  quality: "medium" as const,
  maxResolution: undefined,
  targetFileSize: undefined,
};

export const useVideoFormatStore = create<VideoFormatState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setFormat: (format) => {
        const recommendedCodec = get().getRecommendedCodec(format);

        // Apply WhatsApp optimizations automatically
        if (format === "whatsapp") {
          const whatsappSettings = get().getWhatsAppOptimizedSettings();
          set({
            format,
            codec: "h264",
            bitrate: whatsappSettings.bitrate,
            maxResolution: whatsappSettings.maxResolution,
            targetFileSize: whatsappSettings.targetFileSize,
          });
        } else {
          set({
            format,
            codec: recommendedCodec,
            maxResolution: undefined,
            targetFileSize: undefined,
          });
        }
      },

      setCodec: (codec) => set({ codec }),

      setBitrate: (bitrate) => set({ bitrate }),

      setQuality: (quality) => set({ quality }),

      setMaxResolution: (resolution) => set({ maxResolution: resolution }),

      setTargetFileSize: (size) => set({ targetFileSize: size }),

      resetConfig: () => set(defaultState),

      getConfig: () => {
        const state = get();
        return {
          format: state.format,
          codec: state.codec,
          bitrate: state.bitrate,
          quality: state.quality,
          maxResolution: state.maxResolution,
          targetFileSize: state.targetFileSize,
        };
      },

      getSupportedCodecs: () => {
        const { format } = get();
        let codecs: string[] = [];

        if (format === "webm") {
          codecs = ["vp8", "vp9", "av01"]; // VP8 primeiro por ser mais leve
        } else if (format === "whatsapp") {
          // WhatsApp works best with H.264
          codecs = ["h264", "avc1"];
        } else {
          // MP4 codecs ordenados por performance (mais leves primeiro)
          codecs = [
            "h264", // Básico H.264
            "avc1", // Básico AVC1
            "avc1.42001E", // Baseline profile - mais leve
            "avc1.42E01E", // Extended profile
            "avc1.4D401E", // Main profile
            "avc1.640028", // High profile - mais pesado
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
        } else if (format === "whatsapp") {
          // WhatsApp prefers H.264
          if (supportedCodecs.includes("h264")) return "h264";
          if (supportedCodecs.includes("avc1")) return "avc1";
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
        } else if (format === "whatsapp") {
          // WhatsApp uses MP4 format
          mimeType = `video/mp4; codecs=${codec}`;
        } else {
          mimeType = `video/mp4; codecs=${codec}`;
        }

        // Check if the specific codec is supported
        const isSupported =
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(mimeType);

        if (!isSupported) {
          // Para MP4, tentar formato básico primeiro para melhor compatibilidade
          if (format === "mp4" || format === "whatsapp") {
            const basicMimeType = "video/mp4";
            const basicSupported =
              typeof MediaRecorder !== "undefined" &&
              MediaRecorder.isTypeSupported(basicMimeType);

            console.log(
              `⚠️ Codec MP4 específico não suportado (${mimeType}), usando formato básico (${basicMimeType}):`,
              basicSupported,
            );

            if (basicSupported) {
              return basicMimeType;
            }
          }

          // Fallback para WebM se MP4 não funcionar
          const fallbackMimeType =
            format === "webm" ? "video/webm" : "video/webm";
          const fallbackSupported =
            typeof MediaRecorder !== "undefined" &&
            MediaRecorder.isTypeSupported(fallbackMimeType);

          console.log(
            `⚠️ Codec específico não suportado (${mimeType}), usando fallback (${fallbackMimeType}):`,
            fallbackSupported,
          );

          if (fallbackSupported) {
            return fallbackMimeType;
          }
        }

        return mimeType;
      },

      getWhatsAppOptimizedSettings: () => {
        return {
          // WhatsApp limitations: 16MB max file size
          bitrate: 500000, // 500kbps - low bitrate for smaller files
          maxResolution: { width: 720, height: 720 }, // Max 720p for better compatibility
          targetFileSize: 15, // Target 15MB to stay under 16MB limit
          mimeType: "video/mp4; codecs=h264",
        };
      },

      getQualityBasedSettings: () => {
        const { quality, format } = get();
        const isWindows =
          typeof navigator !== "undefined" &&
          navigator.platform.toLowerCase().includes("win");
        const isMP4 = format === "mp4";

        // Configurações baseadas na qualidade selecionada
        let bitrate: number;
        let chunkSize: number;
        let frameRate: number;

        if (isMP4 && isWindows) {
          // MP4 no Windows - configurações mais conservadoras
          switch (quality) {
            case "low":
              bitrate = 800000; // 800 Kbps
              chunkSize = 15000; // 15 segundos
              frameRate = 12;
              break;
            case "medium":
              bitrate = 1200000; // 1.2 Mbps
              chunkSize = 12000; // 12 segundos
              frameRate = 15;
              break;
            case "high":
              bitrate = 1800000; // 1.8 Mbps
              chunkSize = 10000; // 10 segundos
              frameRate = 18;
              break;
          }
        } else if (isMP4) {
          // MP4 em outras plataformas
          switch (quality) {
            case "low":
              bitrate = 1200000; // 1.2 Mbps
              chunkSize = 8000; // 8 segundos
              frameRate = 20;
              break;
            case "medium":
              bitrate = 2000000; // 2 Mbps
              chunkSize = 6000; // 6 segundos
              frameRate = 24;
              break;
            case "high":
              bitrate = 3000000; // 3 Mbps
              chunkSize = 5000; // 5 segundos
              frameRate = 30;
              break;
          }
        } else {
          // WebM - configurações otimizadas
          switch (quality) {
            case "low":
              bitrate = 1500000; // 1.5 Mbps
              chunkSize = 5000; // 5 segundos
              frameRate = 24;
              break;
            case "medium":
              bitrate = 2500000; // 2.5 Mbps
              chunkSize = 4000; // 4 segundos
              frameRate = 30;
              break;
            case "high":
              bitrate = 4000000; // 4 Mbps
              chunkSize = 3000; // 3 segundos
              frameRate = 30;
              break;
          }
        }

        return {
          bitrate,
          chunkSize,
          frameRate,
          quality,
          format,
          platform: isWindows ? "Windows" : "Other",
          optimizedFor:
            isMP4 && isWindows ? "MP4-Windows" : isMP4 ? "MP4" : "WebM",
        };
      },

      getQualityDescription: () => {
        const { quality } = get();
        const settings = get().getQualityBasedSettings();

        switch (quality) {
          case "low":
            return {
              label: "Baixa Qualidade",
              description: "Arquivo menor, ideal para compartilhamento rápido",
              bitrate: `${Math.round(settings.bitrate / 1000)} Kbps`,
              frameRate: `${settings.frameRate} FPS`,
              suitableFor: "Compartilhamento, tutoriais básicos",
            };
          case "medium":
            return {
              label: "Qualidade Média",
              description: "Equilíbrio entre qualidade e tamanho do arquivo",
              bitrate: `${Math.round(settings.bitrate / 1000)} Kbps`,
              frameRate: `${settings.frameRate} FPS`,
              suitableFor: "Apresentações, demos, uso geral",
            };
          case "high":
            return {
              label: "Alta Qualidade",
              description: "Melhor qualidade visual, arquivo maior",
              bitrate: `${Math.round(settings.bitrate / 1000)} Kbps`,
              frameRate: `${settings.frameRate} FPS`,
              suitableFor: "Conteúdo profissional, edição posterior",
            };
          default:
            return {
              label: "Qualidade Desconhecida",
              description: "",
              bitrate: "N/A",
              frameRate: "N/A",
              suitableFor: "",
            };
        }
      },
    }),
    {
      name: "video-format-config-storage",
      partialize: (state) => ({
        format: state.format,
        codec: state.codec,
        bitrate: state.bitrate,
        quality: state.quality,
        maxResolution: state.maxResolution,
        targetFileSize: state.targetFileSize,
      }),
    },
  ),
);
