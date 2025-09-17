import { BrowserWindow, ipcMain } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addPlatformEventListeners } from "./platform/platform-listeners";
import { addScreenRecorderEventListeners } from "./screen-recorder/screen-recorder-listeners";
import { addPermissionsEventListeners } from "./permissions/permissions-listeners";
import { registerProductionLogsListeners } from "./production-logs/production-logs-listeners";
import { registerDiagnosticListeners } from "./diagnostic/diagnostic-listeners";
import { addS3UploadEventListeners } from "./s3-upload/s3-upload-listeners";
import { addVideoIntroEventListeners } from "./video-intro/video-intro-listeners";
import { addFFmpegEventListeners } from "./ffmpeg/ffmpeg-listeners";
import { addFileSystemEventListeners } from "./file-system/file-system-listeners";
import { registerVideoConcatListeners } from "./video-concat/video-concat-listeners";

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
	"video-intro:concatenate",
	"video-intro:get-available",
	"video-intro:check-intro",
	"ffmpeg:check-availability",
	"ffmpeg:get-install-suggestion",
	"ffmpeg:auto-install",
	"fs:delete-file",
	"fs:exists",
	"fs:move-file",
	"video-concat:auto-concatenate",
	"video-concat:auto-concatenate-alt",
	"video-concat:auto-concatenate-robust",
	"video-concat:concatenate",
	"video-concat:check-ffmpeg",
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

		// Registrar listeners de vídeo intro
		addVideoIntroEventListeners(mainWindow);
		console.log("✅ Listeners de vídeo intro registrados");

		// Registrar listeners do FFmpeg
		addFFmpegEventListeners(mainWindow);
		console.log("✅ Listeners do FFmpeg registrados");

		// Registrar listeners do sistema de arquivos
		addFileSystemEventListeners(mainWindow);
		console.log("✅ Listeners do sistema de arquivos registrados");

		// Registrar listeners de concatenação de vídeo
		console.log("🔧 Tentando registrar listeners de concatenação de vídeo...");
		console.log("🔍 Tipo da função registerVideoConcatListeners:", typeof registerVideoConcatListeners);

		try {
			registerVideoConcatListeners(mainWindow);
			console.log("✅ Listeners de concatenação de vídeo registrados com sucesso");
		} catch (error) {
			console.error("❌ Erro ao registrar listeners de concatenação:", error);
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
