import { ipcMain } from "electron";
import { PermissionsHelper } from "../../permissions-helper";
import {
	PERMISSIONS_CHECK_CHANNEL,
	PERMISSIONS_REQUEST_CHANNEL,
	PERMISSIONS_OPEN_SCREEN_PREFERENCES_CHANNEL,
} from "./permissions-channels";

export function addPermissionsEventListeners() {
	// Check permission status
	ipcMain.handle(PERMISSIONS_CHECK_CHANNEL, async () => {
		try {
			const permissions = await PermissionsHelper.checkPermissions();
			console.log("Permission status:", permissions);
			return permissions;
		} catch (error) {
			console.error("Error checking permissions:", error);
			return {
				camera: false,
				microphone: false,
				screenCapture: false,
			};
		}
	});

	// Request permissions
	ipcMain.handle(PERMISSIONS_REQUEST_CHANNEL, async () => {
		try {
			console.log("Requesting permissions via IPC...");
			const permissions = await PermissionsHelper.requestPermissions();
			console.log("Permissions requested:", permissions);
			return permissions;
		} catch (error) {
			console.error("Error requesting permissions:", error);
			return {
				camera: false,
				microphone: false,
				screenCapture: false,
			};
		}
	});

	// Open screen recording preferences
	ipcMain.handle(PERMISSIONS_OPEN_SCREEN_PREFERENCES_CHANNEL, async () => {
		try {
			await PermissionsHelper.openScreenRecordingPreferences();
			return { success: true };
		} catch (error) {
			console.error("Error opening screen recording preferences:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});
}
