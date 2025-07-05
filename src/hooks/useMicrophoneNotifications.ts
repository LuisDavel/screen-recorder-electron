import { useEffect } from "react";
import { useToastHelpers } from "@/components/Toast";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";

export function useMicrophoneNotifications() {
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();
  const { setNotificationCallbacks } = useMicrophoneConfigStore();

  // Set up notification callbacks when hook is used
  useEffect(() => {
    setNotificationCallbacks({
      onSuccess: (message: string) => {
        showSuccess(message);
      },
      onError: (message: string) => {
        showError(message);
      },
      onWarning: (message: string) => {
        showWarning(message);
      },
      onInfo: (message: string) => {
        showInfo(message);
      },
    });
  }, [setNotificationCallbacks, showSuccess, showError, showWarning, showInfo]);

  // Return helper functions for microphone-specific notifications
  return {
    notifyMicrophoneEnabled: () => showInfo("Microfone habilitado"),
    notifyMicrophoneDisabled: () => showInfo("Microfone desabilitado"),
    notifyMicrophoneInitialized: () => showSuccess("Microfone inicializado com sucesso"),
    notifyMicrophoneError: (error: string) => showError(`Erro no microfone: ${error}`),
    notifyMicrophoneWarning: (warning: string) => showWarning(`Aviso do microfone: ${warning}`),
    notifyPermissionRequired: () => showWarning("Permissão de microfone necessária"),
    notifyDeviceNotFound: () => showError("Dispositivo de microfone não encontrado"),
    notifyStreamStopped: () => showInfo("Stream do microfone parado"),
    notifyAudioLevelHigh: () => showWarning("Nível de áudio muito alto"),
    notifyAudioLevelLow: () => showWarning("Nível de áudio muito baixo"),
    notifyNoiseReductionEnabled: () => showInfo("Redução de ruído ativada"),
    notifyEchoCancellationEnabled: () => showInfo("Cancelamento de eco ativado"),
  };
}
