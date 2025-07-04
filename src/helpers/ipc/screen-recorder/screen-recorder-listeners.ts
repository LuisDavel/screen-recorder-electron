import { ipcMain, desktopCapturer, dialog, BrowserWindow } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";
import { app } from "electron";
import {
	SCREEN_RECORDER_GET_SOURCES_CHANNEL,
	SCREEN_RECORDER_START_CHANNEL,
	SCREEN_RECORDER_STOP_CHANNEL,
	SCREEN_RECORDER_SAVE_CHANNEL,
	SCREEN_RECORDER_GET_STATUS_CHANNEL,
	SCREEN_RECORDER_CHOOSE_SAVE_LOCATION_CHANNEL,
	SCREEN_RECORDER_GET_DEFAULT_LOCATIONS_CHANNEL,
	SCREEN_RECORDER_SAVE_TO_LOCATION_CHANNEL,
} from "./screen-recorder-channels";

// Estado global do recorder
let isRecording = false;
let recordedChunks: Buffer[] = [];

export function addScreenRecorderEventListeners(mainWindow: BrowserWindow) {
	// Obter as fontes de captura disponíveis
	ipcMain.handle(SCREEN_RECORDER_GET_SOURCES_CHANNEL, async () => {
		try {
			const sources = await desktopCapturer.getSources({
				types: ["window", "screen"],
				thumbnailSize: { width: 150, height: 150 },
			});

			return sources.map((source) => ({
				id: source.id,
				name: source.name,
				thumbnail: source.thumbnail.toDataURL(),
			}));
		} catch (error) {
			console.error("Erro ao obter fontes de captura:", error);
			throw error;
		}
	});

	// Iniciar gravação
	ipcMain.handle(
		SCREEN_RECORDER_START_CHANNEL,
		async (event, sourceId: string) => {
			try {
				if (isRecording) {
					throw new Error("Gravação já está em andamento");
				}

				isRecording = true;
				recordedChunks = [];

				// Enviar evento para o renderer que a gravação iniciou
				mainWindow.webContents.send("screen-recorder:recording-started", {
					sourceId,
				});

				return { success: true, message: "Gravação iniciada com sucesso" };
			} catch (error) {
				console.error("Erro ao iniciar gravação:", error);
				isRecording = false;
				throw error;
			}
		},
	);

	// Parar gravação
	ipcMain.handle(SCREEN_RECORDER_STOP_CHANNEL, async () => {
		try {
			if (!isRecording) {
				throw new Error("Nenhuma gravação em andamento");
			}

			isRecording = false;

			// Enviar evento para o renderer que a gravação parou
			mainWindow.webContents.send("screen-recorder:recording-stopped");

			return { success: true, message: "Gravação parada com sucesso" };
		} catch (error) {
			console.error("Erro ao parar gravação:", error);
			throw error;
		}
	});

	// Salvar gravação
	ipcMain.handle(
		SCREEN_RECORDER_SAVE_CHANNEL,
		async (event, videoBuffer: Buffer) => {
			try {
				console.log("Salvando vídeo - tamanho do buffer:", videoBuffer.length);

				const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
					defaultPath: join(
						app.getPath("videos"),
						`screen-recording-${Date.now()}.webm`,
					),
					filters: [
						{ name: "Video Files", extensions: ["webm", "mp4"] },
						{ name: "All Files", extensions: ["*"] },
					],
				});

				if (canceled || !filePath) {
					console.log("Salvamento cancelado pelo usuário");
					return { success: false, message: "Salvamento cancelado" };
				}

				console.log("Salvando em:", filePath);
				await writeFile(filePath, videoBuffer);
				console.log("Arquivo salvo com sucesso");

				return {
					success: true,
					message: "Gravação salva com sucesso",
					filePath,
				};
			} catch (error) {
				console.error("Erro ao salvar gravação:", error);
				return {
					success: false,
					message: `Erro ao salvar: ${error}`,
				};
			}
		},
	);

	// Obter status da gravação
	ipcMain.handle(SCREEN_RECORDER_GET_STATUS_CHANNEL, () => {
		return {
			isRecording,
			recordedChunks: recordedChunks.length,
		};
	});

	// Obter locais padrão para salvar vídeos
	ipcMain.handle(SCREEN_RECORDER_GET_DEFAULT_LOCATIONS_CHANNEL, () => {
		return {
			desktop: app.getPath("desktop"),
			documents: app.getPath("documents"),
			videos: app.getPath("videos"),
			downloads: app.getPath("downloads"),
		};
	});

	// Escolher local personalizado para salvar
	ipcMain.handle(SCREEN_RECORDER_CHOOSE_SAVE_LOCATION_CHANNEL, async () => {
		try {
			const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
				properties: ["openDirectory"],
				title: "Escolha onde salvar os vídeos",
			});

			if (canceled || filePaths.length === 0) {
				return { success: false, message: "Seleção cancelada" };
			}

			return {
				success: true,
				path: filePaths[0],
				message: "Local selecionado com sucesso",
			};
		} catch (error) {
			console.error("Erro ao escolher local:", error);
			throw error;
		}
	});

	// Salvar vídeo em local específico
	ipcMain.handle(
		SCREEN_RECORDER_SAVE_TO_LOCATION_CHANNEL,
		async (event, videoBuffer: Buffer, saveLocation: string) => {
			try {
				console.log("Salvando vídeo em local específico:", saveLocation);
				console.log("Tamanho do buffer:", videoBuffer.length);

				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const fileName = `screen-recording-${timestamp}.webm`;
				const filePath = join(saveLocation, fileName);

				console.log("Caminho completo:", filePath);
				await writeFile(filePath, videoBuffer);
				console.log("Arquivo salvo com sucesso em:", filePath);

				return {
					success: true,
					message: "Gravação salva com sucesso",
					filePath,
					fileName,
				};
			} catch (error) {
				console.error("Erro ao salvar gravação:", error);
				return {
					success: false,
					message: `Erro ao salvar: ${error}`,
				};
			}
		},
	);

	// Listener para receber chunks de vídeo do renderer
	ipcMain.on("screen-recorder:video-chunk", (event, chunk: Buffer) => {
		if (isRecording) {
			recordedChunks.push(chunk);
		}
	});
}
