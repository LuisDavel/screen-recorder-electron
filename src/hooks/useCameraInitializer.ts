import { useEffect, useState, useCallback } from "react";
import { useCameraConfigStore } from "@/store/store-camera-config";

interface UseCameraInitializerOptions {
  autoInitialize?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseCameraInitializerReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  retryCount: number;
  forceInitialize: () => Promise<void>;
  reset: () => void;
}

export function useCameraInitializer(
  options: UseCameraInitializerOptions = {}
): UseCameraInitializerReturn {
  const {
    autoInitialize = true,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;

  const {
    isEnabled,
    selectedDeviceId,
    mainStream,
    isInitializing: storeInitializing,
    initializeMainStream,
    stopMainStream,
  } = useCameraConfigStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Update initialized state based on main stream
  useEffect(() => {
    const initialized = !!(isEnabled && mainStream);
    setIsInitialized(initialized);

    if (initialized) {
      setError(null);
      setRetryCount(0);
    }
  }, [isEnabled, mainStream]);

  // Update initializing state
  useEffect(() => {
    setIsInitializing(storeInitializing);
  }, [storeInitializing]);

  const forceInitialize = useCallback(async (): Promise<void> => {
    if (!isEnabled || !selectedDeviceId) {
      setError("Câmera não está habilitada ou nenhum dispositivo selecionado");
      return;
    }

    if (isInitializing) {
      console.log("useCameraInitializer: Already initializing, skipping");
      return;
    }

    console.log("useCameraInitializer: Force initializing camera");
    setError(null);
    setIsInitializing(true);

    try {
      await initializeMainStream();

      // Wait a bit to see if stream was created
      await new Promise(resolve => setTimeout(resolve, 500));

      const currentState = useCameraConfigStore.getState();
      if (!currentState.mainStream) {
        throw new Error("Stream não foi criado após inicialização");
      }

      console.log("useCameraInitializer: Camera initialized successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("useCameraInitializer: Error initializing camera:", errorMessage);
      setError(errorMessage);

      // Retry logic
      if (retryCount < retryAttempts) {
        console.log(`useCameraInitializer: Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${retryAttempts})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          forceInitialize();
        }, retryDelay);
      } else {
        console.error("useCameraInitializer: Max retry attempts reached");
        setError(`Falha ao inicializar câmera após ${retryAttempts} tentativas: ${errorMessage}`);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [isEnabled, selectedDeviceId, isInitializing, initializeMainStream, retryCount, retryAttempts, retryDelay]);

  const reset = useCallback(() => {
    console.log("useCameraInitializer: Resetting state");
    setError(null);
    setRetryCount(0);
    setIsInitialized(false);
    stopMainStream();
  }, [stopMainStream]);

  // Auto-initialize when camera is enabled
  useEffect(() => {
    if (!autoInitialize) return;

    if (isEnabled && selectedDeviceId && !mainStream && !isInitializing) {
      console.log("useCameraInitializer: Auto-initializing camera");
      forceInitialize();
    }
  }, [autoInitialize, isEnabled, selectedDeviceId, mainStream, isInitializing, forceInitialize]);

  // Monitor camera state changes
  useEffect(() => {
    if (!isEnabled && mainStream) {
      console.log("useCameraInitializer: Camera disabled, stopping stream");
      reset();
    }
  }, [isEnabled, mainStream, reset]);

  return {
    isInitialized,
    isInitializing,
    error,
    retryCount,
    forceInitialize,
    reset,
  };
}
