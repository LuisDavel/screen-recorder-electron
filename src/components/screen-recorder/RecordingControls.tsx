import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AdvancedScreenRecorderManager } from "@/helpers/advanced-screen-recorder";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { useToastHelpers } from "@/components/Toast";
import { minimizeWindow } from "@/helpers/window_helpers";
import {
	Play,
	Square,
	Loader2,
	Camera,
	CameraOff,
	FileText,
	Mic,
	MicOff,
	Video,
} from "lucide-react";

interface RecordingControlsProps {
	selectedSourceId: { id: string; name: string; thumbnail: string } | null;
	onRecordingStateChange: (isRecording: boolean) => void;
	selectedSaveLocation: string | null;
	onCountdownChange?: (countdown: number | null) => void;
}

export function RecordingControls({
	selectedSourceId,
	onRecordingStateChange,
	selectedSaveLocation,
	onCountdownChange,
}: RecordingControlsProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);
	const [countdown, setCountdown] = useState<number | null>(null);
	const [recorder] = useState(() => new AdvancedScreenRecorderManager());

	// Usar diretamente os stores sem duplicação
	const { isEnabled: cameraEnabled, mainStream: cameraStream } =
		useCameraConfigStore();
	const { isEnabled: microphoneEnabled, mainStream: microphoneStream } =
		useMicrophoneConfigStore();
	const { headerConfig, footerConfig } = useHeaderConfigStore();
	const { showSuccess, showError, showInfo } = useToastHelpers();

	// Verificar se é modo câmera apenas
	const isCameraOnlyMode = selectedSourceId?.id === "camera-only";

	// Timer para mostrar o tempo de gravação
	useEffect(() => {
		let interval: NodeJS.Timeout;

		if (isRecording) {
			interval = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);
		} else {
			setRecordingTime(0);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isRecording]);

	// Notificar mudanças no estado de gravação
	useEffect(() => {
		onRecordingStateChange(isRecording);
	}, [isRecording, onRecordingStateChange]);

	// Notificar mudanças na contagem regressiva
	useEffect(() => {
		if (onCountdownChange && typeof onCountdownChange === "function") {
			onCountdownChange(countdown);
		}
	}, [countdown, onCountdownChange]);

	// Iniciar contagem regressiva
	const startCountdown = async (): Promise<void> => {
		return new Promise((resolve) => {
			let count = 3;
			setCountdown(count);

			const interval = setInterval(() => {
				count--;
				setCountdown(count);

				if (count < 0) {
					setCountdown(null);
					clearInterval(interval);
					resolve();
				}
			}, 1000);
		});
	};

	const handleStartRecording = async () => {
		if (!selectedSourceId) {
			alert("Por favor, selecione uma fonte para gravar");
			return;
		}

		if (!selectedSaveLocation) {
			alert("Por favor, selecione um local para salvar o vídeo");
			return;
		}

		// Verificações específicas para modo câmera apenas
		if (isCameraOnlyMode) {
			if (!cameraEnabled) {
				showError(
					"Para usar modo 'Apenas Câmera', ative a câmera nas configurações",
				);
				return;
			}
			if (!cameraStream) {
				showError(
					"Stream da câmera não disponível. Verifique as configurações da câmera",
				);
				return;
			}
		}

		try {
			setIsLoading(true);

			// Verificar se câmera está habilitada e tem stream (apenas se não for modo câmera apenas)
			if (!isCameraOnlyMode && cameraEnabled && !cameraStream) {
				showError(
					"Stream da câmera não disponível. Verifique as configurações da câmera",
				);
				return;
			}

			// Verificar se microfone está habilitado e tem stream
			if (microphoneEnabled && !microphoneStream) {
				showError(
					"Stream do microfone não disponível. Verifique as configurações do microfone",
				);
				return;
			}

			// Iniciar contagem regressiva
			await startCountdown();

			// Não minimizar janela no modo câmera apenas
			if (!isCameraOnlyMode) {
				try {
					await minimizeWindow();
				} catch (error) {
					console.warn("Erro ao minimizar janela:", error);
				}
				// Aguardar um pouco para garantir que a janela foi minimizada
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			const options = AdvancedScreenRecorderManager.getRecommendedOptions(
				selectedSourceId.id,
				selectedSaveLocation,
			);

			// Configurar opções baseadas no modo
			if (isCameraOnlyMode) {
				// Para modo câmera apenas, não incluir overlay da câmera (pois a câmera É o vídeo principal)
				options.includeCameraOverlay = false;
				options.cameraOnly = true; // Nova opção para indicar modo câmera apenas
			} else {
				// Para modo normal, usar diretamente os estados dos stores
				options.includeCameraOverlay = cameraEnabled;
				options.cameraOnly = false;
			}

			options.includeMicrophone = microphoneEnabled;
			options.includeHeader = headerConfig.isEnabled;
			options.headerConfig = headerConfig;
			options.includeFooter = footerConfig.isEnabled;
			options.footerConfig = footerConfig;

			await recorder.startRecording(options);
			setIsRecording(true);

			let message = isCameraOnlyMode
				? "Gravação da câmera iniciada"
				: "Gravação da tela iniciada";

			if (!isCameraOnlyMode && cameraEnabled) {
				message += " com câmera";
			}
			if (microphoneEnabled) {
				message += " com áudio";
			}
			if (headerConfig.isEnabled) {
				message += " com header informativo";
			}
			if (footerConfig.isEnabled) {
				message += " com footer";
			}
			showSuccess(message);
		} catch (error) {
			console.error("Erro ao iniciar gravação:", error);
			showError(
				`Erro ao iniciar gravação: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleStopRecording = async () => {
		try {
			setIsLoading(true);
			await recorder.stopRecording();
			setIsRecording(false);
			showInfo("Gravação finalizada e salva com sucesso");
		} catch (error) {
			console.error("Erro ao parar gravação:", error);
			showError(
				`Erro ao parar gravação: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<>
			{countdown ? (
				<p className="text-lg font-bold text-center">
					Contagem regressiva:{" "}
					<span className="text-primary text-7xl">{countdown}</span>
				</p>
			) : (
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground text-sm">
							{isRecording &&
								(isCameraOnlyMode ? "Gravando câmera..." : "Gravando tela...")}
						</p>

						{isRecording && (
							<div className="flex items-center space-x-2">
								<div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
								<span className="font-mono text-lg font-bold">
									{formatTime(recordingTime)}
								</span>
							</div>
						)}
					</div>

					{/* Botão de gravação */}
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Button
								variant={isRecording ? "destructive" : "default"}
								size="lg"
								onClick={
									isRecording ? handleStopRecording : handleStartRecording
								}
								disabled={
									isLoading ||
									!selectedSourceId ||
									!selectedSaveLocation ||
									countdown !== null ||
									(isCameraOnlyMode && !cameraEnabled)
								}
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{isRecording ? "Parando..." : "Iniciando..."}
									</>
								) : isRecording ? (
									<>
										<Square className="mr-2 h-4 w-4" />
										Parar Gravação
									</>
								) : (
									<>
										<Play className="mr-2 h-4 w-4" />
										{isCameraOnlyMode ? "Gravar Câmera" : "Iniciar Gravação"}
									</>
								)}
							</Button>
						</div>
					</div>

					{/* Resumo das configurações que serão incluídas na gravação */}
					{!isRecording && (
						<div className="bg-muted/50 rounded-xl p-4 backdrop-blur-sm">
							<div className="flex items-center space-x-2 mb-3">
								{isCameraOnlyMode ? (
									<Video className="h-4 w-4 text-blue-600" />
								) : (
									<FileText className="h-4 w-4 text-blue-600" />
								)}
								<Label className="text-sm font-medium">
									{isCameraOnlyMode
										? "Modo Câmera Apenas"
										: "Configurações da Gravação"}
								</Label>
							</div>

							{isCameraOnlyMode ? (
								<div className="space-y-2 text-xs">
									<div className="flex items-center space-x-2">
										<Camera className="h-3 w-3 text-blue-600" />
										<span className="text-blue-600">
											Gravando apenas a câmera em tela cheia
										</span>
									</div>
									<div className="flex items-center space-x-2">
										{microphoneEnabled && microphoneStream ? (
											<Mic className="h-3 w-3 text-green-600" />
										) : (
											<MicOff className="h-3 w-3 text-gray-400" />
										)}
										<span
											className={
												microphoneEnabled ? "text-green-600" : "text-gray-400"
											}
										>
											{microphoneEnabled
												? "Microfone incluído"
												: "Microfone desabilitado"}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<FileText
											className={`h-3 w-3 ${headerConfig.isEnabled ? "text-blue-600" : "text-gray-400"}`}
										/>
										<span
											className={
												headerConfig.isEnabled
													? "text-blue-600"
													: "text-gray-400"
											}
										>
											{headerConfig.isEnabled
												? "Header incluído"
												: "Header desabilitado"}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<Square
											className={`h-3 w-3 ${footerConfig.isEnabled ? "text-blue-600" : "text-gray-400"}`}
										/>
										<span
											className={
												footerConfig.isEnabled
													? "text-blue-600"
													: "text-gray-400"
											}
										>
											{footerConfig.isEnabled
												? "Footer incluído"
												: "Footer desabilitado"}
										</span>
									</div>
								</div>
							) : (
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="flex items-center space-x-2">
										{cameraEnabled && cameraStream ? (
											<Camera className="h-3 w-3 text-green-600" />
										) : (
											<CameraOff className="h-3 w-3 text-gray-400" />
										)}
										<span
											className={
												cameraEnabled ? "text-green-600" : "text-gray-400"
											}
										>
											{cameraEnabled
												? "Câmera incluída"
												: "Câmera desabilitada"}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										{microphoneEnabled && microphoneStream ? (
											<Mic className="h-3 w-3 text-green-600" />
										) : (
											<MicOff className="h-3 w-3 text-gray-400" />
										)}
										<span
											className={
												microphoneEnabled ? "text-green-600" : "text-gray-400"
											}
										>
											{microphoneEnabled
												? "Microfone incluído"
												: "Microfone desabilitado"}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<FileText
											className={`h-3 w-3 ${headerConfig.isEnabled ? "text-blue-600" : "text-gray-400"}`}
										/>
										<span
											className={
												headerConfig.isEnabled
													? "text-blue-600"
													: "text-gray-400"
											}
										>
											{headerConfig.isEnabled
												? "Header incluído"
												: "Header desabilitado"}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<Square
											className={`h-3 w-3 ${footerConfig.isEnabled ? "text-blue-600" : "text-gray-400"}`}
										/>
										<span
											className={
												footerConfig.isEnabled
													? "text-blue-600"
													: "text-gray-400"
											}
										>
											{footerConfig.isEnabled
												? "Footer incluído"
												: "Footer desabilitado"}
										</span>
									</div>
								</div>
							)}

							<div className="mt-3 text-xs text-muted-foreground">
								{isCameraOnlyMode
									? "Sua câmera será gravada em tela cheia"
									: "Use as configurações à direita para ativar/desativar os recursos"}
							</div>
						</div>
					)}
				</div>
			)}
		</>
	);
}
