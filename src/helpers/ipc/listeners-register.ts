import { BrowserWindow, ipcMain } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addPlatformEventListeners } from "./platform/platform-listeners";
import { addScreenRecorderEventListeners } from "./screen-recorder/screen-recorder-listeners";
import { addPermissionsEventListeners } from "./permissions/permissions-listeners";
import { registerProductionLogsListeners } from "./production-logs/production-logs-listeners";
import { registerDiagnosticListeners } from "./diagnostic/diagnostic-listeners";
import { addS3UploadEventListeners } from "./s3-upload/s3-upload-listeners";

// Debug log da importação
console.log(
	"🔍 S3 Upload Listeners importado:",
	typeof addS3UploadEventListeners,
);

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
	"s3-upload:upload-file",
	"s3-upload:test-connection",
];

// Função para limpar handlers existentes
function clearExistingHandlers() {
	console.log("Limpando handlers IPC existentes...");
	console.log("🔍 Canais a serem limpos:", CHANNELS_TO_REGISTER);

	CHANNELS_TO_REGISTER.forEach((channel) => {
		try {
			const hadHandler = ipcMain.listenerCount(channel) > 0;
			ipcMain.removeHandler(channel);
			console.log(
				`✅ Handler removido: ${channel} (tinha handler: ${hadHandler})`,
			);
		} catch {
			// Ignorar erros se o handler não existir
			console.log(`⚠️ Handler não existia: ${channel}`);
		}
	});
}

export default function registerListeners(mainWindow: BrowserWindow) {
	console.log("🔧 Tentando registrar listeners IPC...");

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

		console.log("🔧 Registrando listeners S3 upload...");
		console.log("🔍 Tipo da função S3:", typeof addS3UploadEventListeners);

		try {
			addS3UploadEventListeners(mainWindow);
			console.log("✅ Função S3 chamada com sucesso");
		} catch (error) {
			console.error("❌ Erro ao chamar função S3:", error);
			throw error;
		}

		// Registrar logs e diagnósticos apenas em desenvolvimento
		if (process.env.NODE_ENV === "development") {
			registerProductionLogsListeners();
			registerDiagnosticListeners();
		}

		listenersRegistered = true;
		console.log("IPC listeners registrados com sucesso");

		// Verificação final dos handlers S3
		console.log("🔍 Verificação final dos handlers S3:");
		console.log(
			"🔍 s3-upload:upload-file:",
			ipcMain.listenerCount("s3-upload:upload-file") > 0,
		);
		console.log(
			"🔍 s3-upload:test-connection:",
			ipcMain.listenerCount("s3-upload:test-connection") > 0,
		);

		// Debug adicional - verificação concluída
		console.log("🔍 Debug S3 IPC concluído - handlers registrados com sucesso");
	} catch (error) {
		console.error("❌ Erro ao registrar IPC listeners:", error);
		console.error("Stack trace:", error instanceof Error ? error.stack : error);
		throw error;
	}
}

// Função para resetar o estado (útil para testes)
export function resetListenerRegistration() {
	console.log("🔄 Resetando estado de listeners...");
	listenersRegistered = false;
	clearExistingHandlers();
}
