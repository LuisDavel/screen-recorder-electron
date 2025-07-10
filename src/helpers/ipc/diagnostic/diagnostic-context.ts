import { contextBridge, ipcRenderer } from "electron";
import { DIAGNOSTIC_CHANNELS } from "./diagnostic-channels";
import type { DiagnosticSummary } from "../../production-diagnostic";

export interface DiagnosticAPI {
	runDiagnostic(): Promise<DiagnosticSummary>;
	autoFixPermissions(): Promise<{ success: boolean; error?: string }>;
}

export const createDiagnosticContext = (): DiagnosticAPI => ({
	runDiagnostic: () => ipcRenderer.invoke(DIAGNOSTIC_CHANNELS.RUN_DIAGNOSTIC),
	autoFixPermissions: () =>
		ipcRenderer.invoke(DIAGNOSTIC_CHANNELS.AUTO_FIX_PERMISSIONS),
});

export const exposeDiagnosticContext = (): void => {
	contextBridge.exposeInMainWorld("diagnostic", createDiagnosticContext());
};
