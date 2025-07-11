import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CameraPosition {
	x: number;
	y: number;
}

export interface CameraSize {
	width: number;
	height: number;
}

export interface CameraConfig {
	deviceId: string;
	isEnabled: boolean;
	position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
	size: "small" | "medium" | "large";
	mainStream: MediaStream | null;
	isLoading: boolean;
	isInitializing: boolean;
	currentConstraints: MediaTrackConstraints | null;
	deviceList: MediaDeviceInfo[];
	hasPermission: boolean;
	error: string | null;
	// Additional properties for dialog
	selectedDeviceId: string | null;
	devices: { deviceId: string; label: string }[];
	previewStream: MediaStream | null;
	isPreviewActive: boolean;
}

export interface CameraConfigActions {
	setDeviceId: (deviceId: string) => void;
	setIsEnabled: (isEnabled: boolean) => void;
	setPosition: (position: CameraConfig["position"]) => void;
	setSize: (size: CameraConfig["size"]) => void;
	setMainStream: (stream: MediaStream | null) => void;
	setIsLoading: (isLoading: boolean) => void;
	setIsInitializing: (initializing: boolean) => void;
	setCurrentConstraints: (constraints: MediaTrackConstraints | null) => void;
	setDeviceList: (devices: MediaDeviceInfo[]) => void;
	setHasPermission: (hasPermission: boolean) => void;
	setError: (error: string | null) => void;
	// Additional actions for dialog
	setEnabled: (enabled: boolean) => void;
	setSelectedDeviceId: (deviceId: string | null) => void;
	setDevices: (devices: { deviceId: string; label: string }[]) => void;
	setPreviewStream: (stream: MediaStream | null) => void;
	setIsPreviewActive: (active: boolean) => void;
	initializePreviewStream: () => Promise<void>;
	stopPreviewStream: () => void;
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
}

export type CameraConfigStore = CameraConfig & CameraConfigActions;

export const useCameraConfigStore = create<CameraConfigStore>()(
	persist(
		(set, get) => ({
			// Initial state
			deviceId: "",
			isEnabled: false,
			position: "top-right",
			size: "medium",
			mainStream: null,
			isLoading: false,
			isInitializing: false,
			currentConstraints: null,
			deviceList: [],
			hasPermission: false,
			error: null,
			selectedDeviceId: null,
			devices: [],
			previewStream: null,
			isPreviewActive: false,

			// Actions
			setDeviceId: (deviceId) => set({ deviceId }),
			setIsEnabled: (isEnabled) => set({ isEnabled }),
			setPosition: (position) => set({ position }),
			setSize: (size) => set({ size }),
			setMainStream: (stream) => set({ mainStream: stream }),
			setIsLoading: (isLoading) => set({ isLoading }),
			setIsInitializing: (initializing) =>
				set({ isInitializing: initializing }),
			setCurrentConstraints: (constraints) =>
				set({ currentConstraints: constraints }),
			setDeviceList: (devices) => set({ deviceList: devices }),
			setHasPermission: (hasPermission) => set({ hasPermission }),
			setError: (error) => set({ error }),
			// Additional actions for dialog
			setEnabled: (enabled) => set({ isEnabled: enabled }),
			setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
			setDevices: (devices) => set({ devices }),
			setPreviewStream: (stream) => set({ previewStream: stream }),
			setIsPreviewActive: (active) => set({ isPreviewActive: active }),
			initializePreviewStream: async () => {
				const { selectedDeviceId } = get();
				if (selectedDeviceId) {
					try {
						const stream = await navigator.mediaDevices.getUserMedia({
							video: { deviceId: selectedDeviceId },
						});
						set({ previewStream: stream });
					} catch (error) {
						console.error("Erro ao inicializar preview stream:", error);
					}
				}
			},
			stopPreviewStream: () => {
				const { previewStream } = get();
				if (previewStream) {
					previewStream
						.getTracks()
						.forEach((track: MediaStreamTrack) => track.stop());
					set({ previewStream: null });
				}
			},
			// Notification callbacks
			setNotificationCallbacks: (callbacks) =>
				set({
					onSuccess: callbacks.onSuccess,
					onError: callbacks.onError,
					onWarning: callbacks.onWarning,
					onInfo: callbacks.onInfo,
				}),
		}),
		{
			name: "camera-config",
			partialize: (state) => ({
				deviceId: state.deviceId,
				isEnabled: state.isEnabled,
				position: state.position,
				size: state.size,
				// Don't persist streams or loading states
			}),
		},
	),
);
