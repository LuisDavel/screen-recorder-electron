import {
  PLATFORM_GET_CHANNEL,
  PLATFORM_IS_MACOS_CHANNEL,
  PLATFORM_IS_WINDOWS_CHANNEL,
  PLATFORM_IS_LINUX_CHANNEL,
} from "./platform-channels";

export function exposePlatformContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  contextBridge.exposeInMainWorld("platform", {
    get: () => ipcRenderer.invoke(PLATFORM_GET_CHANNEL),
    isMacOS: () => ipcRenderer.invoke(PLATFORM_IS_MACOS_CHANNEL),
    isWindows: () => ipcRenderer.invoke(PLATFORM_IS_WINDOWS_CHANNEL),
    isLinux: () => ipcRenderer.invoke(PLATFORM_IS_LINUX_CHANNEL),
  });
} 