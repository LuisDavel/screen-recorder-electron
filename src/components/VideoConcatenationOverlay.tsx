import React, { useState, useEffect } from "react";
import { Loader2, Video, CheckCircle, AlertCircle, X } from "lucide-react";

interface VideoConcatenationOverlayProps {
	isVisible: boolean;
	onClose: () => void;
	recordedVideoPath?: string;
}

interface ConcatenationState {
	isProcessing: boolean;
	progress: string;
	result: {
		success: boolean;
		message: string;
		outputPath?: string;
	} | null;
}

// Tipos para a API
interface VideoConcatAPI {
	autoConcatenate: (options: {
		recordedVideoPath: string;
		outputPath?: string;
	}) => Promise<{
		success: boolean;
		outputPath: string;
		message: string;
		fileSize?: number;
	}>;
	autoConcatenateAlt: (options: {
		recordedVideoPath: string;
		outputPath?: string;
	}) => Promise<{
		success: boolean;
		outputPath: string;
		message: string;
		fileSize?: number;
	}>;
	autoConcatenateRobust: (options: {
		recordedVideoPath: string;
		outputPath?: string;
	}) => Promise<{
		success: boolean;
		outputPath: string;
		message: string;
		fileSize?: number;
	}>;
	onProgress: (callback: (progress: string) => void) => void;
	removeProgressListener: () => void;
}

declare global {
	interface Window {
		videoConcatAPI?: VideoConcatAPI;
	}
}

export function VideoConcatenationOverlay({
	isVisible,
	onClose,
	recordedVideoPath,
}: VideoConcatenationOverlayProps) {
	const [state, setState] = useState<ConcatenationState>({
		isProcessing: false,
		progress: "",
		result: null,
	});

	console.log("🎬 VideoConcatenationOverlay render:", {
		isVisible,
		recordedVideoPath,
	});

	useEffect(() => {
		console.log("🎬 VideoConcatenationOverlay useEffect:", {
			isVisible,
			recordedVideoPath,
			hasAPI: !!window.videoConcatAPI,
		});

		if (isVisible && recordedVideoPath && window.videoConcatAPI) {
			console.log("🎬 Iniciando concatenação...");
			startConcatenation();
		} else {
			console.log("🎬 Não iniciando concatenação:", {
				isVisible,
				hasRecordedVideoPath: !!recordedVideoPath,
				hasAPI: !!window.videoConcatAPI,
			});
		}

		// Configurar listener de progresso
		if (window.videoConcatAPI) {
			window.videoConcatAPI.onProgress((progress: string) => {
				setState((prev) => ({ ...prev, progress }));
			});
		}

		// Cleanup
		return () => {
			if (window.videoConcatAPI) {
				window.videoConcatAPI.removeProgressListener();
			}
		};
	}, [isVisible, recordedVideoPath]);

	const startConcatenation = async () => {
		if (!recordedVideoPath || !window.videoConcatAPI) return;

		setState((prev) => ({
			...prev,
			isProcessing: true,
			progress: "Iniciando concatenação...",
			result: null,
		}));

		try {
			console.log(
				"🎯 Usando APENAS método robusto para evitar arquivos duplicados",
			);
			let result;

			// USAR APENAS O MÉTODO ROBUSTO (que está funcionando)
			result = await window.videoConcatAPI.autoConcatenateRobust({
				recordedVideoPath,
			});
			console.log("🎯 RESULTADO ÚNICO RECEBIDO no overlay:", result);

			setState((prev) => ({
				...prev,
				isProcessing: false,
				result: {
					success: result.success,
					message: result.message,
					outputPath: result.outputPath,
				},
			}));
		} catch (error) {
			console.error("❌ Ambos os métodos falharam:", error);
			setState((prev) => ({
				...prev,
				isProcessing: false,
				result: {
					success: false,
					message: `Erro na concatenação: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
				},
			}));
		}
	};

	const handleClose = () => {
		setState({
			isProcessing: false,
			progress: "",
			result: null,
		});
		onClose();
	};

	if (!isVisible) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
			<div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Video className="h-5 w-5" />
						<h3 className="font-semibold">Concatenação de Vídeo</h3>
					</div>
					{!state.isProcessing && (
						<button
							onClick={handleClose}
							className="text-white hover:text-gray-200 transition-colors"
						>
							<X className="h-5 w-5" />
						</button>
					)}
				</div>

				{/* Content */}
				<div className="p-6">
					{state.isProcessing ? (
						// Loading State
						<div className="text-center">
							<div className="flex justify-center mb-4">
								<Loader2 className="h-12 w-12 animate-spin text-blue-500" />
							</div>
							<h4 className="text-lg font-medium text-gray-900 mb-2">
								Processando Vídeo
							</h4>
							<p className="text-gray-600 mb-4">
								Combinando seu vídeo com o vídeo introdutório...
							</p>

							{/* Progress */}
							{state.progress && (
								<div className="bg-gray-100 rounded-lg p-3 mb-4">
									<div className="text-xs text-gray-600 font-mono max-h-20 overflow-y-auto">
										{state.progress.split("\n").slice(-3).join("\n")}
									</div>
								</div>
							)}

							<div className="text-sm text-gray-500">
								Este processo pode levar alguns minutos...
							</div>
						</div>
					) : state.result ? (
						// Result State
						<div className="text-center">
							<div className="flex justify-center mb-4">
								{state.result.success ? (
									<CheckCircle className="h-12 w-12 text-green-500" />
								) : (
									<AlertCircle className="h-12 w-12 text-red-500" />
								)}
							</div>

							<h4
								className={`text-lg font-medium mb-2 ${
									state.result.success ? "text-green-900" : "text-red-900"
								}`}
							>
								{state.result.success ? "Sucesso!" : "Erro"}
							</h4>

							<p
								className={`mb-4 ${
									state.result.success ? "text-green-700" : "text-red-700"
								}`}
							>
								{state.result.message}
							</p>

							{state.result.success && state.result.outputPath && (
								<div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
									<p className="text-sm text-green-800">
										<strong>Arquivo salvo em:</strong>
									</p>
									<p className="text-xs text-green-600 font-mono break-all">
										{state.result.outputPath}
									</p>
								</div>
							)}

							<button
								onClick={handleClose}
								className={`px-6 py-2 rounded-lg font-medium transition-colors ${
									state.result.success
										? "bg-green-500 hover:bg-green-600 text-white"
										: "bg-red-500 hover:bg-red-600 text-white"
								}`}
							>
								Fechar
							</button>
						</div>
					) : (
						// Initial State
						<div className="text-center">
							<div className="flex justify-center mb-4">
								<Video className="h-12 w-12 text-gray-400" />
							</div>
							<h4 className="text-lg font-medium text-gray-900 mb-2">
								Preparando Concatenação
							</h4>
							<p className="text-gray-600">
								Aguarde enquanto preparamos a concatenação do seu vídeo...
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
