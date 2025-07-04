import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addPlatformEventListeners } from "./platform/platform-listeners";
import { addScreenRecorderEventListeners } from "./screen-recorder/screen-recorder-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
	addWindowEventListeners(mainWindow);
	addThemeEventListeners();
	addPlatformEventListeners();
	addScreenRecorderEventListeners(mainWindow);
}
