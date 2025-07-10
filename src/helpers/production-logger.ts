import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { app } from "electron";

export class ProductionLogger {
	private static logFile: string;
	private static logDir: string;

	static initialize() {
		try {
			// Criar diretório de logs no diretório de dados do usuário
			this.logDir = join(app.getPath("userData"), "logs");
			if (!existsSync(this.logDir)) {
				mkdirSync(this.logDir, { recursive: true });
			}

			// Arquivo de log com timestamp
			const timestamp = new Date().toISOString().split("T")[0];
			this.logFile = join(this.logDir, `permissions-${timestamp}.log`);

			this.log("INFO", "Production logger initialized");
			this.log("INFO", `Log file: ${this.logFile}`);
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
			const timestamp = new Date().toISOString();
			const logLine = `${timestamp} [${level}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ""}\n`;

			// Sempre tentar escrever no arquivo
			if (this.logFile) {
				writeFileSync(this.logFile, logLine, { flag: "a" });
			}

			// Em desenvolvimento, também mostrar no console
			if (process.env.NODE_ENV === "development") {
				console.log(`[PROD-LOG] ${level}: ${message}`, data || "");
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
		this.log("INFO", "Permission Status Check", permissions);

		// Log individual permissions
		if (permissions.camera) {
			this.log("INFO", "Camera permission: GRANTED");
		} else {
			this.log("WARN", "Camera permission: DENIED or NOT REQUESTED");
		}

		if (permissions.microphone) {
			this.log("INFO", "Microphone permission: GRANTED");
		} else {
			this.log("WARN", "Microphone permission: DENIED or NOT REQUESTED");
		}

		if (permissions.screenCapture) {
			this.log("INFO", "Screen capture permission: GRANTED");
		} else {
			this.log("WARN", "Screen capture permission: DENIED or NOT REQUESTED");
		}

		const allGranted =
			permissions.camera && permissions.microphone && permissions.screenCapture;
		this.log(
			allGranted ? "INFO" : "WARN",
			`All permissions status: ${allGranted ? "ALL GRANTED" : "SOME MISSING"}`,
		);
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
		this.log("INFO", "System information", {
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.versions.node,
			electronVersion: process.versions.electron,
			chromeVersion: process.versions.chrome,
			isPackaged: app.isPackaged,
		});
	}

	static logPermissionDiagnostic(diagnostic: {
		systemPermissions: Record<string, unknown>;
		webApiPermissions: Record<string, unknown>;
		errorDetails?: Record<string, unknown>;
	}) {
		this.log("INFO", "Permission diagnostic", diagnostic);
	}
}
