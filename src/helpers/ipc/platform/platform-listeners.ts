import { ipcMain } from "electron";
import {
  PLATFORM_GET_CHANNEL,
  PLATFORM_IS_MACOS_CHANNEL,
  PLATFORM_IS_WINDOWS_CHANNEL,
  PLATFORM_IS_LINUX_CHANNEL,
} from "./platform-channels";

export function addPlatformEventListeners() {
  // Retorna a plataforma atual
  ipcMain.handle(PLATFORM_GET_CHANNEL, () => process.platform);

  // Verifica se é macOS
  ipcMain.handle(PLATFORM_IS_MACOS_CHANNEL, () => process.platform === "darwin");

  // Verifica se é Windows
  ipcMain.handle(PLATFORM_IS_WINDOWS_CHANNEL, () => process.platform === "win32");

  // Verifica se é Linux
  ipcMain.handle(PLATFORM_IS_LINUX_CHANNEL, () => process.platform === "linux");
} 