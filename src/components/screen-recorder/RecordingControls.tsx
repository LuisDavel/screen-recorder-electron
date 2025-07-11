import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
	const [includeCameraOverlay, setIncludeCameraOverlay] = useState(false);
	const [includeMicrophone, setIncludeMicrophone] = useState(false);
	const [includeHeader, setIncludeHeader] = useState(false);

	// Debug log para verificar props
	useEffect(() => {
		console.log("🔧 RecordingControls props:", {
			hasOnCountdownChange: !!onCountdownChange,
			onCountdownChangeType: typeof onCountdownChange,
			selectedSourceId: !!selectedSourceId,
			selectedSaveLocation: !!selectedSaveLocation,
		});
	}, [onCountdownChange, selectedSourceId, selectedSaveLocation]);

	// Camera store e notifications
	const { isEnabled: cameraEnabled, mainStream: cameraStream } =
		useCameraConfigStore();
	const { isEnabled: microphoneEnabled, mainStream: microphoneStream } =
		useMicrophoneConfigStore();
	const { headerConfig } = useHeaderConfigStore();
	const { showSuccess, showError, showInfo } = useToastHelpers();

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
		console.log("📊 Mudança na contagem regressiva:", countdown);
		console.log("📊 onCountdownChange disponível:", !!onCountdownChange);

		// Sempre tentar notificar, mesmo se onCountdownChange for undefined
		try {
			if (onCountdownChange && typeof onCountdownChange === "function") {
				console.log("📢 Chamando onCountdownChange com valor:", countdown);
				onCountdownChange(countdown);
				console.log("✅ onCountdownChange chamado com sucesso");
			} else {
				console.log(
					"⚠️ onCountdownChange não é uma função válida:",
					typeof onCountdownChange,
				);
			}
		} catch (error) {
			console.error("❌ Erro ao chamar onCountdownChange:", error);
		}
	}, [countdown, onCountdownChange]);

	// Iniciar contagem regressiva
	const startCountdown = async (): Promise<void> => {
		console.log("🚀 Iniciando contagem regressiva...");
		console.log("🔄 onCountdownChange disponível:", !!onCountdownChange);

		return new Promise((resolve) => {
			let count = 3;
			console.log("Contagem inicial:", count);
			setCountdown(count);

			const interval = setInterval(() => {
				count--;
				console.log("Contagem atual:", count);
				setCountdown(count);

				if (count < 0) {
					console.log("Contagem terminada!");
					setCountdown(null);
					clearInterval(interval);
					resolve();
				}
			}, 1000);
		});
	};

	const handleStartRecording = async () => {
		console.log("🎬 handleStartRecording chamada");

		if (!selectedSourceId) {
			alert("Por favor, selecione uma fonte para gravar");
			return;
		}

		if (!selectedSaveLocation) {
			alert("Por favor, selecione um local para salvar o vídeo");
			return;
		}

		try {
			setIsLoading(true);
			console.log("🎬 Loading ativado, verificando condições...");
			console.log("🎬 Estados atuais:", {
				includeCameraOverlay,
				includeMicrophone,
				includeHeader,
				cameraEnabled,
				microphoneEnabled,
				hasCameraStream: !!cameraStream,
				hasMicrophoneStream: !!microphoneStream,
			});

			// Verificar se câmera está habilitada mas usuário quer incluir overlay
			if (includeCameraOverlay && !cameraEnabled) {
				console.log(
					"❌ Erro: Câmera deve estar habilitada para incluir overlay",
				);
				showError(
					"Câmera deve estar habilitada para incluir overlay na gravação",
				);
				return;
			}

			if (includeCameraOverlay && cameraEnabled && !cameraStream) {
				console.log("❌ Erro: Stream da câmera não disponível");
				showError(
					"Stream da câmera não disponível. Verifique as configurações da câmera",
				);
				return;
			}

			// Verificar se microfone está habilitado mas usuário quer incluir áudio
			if (includeMicrophone && !microphoneEnabled) {
				console.log(
					"❌ Erro: Microfone deve estar habilitado para incluir áudio",
				);
				showError(
					"Microfone deve estar habilitado para incluir áudio na gravação",
				);
				return;
			}

			if (includeMicrophone && microphoneEnabled && !microphoneStream) {
				console.log("❌ Erro: Stream do microfone não disponível");
				showError(
					"Stream do microfone não disponível. Verifique as configurações do microfone",
				);
				return;
			}

			console.log(
				"✅ Todas as validações passaram, iniciando contagem regressiva...",
			);
			// Iniciar contagem regressiva
			await startCountdown();

			// Minimizar janela após contagem
			try {
				await minimizeWindow();
				console.log("Janela minimizada com sucesso");
			} catch (error) {
				console.warn("Erro ao minimizar janela:", error);
			}

			// Aguardar um pouco para garantir que a janela foi minimizada
			await new Promise((resolve) => setTimeout(resolve, 500));

			const options = AdvancedScreenRecorderManager.getRecommendedOptions(
				selectedSourceId.id,
				selectedSaveLocation,
			);

			options.includeCameraOverlay = includeCameraOverlay && cameraEnabled;
			options.includeMicrophone = includeMicrophone && microphoneEnabled;
			options.includeHeader = includeHeader && headerConfig.isEnabled;
			options.headerConfig = headerConfig;

			await recorder.startRecording(options);
			setIsRecording(true);

			let message = "Gravação iniciada";
			if (includeCameraOverlay && cameraEnabled) {
				message += " com câmera";
			}
			if (includeMicrophone && microphoneEnabled) {
				message += " com áudio";
			}
			if (includeHeader && headerConfig.isEnabled) {
				message += " com header informativo";
			}
			showSuccess(message);
		} catch (error) {
			console.error("Erro ao iniciar gravação:", error);
			showError(
				`Erro ao iniciar gravação: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			console.log("🎬 handleStartRecording terminando, setIsLoading(false)");
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
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{isRecording && "Gravando..."}
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
						onClick={isRecording ? handleStopRecording : handleStartRecording}
						disabled={
							isLoading ||
							!selectedSourceId ||
							!selectedSaveLocation ||
							countdown !== null
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
								Iniciar Gravação
							</>
						)}
					</Button>
				</div>
			</div>

			{/* Camera Overlay Option */}
			{!isRecording && (
				<div className="bg-muted/50 flex items-center justify-between rounded-xl p-4 backdrop-blur-sm">
					<div className="flex items-center space-x-3">
						{includeCameraOverlay && cameraEnabled ? (
							<Camera className="h-4 w-4 text-green-600" />
						) : (
							<CameraOff className="h-4 w-4 text-gray-400" />
						)}
						<div className="flex flex-col">
							<Label htmlFor="camera-overlay" className="text-sm font-medium">
								Incluir câmera na gravação
							</Label>
							<span className="text-muted-foreground text-xs">
								{cameraEnabled
									? "Câmera será sobreposta ao vídeo"
									: "Habilite a câmera primeiro"}
							</span>
						</div>
					</div>
					<Switch
						id="camera-overlay"
						checked={includeCameraOverlay}
						onCheckedChange={setIncludeCameraOverlay}
						disabled={!cameraEnabled}
					/>
				</div>
			)}

			{/* Microphone Option */}
			{!isRecording && (
				<div className="bg-muted/50 flex items-center justify-between rounded-xl p-4 backdrop-blur-sm">
					<div className="flex items-center space-x-3">
						{includeMicrophone && microphoneEnabled ? (
							<Mic className="h-4 w-4 text-green-600" />
						) : (
							<MicOff className="h-4 w-4 text-gray-400" />
						)}
						<div className="flex flex-col">
							<Label
								htmlFor="microphone-overlay"
								className="text-sm font-medium"
							>
								Incluir microfone na gravação
							</Label>
							<span className="text-muted-foreground text-xs">
								{microphoneEnabled
									? "Áudio do microfone será incluído no vídeo"
									: "Habilite o microfone primeiro"}
							</span>
						</div>
					</div>
					<Switch
						id="microphone-overlay"
						checked={includeMicrophone}
						onCheckedChange={setIncludeMicrophone}
						disabled={!microphoneEnabled}
					/>
				</div>
			)}

			{/* Header Option */}
			{!isRecording && (
				<div className="bg-muted/50 flex items-center justify-between rounded-xl p-4 backdrop-blur-sm">
					<div className="flex items-center space-x-3">
						<FileText
							className={`h-4 w-4 ${includeHeader && headerConfig.isEnabled ? "text-blue-600" : "text-gray-400"}`}
						/>
						<div className="flex flex-col">
							<Label htmlFor="header-overlay" className="text-sm font-medium">
								Incluir header informativo
							</Label>
							<span className="text-muted-foreground text-xs">
								{headerConfig.isEnabled
									? "Header será adicionado na parte superior do vídeo"
									: "Configure o header nas configurações"}
							</span>
						</div>
					</div>
					<Switch
						id="header-overlay"
						checked={includeHeader}
						onCheckedChange={setIncludeHeader}
						disabled={!headerConfig.isEnabled}
					/>
				</div>
			)}

			{(!selectedSourceId || !selectedSaveLocation) && (
				<div className="rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-orange-900/20">
					<div className="space-y-2">
						{!selectedSourceId && (
							<p className="text-sm text-orange-800 dark:text-orange-200">
								⚠️ Selecione uma fonte de captura antes de iniciar a gravação.
							</p>
						)}
						{!selectedSaveLocation && (
							<p className="text-sm text-orange-800 dark:text-orange-200">
								⚠️ Selecione um local para salvar o vídeo antes de iniciar a
								gravação.
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
