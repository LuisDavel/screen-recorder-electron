import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CameraPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type CameraSize = "small" | "medium" | "large";

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraConfigState {
  // Camera settings
  isEnabled: boolean;
  position: CameraPosition;
  size: CameraSize;
  selectedDeviceId: string | null;
  devices: CameraDevice[];

  // Camera streams
  mainStream: MediaStream | null;
  previewStream: MediaStream | null;

  // Loading states
  isInitializing: boolean;
  isPreviewActive: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setPosition: (position: CameraPosition) => void;
  setSize: (size: CameraSize) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
  setDevices: (devices: CameraDevice[]) => void;
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
  position: "bottom-right" as CameraPosition,
  size: "medium" as CameraSize,
  selectedDeviceId: null,
  devices: [],
  mainStream: null,
  previewStream: null,
  isInitializing: false,
  isPreviewActive: false,
};

export const useCameraConfigStore = create<CameraConfigState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setPosition: (position) => set({ position }),

      setSize: (size) => set({ size }),

      setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),

      setDevices: (devices) => set({ devices }),

      setMainStream: (stream) => set({ mainStream: stream }),

      setPreviewStream: (stream) => set({ previewStream: stream }),

      setIsInitializing: (initializing) =>
        set({ isInitializing: initializing }),

      setIsPreviewActive: (active) => set({ isPreviewActive: active }),

      initializeMainStream: async () => {
        const { selectedDeviceId, isEnabled, mainStream, isInitializing } =
          get();

        if (!isEnabled || !selectedDeviceId || isInitializing) {
          return;
        }

        // Stop existing stream if any
        if (mainStream) {
          mainStream.getTracks().forEach((track) => track.stop());
        }

        set({ isInitializing: true, mainStream: null });

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: selectedDeviceId,
              width: { ideal: 320 },
              height: { ideal: 240 },
            },
            audio: false,
          });

          set({ mainStream: stream, isInitializing: false });

          // Notify success
          const { onSuccess } = get();
          onSuccess?.("Câmera inicializada com sucesso");
        } catch (error) {
          console.error("Erro ao inicializar câmera:", error);

          // Notify error
          const { onError } = get();
          onError?.(
            "Erro ao inicializar câmera: " +
              (error instanceof Error ? error.message : String(error)),
          );

          // Try with basic constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            set({ mainStream: fallbackStream, isInitializing: false });

            // Notify fallback success
            const { onWarning } = get();
            onWarning?.("Câmera inicializada com configurações básicas");
          } catch (fallbackError) {
            console.error("Fallback falhou:", fallbackError);
            set({ isInitializing: false });

            // Notify fallback error
            const { onError } = get();
            onError?.("Falha completa ao inicializar câmera");
          }
        }
      },

      initializePreviewStream: async () => {
        const { selectedDeviceId, previewStream, isPreviewActive } = get();

        if (!selectedDeviceId || !isPreviewActive || previewStream) {
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: selectedDeviceId,
              width: { ideal: 320 },
              height: { ideal: 240 },
            },
            audio: false,
          });

          set({ previewStream: stream });
        } catch (error) {
          console.error("Erro ao inicializar stream de preview:", error);
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

          // Notify camera enabled
          const { onInfo } = get();
          onInfo?.("Câmera habilitada");

          // Force immediate initialization when enabled
          get().initializeMainStream();
        } else {
          get().stopAllStreams();
          set({ isEnabled: newEnabled });

          // Notify camera disabled
          const { onInfo } = get();
          onInfo?.("Câmera desabilitada");
        }
      },

      resetConfig: () => {
        get().stopAllStreams();
        set(defaultState);
      },

      // Force initialization - useful for debugging
      forceInitialize: () => {
        const { selectedDeviceId, isEnabled } = get();
        if (isEnabled && selectedDeviceId) {
          get().initializeMainStream();
        }
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
      name: "camera-config-storage",
      // Don't persist the stream
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        position: state.position,
        size: state.size,
        selectedDeviceId: state.selectedDeviceId,
        devices: state.devices,
      }),
    },
  ),
);
