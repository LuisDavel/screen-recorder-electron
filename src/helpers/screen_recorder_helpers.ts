// Helpers para o Screen Recorder
import { Buffer } from "buffer";
// Obter fontes de captura disponíveis
export async function getScreenSources(): Promise<ScreenSource[]> {
	return await window.screenRecorder.getSources();
}

// Iniciar gravação
export async function startRecording(
	sourceId: string,
): Promise<{ success: boolean; message: string }> {
	return await window.screenRecorder.startRecording(sourceId);
}

// Parar gravação
export async function stopRecording(): Promise<{
	success: boolean;
	message: string;
}> {
	return await window.screenRecorder.stopRecording();
}

// Salvar gravação
export async function saveRecording(
	videoBuffer: Buffer,
	format?: string,
): Promise<{ success: boolean; message: string; filePath?: string }> {
	return await window.screenRecorder.saveRecording(videoBuffer, format);
}

// Obter status da gravação
export async function getRecordingStatus(): Promise<{
	isRecording: boolean;
	recordedChunks: number;
}> {
	return await window.screenRecorder.getStatus();
}

// Enviar chunk de vídeo
export function sendVideoChunk(chunk: Buffer): void {
	window.screenRecorder.sendVideoChunk(chunk);
}

// Configurar listeners para eventos de gravação
export function setupRecordingListeners(
	onRecordingStarted: (event: any, data: any) => void,
	onRecordingStopped: (event: any) => void,
): void {
	window.screenRecorder.onRecordingStarted(onRecordingStarted);
	window.screenRecorder.onRecordingStopped(onRecordingStopped);
}

// Remover todos os listeners
export function removeAllRecordingListeners(): void {
	window.screenRecorder.removeAllListeners();
}

// Obter locais padrão para salvar vídeos
export async function getDefaultSaveLocations(): Promise<DefaultSaveLocations> {
	return await window.screenRecorder.getDefaultLocations();
}

// Escolher local personalizado para salvar
export async function chooseSaveLocation(): Promise<{
	success: boolean;
	path?: string;
	message: string;
}> {
	return await window.screenRecorder.chooseSaveLocation();
}

// Salvar vídeo em local específico
export async function saveToLocation(
	videoBuffer: Buffer,
	saveLocation: string,
	format?: string,
): Promise<{
	success: boolean;
	message: string;
	filePath?: string;
	fileName?: string;
}> {
	return await window.screenRecorder.saveToLocation(
		videoBuffer,
		saveLocation,
		format,
	);
}

// Classe para gerenciar o MediaRecorder
export class ScreenRecorderManager {
	private mediaRecorder: MediaRecorder | null = null;
	private recordedChunks: Blob[] = [];
	private stream: MediaStream | null = null;

	// Iniciar gravação com uma fonte específica
	async startRecording(sourceId: string, saveLocation?: string): Promise<void> {
		try {
			console.log("Iniciando gravação para fonte:", sourceId);
			console.log("Local de salvamento:", saveLocation);

			// Solicitar a stream da fonte selecionada
			console.log("Solicitando stream...");
			this.stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: sourceId,
					},
				} as any,
			});

			console.log("Stream obtida com sucesso:", this.stream);
			console.log("Tracks da stream:", this.stream.getTracks().length);

			// Verificar se há codecs disponíveis
			const supportedTypes = [
				"video/webm; codecs=vp9",
				"video/webm; codecs=vp8",
				"video/webm",
				"video/mp4",
			];

			let selectedType = "";
			for (const type of supportedTypes) {
				if (MediaRecorder.isTypeSupported(type)) {
					selectedType = type;
					console.log("Usando codec:", type);
					break;
				}
			}

			if (!selectedType) {
				throw new Error("Nenhum codec de vídeo suportado encontrado");
			}

			// Criar MediaRecorder
			this.mediaRecorder = new MediaRecorder(this.stream, {
				mimeType: selectedType,
			});

			console.log("MediaRecorder criado com tipo:", selectedType);

			// Configurar event listeners
			this.mediaRecorder.ondataavailable = (event) => {
				console.log("Dados disponíveis - tamanho:", event.data.size);
				if (event.data.size > 0) {
					this.recordedChunks.push(event.data);
					console.log(
						"Chunk adicionado. Total de chunks:",
						this.recordedChunks.length,
					);
				}
			};

			this.mediaRecorder.onstart = () => {
				console.log("MediaRecorder iniciou com sucesso");
			};

			this.mediaRecorder.onerror = (event) => {
				console.error("Erro no MediaRecorder:", event);
			};

			this.mediaRecorder.onstop = async () => {
				console.log("MediaRecorder parou, salvando vídeo...");
				console.log("Chunks gravados:", this.recordedChunks.length);

				if (this.recordedChunks.length === 0) {
					console.error("Nenhum chunk de vídeo foi gravado!");
					alert("Erro: Nenhum dados de vídeo foram capturados.");
					this.cleanup();
					return;
				}

				try {
					// Converter chunks para buffer e salvar
					const blob = new Blob(this.recordedChunks, { type: "video/webm" });
					console.log("Blob criado, tamanho:", blob.size, "bytes");

					const buffer = await blob.arrayBuffer();
					const uint8Array = new Uint8Array(buffer);

					// Salvar usando o helper
					let result;
					if (saveLocation) {
						console.log("Salvando em local específico:", saveLocation);
						result = await saveToLocation(
							Buffer.from(uint8Array),
							saveLocation,
						);
					} else {
						console.log("Salvando com diálogo de escolha de local");
						result = await saveRecording(Buffer.from(uint8Array));
					}

					console.log("Resultado do salvamento:", result);

					if (result.success) {
						alert(`Vídeo salvo com sucesso! Local: ${result.filePath}`);
					} else {
						alert(`Erro ao salvar vídeo: ${result.message}`);
					}
				} catch (error) {
					console.error("Erro ao salvar vídeo:", error);
					alert(
						"Erro ao salvar o vídeo. Verifique as permissões e tente novamente.",
					);
				}

				// Limpar recursos
				this.cleanup();
			};

			// Configurar para capturar dados a cada segundo
			this.mediaRecorder.start(1000);
			this.recordedChunks = [];

			console.log("MediaRecorder iniciado para fonte:", sourceId);
		} catch (error) {
			console.error("Erro ao iniciar gravação:", error);
			this.cleanup();
			throw error;
		}
	}

	// Parar gravação
	async stopRecording(): Promise<void> {
		console.log("Parando gravação...");
		if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
			console.log("Estado do MediaRecorder:", this.mediaRecorder.state);
			this.mediaRecorder.stop();
			console.log("MediaRecorder.stop() chamado");
		} else {
			console.log("MediaRecorder não está ativo ou é null");
		}
	}

	// Limpar recursos
	private cleanup(): void {
		console.log("Limpando recursos...");
		if (this.stream) {
			console.log("Parando tracks da stream");
			this.stream.getTracks().forEach((track) => {
				track.stop();
				console.log("Track parado:", track.kind);
			});
			this.stream = null;
		}
		this.mediaRecorder = null;
		console.log("Limpeza concluída");
	}

	// Verificar se está gravando
	get isRecording(): boolean {
		return (
			this.mediaRecorder !== null && this.mediaRecorder.state === "recording"
		);
	}
}
