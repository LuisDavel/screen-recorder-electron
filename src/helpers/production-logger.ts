import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { app } from "electron";

export class ProductionLogger {
	private static logFile: string;
	private static logDir: string;
	private static initialized = false;

	static initialize() {
		try {
			// Evitar inicialização duplicada
			if (this.initialized) {
				return;
			}

			// Criar diretório de logs sempre, não apenas em desenvolvimento
			this.logDir = join(app.getPath("userData"), "logs");
			if (!existsSync(this.logDir)) {
				mkdirSync(this.logDir, { recursive: true });
			}

			// Arquivo de log com timestamp
			const timestamp = new Date().toISOString().split("T")[0];
			this.logFile = join(this.logDir, `permissions-${timestamp}.log`);

			this.initialized = true;

			this.log("INFO", "Production logger initialized");
			this.log("INFO", `Log file: ${this.logFile}`);
		} catch (error) {
			console.error("Failed to initialize production logger:", error);
			this.initialized = false;
		}
	}

	// Método auxiliar para garantir inicialização
	private static ensureInitialized(): void {
		if (!this.initialized) {
			this.initialize();
		}
	}

	static log(
		level: "INFO" | "WARN" | "ERROR",
		message: string,
		data?: Record<string, unknown> | string | boolean,
	) {
		try {
			// Garantir inicialização antes de usar
			this.ensureInitialized();

			// Sempre mostrar no console em desenvolvimento
			if (process.env.NODE_ENV === "development") {
				console.log(`[PROD-LOG] ${level}: ${message}`, data || "");
			}

			// Lista de mensagens importantes que devem ser sempre salvas
			const importantMessages = [
				"S3",
				"upload",
				"connection",
				"error",
				"permission",
				"diagnostic",
				"recording",
				"failed",
				"success",
				"completed",
				"started",
				"Application", // Adicionar para logAppStart e logAppQuit
			];

			// Verificar se a mensagem é importante
			const isImportantMessage = importantMessages.some((keyword) =>
				message.toLowerCase().includes(keyword.toLowerCase()),
			);

			// Salvar se for erro, warning ou mensagem importante
			if (level === "ERROR" || level === "WARN" || isImportantMessage) {
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

	static getLogDirectory(): string {
		this.ensureInitialized();
		return this.logDir || join(app.getPath("userData"), "logs");
	}

	static getLogFilePath(): string {
		this.ensureInitialized();
		const timestamp = new Date().toISOString().split("T")[0];
		return (
			this.logFile ||
			join(this.getLogDirectory(), `permissions-${timestamp}.log`)
		);
	}

	static logPermissionRequest(
		type: "camera" | "microphone" | "screen",
		granted: boolean,
	) {
		this.ensureInitialized();
		this.log(
			granted ? "INFO" : "WARN",
			`Permission request for ${type}: ${granted ? "GRANTED" : "DENIED"}`,
		);
	}

	static logPermissionStatus(permissions: {
		camera: boolean;
		microphone: boolean;
		screenCapture: boolean;
	}) {
		this.ensureInitialized();
		this.log("INFO", "Permission status check", permissions);

		Object.entries(permissions).forEach(([key, value]) => {
			this.log(
				value ? "INFO" : "WARN",
				`${key} permission: ${value ? "GRANTED" : "DENIED"}`,
			);
		});

		const allGranted = Object.values(permissions).every(Boolean);
		this.log(
			allGranted ? "INFO" : "WARN",
			`All permissions status: ${allGranted ? "ALL GRANTED" : "SOME MISSING"}`,
		);
	}

	static logS3Upload(
		action: "start" | "progress" | "complete" | "error",
		details: Record<string, unknown>,
	) {
		this.ensureInitialized();
		const level = action === "error" ? "ERROR" : "INFO";
		this.log(level, `S3 upload ${action}`, details);
	}

	static logRecordingActivity(
		action: "start" | "stop" | "save" | "error",
		details: Record<string, unknown>,
	) {
		this.ensureInitialized();
		const level = action === "error" ? "ERROR" : "INFO";
		this.log(level, `Recording ${action}`, details);
	}

	static logSystemInfo() {
		this.ensureInitialized();
		// Logar informações do sistema sempre
		this.log("INFO", "System information", {
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.versions.node,
			electronVersion: process.versions.electron,
			chromeVersion: process.versions.chrome,
			isPackaged: app.isPackaged,
			appVersion: app.getVersion(),
		});
	}

	static logError(error: Error, context?: string) {
		this.ensureInitialized();
		this.log("ERROR", `${context ? `[${context}] ` : ""}${error.message}`, {
			stack: error.stack,
			name: error.name,
		});
	}

	static logWarning(message: string, details?: Record<string, unknown>) {
		this.ensureInitialized();
		this.log("WARN", message, details);
	}

	static logInfo(message: string, details?: Record<string, unknown>) {
		this.ensureInitialized();
		this.log("INFO", message, details);
	}

	static logAppStart() {
		this.ensureInitialized();
		this.log("INFO", "Application started", {
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.versions.node,
			electronVersion: process.versions.electron,
			chromeVersion: process.versions.chrome,
			isPackaged: app.isPackaged,
			appVersion: app.getVersion(),
			startTime: new Date().toISOString(),
		});
	}

	static logAppQuit() {
		this.ensureInitialized();
		this.log("INFO", "Application quit", {
			exitTime: new Date().toISOString(),
			platform: process.platform,
			appVersion: app.getVersion(),
		});
	}
}
