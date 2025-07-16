import {
	WIN_MINIMIZE_CHANNEL,
	WIN_MAXIMIZE_CHANNEL,
	WIN_CLOSE_CHANNEL,
	WIN_MINIMIZED_EVENT,
	WIN_RESTORED_EVENT,
	WIN_FOCUS_EVENT,
	WIN_BLUR_EVENT,
} from "./window-channels";

export function exposeWindowContext() {
	const { contextBridge, ipcRenderer } = window.require("electron");
	contextBridge.exposeInMainWorld("electronWindow", {
		minimize: () => ipcRenderer.invoke(WIN_MINIMIZE_CHANNEL),
		maximize: () => ipcRenderer.invoke(WIN_MAXIMIZE_CHANNEL),
		close: () => ipcRenderer.invoke(WIN_CLOSE_CHANNEL),

		// Eventos de notificação
		onMinimized: (callback: () => void) => {
			ipcRenderer.on(WIN_MINIMIZED_EVENT, callback);
		},
		onRestored: (callback: () => void) => {
			ipcRenderer.on(WIN_RESTORED_EVENT, callback);
		},
		onFocus: (callback: () => void) => {
			ipcRenderer.on(WIN_FOCUS_EVENT, callback);
		},
		onBlur: (callback: () => void) => {
			ipcRenderer.on(WIN_BLUR_EVENT, callback);
		},

		// Métodos para remover listeners
		removeAllListeners: () => {
			ipcRenderer.removeAllListeners(WIN_MINIMIZED_EVENT);
			ipcRenderer.removeAllListeners(WIN_RESTORED_EVENT);
			ipcRenderer.removeAllListeners(WIN_FOCUS_EVENT);
			ipcRenderer.removeAllListeners(WIN_BLUR_EVENT);
		},
	});
}
