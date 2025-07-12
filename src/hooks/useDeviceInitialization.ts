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
	reconnectDevices: () => Promise<void>;
}

// Global locks to prevent multiple simultaneous initializations
let cameraInitializationLock = false;
let microphoneInitializationLock = false;

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

			// Check if already initializing
			if (cameraInitializationLock) {
				console.log("Camera initialization already in progress, skipping...");
				return {
					success: false,
					error: "Inicialização da câmera já em andamento",
				};
			}

			cameraInitializationLock = true;
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
			} finally {
				cameraInitializationLock = false;
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

			// Check if already initializing
			if (microphoneInitializationLock) {
				console.log(
					"Microphone initialization already in progress, skipping...",
				);
				return {
					success: false,
					error: "Inicialização do microfone já em andamento",
				};
			}

			microphoneInitializationLock = true;
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
			} finally {
				microphoneInitializationLock = false;
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

	// Reconnect devices on page load
	const reconnectDevices = useCallback(async (): Promise<void> => {
		console.log("Attempting to reconnect devices...");

		if (devices.includes("camera")) {
			await cameraStore.reconnectCamera();
		}

		if (devices.includes("microphone")) {
			await microphoneStore.reconnectMicrophone();
		}
	}, [devices, cameraStore, microphoneStore]);

	// Reset function
	const reset = useCallback(() => {
		setCameraInitialized(false);
		setCameraError(null);
		setMicrophoneInitialized(false);
		setMicrophoneError(null);
		deviceInitializationManager.reset();
		// Reset locks
		cameraInitializationLock = false;
		microphoneInitializationLock = false;
	}, []);

	// Auto-initialize when devices are enabled (with debounce)
	useEffect(() => {
		if (!autoInitialize) return;

		const shouldInitializeCamera =
			devices.includes("camera") &&
			cameraStore.isEnabled &&
			cameraStore.selectedDeviceId &&
			!cameraStore.mainStream &&
			!cameraStore.isInitializing &&
			!cameraInitializationLock;

		const shouldInitializeMicrophone =
			devices.includes("microphone") &&
			microphoneStore.isEnabled &&
			microphoneStore.selectedDeviceId &&
			!microphoneStore.mainStream &&
			!microphoneStore.isInitializing &&
			!microphoneInitializationLock;

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

	// Reconnect devices on mount (for page refresh scenarios)
	useEffect(() => {
		if (autoInitialize) {
			// Small delay to ensure stores are hydrated
			const timer = setTimeout(() => {
				reconnectDevices();
			}, 500);

			return () => clearTimeout(timer);
		}
	}, [autoInitialize, reconnectDevices]);

	// Watch for route changes or component re-mounts and reconnect if needed
	useEffect(() => {
		const interval = setInterval(() => {
			// Check if devices are enabled but don't have streams
			const cameraNeedsReconnect =
				devices.includes("camera") &&
				cameraStore.isEnabled &&
				cameraStore.selectedDeviceId &&
				!cameraStore.mainStream &&
				!cameraStore.isInitializing;

			const microphoneNeedsReconnect =
				devices.includes("microphone") &&
				microphoneStore.isEnabled &&
				microphoneStore.selectedDeviceId &&
				!microphoneStore.mainStream &&
				!microphoneStore.isInitializing;

			if (cameraNeedsReconnect || microphoneNeedsReconnect) {
				console.log("🔄 Device reconnection needed:", {
					camera: cameraNeedsReconnect,
					microphone: microphoneNeedsReconnect,
				});
				reconnectDevices();
			}
		}, 3000); // Check every 3 seconds

		return () => clearInterval(interval);
	}, [
		devices,
		cameraStore.isEnabled,
		cameraStore.selectedDeviceId,
		cameraStore.mainStream,
		cameraStore.isInitializing,
		microphoneStore.isEnabled,
		microphoneStore.selectedDeviceId,
		microphoneStore.mainStream,
		microphoneStore.isInitializing,
		reconnectDevices,
	]);

	// Monitor stream health and reconnect if tracks become inactive
	useEffect(() => {
		const healthCheck = setInterval(async () => {
			if (devices.includes("camera")) {
				await cameraStore.checkAndReconnectCamera();
			}

			// Add microphone health check if needed
			if (devices.includes("microphone")) {
				const { isEnabled, selectedDeviceId, mainStream } = microphoneStore;
				if (isEnabled && selectedDeviceId && mainStream) {
					const streamActive =
						mainStream.getTracks().length > 0 &&
						mainStream.getTracks().some((track) => track.readyState === "live");
					if (!streamActive) {
						console.log(
							"🔄 Microphone stream not active, attempting reconnect...",
						);
						await microphoneStore.reconnectMicrophone();
					}
				}
			}
		}, 5000); // Check every 5 seconds

		return () => clearInterval(healthCheck);
	}, [devices, cameraStore, microphoneStore]);

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
		reconnectDevices,
	};
}
