import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";

export interface DeviceInitializationOptions {
	autoInitialize?: boolean;
	retryAttempts?: number;
	retryDelay?: number;
}

export interface DeviceInitializationResult {
	success: boolean;
	error?: string;
	stream?: MediaStream;
}

export class DeviceInitializationManager {
	private static instance: DeviceInitializationManager;
	private cameraInitialized = false;
	private microphoneInitialized = false;
	private initializationPromises = new Map<
		string,
		Promise<DeviceInitializationResult>
	>();

	private constructor() {}

	static getInstance(): DeviceInitializationManager {
		if (!DeviceInitializationManager.instance) {
			DeviceInitializationManager.instance = new DeviceInitializationManager();
		}
		return DeviceInitializationManager.instance;
	}

	async initializeCamera(
		options: DeviceInitializationOptions = {},
	): Promise<DeviceInitializationResult> {
		const { retryAttempts = 3, retryDelay = 1000 } = options;
		const key = "camera";

		// Se já existe uma inicialização em andamento, aguarda ela
		if (this.initializationPromises.has(key)) {
			return this.initializationPromises.get(key)!;
		}

		const initPromise = this.performCameraInitialization(
			retryAttempts,
			retryDelay,
		);
		this.initializationPromises.set(key, initPromise);

		try {
			const result = await initPromise;
			this.cameraInitialized = result.success;
			return result;
		} finally {
			this.initializationPromises.delete(key);
		}
	}

	async initializeMicrophone(
		options: DeviceInitializationOptions = {},
	): Promise<DeviceInitializationResult> {
		const { retryAttempts = 3, retryDelay = 1000 } = options;
		const key = "microphone";

		// Se já existe uma inicialização em andamento, aguarda ela
		if (this.initializationPromises.has(key)) {
			return this.initializationPromises.get(key)!;
		}

		const initPromise = this.performMicrophoneInitialization(
			retryAttempts,
			retryDelay,
		);
		this.initializationPromises.set(key, initPromise);

		try {
			const result = await initPromise;
			this.microphoneInitialized = result.success;
			return result;
		} finally {
			this.initializationPromises.delete(key);
		}
	}

	private async performCameraInitialization(
		retryAttempts: number,
		retryDelay: number,
	): Promise<DeviceInitializationResult> {
		const cameraStore = useCameraConfigStore.getState();

		if (!cameraStore.isEnabled || !cameraStore.selectedDeviceId) {
			return {
				success: false,
				error: "Câmera não está habilitada ou dispositivo não selecionado",
			};
		}

		if (cameraStore.isInitializing) {
			return { success: false, error: "Câmera já está sendo inicializada" };
		}

		for (let attempt = 1; attempt <= retryAttempts; attempt++) {
			try {
				console.log(
					`Tentativa ${attempt}/${retryAttempts} de inicialização da câmera`,
				);

				// Parar stream existente
				if (cameraStore.mainStream) {
					cameraStore.mainStream.getTracks().forEach((track) => track.stop());
				}

				cameraStore.setIsInitializing(true);

				const stream = await navigator.mediaDevices.getUserMedia({
					video: {
						deviceId: cameraStore.selectedDeviceId,
						width: { ideal: 320 },
						height: { ideal: 240 },
					},
					audio: false,
				});

				cameraStore.setMainStream(stream);
				cameraStore.setIsInitializing(false);

				console.log("Câmera inicializada com sucesso");
				return { success: true, stream };
			} catch (error) {
				console.error(`Erro na tentativa ${attempt}:`, error);

				if (attempt === retryAttempts) {
					// Última tentativa - tentar com configurações básicas
					try {
						const fallbackStream = await navigator.mediaDevices.getUserMedia({
							video: true,
							audio: false,
						});

						cameraStore.setMainStream(fallbackStream);
						cameraStore.setIsInitializing(false);

						console.log("Câmera inicializada com configurações básicas");
						return { success: true, stream: fallbackStream };
					} catch {
						cameraStore.setIsInitializing(false);
						const errorMessage =
							error instanceof Error ? error.message : String(error);
						return {
							success: false,
							error: `Falha ao inicializar câmera: ${errorMessage}`,
						};
					}
				}

				// Aguardar antes da próxima tentativa
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			}
		}

		return { success: false, error: "Todas as tentativas falharam" };
	}

	private async performMicrophoneInitialization(
		retryAttempts: number,
		retryDelay: number,
	): Promise<DeviceInitializationResult> {
		const microphoneStore = useMicrophoneConfigStore.getState();

		if (!microphoneStore.isEnabled || !microphoneStore.selectedDeviceId) {
			return {
				success: false,
				error: "Microfone não está habilitado ou dispositivo não selecionado",
			};
		}

		if (microphoneStore.isInitializing) {
			return { success: false, error: "Microfone já está sendo inicializado" };
		}

		for (let attempt = 1; attempt <= retryAttempts; attempt++) {
			try {
				console.log(
					`Tentativa ${attempt}/${retryAttempts} de inicialização do microfone`,
				);

				// Parar stream existente
				if (microphoneStore.mainStream) {
					microphoneStore.mainStream
						.getTracks()
						.forEach((track) => track.stop());
				}

				microphoneStore.setIsInitializing(true);

				const constraints: MediaStreamConstraints = {
					audio: {
						deviceId: microphoneStore.selectedDeviceId,
						echoCancellation: microphoneStore.echoCancellation,
						noiseSuppression: microphoneStore.noiseReduction,
						autoGainControl: microphoneStore.autoGainControl,
					},
					video: false,
				};

				const stream = await navigator.mediaDevices.getUserMedia(constraints);

				microphoneStore.setMainStream(stream);
				microphoneStore.setIsInitializing(false);

				console.log("Microfone inicializado com sucesso");
				return { success: true, stream };
			} catch (error) {
				console.error(`Erro na tentativa ${attempt}:`, error);

				if (attempt === retryAttempts) {
					// Última tentativa - tentar com configurações básicas
					try {
						const fallbackStream = await navigator.mediaDevices.getUserMedia({
							audio: true,
							video: false,
						});

						microphoneStore.setMainStream(fallbackStream);
						microphoneStore.setIsInitializing(false);

						console.log("Microfone inicializado com configurações básicas");
						return { success: true, stream: fallbackStream };
					} catch {
						microphoneStore.setIsInitializing(false);
						const errorMessage =
							error instanceof Error ? error.message : String(error);
						return {
							success: false,
							error: `Falha ao inicializar microfone: ${errorMessage}`,
						};
					}
				}

				// Aguardar antes da próxima tentativa
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			}
		}

		return { success: false, error: "Todas as tentativas falharam" };
	}

	async initializeAllDevices(
		options: DeviceInitializationOptions = {},
	): Promise<{
		camera: DeviceInitializationResult;
		microphone: DeviceInitializationResult;
	}> {
		const [cameraResult, microphoneResult] = await Promise.all([
			this.initializeCamera(options),
			this.initializeMicrophone(options),
		]);

		return {
			camera: cameraResult,
			microphone: microphoneResult,
		};
	}

	isCameraInitialized(): boolean {
		return this.cameraInitialized;
	}

	isMicrophoneInitialized(): boolean {
		return this.microphoneInitialized;
	}

	reset(): void {
		this.cameraInitialized = false;
		this.microphoneInitialized = false;
		this.initializationPromises.clear();
	}
}

export const deviceInitializationManager =
	DeviceInitializationManager.getInstance();
