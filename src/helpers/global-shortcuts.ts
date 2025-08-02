import { globalShortcut, BrowserWindow } from "electron";

export class GlobalShortcuts {
    private static instance: GlobalShortcuts;
    private mainWindow: BrowserWindow | null = null;
    private shortcuts: Map<string, string> = new Map();

    private constructor() { }

    public static getInstance(): GlobalShortcuts {
        if (!GlobalShortcuts.instance) {
            GlobalShortcuts.instance = new GlobalShortcuts();
        }
        return GlobalShortcuts.instance;
    }

    public initialize(mainWindow: BrowserWindow): void {
        this.mainWindow = mainWindow;
        this.registerShortcuts();
        console.log("🎹 Atalhos globais inicializados");
    }

    private registerShortcuts(): void {
        try {
            // Atalho para pausar/continuar gravação: Ctrl+Shift+P (Windows/Linux) ou Cmd+Shift+P (macOS)
            const pauseShortcut = process.platform === 'darwin' ? 'Cmd+Shift+P' : 'Ctrl+Shift+P';
            const pauseRegistered = globalShortcut.register(pauseShortcut, () => {
                console.log("🎹 Atalho pausar/continuar ativado");
                this.sendToRenderer('shortcut:toggle-pause');
            });

            if (pauseRegistered) {
                this.shortcuts.set('pause', pauseShortcut);
                console.log(`✅ Atalho pausar/continuar registrado: ${pauseShortcut}`);
            } else {
                console.error(`❌ Falha ao registrar atalho pausar/continuar: ${pauseShortcut}`);
            }

            // Atalho para parar gravação: Ctrl+Shift+S (Windows/Linux) ou Cmd+Shift+S (macOS)
            const stopShortcut = process.platform === 'darwin' ? 'Cmd+Shift+S' : 'Ctrl+Shift+S';
            const stopRegistered = globalShortcut.register(stopShortcut, () => {
                console.log("🎹 Atalho parar gravação ativado");
                this.sendToRenderer('shortcut:stop-recording');
            });

            if (stopRegistered) {
                this.shortcuts.set('stop', stopShortcut);
                console.log(`✅ Atalho parar gravação registrado: ${stopShortcut}`);
            } else {
                console.error(`❌ Falha ao registrar atalho parar gravação: ${stopShortcut}`);
            }

            // Atalho para iniciar gravação: Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (macOS)
            const startShortcut = process.platform === 'darwin' ? 'Cmd+Shift+R' : 'Ctrl+Shift+R';
            const startRegistered = globalShortcut.register(startShortcut, () => {
                console.log("🎹 Atalho iniciar gravação ativado");
                this.sendToRenderer('shortcut:start-recording');
            });

            if (startRegistered) {
                this.shortcuts.set('start', startShortcut);
                console.log(`✅ Atalho iniciar gravação registrado: ${startShortcut}`);
            } else {
                console.error(`❌ Falha ao registrar atalho iniciar gravação: ${startShortcut}`);
            }

            // Atalho para mostrar/ocultar janela: Ctrl+Shift+H (Windows/Linux) ou Cmd+Shift+H (macOS)
            const toggleWindowShortcut = process.platform === 'darwin' ? 'Cmd+Shift+H' : 'Ctrl+Shift+H';
            const toggleWindowRegistered = globalShortcut.register(toggleWindowShortcut, () => {
                console.log("🎹 Atalho mostrar/ocultar janela ativado");
                this.toggleWindow();
            });

            if (toggleWindowRegistered) {
                this.shortcuts.set('toggleWindow', toggleWindowShortcut);
                console.log(`✅ Atalho mostrar/ocultar janela registrado: ${toggleWindowShortcut}`);
            } else {
                console.error(`❌ Falha ao registrar atalho mostrar/ocultar janela: ${toggleWindowShortcut}`);
            }

        } catch (error) {
            console.error("❌ Erro ao registrar atalhos globais:", error);
        }
    }

    private sendToRenderer(channel: string, data?: any): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
        } else {
            console.warn("⚠️ Janela principal não disponível para enviar comando:", channel);
        }
    }

    private toggleWindow(): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            if (this.mainWindow.isVisible()) {
                this.mainWindow.hide();
                console.log("🔄 Janela ocultada via atalho");
            } else {
                this.mainWindow.show();
                this.mainWindow.focus();
                console.log("🔄 Janela mostrada via atalho");
            }
        }
    }

    public getRegisteredShortcuts(): Record<string, string> {
        const shortcuts: Record<string, string> = {};
        this.shortcuts.forEach((shortcut, action) => {
            shortcuts[action] = shortcut;
        });
        return shortcuts;
    }

    public unregisterAll(): void {
        try {
            globalShortcut.unregisterAll();
            this.shortcuts.clear();
            console.log("🎹 Todos os atalhos globais foram removidos");
        } catch (error) {
            console.error("❌ Erro ao remover atalhos globais:", error);
        }
    }

    public dispose(): void {
        this.unregisterAll();
        this.mainWindow = null;
        console.log("🎹 GlobalShortcuts disposed");
    }
}