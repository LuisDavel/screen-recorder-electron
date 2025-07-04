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

export function exposeScreenRecorderContext() {
	const { contextBridge, ipcRenderer } = window.require("electron");

	contextBridge.exposeInMainWorld("screenRecorder", {
		// Obter fontes de captura disponíveis
		getSources: () => ipcRenderer.invoke(SCREEN_RECORDER_GET_SOURCES_CHANNEL),

		// Iniciar gravação
		startRecording: (sourceId: string) =>
			ipcRenderer.invoke(SCREEN_RECORDER_START_CHANNEL, sourceId),

		// Parar gravação
		stopRecording: () => ipcRenderer.invoke(SCREEN_RECORDER_STOP_CHANNEL),

		// Salvar gravação
		saveRecording: (videoBuffer: Buffer) =>
			ipcRenderer.invoke(SCREEN_RECORDER_SAVE_CHANNEL, videoBuffer),

		// Obter status da gravação
		getStatus: () => ipcRenderer.invoke(SCREEN_RECORDER_GET_STATUS_CHANNEL),

		// Obter locais padrão para salvar
		getDefaultLocations: () =>
			ipcRenderer.invoke(SCREEN_RECORDER_GET_DEFAULT_LOCATIONS_CHANNEL),

		// Escolher local personalizado para salvar
		chooseSaveLocation: () =>
			ipcRenderer.invoke(SCREEN_RECORDER_CHOOSE_SAVE_LOCATION_CHANNEL),

		// Salvar vídeo em local específico
		saveToLocation: (videoBuffer: Buffer, saveLocation: string) =>
			ipcRenderer.invoke(
				SCREEN_RECORDER_SAVE_TO_LOCATION_CHANNEL,
				videoBuffer,
				saveLocation,
			),

		// Enviar chunk de vídeo
		sendVideoChunk: (chunk: Buffer) =>
			ipcRenderer.send("screen-recorder:video-chunk", chunk),

		// Listeners para eventos do main process
		onRecordingStarted: (callback: (event: any, data: any) => void) => {
			ipcRenderer.on("screen-recorder:recording-started", callback);
		},

		onRecordingStopped: (callback: (event: any) => void) => {
			ipcRenderer.on("screen-recorder:recording-stopped", callback);
		},

		// Remover listeners
		removeAllListeners: () => {
			ipcRenderer.removeAllListeners("screen-recorder:recording-started");
			ipcRenderer.removeAllListeners("screen-recorder:recording-stopped");
		},
	});
}
