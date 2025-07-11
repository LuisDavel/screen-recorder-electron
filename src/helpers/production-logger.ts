import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { app } from "electron";

export class ProductionLogger {
	private static logFile: string;
	private static logDir: string;

	static initialize() {
		try {
			// Só criar diretório de logs em desenvolvimento
			if (process.env.NODE_ENV === "development") {
				this.logDir = join(app.getPath("userData"), "logs");
				if (!existsSync(this.logDir)) {
					mkdirSync(this.logDir, { recursive: true });
				}

				// Arquivo de log com timestamp
				const timestamp = new Date().toISOString().split("T")[0];
				this.logFile = join(this.logDir, `permissions-${timestamp}.log`);

				this.log("INFO", "Production logger initialized");
				this.log("INFO", `Log file: ${this.logFile}`);
			} else {
				console.log(
					"Production logger disabled in production to save resources",
				);
			}
		} catch (error) {
			console.error("Failed to initialize production logger:", error);
		}
	}

	static log(
		level: "INFO" | "WARN" | "ERROR",
		message: string,
		data?: Record<string, unknown> | string | boolean,
	) {
		try {
			// Reduzir escrita para economizar recursos - só em desenvolvimento
			if (process.env.NODE_ENV === "development") {
				console.log(`[PROD-LOG] ${level}: ${message}`, data || "");
			}

			// Só gravar logs críticos em produção
			if (level === "ERROR") {
				const timestamp = new Date().toISOString();
				const logLine = `${timestamp} [${level}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ""}\n`;

				if (this.logFile) {
					writeFileSync(this.logFile, logLine, { flag: "a" });
				}
			}
		} catch (error) {
			console.error("Failed to write log:", error);
		}
	}

	static logPermissionStatus(permissions: {
		camera: boolean;
		microphone: boolean;
		screenCapture: boolean;
	}) {
		// Reduzir logging para economizar recursos
		if (process.env.NODE_ENV === "development") {
			this.log("INFO", "Permission Status Check", permissions);
		}

		// Só logar se alguma permissão estiver faltando
		const allGranted =
			permissions.camera && permissions.microphone && permissions.screenCapture;

		if (!allGranted) {
			this.log(
				"WARN",
				`Missing permissions: ${
					!permissions.camera ? "Camera " : ""
				}${!permissions.microphone ? "Microphone " : ""}${
					!permissions.screenCapture ? "ScreenCapture " : ""
				}`.trim(),
			);
		}
	}

	static logPermissionRequest(
		type: "camera" | "microphone" | "screen",
		result: boolean,
	) {
		this.log(
			"INFO",
			`Permission request for ${type}: ${result ? "GRANTED" : "DENIED"}`,
		);
	}

	static logAppStart() {
		this.log("INFO", "Application started");
		this.log("INFO", `App version: ${app.getVersion()}`);
		this.log("INFO", `Platform: ${process.platform}`);
		this.log("INFO", `Electron version: ${process.versions.electron}`);
		this.log("INFO", `Node version: ${process.versions.node}`);
		this.log("INFO", `Chrome version: ${process.versions.chrome}`);
	}

	static logAppQuit() {
		this.log("INFO", "Application quit requested");
		this.log("INFO", "Cleaning up resources...");
	}

	static logError(error: Error, context?: string) {
		this.log("ERROR", `${context ? `${context}: ` : ""}${error.message}`, {
			stack: error.stack,
			name: error.name,
		});
	}

	static getLogDirectory(): string {
		return this.logDir;
	}

	static getLogFilePath(): string {
		return this.logFile;
	}

	static logSystemInfo() {
		// Só logar informações do sistema em desenvolvimento
		if (process.env.NODE_ENV === "development") {
			this.log("INFO", "System information", {
				platform: process.platform,
				arch: process.arch,
				nodeVersion: process.versions.node,
				electronVersion: process.versions.electron,
				chromeVersion: process.versions.chrome,
				isPackaged: app.isPackaged,
			});
		}
	}

	static logPermissionDiagnostic(diagnostic: {
		systemPermissions: Record<string, unknown>;
		webApiPermissions: Record<string, unknown>;
		errorDetails?: Record<string, unknown>;
	}) {
		this.log("INFO", "Permission diagnostic", diagnostic);
	}
}
