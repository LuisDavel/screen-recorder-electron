import { useS3ConfigStore } from "@/store/store-s3-config";
import { RendererLogger } from "./renderer-logger";

export interface S3UploadResult {
	success: boolean;
	message: string;
	s3Url?: string;
	uploadId?: string;
	error?: string;
}

export interface S3UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

export class S3UploadHelper {
	/**
	 * Faz upload de um arquivo para S3 via IPC
	 * @param filePath Caminho local do arquivo
	 * @param onProgress Callback para progresso do upload
	 * @returns Promise com resultado do upload
	 */
	public async uploadFile(
		filePath: string,
		onProgress?: (progress: S3UploadProgress) => void,
	): Promise<S3UploadResult> {
		try {
			// Obter configuração atual
			const config = useS3ConfigStore.getState().config;

			RendererLogger.log("INFO", "Iniciando verificação de configuração S3", {
				isEnabled: config.isEnabled,
				isConfigured: config.isConfigured,
				bucketName: config.bucketName,
				region: config.region,
			});

			if (!config.isEnabled) {
				const message = "Upload S3 não está habilitado";
				RendererLogger.log("WARN", message);
				return {
					success: false,
					message,
				};
			}

			if (!config.isConfigured) {
				const message = "Configuração S3 não está válida";
				RendererLogger.log("ERROR", message, { config });
				return {
					success: false,
					message,
				};
			}

			RendererLogger.log("INFO", "Iniciando upload para S3", { filePath });

			// Verificar se o window.s3Upload está disponível
			if (typeof window === "undefined" || !window.s3Upload) {
				const message = "Interface S3 não está disponível";
				RendererLogger.log("ERROR", message);
				return {
					success: false,
					message,
				};
			}

			RendererLogger.log(
				"INFO",
				"Interface S3 está disponível, configurando listeners",
			);

			// Configurar listeners para feedback visual
			let progressListener: (
				event: Electron.IpcRendererEvent,
				progress: S3UploadProgress,
			) => void;
			let completeListener: (
				event: Electron.IpcRendererEvent,
				result: S3UploadResult,
			) => void;
			let errorListener: (
				event: Electron.IpcRendererEvent,
				error: string,
			) => void;

			// Criar promise para aguardar eventos
			const uploadPromise = new Promise<S3UploadResult>((resolve, reject) => {
				// Listener para progresso
				progressListener = (event, progress) => {
					RendererLogger.log("INFO", "Progresso upload S3", {
						percentage: progress.percentage,
						loaded: progress.loaded,
						total: progress.total,
					});
					if (onProgress) {
						onProgress(progress);
					}
				};

				// Listener para conclusão
				completeListener = (event, result) => {
					RendererLogger.log("INFO", "Upload S3 concluído", {
						success: result.success,
						s3Url: result.s3Url,
						uploadId: result.uploadId,
					});
					resolve(result);
				};

				// Listener para erro
				errorListener = (event, error) => {
					RendererLogger.log("ERROR", "Erro no upload S3", { error });
					reject(new Error(error));
				};

				// Registrar listeners
				window.s3Upload.onProgress(progressListener);
				window.s3Upload.onComplete(completeListener);
				window.s3Upload.onError(errorListener);
			});

			// Iniciar upload
			RendererLogger.log("INFO", "Enviando arquivo para upload S3", {
				filePath,
			});
			const uploadResult = window.s3Upload.uploadFile(filePath, config);

			// Aguardar conclusão ou erro
			try {
				const result = await Promise.race([uploadResult, uploadPromise]);

				RendererLogger.log("INFO", "Upload S3 finalizado", {
					success: result.success,
					message: result.message,
					s3Url: result.s3Url,
				});

				return result;
			} catch (error) {
				RendererLogger.log("ERROR", "Erro durante upload S3", { error });
				return {
					success: false,
					message: `Erro no upload: ${error instanceof Error ? error.message : String(error)}`,
					error: error instanceof Error ? error.message : String(error),
				};
			} finally {
				// Limpar listeners
				if (typeof window !== "undefined" && window.s3Upload) {
					window.s3Upload.removeAllListeners();
				}
			}
		} catch (error) {
			RendererLogger.log("ERROR", "Erro inesperado no upload S3", { error });
			return {
				success: false,
				message: `Erro no upload: ${error instanceof Error ? error.message : String(error)}`,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Testa a conexão com S3
	 */
	public async testConnection(): Promise<S3UploadResult> {
		try {
			const config = useS3ConfigStore.getState().config;

			RendererLogger.log("INFO", "Testando conexão S3", {
				bucketName: config.bucketName,
				region: config.region,
			});

			if (!config.isConfigured) {
				const message = "Configuração S3 não está válida";
				RendererLogger.log("ERROR", message);
				return {
					success: false,
					message,
				};
			}

			if (typeof window === "undefined" || !window.s3Upload) {
				const message = "Interface S3 não está disponível";
				RendererLogger.log("ERROR", message);
				return {
					success: false,
					message,
				};
			}

			const result = await window.s3Upload.testConnection(config);

			RendererLogger.log("INFO", "Resultado do teste de conexão S3", {
				success: result.success,
				message: result.message,
			});

			return result;
		} catch (error) {
			RendererLogger.log("ERROR", "Erro ao testar conexão S3", { error });
			return {
				success: false,
				message: `Erro no teste: ${error instanceof Error ? error.message : String(error)}`,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}

// Instância singleton
export const s3UploadHelper = new S3UploadHelper();

/**
 * Função auxiliar para upload de arquivo
 */
export async function uploadToS3(
	filePath: string,
	onProgress?: (progress: S3UploadProgress) => void,
): Promise<S3UploadResult> {
	return s3UploadHelper.uploadFile(filePath, onProgress);
}

/**
 * Função auxiliar para testar conexão S3
 */
export async function testS3Connection(): Promise<S3UploadResult> {
	return s3UploadHelper.testConnection();
}
