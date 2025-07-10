import { ipcMain, shell } from "electron";
import { existsSync } from "fs";
import { ProductionLogger } from "../../production-logger";
import { PRODUCTION_LOGS_CHANNELS } from "./production-logs-channels";

export const registerProductionLogsListeners = () => {
	// Get log information
	ipcMain.handle(PRODUCTION_LOGS_CHANNELS.GET_LOG_INFO, async () => {
		try {
			const logDirectory = ProductionLogger.getLogDirectory();
			const logFile = ProductionLogger.getLogFilePath();
			const exists = existsSync(logFile);

			return {
				logDirectory,
				logFile,
				exists,
			};
		} catch (error) {
			console.error("Error getting log info:", error);
			return {
				logDirectory: "",
				logFile: "",
				exists: false,
			};
		}
	});

	// Open log directory
	ipcMain.handle(PRODUCTION_LOGS_CHANNELS.OPEN_LOG_DIRECTORY, async () => {
		try {
			const logDirectory = ProductionLogger.getLogDirectory();
			await shell.openPath(logDirectory);
			ProductionLogger.log("INFO", "Log directory opened");
		} catch (error) {
			console.error("Error opening log directory:", error);
			ProductionLogger.log(
				"ERROR",
				"Failed to open log directory",
				error as string,
			);
		}
	});

	// Open log file
	ipcMain.handle(PRODUCTION_LOGS_CHANNELS.OPEN_LOG_FILE, async () => {
		try {
			const logFile = ProductionLogger.getLogFilePath();
			if (existsSync(logFile)) {
				await shell.openPath(logFile);
				ProductionLogger.log("INFO", "Log file opened");
			} else {
				ProductionLogger.log("WARN", "Log file does not exist");
			}
		} catch (error) {
			console.error("Error opening log file:", error);
			ProductionLogger.log("ERROR", "Failed to open log file", error as string);
		}
	});

	// Log message from renderer
	ipcMain.handle(
		PRODUCTION_LOGS_CHANNELS.LOG_MESSAGE,
		async (
			event,
			level: "INFO" | "WARN" | "ERROR",
			message: string,
			data?: Record<string, unknown> | string | boolean,
		) => {
			try {
				ProductionLogger.log(level, message, data);
			} catch (error) {
				console.error("Error logging message from renderer:", error);
			}
		},
	);
};
