import { useEffect, useCallback } from "react";
import { useToastHelpers } from "@/components/Toast";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";

export type DeviceType = "camera" | "microphone";

export interface UseDeviceNotificationsOptions {
	devices?: DeviceType[];
}

export interface DeviceNotificationHelpers {
	// Generic notifications
	notifySuccess: (message: string) => void;
	notifyError: (message: string) => void;
	notifyWarning: (message: string) => void;
	notifyInfo: (message: string) => void;

	// Camera specific
	notifyCameraEnabled: () => void;
	notifyCameraDisabled: () => void;
	notifyCameraInitialized: () => void;
	notifyCameraError: (error: string) => void;
	notifyCameraWarning: (warning: string) => void;
	notifyPermissionRequired: () => void;
	notifyDeviceNotFound: () => void;
	notifyStreamStopped: () => void;

	// Microphone specific
	notifyMicrophoneEnabled: () => void;
	notifyMicrophoneDisabled: () => void;
	notifyMicrophoneInitialized: () => void;
	notifyMicrophoneError: (error: string) => void;
	notifyMicrophoneWarning: (warning: string) => void;
	notifyMicrophonePermissionRequired: () => void;
	notifyMicrophoneDeviceNotFound: () => void;
	notifyMicrophoneStreamStopped: () => void;
	notifyAudioLevelHigh: () => void;
	notifyAudioLevelLow: () => void;
	notifyNoiseReductionEnabled: () => void;
	notifyEchoCancellationEnabled: () => void;
}

export function useDeviceNotifications(
	options: UseDeviceNotificationsOptions = {},
): DeviceNotificationHelpers {
	const { devices = ["camera", "microphone"] } = options;

	const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();
	const { setNotificationCallbacks: setCameraNotificationCallbacks } =
		useCameraConfigStore();
	const { setNotificationCallbacks: setMicrophoneNotificationCallbacks } =
		useMicrophoneConfigStore();

	// Set up notification callbacks when hook is used
	useEffect(() => {
		const callbacks = {
			onSuccess: (message: string) => showSuccess(message),
			onError: (message: string) => showError(message),
			onWarning: (message: string) => showWarning(message),
			onInfo: (message: string) => showInfo(message),
		};

		if (devices.includes("camera")) {
			setCameraNotificationCallbacks(callbacks);
		}

		if (devices.includes("microphone")) {
			setMicrophoneNotificationCallbacks(callbacks);
		}
	}, [
		devices,
		setCameraNotificationCallbacks,
		setMicrophoneNotificationCallbacks,
		showSuccess,
		showError,
		showWarning,
		showInfo,
	]);

	// Generic notification helpers
	const notifySuccess = useCallback(
		(message: string) => {
			showSuccess(message);
		},
		[showSuccess],
	);

	const notifyError = useCallback(
		(message: string) => {
			showError(message);
		},
		[showError],
	);

	const notifyWarning = useCallback(
		(message: string) => {
			showWarning(message);
		},
		[showWarning],
	);

	const notifyInfo = useCallback(
		(message: string) => {
			showInfo(message);
		},
		[showInfo],
	);

	// Camera specific notifications
	const notifyCameraEnabled = useCallback(() => {
		showInfo("Câmera habilitada");
	}, [showInfo]);

	const notifyCameraDisabled = useCallback(() => {
		showInfo("Câmera desabilitada");
	}, [showInfo]);

	const notifyCameraInitialized = useCallback(() => {
		showSuccess("Câmera inicializada com sucesso");
	}, [showSuccess]);

	const notifyCameraError = useCallback(
		(error: string) => {
			showError(`Erro na câmera: ${error}`);
		},
		[showError],
	);

	const notifyCameraWarning = useCallback(
		(warning: string) => {
			showWarning(`Aviso da câmera: ${warning}`);
		},
		[showWarning],
	);

	const notifyPermissionRequired = useCallback(() => {
		showWarning("Permissão de câmera necessária");
	}, [showWarning]);

	const notifyDeviceNotFound = useCallback(() => {
		showError("Dispositivo de câmera não encontrado");
	}, [showError]);

	const notifyStreamStopped = useCallback(() => {
		showInfo("Stream da câmera parado");
	}, [showInfo]);

	// Microphone specific notifications
	const notifyMicrophoneEnabled = useCallback(() => {
		showInfo("Microfone habilitado");
	}, [showInfo]);

	const notifyMicrophoneDisabled = useCallback(() => {
		showInfo("Microfone desabilitado");
	}, [showInfo]);

	const notifyMicrophoneInitialized = useCallback(() => {
		showSuccess("Microfone inicializado com sucesso");
	}, [showSuccess]);

	const notifyMicrophoneError = useCallback(
		(error: string) => {
			showError(`Erro no microfone: ${error}`);
		},
		[showError],
	);

	const notifyMicrophoneWarning = useCallback(
		(warning: string) => {
			showWarning(`Aviso do microfone: ${warning}`);
		},
		[showWarning],
	);

	const notifyMicrophonePermissionRequired = useCallback(() => {
		showWarning("Permissão de microfone necessária");
	}, [showWarning]);

	const notifyMicrophoneDeviceNotFound = useCallback(() => {
		showError("Dispositivo de microfone não encontrado");
	}, [showError]);

	const notifyMicrophoneStreamStopped = useCallback(() => {
		showInfo("Stream do microfone parado");
	}, [showInfo]);

	const notifyAudioLevelHigh = useCallback(() => {
		showWarning("Nível de áudio muito alto");
	}, [showWarning]);

	const notifyAudioLevelLow = useCallback(() => {
		showWarning("Nível de áudio muito baixo");
	}, [showWarning]);

	const notifyNoiseReductionEnabled = useCallback(() => {
		showInfo("Redução de ruído ativada");
	}, [showInfo]);

	const notifyEchoCancellationEnabled = useCallback(() => {
		showInfo("Cancelamento de eco ativado");
	}, [showInfo]);

	return {
		// Generic
		notifySuccess,
		notifyError,
		notifyWarning,
		notifyInfo,

		// Camera
		notifyCameraEnabled,
		notifyCameraDisabled,
		notifyCameraInitialized,
		notifyCameraError,
		notifyCameraWarning,
		notifyPermissionRequired,
		notifyDeviceNotFound,
		notifyStreamStopped,

		// Microphone
		notifyMicrophoneEnabled,
		notifyMicrophoneDisabled,
		notifyMicrophoneInitialized,
		notifyMicrophoneError,
		notifyMicrophoneWarning,
		notifyMicrophonePermissionRequired,
		notifyMicrophoneDeviceNotFound,
		notifyMicrophoneStreamStopped,
		notifyAudioLevelHigh,
		notifyAudioLevelLow,
		notifyNoiseReductionEnabled,
		notifyEchoCancellationEnabled,
	};
}
