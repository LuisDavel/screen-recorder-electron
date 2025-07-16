import { app, BrowserWindow, powerSaveBlocker, ipcMain } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
import { PermissionsHelper } from "./helpers/permissions-helper";
import { ProductionLogger } from "./helpers/production-logger";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import {
	installExtension,
	REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

const inDevelopment = process.env.NODE_ENV === "development";

// Controle da janela e estados
let mainWindow: BrowserWindow | null = null;
let isRecording = false;
let isAppQuiting = false;
let translucencyTimeout: NodeJS.Timeout | null = null;

// Power save blocker IDs
let systemSleepBlockerId: number | null = null;
let displaySleepBlockerId: number | null = null;
let appSuspensionBlockerId: number | null = null;

function createWindow() {
	// Prevenir criação de janelas duplicadas
	if (mainWindow && !mainWindow.isDestroyed()) {
		console.warn("Janela principal já existe. Pulando criação duplicada.");
		return mainWindow;
	}

	console.log("Criando janela principal...");
	const preload = path.join(__dirname, "preload.js");
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 900,
		webPreferences: {
			devTools: inDevelopment,
			contextIsolation: true,
			nodeIntegration: true,
			nodeIntegrationInSubFrames: false,
			webSecurity: true,
			allowRunningInsecureContent: false,
			backgroundThrottling: false, // CRÍTICO: Impede throttling
			offscreen: false,
			spellcheck: false,
			preload: preload,
			nodeIntegrationInWorker: true,
			experimentalFeatures: true,
			webgl: true,
			plugins: true,
		},
		titleBarStyle: "default", // Header nativo ativado
		show: false,
		// Configurações para bloquear minimização
		skipTaskbar: false,
		alwaysOnTop: false,
		acceptFirstMouse: true,
		disableAutoHideCursor: true,
		enableLargerThanScreen: false,
		focusable: true,
		hasShadow: true,
		kiosk: false,
		minimizable: false, // BLOQUEAR MINIMIZAÇÃO
		movable: true,
		resizable: true,
		thickFrame: true,
		transparent: false,
		autoHideMenuBar: false, // Manter menu bar visível
		fullscreenable: true,
		vibrancy: undefined,
	});

	console.log("Registrando IPC listeners...");
	try {
		registerListeners(mainWindow);
		console.log("✅ registerListeners chamado com sucesso");
	} catch (error) {
		console.error("❌ Erro ao chamar registerListeners:", error);
		throw error;
	}

	// Handle media permissions
	mainWindow.webContents.session.setPermissionRequestHandler(
		(webContents, permission, callback) => {
			if (permission === "media") {
				console.log("Requesting media permission from system");
				callback(true);
			} else {
				callback(false);
			}
		},
	);

	mainWindow.webContents.session.setPermissionCheckHandler(
		(webContents, permission) => {
			if (permission === "media") {
				return true;
			}
			return false;
		},
	);

	// Setup power save blockers
	setupPowerSaveBlockers();

	// Setup IPC handlers
	setupBackgroundRecordingHandlers();

	// Show window when ready
	mainWindow.once("ready-to-show", async () => {
		console.log("Janela principal pronta para exibir");
		mainWindow?.show();
		mainWindow?.focus();

		// Iniciar modo translúcido após 3 segundos
		startTranslucencyTimer();

		// Check permissions
		try {
			const needsPermissions = await PermissionsHelper.needsPermissionSetup();
			if (needsPermissions) {
				console.log("Requesting system permissions...");
				await PermissionsHelper.requestPermissions();
			}
		} catch (error) {
			console.error("Error handling permissions:", error);
		}

		// Garantir performance máxima
		setTimeout(() => {
			if (mainWindow) {
				mainWindow.webContents.setBackgroundThrottling(false);
				console.log("🚀 Background throttling desabilitado definitivamente");
			}
		}, 1000);
	});

	// Minimização já está bloqueada via minimizable: false

	// Controle inteligente de fechamento
	mainWindow.on("close", (event) => {
		if (!isAppQuiting) {
			if (isRecording) {
				// Se estiver gravando, apenas ocultar (não fechar)
				event.preventDefault();
				console.log("🎬 Gravação ativa - ocultando janela");
				mainWindow?.hide();
			} else {
				// Se não estiver gravando, fechar normalmente
				console.log("❌ Fechando aplicação");
				isAppQuiting = true;
				app.quit();
			}
		}
	});

	// Eventos de foco para controle de translucidez
	mainWindow.on("focus", () => {
		console.log("🔄 Window focused");
		clearTranslucencyTimer();

		// Só remover translucidez se não estiver gravando
		if (!isRecording) {
			console.log("🌫️ Removendo translucidez - não está gravando");
			setWindowOpacity(1.0);
		} else {
			console.log("🌫️ Mantendo translucidez - gravação ativa");
		}
	});

	mainWindow.on("blur", () => {
		console.log("🔄 Window blurred - iniciando timer de translucidez");
		startTranslucencyTimer();
	});

	// Eventos de visibilidade
	mainWindow.on("show", () => {
		console.log("🔄 Window shown");
		clearTranslucencyTimer();

		// Só remover translucidez se não estiver gravando
		if (!isRecording) {
			console.log("🌫️ Removendo translucidez - não está gravando");
			setWindowOpacity(1.0);
		} else {
			console.log("🌫️ Mantendo translucidez - gravação ativa");
		}
	});

	mainWindow.on("hide", () => {
		console.log("🔄 Window hidden");
		clearTranslucencyTimer();
	});

	// Limpar recursos quando fechada
	mainWindow.on("closed", () => {
		console.log("Janela principal foi fechada");
		cleanupPowerSaveBlockers();
		clearTranslucencyTimer();
		mainWindow = null;
	});

	// Adicionar listener para background recording
	mainWindow.webContents.on("did-finish-load", () => {
		mainWindow?.webContents.executeJavaScript(`
			window.addEventListener('background-recording-status-changed', (event) => {
				console.log('Background recording status changed:', event.detail);
			});
		`);
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		mainWindow.loadFile(
			path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
		);
	}

	return mainWindow;
}

// Configurar timer de translucidez
function startTranslucencyTimer() {
	clearTranslucencyTimer();

	// Se estiver gravando, não iniciar timer (já está translúcido)
	if (isRecording) {
		console.log("⏱️ Gravação ativa - mantendo translucidez");
		return;
	}

	console.log("⏱️ Iniciando timer de translucidez (3 segundos)");
	translucencyTimeout = setTimeout(() => {
		console.log("🌫️ Ativando modo translúcido");
		setWindowOpacity(0.7); // 70% de opacidade
	}, 3000);
}

// Limpar timer de translucidez
function clearTranslucencyTimer() {
	if (translucencyTimeout) {
		clearTimeout(translucencyTimeout);
		translucencyTimeout = null;
		console.log("⏱️ Timer de translucidez cancelado");
	}
}

// Definir opacidade da janela
function setWindowOpacity(opacity: number) {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.setOpacity(opacity);
		console.log(`🌫️ Opacidade da janela definida para: ${opacity}`);
	}
}

// Configurar IPC handlers para background recording
function setupBackgroundRecordingHandlers() {
	// Sincronizar status de gravação
	ipcMain.handle("sync-recording-status", async (event, status: boolean) => {
		if (isRecording !== status) {
			isRecording = status;
			console.log(
				`🔄 Status de gravação sincronizado: ${isRecording ? "ativado" : "desativado"}`,
			);

			// Se parar de gravar, voltar opacidade normal
			if (!isRecording) {
				clearTranslucencyTimer();
				setWindowOpacity(1.0);
			}
		}
		return { success: true, isRecording };
	});

	// Controlar translucidez manualmente
	ipcMain.handle("set-window-opacity", async (event, opacity: number) => {
		setWindowOpacity(opacity);
		return { success: true, opacity };
	});

	// Mostrar/ocultar janela
	ipcMain.handle("show-window", async () => {
		if (mainWindow) {
			mainWindow.show();
			mainWindow.focus();
			return { success: true };
		}
		return { success: false };
	});

	ipcMain.handle("hide-window", async () => {
		if (mainWindow) {
			mainWindow.hide();
			return { success: true };
		}
		return { success: false };
	});

	// Keep alive
	ipcMain.handle("keep-alive", async () => {
		return { alive: true, timestamp: Date.now() };
	});

	console.log("📡 IPC handlers para background recording configurados");
}

// Configurar power save blockers
function setupPowerSaveBlockers() {
	try {
		systemSleepBlockerId = powerSaveBlocker.start("prevent-app-suspension");
		console.log(
			"🔒 System sleep blocker ativado:",
			powerSaveBlocker.isStarted(systemSleepBlockerId),
		);

		displaySleepBlockerId = powerSaveBlocker.start("prevent-display-sleep");
		console.log(
			"🔒 Display sleep blocker ativado:",
			powerSaveBlocker.isStarted(displaySleepBlockerId),
		);

		try {
			appSuspensionBlockerId = powerSaveBlocker.start("prevent-app-suspension");
			console.log(
				"🔒 App suspension blocker ativado:",
				powerSaveBlocker.isStarted(appSuspensionBlockerId),
			);
		} catch (error) {
			console.warn("⚠️ App suspension blocker não disponível:", error);
		}
	} catch (error) {
		console.error("❌ Erro ao configurar power save blockers:", error);
	}
}

// Limpar power save blockers
function cleanupPowerSaveBlockers() {
	if (systemSleepBlockerId !== null) {
		powerSaveBlocker.stop(systemSleepBlockerId);
		console.log("🔓 System sleep blocker desativado");
		systemSleepBlockerId = null;
	}

	if (displaySleepBlockerId !== null) {
		powerSaveBlocker.stop(displaySleepBlockerId);
		console.log("🔓 Display sleep blocker desativado");
		displaySleepBlockerId = null;
	}

	if (appSuspensionBlockerId !== null) {
		powerSaveBlocker.stop(appSuspensionBlockerId);
		console.log("🔓 App suspension blocker desativado");
		appSuspensionBlockerId = null;
	}
}

async function installExtensions() {
	try {
		const result = await installExtension(REACT_DEVELOPER_TOOLS);
		console.log(`Extensions installed successfully: ${result.name}`);
	} catch {
		console.error("Failed to install extensions");
	}
}

// Configurações agressivas para background recording
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-background-media-suspend");
app.commandLine.appendSwitch(
	"disable-features",
	"TranslateUI,VizDisplayCompositor",
);
app.commandLine.appendSwitch("disable-ipc-flooding-protection");
app.commandLine.appendSwitch("disable-dev-shm-usage");
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-web-security");
app.commandLine.appendSwitch("disable-site-isolation-trials");
app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-default-apps");
app.commandLine.appendSwitch("disable-extensions");
app.commandLine.appendSwitch("disable-sync");
app.commandLine.appendSwitch("disable-translate");
app.commandLine.appendSwitch("disable-background-mode");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-features", "VizDisplayCompositor");
app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder");
app.commandLine.appendSwitch(
	"force-fieldtrials",
	"WebRTC-FlexFEC-03-Advertised/Enabled/",
);
app.commandLine.appendSwitch("disable-hang-monitor");
app.commandLine.appendSwitch("disable-domain-reliability");
app.commandLine.appendSwitch(
	"disable-component-extensions-with-background-pages",
);
app.commandLine.appendSwitch("disable-field-trial-config");
app.commandLine.appendSwitch("max-active-webgl-contexts", "16");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("enable-hardware-overlays");

app
	.whenReady()
	.then(() => {
		console.log("App está pronto, inicializando...");
		if (process.env.NODE_ENV === "development") {
			ProductionLogger.initialize();
			ProductionLogger.logAppStart();
		}

		return createWindow();
	})
	.then(installExtensions);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		cleanupPowerSaveBlockers();
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		console.log("Ativando app - criando nova janela");
		createWindow();
	}
});

app.on("before-quit", () => {
	console.log("🔄 App sendo fechado - limpando recursos");
	cleanupPowerSaveBlockers();
	clearTranslucencyTimer();
	ProductionLogger.logAppQuit();
});

// Removido: Sistema de tray
// Removido: Deep links (mantidos apenas os básicos se necessário)
// Removido: Lógica de minimização
