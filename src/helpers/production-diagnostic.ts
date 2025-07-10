import { app, shell, systemPreferences } from "electron";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { ProductionLogger } from "./production-logger";

export interface DiagnosticResult {
	category: "permissions" | "configuration" | "system" | "logs";
	level: "info" | "warning" | "error";
	title: string;
	description: string;
	solutions: string[];
	autoFixAvailable: boolean;
	details?: Record<string, unknown>;
}

export interface DiagnosticSummary {
	totalIssues: number;
	criticalIssues: number;
	warningIssues: number;
	infoIssues: number;
	results: DiagnosticResult[];
	systemInfo: {
		platform: string;
		appVersion: string;
		electronVersion: string;
		webSecurity: boolean;
		logFileExists: boolean;
		logFileSize: number;
		lastLogEntry?: string;
	};
}

export class ProductionDiagnostic {
	private static async checkPermissionStatus(): Promise<DiagnosticResult[]> {
		const results: DiagnosticResult[] = [];

		try {
			// Verificar status atual das permissões
			const cameraStatus =
				await systemPreferences.getMediaAccessStatus("camera");
			const microphoneStatus =
				await systemPreferences.getMediaAccessStatus("microphone");
			const screenCaptureStatus =
				await systemPreferences.getMediaAccessStatus("screen");

			ProductionLogger.log("INFO", "Diagnostic: Checking permission status", {
				camera: cameraStatus,
				microphone: microphoneStatus,
				screenCapture: screenCaptureStatus,
			});

			// Verificar câmera
			if (cameraStatus !== "granted") {
				results.push({
					category: "permissions",
					level: "error",
					title: "Permissão de Câmera Negada",
					description: `Status atual: ${cameraStatus}. A aplicação não pode acessar a câmera.`,
					solutions: [
						"Abrir Preferências do Sistema > Segurança e Privacidade > Câmera",
						"Verificar se o app está listado e habilitado",
						"Remover e readdionar o app nas permissões",
						"Reinicializar o aplicativo após conceder permissões",
					],
					autoFixAvailable: true,
					details: { currentStatus: cameraStatus },
				});
			}

			// Verificar microfone
			if (microphoneStatus !== "granted") {
				results.push({
					category: "permissions",
					level: "error",
					title: "Permissão de Microfone Negada",
					description: `Status atual: ${microphoneStatus}. A aplicação não pode acessar o microfone.`,
					solutions: [
						"Abrir Preferências do Sistema > Segurança e Privacidade > Microfone",
						"Verificar se o app está listado e habilitado",
						"Remover e readdionar o app nas permissões",
						"Reinicializar o aplicativo após conceder permissões",
					],
					autoFixAvailable: true,
					details: { currentStatus: microphoneStatus },
				});
			}

			// Verificar captura de tela
			if (screenCaptureStatus !== "granted") {
				results.push({
					category: "permissions",
					level: "error",
					title: "Permissão de Captura de Tela Negada",
					description: `Status atual: ${screenCaptureStatus}. A aplicação não pode capturar a tela.`,
					solutions: [
						"Abrir Preferências do Sistema > Segurança e Privacidade > Gravação de Tela",
						"Verificar se o app está listado e habilitado",
						"Pode ser necessário arrastar o app para a lista manualmente",
						"Reinicializar o aplicativo após conceder permissões",
					],
					autoFixAvailable: true,
					details: { currentStatus: screenCaptureStatus },
				});
			}

			// Verificar se todas as permissões estão OK
			if (
				cameraStatus === "granted" &&
				microphoneStatus === "granted" &&
				screenCaptureStatus === "granted"
			) {
				results.push({
					category: "permissions",
					level: "info",
					title: "Todas as Permissões Concedidas",
					description:
						"Todas as permissões necessárias estão concedidas corretamente.",
					solutions: [],
					autoFixAvailable: false,
					details: {
						camera: cameraStatus,
						microphone: microphoneStatus,
						screenCapture: screenCaptureStatus,
					},
				});
			}
		} catch (error) {
			results.push({
				category: "permissions",
				level: "error",
				title: "Erro ao Verificar Permissões",
				description: `Falha ao verificar o status das permissões: ${error}`,
				solutions: [
					"Verificar se o app está rodando como aplicação assinada",
					"Verificar se o Info.plist contém as descrições necessárias",
					"Tentar executar o app como administrador",
				],
				autoFixAvailable: false,
				details: { error: String(error) },
			});
		}

		return results;
	}

	private static async checkLogFile(): Promise<DiagnosticResult[]> {
		const results: DiagnosticResult[] = [];

		try {
			const logDir = join(app.getPath("userData"), "logs");
			const timestamp = new Date().toISOString().split("T")[0];
			const logFile = join(logDir, `permissions-${timestamp}.log`);

			if (!existsSync(logFile)) {
				results.push({
					category: "logs",
					level: "warning",
					title: "Arquivo de Log Não Encontrado",
					description: "O arquivo de log de hoje não foi encontrado.",
					solutions: [
						"Verificar se o aplicativo foi executado hoje",
						"Verificar permissões de escrita no diretório de logs",
						"Executar o aplicativo e tentar novamente",
					],
					autoFixAvailable: false,
					details: { expectedPath: logFile },
				});
				return results;
			}

			// Ler o arquivo de log
			const logContent = readFileSync(logFile, "utf8");
			const logLines = logContent.split("\n").filter((line) => line.trim());

			// Verificar se há erros no log
			const errorLines = logLines.filter((line) => line.includes("[ERROR]"));
			const warningLines = logLines.filter((line) => line.includes("[WARN]"));
			const infoLines = logLines.filter((line) => line.includes("[INFO]"));

			if (errorLines.length > 0) {
				results.push({
					category: "logs",
					level: "error",
					title: "Erros Encontrados nos Logs",
					description: `Encontrados ${errorLines.length} erros no log de hoje.`,
					solutions: [
						"Analisar os erros específicos nos logs",
						"Verificar se as permissões foram negadas",
						"Verificar se há problemas de configuração",
					],
					autoFixAvailable: false,
					details: {
						errorCount: errorLines.length,
						recentErrors: errorLines.slice(-5), // últimos 5 erros
					},
				});
			}

			if (warningLines.length > 0) {
				results.push({
					category: "logs",
					level: "warning",
					title: "Avisos Encontrados nos Logs",
					description: `Encontrados ${warningLines.length} avisos no log de hoje.`,
					solutions: [
						"Analisar os avisos específicos nos logs",
						"Verificar se há permissões não concedidas",
						"Considerar se os avisos afetam a funcionalidade",
					],
					autoFixAvailable: false,
					details: {
						warningCount: warningLines.length,
						recentWarnings: warningLines.slice(-5), // últimos 5 avisos
					},
				});
			}

			// Verificar se há logs de sucesso
			const successLines = logLines.filter(
				(line) => line.includes("ALL GRANTED") || line.includes("GRANTED"),
			);

			if (successLines.length > 0) {
				results.push({
					category: "logs",
					level: "info",
					title: "Logs de Sucesso Encontrados",
					description:
						"Encontradas evidências de permissões concedidas nos logs.",
					solutions: [],
					autoFixAvailable: false,
					details: {
						successCount: successLines.length,
						recentSuccess: successLines.slice(-3), // últimos 3 sucessos
					},
				});
			}

			// Verificar se há logs informativos suficientes
			if (infoLines.length === 0) {
				results.push({
					category: "logs",
					level: "warning",
					title: "Poucos Logs Informativos",
					description: "Nenhum log informativo foi encontrado no arquivo.",
					solutions: [
						"Verificar se o sistema de logs está funcionando corretamente",
						"Executar algumas operações no aplicativo para gerar logs",
					],
					autoFixAvailable: false,
					details: { infoLinesCount: infoLines.length },
				});
			}

			// Verificar se o log foi criado recentemente
			const stats = statSync(logFile);
			const lastModified = stats.mtime;
			const now = new Date();
			const timeDiff = now.getTime() - lastModified.getTime();
			const hoursDiff = timeDiff / (1000 * 60 * 60);

			if (hoursDiff > 24) {
				results.push({
					category: "logs",
					level: "warning",
					title: "Log Desatualizado",
					description: `O log foi modificado há ${Math.round(hoursDiff)} horas.`,
					solutions: [
						"Executar o aplicativo para gerar logs atualizados",
						"Verificar se o sistema de logs está funcionando",
					],
					autoFixAvailable: false,
					details: { lastModified: lastModified.toISOString() },
				});
			}
		} catch (error) {
			results.push({
				category: "logs",
				level: "error",
				title: "Erro ao Analisar Logs",
				description: `Falha ao analisar os arquivos de log: ${error}`,
				solutions: [
					"Verificar permissões de leitura no diretório de logs",
					"Verificar se o arquivo de log não está corrompido",
					"Tentar executar o aplicativo como administrador",
				],
				autoFixAvailable: false,
				details: { error: String(error) },
			});
		}

		return results;
	}

	private static async checkSystemConfiguration(): Promise<DiagnosticResult[]> {
		const results: DiagnosticResult[] = [];

		try {
			// Verificar se estamos no macOS
			if (process.platform !== "darwin") {
				results.push({
					category: "system",
					level: "info",
					title: "Sistema Operacional",
					description: `Sistema detectado: ${process.platform}. Algumas verificações são específicas do macOS.`,
					solutions: [],
					autoFixAvailable: false,
					details: { platform: process.platform },
				});
			}

			// Verificar versão do macOS
			if (process.platform === "darwin") {
				const osVersion = process.getSystemVersion();
				const majorVersion = parseInt(osVersion.split(".")[0]);

				if (majorVersion < 10) {
					results.push({
						category: "system",
						level: "warning",
						title: "Versão do macOS Antiga",
						description: `macOS ${osVersion} pode ter limitações nas permissões.`,
						solutions: [
							"Considerar atualizar para uma versão mais recente do macOS",
							"Verificar compatibilidade das permissões",
						],
						autoFixAvailable: false,
						details: { osVersion },
					});
				}
			}

			// Verificar se o app está assinado (em produção)
			if (app.isPackaged) {
				results.push({
					category: "system",
					level: "info",
					title: "Aplicação Empacotada",
					description:
						"A aplicação está rodando em modo de produção (empacotada).",
					solutions: [],
					autoFixAvailable: false,
					details: { isPackaged: true },
				});
			} else {
				results.push({
					category: "system",
					level: "warning",
					title: "Aplicação em Desenvolvimento",
					description: "A aplicação está rodando em modo de desenvolvimento.",
					solutions: [
						"Testar com uma build empacotada para produção",
						"Verificar se as permissões funcionam corretamente na build final",
					],
					autoFixAvailable: false,
					details: { isPackaged: false },
				});
			}
		} catch (error) {
			results.push({
				category: "system",
				level: "error",
				title: "Erro na Verificação do Sistema",
				description: `Falha ao verificar configurações do sistema: ${error}`,
				solutions: [
					"Verificar se o Electron está funcionando corretamente",
					"Tentar reinicializar o aplicativo",
				],
				autoFixAvailable: false,
				details: { error: String(error) },
			});
		}

		return results;
	}

	public static async runFullDiagnostic(): Promise<DiagnosticSummary> {
		ProductionLogger.log("INFO", "Starting full diagnostic");

		const permissionResults = await this.checkPermissionStatus();
		const logResults = await this.checkLogFile();
		const systemResults = await this.checkSystemConfiguration();

		const allResults = [...permissionResults, ...logResults, ...systemResults];

		const criticalIssues = allResults.filter((r) => r.level === "error").length;
		const warningIssues = allResults.filter(
			(r) => r.level === "warning",
		).length;
		const infoIssues = allResults.filter((r) => r.level === "info").length;

		// Coletar informações do sistema
		const logDir = join(app.getPath("userData"), "logs");
		const timestamp = new Date().toISOString().split("T")[0];
		const logFile = join(logDir, `permissions-${timestamp}.log`);

		let logFileSize = 0;
		let lastLogEntry = "";

		try {
			if (existsSync(logFile)) {
				const stats = statSync(logFile);
				logFileSize = stats.size;

				const logContent = readFileSync(logFile, "utf8");
				const logLines = logContent.split("\n").filter((line) => line.trim());
				lastLogEntry = logLines[logLines.length - 1] || "";
			}
		} catch (error) {
			console.error("Error reading log file for diagnostic:", error);
		}

		const summary: DiagnosticSummary = {
			totalIssues: allResults.length,
			criticalIssues,
			warningIssues,
			infoIssues,
			results: allResults,
			systemInfo: {
				platform: process.platform,
				appVersion: app.getVersion(),
				electronVersion: process.versions.electron,
				webSecurity: true, // Assumindo que está habilitado
				logFileExists: existsSync(logFile),
				logFileSize,
				lastLogEntry,
			},
		};

		ProductionLogger.log("INFO", "Diagnostic completed", {
			totalIssues: summary.totalIssues,
			criticalIssues: summary.criticalIssues,
			warningIssues: summary.warningIssues,
		});

		return summary;
	}

	public static async autoFixPermissions(): Promise<boolean> {
		try {
			ProductionLogger.log("INFO", "Attempting auto-fix for permissions");

			// Tentar solicitar permissões automaticamente
			const cameraPermission =
				await systemPreferences.askForMediaAccess("camera");
			const microphonePermission =
				await systemPreferences.askForMediaAccess("microphone");

			ProductionLogger.log("INFO", "Auto-fix results", {
				camera: cameraPermission,
				microphone: microphonePermission,
			});

			// Para captura de tela, abrir as preferências
			await shell.openPath(
				"x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
			);

			return cameraPermission && microphonePermission;
		} catch (error) {
			ProductionLogger.log("ERROR", "Auto-fix failed", error as string);
			return false;
		}
	}
}
