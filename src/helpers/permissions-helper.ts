import { systemPreferences, shell } from "electron";
import { ProductionLogger } from "./production-logger";

export interface PermissionStatus {
	camera: boolean;
	microphone: boolean;
	screenCapture: boolean;
}

export class PermissionsHelper {
	// Check current permission status
	static async checkPermissions(): Promise<PermissionStatus> {
		try {
			const cameraStatus =
				await systemPreferences.getMediaAccessStatus("camera");
			const microphoneStatus =
				await systemPreferences.getMediaAccessStatus("microphone");
			const screenCaptureStatus =
				await systemPreferences.getMediaAccessStatus("screen");

			const permissions = {
				camera: cameraStatus === "granted",
				microphone: microphoneStatus === "granted",
				screenCapture: screenCaptureStatus === "granted",
			};

			// Log permission status
			ProductionLogger.logPermissionStatus(permissions);

			return permissions;
		} catch (error) {
			console.error("Error checking permissions:", error);
			ProductionLogger.log(
				"ERROR",
				"Failed to check permissions",
				error as string,
			);
			return {
				camera: false,
				microphone: false,
				screenCapture: false,
			};
		}
	}

	// Request permissions from system
	static async requestPermissions(): Promise<PermissionStatus> {
		try {
			console.log("Requesting system permissions...");
			ProductionLogger.log("INFO", "Starting permission request process");

			// Request camera permission
			const cameraPermission =
				await systemPreferences.askForMediaAccess("camera");
			console.log("Camera permission:", cameraPermission);
			ProductionLogger.logPermissionRequest("camera", cameraPermission);

			// Request microphone permission
			const microphonePermission =
				await systemPreferences.askForMediaAccess("microphone");
			console.log("Microphone permission:", microphonePermission);
			ProductionLogger.logPermissionRequest("microphone", microphonePermission);

			// For screen capture, we need to guide user to system preferences
			// as it requires manual approval in macOS
			const screenCaptureStatus =
				await systemPreferences.getMediaAccessStatus("screen");
			console.log("Screen capture status:", screenCaptureStatus);
			ProductionLogger.logPermissionRequest(
				"screen",
				screenCaptureStatus === "granted",
			);

			const finalPermissions = {
				camera: cameraPermission,
				microphone: microphonePermission,
				screenCapture: screenCaptureStatus === "granted",
			};

			ProductionLogger.log(
				"INFO",
				"Permission request completed",
				finalPermissions,
			);

			return finalPermissions;
		} catch (error) {
			console.error("Error requesting permissions:", error);
			ProductionLogger.log(
				"ERROR",
				"Failed to request permissions",
				error as string,
			);
			return {
				camera: false,
				microphone: false,
				screenCapture: false,
			};
		}
	}

	// Open system preferences for screen recording permission
	static async openScreenRecordingPreferences(): Promise<void> {
		try {
			await shell.openExternal(
				"x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
			);
		} catch (error) {
			console.error("Error opening system preferences:", error);
		}
	}

	// Check if we need to show permission dialogs
	static async needsPermissionSetup(): Promise<boolean> {
		const permissions = await this.checkPermissions();
		return (
			!permissions.camera ||
			!permissions.microphone ||
			!permissions.screenCapture
		);
	}
}
