import { usePatientDataStore } from "@/store/store-patient-data";
import { RendererLogger } from "./renderer-logger";

export interface LaudoVideoRequest {
	id: number;
	link: string;
}

export interface LaudoVideoResponse {
	success: boolean;
	message: string;
	error?: string;
}

export class CardiopicApiHelper {
	private static readonly API_ENDPOINT = 'https://www.cardiopic.com.br/cardiopic-report/Api/LaudosVideos.php';

	/**
	 * Envia o link do vídeo para a API do Cardiopic
	 * @param videoLink Link do vídeo no S3
	 * @returns Promise com resultado da requisição
	 */
	public static async sendVideoLink(videoLink: string): Promise<LaudoVideoResponse> {
		try {
			// Obter ID do paciente do store
			const patientId = usePatientDataStore.getState().getPatientId();
			
			if (!patientId) {
				const message = "ID do paciente não encontrado. Não é possível enviar o link do vídeo.";
				RendererLogger.log("WARN", message);
				return {
					success: false,
					message,
				};
			}

			RendererLogger.log("INFO", "Enviando link do vídeo para API Cardiopic", {
				patientId,
				videoLink,
			});

			const requestBody: LaudoVideoRequest = {
				id: patientId,
				link: videoLink,
			};

			const response = await fetch(this.API_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': 'Bearer ' + process.env.CARDIOPIC_API_KEY,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorText = await response.text();
				const errorMessage = `Erro HTTP ${response.status}: ${errorText}`;
				RendererLogger.log("ERROR", errorMessage, {
					status: response.status,
					statusText: response.statusText,
				});
				return {
					success: false,
					message: errorMessage,
					error: errorText,
				};
			}

			const result = await response.json();
			
			RendererLogger.log("INFO", "Link do vídeo enviado com sucesso para API Cardiopic", {
				patientId,
				result,
			});

			return {
				success: true,
				message: "Link do vídeo enviado com sucesso para a API Cardiopic",
			};

		} catch (error) {
			const errorMessage = `Erro ao enviar link do vídeo para API Cardiopic: ${error instanceof Error ? error.message : String(error)}`;
			RendererLogger.log("ERROR", errorMessage, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});

			return {
				success: false,
				message: errorMessage,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Verifica se há dados do paciente disponíveis para envio
	 * @returns true se há dados do paciente
	 */
	public static hasPatientData(): boolean {
		return usePatientDataStore.getState().hasPatientData();
	}

	/**
	 * Obtém o ID do paciente atual
	 * @returns ID do paciente ou null se não houver
	 */
	public static getPatientId(): number | null {
		return usePatientDataStore.getState().getPatientId();
	}
} 