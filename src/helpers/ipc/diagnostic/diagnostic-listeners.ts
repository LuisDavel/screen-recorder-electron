import { ipcMain } from "electron";
import { ProductionDiagnostic } from "../../production-diagnostic";
import { DIAGNOSTIC_CHANNELS } from "./diagnostic-channels";

export const registerDiagnosticListeners = () => {
	// Execute full diagnostic
	ipcMain.handle(DIAGNOSTIC_CHANNELS.RUN_DIAGNOSTIC, async () => {
		try {
			const diagnostic = await ProductionDiagnostic.runFullDiagnostic();
			return diagnostic;
		} catch (error) {
			console.error("Error running diagnostic:", error);
			throw error;
		}
	});

	// Auto-fix permissions
	ipcMain.handle(DIAGNOSTIC_CHANNELS.AUTO_FIX_PERMISSIONS, async () => {
		try {
			const result = await ProductionDiagnostic.autoFixPermissions();
			return { success: result };
		} catch (error) {
			console.error("Error auto-fixing permissions:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});
};
