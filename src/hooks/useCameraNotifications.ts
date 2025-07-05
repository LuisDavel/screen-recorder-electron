import { useEffect } from "react";
import { useToastHelpers } from "@/components/Toast";
import { useCameraConfigStore } from "@/store/store-camera-config";

export function useCameraNotifications() {
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();
  const { setNotificationCallbacks } = useCameraConfigStore();

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

  // Return helper functions for camera-specific notifications
  return {
    notifyCameraEnabled: () => showInfo("Câmera habilitada"),
    notifyCameraDisabled: () => showInfo("Câmera desabilitada"),
    notifyCameraInitialized: () => showSuccess("Câmera inicializada com sucesso"),
    notifyCameraError: (error: string) => showError(`Erro na câmera: ${error}`),
    notifyCameraWarning: (warning: string) => showWarning(`Aviso da câmera: ${warning}`),
    notifyPermissionRequired: () => showWarning("Permissão de câmera necessária"),
    notifyDeviceNotFound: () => showError("Dispositivo de câmera não encontrado"),
    notifyStreamStopped: () => showInfo("Stream da câmera parado"),
  };
}
