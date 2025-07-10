import { systemPreferences, shell, app } from "electron";
import { ProductionLogger } from "./production-logger";
import { ManualPermissionTrigger } from "./manual-permission-trigger";

export interface PermissionStatus {
	camera: boolean;
	microphone: boolean;
	screenCapture: boolean;
}

export interface EnhancedPermissionResult {
	status: PermissionStatus;
	errors: string[];
	warnings: string[];
	recommendations: string[];
	needsManualIntervention: boolean;
	troubleshootingSteps: string[];
}

export class EnhancedPermissionsHelper {
	private static async checkSystemPermissionWithRetry(
		type: "camera" | "microphone" | "screen",
		maxRetries = 3,
		delayMs = 1000,
	): Promise<{ status: string; error?: string }> {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const status = await systemPreferences.getMediaAccessStatus(type);
				ProductionLogger.log(
					"INFO",
					`System permission check for ${type} (attempt ${attempt}): ${status}`,
				);
				return { status };
			} catch (error) {
				const errorMessage = `Attempt ${attempt} failed for ${type}: ${error}`;
				ProductionLogger.log("WARN", errorMessage);

				if (attempt === maxRetries) {
					return {
						status: "denied",
						error: `Failed after ${maxRetries} attempts: ${error}`,
					};
				}

				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		return { status: "denied", error: "Unexpected error in retry logic" };
	}

	private static async requestPermissionWithFallback(
		type: "camera" | "microphone",
	): Promise<{ granted: boolean; method: string; error?: string }> {
		// Método 1: Tentar com systemPreferences
		try {
			ProductionLogger.log(
				"INFO",
				`Attempting system permission request for ${type}`,
			);
			const granted = await systemPreferences.askForMediaAccess(type);

			if (granted) {
				return { granted: true, method: "systemPreferences" };
			}
		} catch (error) {
			ProductionLogger.log(
				"WARN",
				`System permission request failed for ${type}: ${error}`,
			);
		}

		// Método 2: Tentar com getUserMedia (mais efetivo em produção)
		try {
			ProductionLogger.log(
				"INFO",
				`Attempting getUserMedia permission request for ${type}`,
			);

			let result: boolean;
			if (type === "camera") {
				result = await ManualPermissionTrigger.requestCameraPermission();
			} else {
				result = await ManualPermissionTrigger.requestMicrophonePermission();
			}

			if (result) {
				return { granted: true, method: "getUserMedia" };
			}
		} catch (error) {
			return {
				granted: false,
				method: "none",
				error: `Both methods failed. Last error: ${error}`,
			};
		}

		return {
			granted: false,
			method: "none",
			error: "Permission was denied by user",
		};
	}

	public static async checkPermissionsEnhanced(): Promise<EnhancedPermissionResult> {
		const errors: string[] = [];
		const warnings: string[] = [];
		const recommendations: string[] = [];
		const troubleshootingSteps: string[] = [];

		ProductionLogger.log("INFO", "Starting enhanced permission check");

		// Check camera
		const cameraCheck = await this.checkSystemPermissionWithRetry("camera");
		const cameraGranted = cameraCheck.status === "granted";

		if (cameraCheck.error) {
			errors.push(
				`Erro ao verificar permissão da câmera: ${cameraCheck.error}`,
			);
			troubleshootingSteps.push(
				"Verifique se o aplicativo está assinado corretamente",
			);
		}

		if (!cameraGranted) {
			if (cameraCheck.status === "denied") {
				warnings.push("Permissão da câmera foi negada pelo usuário");
				recommendations.push(
					"Vá para Preferências do Sistema > Segurança e Privacidade > Câmera e habilite o acesso",
				);
				troubleshootingSteps.push(
					"Remova o app da lista de câmera e execute novamente para forçar nova solicitação",
				);
			} else if (cameraCheck.status === "not-determined") {
				recommendations.push(
					"Execute a solicitação de permissão da câmera novamente",
				);
			}
		}

		// Check microphone
		const microphoneCheck =
			await this.checkSystemPermissionWithRetry("microphone");
		const microphoneGranted = microphoneCheck.status === "granted";

		if (microphoneCheck.error) {
			errors.push(
				`Erro ao verificar permissão do microfone: ${microphoneCheck.error}`,
			);
		}

		if (!microphoneGranted) {
			if (microphoneCheck.status === "denied") {
				warnings.push("Permissão do microfone foi negada pelo usuário");
				recommendations.push(
					"Vá para Preferências do Sistema > Segurança e Privacidade > Microfone e habilite o acesso",
				);
			}
		}

		// Check screen capture
		const screenCheck = await this.checkSystemPermissionWithRetry("screen");
		const screenGranted = screenCheck.status === "granted";

		if (screenCheck.error) {
			errors.push(
				`Erro ao verificar permissão de captura de tela: ${screenCheck.error}`,
			);
		}

		if (!screenGranted) {
			warnings.push("Permissão de captura de tela não está concedida");
			recommendations.push(
				"Vá para Preferências do Sistema > Segurança e Privacidade > Gravação de Tela",
			);
			recommendations.push(
				"Pode ser necessário arrastar o aplicativo para a lista manualmente",
			);
			troubleshootingSteps.push(
				"Feche completamente o aplicativo antes de alterar as configurações de captura de tela",
			);
		}

		// Additional checks for production environment
		if (process.platform === "darwin") {
			// Check macOS version
			const osVersion = process.getSystemVersion();
			const majorVersion = parseInt(osVersion.split(".")[0]);

			if (majorVersion < 10) {
				warnings.push(`macOS ${osVersion} pode ter limitações de permissão`);
				recommendations.push(
					"Considere atualizar para uma versão mais recente",
				);
			}

			// Check if app is properly signed
			try {
				const isPackaged = app.isPackaged;
				if (!isPackaged) {
					warnings.push("Aplicativo em modo de desenvolvimento");
					recommendations.push(
						"Teste com uma build empacotada para verificar permissões de produção",
					);
				}
			} catch (error) {
				errors.push(`Erro ao verificar status do aplicativo: ${error}`);
			}
		}

		const status: PermissionStatus = {
			camera: cameraGranted,
			microphone: microphoneGranted,
			screenCapture: screenGranted,
		};

		const needsManualIntervention =
			errors.length > 0 ||
			(!cameraGranted && cameraCheck.status === "denied") ||
			(!microphoneGranted && microphoneCheck.status === "denied") ||
			!screenGranted;

		// Add general troubleshooting steps
		if (needsManualIntervention) {
			troubleshootingSteps.push(
				"Reinicie o aplicativo após alterar as permissões",
			);
			troubleshootingSteps.push(
				"Verifique se não há outros aplicativos usando a câmera/microfone",
			);
			troubleshootingSteps.push(
				"Execute o aplicativo como administrador se os problemas persistirem",
			);
		}

		const result: EnhancedPermissionResult = {
			status,
			errors,
			warnings,
			recommendations,
			needsManualIntervention,
			troubleshootingSteps,
		};

		ProductionLogger.log("INFO", "Enhanced permission check completed", {
			cameraGranted: result.status.camera,
			microphoneGranted: result.status.microphone,
			screenCaptureGranted: result.status.screenCapture,
			errorCount: result.errors.length,
			warningCount: result.warnings.length,
			needsManualIntervention: result.needsManualIntervention,
		});

		return result;
	}

	public static async requestPermissionsEnhanced(): Promise<EnhancedPermissionResult> {
		ProductionLogger.log("INFO", "Starting enhanced permission request");

		const errors: string[] = [];
		const warnings: string[] = [];
		const recommendations: string[] = [];
		const troubleshootingSteps: string[] = [];

		// Request camera permission
		const cameraResult = await this.requestPermissionWithFallback("camera");
		if (!cameraResult.granted && cameraResult.error) {
			errors.push(
				`Erro ao solicitar permissão da câmera: ${cameraResult.error}`,
			);
		}

		// Request microphone permission
		const microphoneResult =
			await this.requestPermissionWithFallback("microphone");
		if (!microphoneResult.granted && microphoneResult.error) {
			errors.push(
				`Erro ao solicitar permissão do microfone: ${microphoneResult.error}`,
			);
		}

		// For screen capture, we can only check and guide to system preferences
		let screenGranted = false;
		try {
			const screenStatus =
				await systemPreferences.getMediaAccessStatus("screen");
			screenGranted = screenStatus === "granted";

			if (!screenGranted) {
				recommendations.push(
					"Abra as Preferências do Sistema para configurar captura de tela",
				);
				// Open system preferences for screen recording
				await shell.openPath(
					"x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
				);
			}
		} catch (error) {
			errors.push(`Erro ao verificar captura de tela: ${error}`);
		}

		const status: PermissionStatus = {
			camera: cameraResult.granted,
			microphone: microphoneResult.granted,
			screenCapture: screenGranted,
		};

		const needsManualIntervention =
			errors.length > 0 ||
			!status.camera ||
			!status.microphone ||
			!status.screenCapture;

		if (needsManualIntervention) {
			troubleshootingSteps.push(
				"Verifique se as permissões foram concedidas nas Preferências do Sistema",
			);
			troubleshootingSteps.push(
				"Reinicie o aplicativo após conceder as permissões",
			);
		}

		const result: EnhancedPermissionResult = {
			status,
			errors,
			warnings,
			recommendations,
			needsManualIntervention,
			troubleshootingSteps,
		};

		ProductionLogger.log("INFO", "Enhanced permission request completed", {
			cameraGranted: result.status.camera,
			microphoneGranted: result.status.microphone,
			screenCaptureGranted: result.status.screenCapture,
			errorCount: result.errors.length,
			warningCount: result.warnings.length,
			needsManualIntervention: result.needsManualIntervention,
		});

		return result;
	}

	public static async resetPermissions(): Promise<{
		success: boolean;
		message: string;
	}> {
		try {
			ProductionLogger.log("INFO", "Attempting to reset permissions");

			if (process.platform === "darwin") {
				const appBundleId = app.getName();

				// Instructions for manual reset since we can't do it programmatically
				const message = `Para resetar as permissões:

1. Abra o Terminal
2. Execute os seguintes comandos:

tccutil reset Camera ${appBundleId}
tccutil reset Microphone ${appBundleId}
tccutil reset ScreenCapture ${appBundleId}

3. Reinicie o aplicativo

Alternativamente, vá para Preferências do Sistema > Segurança e Privacidade > Privacidade e remova o aplicativo das listas de Câmera, Microfone e Gravação de Tela.`;

				ProductionLogger.log("INFO", "Permission reset instructions provided");

				return {
					success: true,
					message,
				};
			}

			return {
				success: false,
				message: "Reset de permissões só é suportado no macOS",
			};
		} catch (error) {
			ProductionLogger.log(
				"ERROR",
				"Failed to provide reset instructions",
				error as string,
			);
			return {
				success: false,
				message: `Erro ao fornecer instruções de reset: ${error}`,
			};
		}
	}
}
