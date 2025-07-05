import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MicrophoneGain = "low" | "medium" | "high";

interface MicrophoneDevice {
  deviceId: string;
  label: string;
}

interface MicrophoneConfigState {
  // Microphone settings
  isEnabled: boolean;
  selectedDeviceId: string | null;
  devices: MicrophoneDevice[];

  // Audio settings
  gain: MicrophoneGain;
  noiseReduction: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;

  // Microphone streams
  mainStream: MediaStream | null;
  previewStream: MediaStream | null;

  // Loading states
  isInitializing: boolean;
  isPreviewActive: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
  setDevices: (devices: MicrophoneDevice[]) => void;
  setGain: (gain: MicrophoneGain) => void;
  setNoiseReduction: (enabled: boolean) => void;
  setEchoCancellation: (enabled: boolean) => void;
  setAutoGainControl: (enabled: boolean) => void;
  setMainStream: (stream: MediaStream | null) => void;
  setPreviewStream: (stream: MediaStream | null) => void;
  setIsInitializing: (initializing: boolean) => void;
  setIsPreviewActive: (active: boolean) => void;

  // Notification callbacks
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onWarning?: (message: string) => void;
  onInfo?: (message: string) => void;
  setNotificationCallbacks: (callbacks: {
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
    onWarning?: (message: string) => void;
    onInfo?: (message: string) => void;
  }) => void;

  // Stream management
  initializeMainStream: () => Promise<void>;
  initializePreviewStream: () => Promise<void>;
  stopMainStream: () => void;
  stopPreviewStream: () => void;
  stopAllStreams: () => void;

  // Utility actions
  toggleEnabled: () => void;
  resetConfig: () => void;
}

const defaultState = {
  isEnabled: false,
  selectedDeviceId: null,
  devices: [],
  gain: "medium" as MicrophoneGain,
  noiseReduction: true,
  echoCancellation: true,
  autoGainControl: true,
  mainStream: null,
  previewStream: null,
  isInitializing: false,
  isPreviewActive: false,
};

export const useMicrophoneConfigStore = create<MicrophoneConfigState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),

      setDevices: (devices) => set({ devices }),

      setGain: (gain) => set({ gain }),

      setNoiseReduction: (enabled) => set({ noiseReduction: enabled }),

      setEchoCancellation: (enabled) => set({ echoCancellation: enabled }),

      setAutoGainControl: (enabled) => set({ autoGainControl: enabled }),

      setMainStream: (stream) => set({ mainStream: stream }),

      setPreviewStream: (stream) => set({ previewStream: stream }),

      setIsInitializing: (initializing) =>
        set({ isInitializing: initializing }),

      setIsPreviewActive: (active) => set({ isPreviewActive: active }),

      initializeMainStream: async () => {
        const {
          selectedDeviceId,
          isEnabled,
          mainStream,
          isInitializing,
          gain,
          noiseReduction,
          echoCancellation,
          autoGainControl
        } = get();

        if (!isEnabled || !selectedDeviceId || isInitializing) {
          return;
        }

        // Stop existing stream if any
        if (mainStream) {
          mainStream.getTracks().forEach((track) => track.stop());
        }

        set({ isInitializing: true, mainStream: null });

        try {
          const constraints: MediaStreamConstraints = {
            audio: {
              deviceId: selectedDeviceId,
              echoCancellation: echoCancellation,
              noiseSuppression: noiseReduction,
              autoGainControl: autoGainControl,
              // Map gain to actual values
              ...(gain === "low" && { volume: 0.3 }),
              ...(gain === "medium" && { volume: 0.7 }),
              ...(gain === "high" && { volume: 1.0 }),
            },
            video: false,
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          set({ mainStream: stream, isInitializing: false });

          // Notify success
          const { onSuccess } = get();
          onSuccess?.("Microfone inicializado com sucesso");
        } catch (error) {
          console.error("Erro ao inicializar microfone:", error);

          // Notify error
          const { onError } = get();
          onError?.(
            "Erro ao inicializar microfone: " +
              (error instanceof Error ? error.message : String(error)),
          );

          // Try with basic constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
            set({ mainStream: fallbackStream, isInitializing: false });

            // Notify fallback success
            const { onWarning } = get();
            onWarning?.("Microfone inicializado com configurações básicas");
          } catch (fallbackError) {
            console.error("Fallback falhou:", fallbackError);
            set({ isInitializing: false });

            // Notify fallback error
            const { onError } = get();
            onError?.("Falha completa ao inicializar microfone");
          }
        }
      },

      initializePreviewStream: async () => {
        const {
          selectedDeviceId,
          previewStream,
          isPreviewActive,
          noiseReduction,
          echoCancellation,
          autoGainControl
        } = get();

        if (!selectedDeviceId || !isPreviewActive || previewStream) {
          return;
        }

        try {
          const constraints: MediaStreamConstraints = {
            audio: {
              deviceId: selectedDeviceId,
              echoCancellation: echoCancellation,
              noiseSuppression: noiseReduction,
              autoGainControl: autoGainControl,
            },
            video: false,
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          set({ previewStream: stream });
        } catch (error) {
          console.error("Erro ao inicializar stream de preview do microfone:", error);
        }
      },

      stopMainStream: () => {
        const { mainStream } = get();
        if (mainStream) {
          mainStream.getTracks().forEach((track) => track.stop());
          set({ mainStream: null });
        }
      },

      stopPreviewStream: () => {
        const { previewStream } = get();
        if (previewStream) {
          previewStream.getTracks().forEach((track) => track.stop());
          set({ previewStream: null });
        }
      },

      stopAllStreams: () => {
        const { mainStream, previewStream } = get();
        if (mainStream) {
          mainStream.getTracks().forEach((track) => track.stop());
        }
        if (previewStream) {
          previewStream.getTracks().forEach((track) => track.stop());
        }
        set({ mainStream: null, previewStream: null });
      },

      toggleEnabled: () => {
        const { isEnabled } = get();
        const newEnabled = !isEnabled;

        if (newEnabled) {
          set({ isEnabled: newEnabled });

          // Notify microphone enabled
          const { onInfo } = get();
          onInfo?.("Microfone habilitado");

          // Force immediate initialization when enabled
          get().initializeMainStream();
        } else {
          get().stopAllStreams();
          set({ isEnabled: newEnabled });

          // Notify microphone disabled
          const { onInfo } = get();
          onInfo?.("Microfone desabilitado");
        }
      },

      resetConfig: () => {
        get().stopAllStreams();
        set(defaultState);
      },

      setNotificationCallbacks: (callbacks) => {
        set({
          onSuccess: callbacks.onSuccess,
          onError: callbacks.onError,
          onWarning: callbacks.onWarning,
          onInfo: callbacks.onInfo,
        });
      },
    }),
    {
      name: "microphone-config-storage",
      // Don't persist the stream
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        selectedDeviceId: state.selectedDeviceId,
        devices: state.devices,
        gain: state.gain,
        noiseReduction: state.noiseReduction,
        echoCancellation: state.echoCancellation,
        autoGainControl: state.autoGainControl,
      }),
    },
  ),
);
