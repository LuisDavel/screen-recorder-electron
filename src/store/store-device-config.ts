import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DeviceType = "camera" | "microphone";

export interface DeviceInfo {
	deviceId: string;
	label: string;
}

export interface DeviceConfig {
	type: DeviceType;
	isEnabled: boolean;
	selectedDeviceId: string | null;
	devices: DeviceInfo[];
	mainStream: MediaStream | null;
	previewStream: MediaStream | null;
	isInitializing: boolean;
	isPreviewActive: boolean;
	error: string | null;
}

export interface DeviceConfigActions {
	setEnabled: (enabled: boolean) => void;
	setSelectedDeviceId: (deviceId: string | null) => void;
	setDevices: (devices: DeviceInfo[]) => void;
	setMainStream: (stream: MediaStream | null) => void;
	setPreviewStream: (stream: MediaStream | null) => void;
	setIsInitializing: (initializing: boolean) => void;
	setIsPreviewActive: (active: boolean) => void;
	setError: (error: string | null) => void;

	// Stream management
	initializeMainStream: () => Promise<void>;
	initializePreviewStream: () => Promise<void>;
	stopMainStream: () => void;
	stopPreviewStream: () => void;
	stopAllStreams: () => void;

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

	// Utility actions
	toggleEnabled: () => void;
	resetConfig: () => void;
}

export type DeviceConfigStore = DeviceConfig & DeviceConfigActions;

export function createDeviceStore(deviceType: DeviceType, storeName: string) {
	return create<DeviceConfigStore>()(
		persist(
			(set, get) => ({
				// Initial state
				type: deviceType,
				isEnabled: false,
				selectedDeviceId: null,
				devices: [],
				mainStream: null,
				previewStream: null,
				isInitializing: false,
				isPreviewActive: false,
				error: null,

				// Basic setters
				setEnabled: (enabled) => set({ isEnabled: enabled }),
				setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
				setDevices: (devices) => set({ devices }),
				setMainStream: (stream) => set({ mainStream: stream }),
				setPreviewStream: (stream) => set({ previewStream: stream }),
				setIsInitializing: (initializing) =>
					set({ isInitializing: initializing }),
				setIsPreviewActive: (active) => set({ isPreviewActive: active }),
				setError: (error) => set({ error }),

				// Stream management
				initializeMainStream: async () => {
					const {
						selectedDeviceId,
						isEnabled,
						mainStream,
						isInitializing,
						type,
					} = get();

					if (!isEnabled || !selectedDeviceId || isInitializing) return;

					if (mainStream) {
						mainStream.getTracks().forEach((track) => track.stop());
					}

					set({ isInitializing: true, mainStream: null });

					try {
						const constraints: MediaStreamConstraints =
							type === "camera"
								? { video: { deviceId: selectedDeviceId } }
								: { audio: { deviceId: selectedDeviceId } };

						const stream =
							await navigator.mediaDevices.getUserMedia(constraints);
						set({ mainStream: stream, isInitializing: false });

						const { onSuccess } = get();
						onSuccess?.(
							`${type === "camera" ? "Câmera" : "Microfone"} inicializado com sucesso`,
						);
					} catch (error) {
						console.error(`Erro ao inicializar ${type}:`, error);
						set({ isInitializing: false });

						const { onError } = get();
						onError?.(
							`Erro ao inicializar ${type === "camera" ? "câmera" : "microfone"}: ${
								error instanceof Error ? error.message : String(error)
							}`,
						);
					}
				},

				initializePreviewStream: async () => {
					const { selectedDeviceId, previewStream, isPreviewActive, type } =
						get();

					if (!selectedDeviceId || !isPreviewActive || previewStream) return;

					try {
						const constraints: MediaStreamConstraints =
							type === "camera"
								? { video: { deviceId: selectedDeviceId } }
								: { audio: { deviceId: selectedDeviceId } };

						const stream =
							await navigator.mediaDevices.getUserMedia(constraints);
						set({ previewStream: stream });
					} catch (error) {
						console.error(`Erro ao inicializar preview do ${type}:`, error);
						set({ error: `Erro ao inicializar preview do ${type}` });
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
					const { isEnabled, type } = get();
					const newEnabled = !isEnabled;

					if (newEnabled) {
						set({ isEnabled: newEnabled });
						const { onInfo } = get();
						onInfo?.(
							`${type === "camera" ? "Câmera" : "Microfone"} habilitado`,
						);
						get().initializeMainStream();
					} else {
						get().stopAllStreams();
						set({ isEnabled: newEnabled });
						const { onInfo } = get();
						onInfo?.(
							`${type === "camera" ? "Câmera" : "Microfone"} desabilitado`,
						);
					}
				},

				resetConfig: () => {
					get().stopAllStreams();
					set({
						isEnabled: false,
						selectedDeviceId: null,
						devices: [],
						mainStream: null,
						previewStream: null,
						isInitializing: false,
						isPreviewActive: false,
						error: null,
					});
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
				name: storeName,
				partialize: (state) => ({
					isEnabled: state.isEnabled,
					selectedDeviceId: state.selectedDeviceId,
					devices: state.devices,
				}),
			},
		),
	);
}

// Create specific stores for camera and microphone
export const useCameraStore = createDeviceStore(
	"camera",
	"camera-device-config",
);
export const useMicrophoneStore = createDeviceStore(
	"microphone",
	"microphone-device-config",
);
