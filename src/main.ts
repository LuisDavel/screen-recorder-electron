import { app, BrowserWindow, powerSaveBlocker } from "electron";
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

// Controle para evitar criação de janelas duplicadas
let mainWindow: BrowserWindow | null = null;

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
			webSecurity: true, // Enable web security for proper permission handling
			allowRunningInsecureContent: false, // Disable insecure content for better security
			backgroundThrottling: false,
			preload: preload,
		},
		titleBarStyle: "hidden",
		show: false,
	});

	console.log("Registrando IPC listeners...");
	registerListeners(mainWindow);

	// Handle media permissions properly - request system permissions
	mainWindow.webContents.session.setPermissionRequestHandler(
		(webContents, permission, callback) => {
			if (permission === "media") {
				// For built apps, we need to request system permissions
				// This will trigger the native macOS permission dialog
				console.log("Requesting media permission from system");
				callback(true);
			} else {
				callback(false);
			}
		},
	);

	// Handle permission checks - don't override system permissions
	mainWindow.webContents.session.setPermissionCheckHandler(
		(webContents, permission) => {
			if (permission === "media") {
				// Let the system handle the permission check
				return true;
			}
			return false;
		},
	);

	// Prevent system sleep during recording
	const powerSaveId = powerSaveBlocker.start("prevent-display-sleep");
	console.log(
		"Power save blocker started:",
		powerSaveBlocker.isStarted(powerSaveId),
	);

	// Show window when ready
	mainWindow.once("ready-to-show", async () => {
		console.log("Janela principal pronta para exibir");
		mainWindow?.show();

		// Check and request permissions after window is ready
		try {
			const needsPermissions = await PermissionsHelper.needsPermissionSetup();
			if (needsPermissions) {
				console.log("Requesting system permissions...");
				await PermissionsHelper.requestPermissions();
			}
		} catch (error) {
			console.error("Error handling permissions:", error);
		}
	});

	// Prevent throttling when minimized
	mainWindow.on("minimize", () => {
		console.log("Window minimized - maintaining background activity");
	});

	mainWindow.on("restore", () => {
		console.log("Window restored");
	});

	// Limpar referência quando a janela for fechada
	mainWindow.on("closed", () => {
		console.log("Janela principal foi fechada");
		mainWindow = null;
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

async function installExtensions() {
	try {
		const result = await installExtension(REACT_DEVELOPER_TOOLS);
		console.log(`Extensions installed successfully: ${result.name}`);
	} catch {
		console.error("Failed to install extensions");
	}
}

// Prevent app suspension
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

app
	.whenReady()
	.then(() => {
		console.log("App está pronto, inicializando...");
		// Initialize production logger apenas em desenvolvimento
		if (process.env.NODE_ENV === "development") {
			ProductionLogger.initialize();
			ProductionLogger.logAppStart();
		}

		return createWindow();
	})
	.then(installExtensions);

//osX only
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		console.log("Ativando app - criando nova janela");
		createWindow();
	}
});
//osX only ends

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("before-quit", () => {
	ProductionLogger.logAppQuit();
});

// Handle deep links
let deepLinkUrl: string | null = null;

const handleDeepLink = (url: string) => {
	if (!mainWindow) {
		return;
	}
	console.log("Deep link received:", url);
	mainWindow.webContents.send("deep-link-received", url);
};

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient("videorecorder", process.execPath, ["--"]);
	}
} else {
	app.setAsDefaultProtocolClient("videorecorder");
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.on("second-instance", (event, commandLine, workingDirectory) => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}

		const url = commandLine.pop();
		if (url && url.startsWith("videorecorder://")) {
			handleDeepLink(url);
		}
	});

	app.on("open-url", (event, url) => {
		event.preventDefault();
		if (app.isReady()) {
			handleDeepLink(url);
		} else {
			deepLinkUrl = url;
		}
	});

	const firstUrl = process.argv.find((arg) =>
		arg.startsWith("videorecorder://"),
	);
	if (firstUrl) {
		deepLinkUrl = firstUrl;
	}
}

app.on("ready", () => {
	if (deepLinkUrl) {
		handleDeepLink(deepLinkUrl);
	}
});
