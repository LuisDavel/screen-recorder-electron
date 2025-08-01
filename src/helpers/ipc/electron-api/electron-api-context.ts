export function exposeElectronAPIContext() {
    try {
        const { contextBridge, ipcRenderer } = window.require("electron");

        contextBridge.exposeInMainWorld("electronAPI", {
            invoke: (channel: string, ...args: any[]) => {
                console.log("🔍 electronAPI.invoke chamado:", { channel, args });
                return ipcRenderer.invoke(channel, ...args);
            },
            on: (channel: string, callback: (...args: any[]) => void) => {
                console.log("🔍 electronAPI.on chamado:", { channel });
                return ipcRenderer.on(channel, callback);
            },
            removeAllListeners: (channel: string) => {
                console.log("🔍 electronAPI.removeAllListeners chamado:", { channel });
                return ipcRenderer.removeAllListeners(channel);
            }
        });

        console.log("✅ ElectronAPI context exposto com sucesso");
    } catch (error) {
        console.error("❌ Erro ao expor ElectronAPI context:", error);
        throw error;
    }
}