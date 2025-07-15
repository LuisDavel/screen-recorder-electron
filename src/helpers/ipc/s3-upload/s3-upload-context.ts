import {
	S3_UPLOAD_FILE_CHANNEL,
	S3_UPLOAD_TEST_CONNECTION_CHANNEL,
	S3_UPLOAD_PROGRESS_CHANNEL,
	S3_UPLOAD_COMPLETE_CHANNEL,
	S3_UPLOAD_ERROR_CHANNEL,
} from "./s3-upload-channels";

interface S3Config {
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	bucketName: string;
	folderPrefix?: string;
}

interface S3UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

interface S3UploadResult {
	success: boolean;
	message: string;
	s3Url?: string;
	uploadId?: string;
	error?: string;
}

export function exposeS3UploadContext() {
	const { contextBridge, ipcRenderer } = window.require("electron");

	contextBridge.exposeInMainWorld("s3Upload", {
		// Upload de arquivo
		uploadFile: (filePath: string, s3Config: S3Config) =>
			ipcRenderer.invoke(S3_UPLOAD_FILE_CHANNEL, filePath, s3Config),

		// Teste de conexão
		testConnection: (s3Config: S3Config) =>
			ipcRenderer.invoke(S3_UPLOAD_TEST_CONNECTION_CHANNEL, s3Config),

		// Listeners para progresso
		onProgress: (
			callback: (
				event: Electron.IpcRendererEvent,
				progress: S3UploadProgress,
			) => void,
		) => {
			ipcRenderer.on(S3_UPLOAD_PROGRESS_CHANNEL, callback);
		},

		// Listeners para conclusão
		onComplete: (
			callback: (
				event: Electron.IpcRendererEvent,
				result: S3UploadResult,
			) => void,
		) => {
			ipcRenderer.on(S3_UPLOAD_COMPLETE_CHANNEL, callback);
		},

		// Listeners para erro
		onError: (
			callback: (event: Electron.IpcRendererEvent, error: string) => void,
		) => {
			ipcRenderer.on(S3_UPLOAD_ERROR_CHANNEL, callback);
		},

		// Remover listeners
		removeAllListeners: () => {
			ipcRenderer.removeAllListeners(S3_UPLOAD_PROGRESS_CHANNEL);
			ipcRenderer.removeAllListeners(S3_UPLOAD_COMPLETE_CHANNEL);
			ipcRenderer.removeAllListeners(S3_UPLOAD_ERROR_CHANNEL);
		},
	});
}
