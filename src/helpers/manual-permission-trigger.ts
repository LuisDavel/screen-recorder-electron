import { RendererLogger } from "./renderer-logger";

export class ManualPermissionTrigger {
	static async requestCameraPermission(): Promise<boolean> {
		try {
			RendererLogger.log(
				"INFO",
				"Attempting to request camera permission via getUserMedia",
			);

			// Tentar acessar a câmera para forçar o diálogo
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false,
			});

			// Parar o stream imediatamente
			stream.getTracks().forEach((track) => track.stop());

			RendererLogger.log("INFO", "Camera permission granted via getUserMedia");
			return true;
		} catch (error) {
			RendererLogger.log(
				"ERROR",
				"Camera permission denied via getUserMedia",
				error as string,
			);
			return false;
		}
	}

	static async requestMicrophonePermission(): Promise<boolean> {
		try {
			RendererLogger.log(
				"INFO",
				"Attempting to request microphone permission via getUserMedia",
			);

			// Tentar acessar o microfone para forçar o diálogo
			const stream = await navigator.mediaDevices.getUserMedia({
				video: false,
				audio: true,
			});

			// Parar o stream imediatamente
			stream.getTracks().forEach((track) => track.stop());

			RendererLogger.log(
				"INFO",
				"Microphone permission granted via getUserMedia",
			);
			return true;
		} catch (error) {
			RendererLogger.log(
				"ERROR",
				"Microphone permission denied via getUserMedia",
				error as string,
			);
			return false;
		}
	}

	static async requestBothPermissions(): Promise<{
		camera: boolean;
		microphone: boolean;
	}> {
		try {
			RendererLogger.log(
				"INFO",
				"Attempting to request both camera and microphone permissions",
			);

			// Tentar acessar tanto câmera quanto microfone
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});

			// Parar o stream imediatamente
			stream.getTracks().forEach((track) => track.stop());

			RendererLogger.log(
				"INFO",
				"Both camera and microphone permissions granted via getUserMedia",
			);
			return { camera: true, microphone: true };
		} catch (error) {
			RendererLogger.log(
				"ERROR",
				"Failed to get both permissions via getUserMedia",
				error as string,
			);

			// Tentar individualmente
			const camera = await this.requestCameraPermission();
			const microphone = await this.requestMicrophonePermission();

			return { camera, microphone };
		}
	}
}
