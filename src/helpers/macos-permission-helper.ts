import { systemPreferences, shell, app } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import { ProductionLogger } from "./production-logger";
import { existsSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

interface MacOSPermissionIssue {
	type: "permission" | "configuration" | "system";
	category: "camera" | "microphone" | "screen" | "general";
	severity: "critical" | "warning" | "info";
	title: string;
	description: string;
	autoFixable: boolean;
	solutions: string[];
	commands?: string[];
}

interface MacOSSystemInfo {
	version: string;
	majorVersion: number;
	bundleId: string;
	isPackaged: boolean;
	isSigned: boolean;
	infoPlistValid: boolean;
	hardendedRuntimeEnabled: boolean;
}

export class MacOSPermissionHelper {
	private static bundleId = "com.videorecorder.app";

	/**
	 * Detecta automaticamente problemas específicos do macOS
	 */
	public static async detectMacOSIssues(): Promise<MacOSPermissionIssue[]> {
		if (process.platform !== "darwin") {
			return [];
		}

		ProductionLogger.log(
			"INFO",
			"Starting macOS-specific permission detection",
		);

		const issues: MacOSPermissionIssue[] = [];
		const systemInfo = await this.getSystemInfo();

		// Verificar permissões específicas do macOS
		const permissionIssues = await this.checkMacOSPermissions();
		issues.push(...permissionIssues);

		// Verificar configuração do Info.plist
		const infoPlistIssues = await this.checkInfoPlist();
		issues.push(...infoPlistIssues);

		// Verificar assinatura de código
		const codeSigningIssues = await this.checkCodeSigning();
		issues.push(...codeSigningIssues);

		// Verificar problemas específicos da versão do macOS
		const versionIssues = await this.checkMacOSVersion(systemInfo);
		issues.push(...versionIssues);

		ProductionLogger.log("INFO", "macOS issue detection completed", {
			totalIssues: issues.length,
			critical: issues.filter((i) => i.severity === "critical").length,
			warnings: issues.filter((i) => i.severity === "warning").length,
		});

		return issues;
	}

	/**
	 * Aplicar correções automáticas para macOS
	 */
	public static async applyMacOSFixes(): Promise<{
		success: boolean;
		fixedIssues: number;
		failedFixes: string[];
		requiresManualIntervention: MacOSPermissionIssue[];
	}> {
		ProductionLogger.log("INFO", "Starting macOS auto-fix process");

		const issues = await this.detectMacOSIssues();
		const fixableIssues = issues.filter((i) => i.autoFixable);
		const manualIssues = issues.filter((i) => !i.autoFixable);

		let fixedCount = 0;
		const failedFixes: string[] = [];

		for (const issue of fixableIssues) {
			try {
				const success = await this.applyFix(issue);
				if (success) {
					fixedCount++;
					ProductionLogger.log("INFO", `Fixed issue: ${issue.title}`);
				} else {
					failedFixes.push(issue.title);
				}
			} catch (error) {
				failedFixes.push(`${issue.title}: ${error}`);
				ProductionLogger.log(
					"ERROR",
					`Failed to fix ${issue.title}`,
					error as string,
				);
			}
		}

		const result = {
			success: fixedCount > 0,
			fixedIssues: fixedCount,
			failedFixes,
			requiresManualIntervention: manualIssues,
		};

		ProductionLogger.log("INFO", "macOS auto-fix completed", result);
		return result;
	}

	/**
	 * Reset completo das permissões do macOS
	 */
	public static async resetMacOSPermissions(): Promise<{
		success: boolean;
		message: string;
		commands: string[];
	}> {
		try {
			ProductionLogger.log("INFO", "Attempting macOS permission reset");

			const commands = [
				`tccutil reset Camera ${this.bundleId}`,
				`tccutil reset Microphone ${this.bundleId}`,
				`tccutil reset ScreenCapture ${this.bundleId}`,
			];

			// Executar comandos de reset
			for (const command of commands) {
				try {
					await execAsync(command);
					ProductionLogger.log("INFO", `Executed reset command: ${command}`);
				} catch (error) {
					ProductionLogger.log(
						"WARN",
						`Reset command failed: ${command}`,
						error as string,
					);
				}
			}

			// Tentar solicitar permissões novamente
			setTimeout(async () => {
				try {
					await systemPreferences.askForMediaAccess("camera");
					await systemPreferences.askForMediaAccess("microphone");
					ProductionLogger.log("INFO", "Re-requested permissions after reset");
				} catch (error) {
					ProductionLogger.log(
						"WARN",
						"Failed to re-request permissions",
						error as string,
					);
				}
			}, 1000);

			return {
				success: true,
				message:
					"Reset de permissões executado com sucesso. Reinicie o aplicativo para aplicar as mudanças.",
				commands,
			};
		} catch (error) {
			ProductionLogger.log(
				"ERROR",
				"Failed to reset macOS permissions",
				error as string,
			);
			return {
				success: false,
				message: `Erro ao resetar permissões: ${error}`,
				commands: [],
			};
		}
	}

	/**
	 * Abrir preferências específicas do macOS
	 */
	public static async openMacOSPreferences(
		type: "camera" | "microphone" | "screen",
	): Promise<boolean> {
		try {
			const urls = {
				camera:
					"x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
				microphone:
					"x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
				screen:
					"x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
			};

			await shell.openExternal(urls[type]);
			ProductionLogger.log("INFO", `Opened macOS preferences for ${type}`);
			return true;
		} catch (error) {
			ProductionLogger.log(
				"ERROR",
				`Failed to open macOS preferences for ${type}`,
				error as string,
			);
			return false;
		}
	}

	/**
	 * Verificar se o aplicativo está nas preferências de privacidade
	 */
	public static async isAppInPrivacyPreferences(): Promise<{
		camera: boolean;
		microphone: boolean;
		screen: boolean;
	}> {
		try {
			// Verificar usando tccutil (quando disponível)
			const { stdout } = await execAsync("tccutil list");
			const lines = stdout.split("\n");

			const cameraListed = lines.some(
				(line) =>
					line.includes(this.bundleId) && line.includes("kTCCServiceCamera"),
			);
			const microphoneListed = lines.some(
				(line) =>
					line.includes(this.bundleId) &&
					line.includes("kTCCServiceMicrophone"),
			);
			const screenListed = lines.some(
				(line) =>
					line.includes(this.bundleId) &&
					line.includes("kTCCServiceScreenCapture"),
			);

			return {
				camera: cameraListed,
				microphone: microphoneListed,
				screen: screenListed,
			};
		} catch (error) {
			ProductionLogger.log(
				"WARN",
				"Could not verify app in privacy preferences",
				error as string,
			);
			return {
				camera: false,
				microphone: false,
				screen: false,
			};
		}
	}

	// Métodos privados para verificação específica

	private static async getSystemInfo(): Promise<MacOSSystemInfo> {
		const version = process.getSystemVersion();
		const majorVersion = parseInt(version.split(".")[0]);
		const bundleId = this.bundleId;
		const isPackaged = app.isPackaged;

		let isSigned = false;
		let infoPlistValid = false;
		const hardendedRuntimeEnabled = false;

		try {
			// Verificar assinatura
			const { stdout } = await execAsync(
				`codesign -dv ${app.getAppPath()} 2>&1`,
			);
			isSigned = !stdout.includes("not signed");
		} catch (error) {
			ProductionLogger.log(
				"WARN",
				"Could not verify code signing",
				error as string,
			);
		}

		// Verificar Info.plist
		try {
			const infoPlistPath = join(app.getAppPath(), "Contents", "Info.plist");
			if (existsSync(infoPlistPath)) {
				const { stdout } = await execAsync(`plutil -p "${infoPlistPath}"`);
				infoPlistValid =
					stdout.includes("NSCameraUsageDescription") &&
					stdout.includes("NSMicrophoneUsageDescription") &&
					stdout.includes("NSScreenCaptureDescription");
			}
		} catch (error) {
			ProductionLogger.log(
				"WARN",
				"Could not verify Info.plist",
				error as string,
			);
		}

		return {
			version,
			majorVersion,
			bundleId,
			isPackaged,
			isSigned,
			infoPlistValid,
			hardendedRuntimeEnabled,
		};
	}

	private static async checkMacOSPermissions(): Promise<
		MacOSPermissionIssue[]
	> {
		const issues: MacOSPermissionIssue[] = [];

		try {
			// Verificar câmera
			const cameraStatus =
				await systemPreferences.getMediaAccessStatus("camera");
			if (cameraStatus === "denied") {
				issues.push({
					type: "permission",
					category: "camera",
					severity: "critical",
					title: "Permissão de Câmera Negada",
					description: "O usuário negou explicitamente o acesso à câmera",
					autoFixable: true,
					solutions: [
						"Resetar permissões via tccutil",
						"Remover app das Preferências de Privacidade",
						"Solicitar permissão novamente",
					],
					commands: [`tccutil reset Camera ${this.bundleId}`],
				});
			}

			// Verificar microfone
			const micStatus =
				await systemPreferences.getMediaAccessStatus("microphone");
			if (micStatus === "denied") {
				issues.push({
					type: "permission",
					category: "microphone",
					severity: "critical",
					title: "Permissão de Microfone Negada",
					description: "O usuário negou explicitamente o acesso ao microfone",
					autoFixable: true,
					solutions: [
						"Resetar permissões via tccutil",
						"Remover app das Preferências de Privacidade",
						"Solicitar permissão novamente",
					],
					commands: [`tccutil reset Microphone ${this.bundleId}`],
				});
			}

			// Verificar captura de tela
			const screenStatus =
				await systemPreferences.getMediaAccessStatus("screen");
			if (screenStatus === "denied") {
				issues.push({
					type: "permission",
					category: "screen",
					severity: "critical",
					title: "Permissão de Captura de Tela Negada",
					description:
						"O usuário negou explicitamente o acesso à captura de tela",
					autoFixable: false,
					solutions: [
						"Abrir Preferências do Sistema manualmente",
						"Arrastar aplicativo para lista de Gravação de Tela",
						"Marcar caixa de seleção do aplicativo",
					],
					commands: [`tccutil reset ScreenCapture ${this.bundleId}`],
				});
			}
		} catch (error) {
			issues.push({
				type: "system",
				category: "general",
				severity: "warning",
				title: "Erro ao Verificar Permissões",
				description: `Não foi possível verificar o status das permissões: ${error}`,
				autoFixable: false,
				solutions: [
					"Verificar se o aplicativo está corretamente instalado",
					"Tentar executar como administrador",
					"Verificar integridade do sistema",
				],
			});
		}

		return issues;
	}

	private static async checkInfoPlist(): Promise<MacOSPermissionIssue[]> {
		const issues: MacOSPermissionIssue[] = [];

		try {
			if (!app.isPackaged) {
				issues.push({
					type: "configuration",
					category: "general",
					severity: "warning",
					title: "Aplicativo em Modo de Desenvolvimento",
					description: "O aplicativo está rodando em modo de desenvolvimento",
					autoFixable: false,
					solutions: [
						"Gerar build empacotada para testar permissões",
						"Verificar se configurações funcionam na produção",
					],
				});
				return issues;
			}

			const infoPlistPath = join(app.getAppPath(), "Contents", "Info.plist");
			if (!existsSync(infoPlistPath)) {
				issues.push({
					type: "configuration",
					category: "general",
					severity: "critical",
					title: "Info.plist Não Encontrado",
					description: "O arquivo Info.plist não foi encontrado no aplicativo",
					autoFixable: false,
					solutions: [
						"Verificar se a build foi gerada corretamente",
						"Recriar build com configurações adequadas",
					],
				});
				return issues;
			}

			const { stdout } = await execAsync(`plutil -p "${infoPlistPath}"`);
			const requiredKeys = [
				"NSCameraUsageDescription",
				"NSMicrophoneUsageDescription",
				"NSScreenCaptureDescription",
			];

			for (const key of requiredKeys) {
				if (!stdout.includes(key)) {
					issues.push({
						type: "configuration",
						category: "general",
						severity: "critical",
						title: `${key} Ausente`,
						description: `A chave ${key} não foi encontrada no Info.plist`,
						autoFixable: false,
						solutions: [
							"Verificar forge.config.ts",
							"Adicionar descrição de uso no extendInfo",
							"Rebuild aplicativo",
						],
					});
				}
			}
		} catch (error) {
			issues.push({
				type: "configuration",
				category: "general",
				severity: "warning",
				title: "Erro ao Verificar Info.plist",
				description: `Não foi possível verificar o Info.plist: ${error}`,
				autoFixable: false,
				solutions: [
					"Verificar se o aplicativo está corretamente instalado",
					"Tentar rebuild se necessário",
				],
			});
		}

		return issues;
	}

	private static async checkCodeSigning(): Promise<MacOSPermissionIssue[]> {
		const issues: MacOSPermissionIssue[] = [];

		try {
			const { stdout } = await execAsync(
				`codesign -dv ${app.getAppPath()} 2>&1`,
			);

			if (stdout.includes("not signed")) {
				issues.push({
					type: "configuration",
					category: "general",
					severity: "warning",
					title: "Aplicativo Não Assinado",
					description: "O aplicativo não possui assinatura de código",
					autoFixable: true,
					solutions: [
						"Assinar com certificado ad-hoc para desenvolvimento",
						"Considerar certificado de desenvolvedor para distribuição",
					],
					commands: [`codesign --force --deep --sign - ${app.getAppPath()}`],
				});
			}
		} catch {
			issues.push({
				type: "system",
				category: "general",
				severity: "info",
				title: "Não Foi Possível Verificar Assinatura",
				description:
					"Não foi possível verificar o status da assinatura de código",
				autoFixable: false,
				solutions: [
					"Verificar se as ferramentas de desenvolvimento estão instaladas",
					"Tentar verificar manualmente via Terminal",
				],
			});
		}

		return issues;
	}

	private static async checkMacOSVersion(
		systemInfo: MacOSSystemInfo,
	): Promise<MacOSPermissionIssue[]> {
		const issues: MacOSPermissionIssue[] = [];

		if (systemInfo.majorVersion < 10) {
			issues.push({
				type: "system",
				category: "general",
				severity: "warning",
				title: "Versão do macOS Antiga",
				description: `macOS ${systemInfo.version} pode ter limitações nas permissões`,
				autoFixable: false,
				solutions: [
					"Considerar atualizar para versão mais recente",
					"Verificar documentação de compatibilidade",
				],
			});
		}

		if (systemInfo.majorVersion >= 11) {
			// macOS Big Sur e posteriores têm requisitos mais rigorosos
			issues.push({
				type: "system",
				category: "general",
				severity: "info",
				title: "Requisitos de Segurança Modernos",
				description: `macOS ${systemInfo.version} aplica verificações de segurança mais rigorosas`,
				autoFixable: false,
				solutions: [
					"Verificar se hardened runtime está configurado",
					"Considerar notarização para distribuição",
				],
			});
		}

		return issues;
	}

	private static async applyFix(issue: MacOSPermissionIssue): Promise<boolean> {
		try {
			if (issue.commands && issue.commands.length > 0) {
				for (const command of issue.commands) {
					await execAsync(command);
				}
				return true;
			}

			// Fixes específicos por tipo
			switch (issue.category) {
				case "camera":
				case "microphone":
					await systemPreferences.askForMediaAccess(issue.category);
					return true;
				case "screen":
					await this.openMacOSPreferences("screen");
					return true;
				default:
					return false;
			}
		} catch (error) {
			ProductionLogger.log(
				"ERROR",
				`Failed to apply fix for ${issue.title}`,
				error as string,
			);
			return false;
		}
	}
}
