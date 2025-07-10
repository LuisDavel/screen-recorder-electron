// Renderer process logger that communicates with main process
export class RendererLogger {
	static log(
		level: "INFO" | "WARN" | "ERROR",
		message: string,
		data?: Record<string, unknown> | string | boolean,
	) {
		try {
			// Always log to console in development
			if (process.env.NODE_ENV === "development") {
				console.log(`[${level}] ${message}`, data || "");
			}

			// Send to main process for production logging
			if (window.productionLogs?.logMessage) {
				window.productionLogs.logMessage(level, message, data);
			}
		} catch (error) {
			console.error("Failed to log message:", error);
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
}
