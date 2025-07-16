import exposeContexts from "./helpers/ipc/context-exposer";

exposeContexts();

// Setup background recording listeners
const { ipcRenderer, contextBridge } = window.require("electron");

// Definir tipos para a API de background recording
interface BackgroundRecordingAPI {
	syncRecordingStatus: (
		status: boolean,
	) => Promise<{ success: boolean; isRecording: boolean }>;
	showWindow: () => Promise<{ success: boolean }>;
	hideWindow: () => Promise<{ success: boolean }>;
	setWindowOpacity: (
		opacity: number,
	) => Promise<{ success: boolean; opacity: number }>;
	keepAlive: () => Promise<{ alive: boolean; timestamp: number }>;
	ensureMinimizationBlocked: () => Promise<{
		success: boolean;
		blocked: boolean;
	}>;
}

// Estender o window com backgroundRecordingAPI
declare global {
	interface Window {
		backgroundRecordingAPI?: BackgroundRecordingAPI;
	}
}

// Expor API simplificada para background recording
contextBridge.exposeInMainWorld("backgroundRecordingAPI", {
	// Sincronizar status de gravação
	syncRecordingStatus: (status: boolean) =>
		ipcRenderer.invoke("sync-recording-status", status),

	// Controle de janela
	showWindow: () => ipcRenderer.invoke("show-window"),
	hideWindow: () => ipcRenderer.invoke("hide-window"),

	// Controle de opacidade
	setWindowOpacity: (opacity: number) =>
		ipcRenderer.invoke("set-window-opacity", opacity),

	// Keep alive
	keepAlive: () => ipcRenderer.invoke("keep-alive"),

	// Reforçar bloqueio de minimização
	ensureMinimizationBlocked: () =>
		ipcRenderer.invoke("ensure-minimization-blocked"),
});

// Escutar eventos de background mode do main process (legacy)
ipcRenderer.on(
	"background-mode-activated",
	(event: unknown, enabled: boolean) => {
		console.log("Background mode event received from main:", enabled);

		// Dispatch event to renderer
		const customEvent = new CustomEvent("background-mode-activated", {
			detail: enabled,
		});

		// Aguardar DOM estar pronto
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => {
				window.dispatchEvent(customEvent);
			});
		} else {
			window.dispatchEvent(customEvent);
		}
	},
);

// Escutar eventos de background recording mode aprimorado
ipcRenderer.on(
	"background-recording-mode-activated",
	(event: unknown, data: unknown) => {
		console.log("Background recording mode event received from main:", data);

		// Dispatch event to renderer
		const customEvent = new CustomEvent("background-recording-mode-activated", {
			detail: data,
		});

		// Aguardar DOM estar pronto
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => {
				window.dispatchEvent(customEvent);
			});
		} else {
			window.dispatchEvent(customEvent);
		}
	},
);

// Sistema de keep alive para manter aplicação ativa
let keepAliveInterval: NodeJS.Timeout | null = null;

function startKeepAlive() {
	if (keepAliveInterval) {
		clearInterval(keepAliveInterval);
	}

	// Manter aplicação viva - chama a cada 30 segundos
	keepAliveInterval = setInterval(() => {
		if (window.backgroundRecordingAPI) {
			window.backgroundRecordingAPI
				.keepAlive()
				.then((result: unknown) => {
					console.log("Keep alive:", result);
				})
				.catch((error: unknown) => {
					console.error("Keep alive error:", error);
				});
		}
	}, 30000);
}

// Iniciar keep alive quando DOM estiver pronto
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", startKeepAlive);
} else {
	startKeepAlive();
}

// Limpar recursos quando a janela for fechada
window.addEventListener("beforeunload", () => {
	if (keepAliveInterval) {
		clearInterval(keepAliveInterval);
	}
});
