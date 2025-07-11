import { useEffect, useCallback, useState } from "react";
import {
	deviceInitializationManager,
	DeviceInitializationOptions,
	DeviceInitializationResult,
} from "@/helpers/device-initialization-manager";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";

export interface UseDeviceInitializationOptions
	extends DeviceInitializationOptions {
	devices?: ("camera" | "microphone")[];
	autoInitialize?: boolean;
}

export interface UseDeviceInitializationReturn {
	// Camera
	cameraInitialized: boolean;
	cameraInitializing: boolean;
	cameraError: string | null;
	initializeCamera: () => Promise<DeviceInitializationResult>;

	// Microphone
	microphoneInitialized: boolean;
	microphoneInitializing: boolean;
	microphoneError: string | null;
	initializeMicrophone: () => Promise<DeviceInitializationResult>;

	// Combined
	initializeAllDevices: () => Promise<void>;
	isAnyDeviceInitializing: boolean;
	allDevicesInitialized: boolean;

	// Control
	reset: () => void;
}

export function useDeviceInitialization(
	options: UseDeviceInitializationOptions = {},
): UseDeviceInitializationReturn {
	const {
		devices = ["camera", "microphone"],
		autoInitialize = true,
		retryAttempts = 3,
		retryDelay = 1000,
	} = options;

	// States
	const [cameraInitialized, setCameraInitialized] = useState(false);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [microphoneInitialized, setMicrophoneInitialized] = useState(false);
	const [microphoneError, setMicrophoneError] = useState<string | null>(null);

	// Store states
	const cameraStore = useCameraConfigStore();
	const microphoneStore = useMicrophoneConfigStore();

	// Initialize camera
	const initializeCamera =
		useCallback(async (): Promise<DeviceInitializationResult> => {
			if (!devices.includes("camera")) {
				return {
					success: false,
					error: "Câmera não está incluída nos dispositivos configurados",
				};
			}

			setCameraError(null);

			try {
				const result = await deviceInitializationManager.initializeCamera({
					retryAttempts,
					retryDelay,
				});

				setCameraInitialized(result.success);
				if (!result.success && result.error) {
					setCameraError(result.error);
				}

				return result;
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				setCameraError(errorMessage);
				return { success: false, error: errorMessage };
			}
		}, [devices, retryAttempts, retryDelay]);

	// Initialize microphone
	const initializeMicrophone =
		useCallback(async (): Promise<DeviceInitializationResult> => {
			if (!devices.includes("microphone")) {
				return {
					success: false,
					error: "Microfone não está incluído nos dispositivos configurados",
				};
			}

			setMicrophoneError(null);

			try {
				const result = await deviceInitializationManager.initializeMicrophone({
					retryAttempts,
					retryDelay,
				});

				setMicrophoneInitialized(result.success);
				if (!result.success && result.error) {
					setMicrophoneError(result.error);
				}

				return result;
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				setMicrophoneError(errorMessage);
				return { success: false, error: errorMessage };
			}
		}, [devices, retryAttempts, retryDelay]);

	// Initialize all devices
	const initializeAllDevices = useCallback(async (): Promise<void> => {
		const promises: Promise<DeviceInitializationResult>[] = [];

		if (devices.includes("camera")) {
			promises.push(initializeCamera());
		}

		if (devices.includes("microphone")) {
			promises.push(initializeMicrophone());
		}

		await Promise.all(promises);
	}, [devices, initializeCamera, initializeMicrophone]);

	// Reset function
	const reset = useCallback(() => {
		setCameraInitialized(false);
		setCameraError(null);
		setMicrophoneInitialized(false);
		setMicrophoneError(null);
		deviceInitializationManager.reset();
	}, []);

	// Auto-initialize when devices are enabled
	useEffect(() => {
		if (!autoInitialize) return;

		const shouldInitializeCamera =
			devices.includes("camera") &&
			cameraStore.isEnabled &&
			cameraStore.selectedDeviceId &&
			!cameraStore.mainStream &&
			!cameraStore.isInitializing;

		const shouldInitializeMicrophone =
			devices.includes("microphone") &&
			microphoneStore.isEnabled &&
			microphoneStore.selectedDeviceId &&
			!microphoneStore.mainStream &&
			!microphoneStore.isInitializing;

		if (shouldInitializeCamera) {
			console.log("Auto-inicializando câmera...");
			initializeCamera();
		}

		if (shouldInitializeMicrophone) {
			console.log("Auto-inicializando microfone...");
			initializeMicrophone();
		}
	}, [
		autoInitialize,
		devices,
		cameraStore.isEnabled,
		cameraStore.selectedDeviceId,
		cameraStore.mainStream,
		cameraStore.isInitializing,
		microphoneStore.isEnabled,
		microphoneStore.selectedDeviceId,
		microphoneStore.mainStream,
		microphoneStore.isInitializing,
		initializeCamera,
		initializeMicrophone,
	]);

	// Update initialized states based on streams
	useEffect(() => {
		if (devices.includes("camera")) {
			setCameraInitialized(!!cameraStore.mainStream);
		}
	}, [devices, cameraStore.mainStream]);

	useEffect(() => {
		if (devices.includes("microphone")) {
			setMicrophoneInitialized(!!microphoneStore.mainStream);
		}
	}, [devices, microphoneStore.mainStream]);

	// Computed values
	const isAnyDeviceInitializing =
		(devices.includes("camera") && cameraStore.isInitializing) ||
		(devices.includes("microphone") && microphoneStore.isInitializing);

	const allDevicesInitialized = devices.every((device) => {
		if (device === "camera") {
			return !cameraStore.isEnabled || cameraInitialized;
		}
		if (device === "microphone") {
			return !microphoneStore.isEnabled || microphoneInitialized;
		}
		return true;
	});

	return {
		// Camera
		cameraInitialized,
		cameraInitializing: cameraStore.isInitializing,
		cameraError,
		initializeCamera,

		// Microphone
		microphoneInitialized,
		microphoneInitializing: microphoneStore.isInitializing,
		microphoneError,
		initializeMicrophone,

		// Combined
		initializeAllDevices,
		isAnyDeviceInitializing,
		allDevicesInitialized,

		// Control
		reset,
	};
}
