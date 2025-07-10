import { contextBridge, ipcRenderer } from "electron";
import { PRODUCTION_LOGS_CHANNELS } from "./production-logs-channels";

export interface ProductionLogsAPI {
	getLogInfo(): Promise<{
		logDirectory: string;
		logFile: string;
		exists: boolean;
	}>;
	openLogDirectory(): Promise<void>;
	openLogFile(): Promise<void>;
	logMessage(
		level: "INFO" | "WARN" | "ERROR",
		message: string,
		data?: Record<string, unknown> | string | boolean,
	): Promise<void>;
}

export const createProductionLogsContext = (): ProductionLogsAPI => ({
	getLogInfo: () => ipcRenderer.invoke(PRODUCTION_LOGS_CHANNELS.GET_LOG_INFO),
	openLogDirectory: () =>
		ipcRenderer.invoke(PRODUCTION_LOGS_CHANNELS.OPEN_LOG_DIRECTORY),
	openLogFile: () => ipcRenderer.invoke(PRODUCTION_LOGS_CHANNELS.OPEN_LOG_FILE),
	logMessage: (level, message, data) =>
		ipcRenderer.invoke(
			PRODUCTION_LOGS_CHANNELS.LOG_MESSAGE,
			level,
			message,
			data,
		),
});

export const exposeProductionLogsContext = (): void => {
	contextBridge.exposeInMainWorld(
		"productionLogs",
		createProductionLogsContext(),
	);
};
