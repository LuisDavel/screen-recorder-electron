import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposePlatformContext } from "./platform/platform-context";
import { exposeScreenRecorderContext } from "./screen-recorder/screen-recorder-context";
import { exposePermissionsContext } from "./permissions/permissions-context";
import { exposeProductionLogsContext } from "./production-logs/production-logs-context";
import { exposeDiagnosticContext } from "./diagnostic/diagnostic-context";

// Controle para evitar exposição duplicada
let contextsExposed = false;

export default function exposeContexts() {
	// Prevenir exposição duplicada
	if (contextsExposed) {
		console.warn("Contextos já foram expostos. Pulando exposição duplicada.");
		return;
	}

	try {
		exposeWindowContext();
		exposeThemeContext();
		exposePlatformContext();
		exposeScreenRecorderContext();
		exposePermissionsContext();
		exposeProductionLogsContext();
		exposeDiagnosticContext();

		contextsExposed = true;
		console.log("Contextos IPC expostos com sucesso");
	} catch (error) {
		console.error("Erro ao expor contextos IPC:", error);
		throw error;
	}
}

// Função para resetar o estado (útil para testes)
export function resetContextExposition() {
	contextsExposed = false;
}
