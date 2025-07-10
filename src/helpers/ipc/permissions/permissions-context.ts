import {
	PERMISSIONS_CHECK_CHANNEL,
	PERMISSIONS_REQUEST_CHANNEL,
	PERMISSIONS_OPEN_SCREEN_PREFERENCES_CHANNEL,
} from "./permissions-channels";

export function exposePermissionsContext() {
	const { contextBridge, ipcRenderer } = window.require("electron");

	contextBridge.exposeInMainWorld("permissions", {
		// Check permission status
		checkPermissions: () => ipcRenderer.invoke(PERMISSIONS_CHECK_CHANNEL),

		// Request permissions
		requestPermissions: () => ipcRenderer.invoke(PERMISSIONS_REQUEST_CHANNEL),

		// Open screen recording preferences
		openScreenRecordingPreferences: () =>
			ipcRenderer.invoke(PERMISSIONS_OPEN_SCREEN_PREFERENCES_CHANNEL),
	});
}
