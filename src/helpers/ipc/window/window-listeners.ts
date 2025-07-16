import { BrowserWindow, ipcMain } from "electron";
import {
	WIN_CLOSE_CHANNEL,
	WIN_MAXIMIZE_CHANNEL,
	WIN_MINIMIZE_CHANNEL,
	WIN_MINIMIZED_EVENT,
	WIN_RESTORED_EVENT,
	WIN_FOCUS_EVENT,
	WIN_BLUR_EVENT,
} from "./window-channels";

export function addWindowEventListeners(mainWindow: BrowserWindow) {
	ipcMain.handle(WIN_MINIMIZE_CHANNEL, () => {
		mainWindow.minimize();
	});
	ipcMain.handle(WIN_MAXIMIZE_CHANNEL, () => {
		if (mainWindow.isMaximized()) {
			mainWindow.unmaximize();
		} else {
			mainWindow.maximize();
		}
	});
	ipcMain.handle(WIN_CLOSE_CHANNEL, () => {
		mainWindow.close();
	});

	// Eventos de notificação para o renderer
	mainWindow.on("minimize", () => {
		console.log("Janela minimizada - notificando renderer");
		mainWindow.webContents.send(WIN_MINIMIZED_EVENT);
	});

	mainWindow.on("restore", () => {
		console.log("Janela restaurada - notificando renderer");
		mainWindow.webContents.send(WIN_RESTORED_EVENT);
	});

	mainWindow.on("focus", () => {
		console.log("Janela focada - notificando renderer");
		mainWindow.webContents.send(WIN_FOCUS_EVENT);
	});

	mainWindow.on("blur", () => {
		console.log("Janela desfocada - notificando renderer");
		mainWindow.webContents.send(WIN_BLUR_EVENT);
	});
}
