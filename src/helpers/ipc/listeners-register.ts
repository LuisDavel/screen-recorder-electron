import { BrowserWindow, ipcMain } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addPlatformEventListeners } from "./platform/platform-listeners";
import { addScreenRecorderEventListeners } from "./screen-recorder/screen-recorder-listeners";
import { addPermissionsEventListeners } from "./permissions/permissions-listeners";
import { registerProductionLogsListeners } from "./production-logs/production-logs-listeners";
import { registerDiagnosticListeners } from "./diagnostic/diagnostic-listeners";

// Controle para evitar registros duplicados
let listenersRegistered = false;

// Lista de canais que serão registrados
const CHANNELS_TO_REGISTER = [
	"window:minimize",
	"window:maximize",
	"window:close",
	"theme:get",
	"theme:set",
	"platform:get",
	"screen-recorder:get-sources",
	"screen-recorder:start-recording",
	"screen-recorder:stop-recording",
	"permissions:check",
	"permissions:request",
	"production-logs:get-logs",
	"production-logs:clear-logs",
	"diagnostic:run-diagnostic",
	"diagnostic:auto-fix-permissions",
];

// Função para limpar handlers existentes
function clearExistingHandlers() {
	console.log("Limpando handlers IPC existentes...");
	CHANNELS_TO_REGISTER.forEach((channel) => {
		try {
			ipcMain.removeHandler(channel);
		} catch {
			// Ignorar erros se o handler não existir
		}
	});
}

export default function registerListeners(mainWindow: BrowserWindow) {
	// Prevenir registros duplicados
	if (listenersRegistered) {
		console.warn("Listeners já foram registrados. Pulando registro duplicado.");
		return;
	}

	try {
		// Limpar handlers existentes para evitar duplicação
		clearExistingHandlers();

		addWindowEventListeners(mainWindow);
		addThemeEventListeners();
		addPlatformEventListeners();
		addScreenRecorderEventListeners(mainWindow);
		addPermissionsEventListeners();
		registerProductionLogsListeners();
		registerDiagnosticListeners();

		listenersRegistered = true;
		console.log("IPC listeners registrados com sucesso");
	} catch (error) {
		console.error("Erro ao registrar IPC listeners:", error);
		throw error;
	}
}

// Função para resetar o estado (útil para testes)
export function resetListenerRegistration() {
	listenersRegistered = false;
	clearExistingHandlers();
}
