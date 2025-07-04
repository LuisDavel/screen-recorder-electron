import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScreenRecorderManager } from "@/helpers/screen_recorder_helpers";
import { Play, Square, Loader2 } from "lucide-react";

interface RecordingControlsProps {
	selectedSourceId: string | null;
	onRecordingStateChange: (isRecording: boolean) => void;
	selectedSaveLocation: string | null;
}

export default function RecordingControls({
	selectedSourceId,
	onRecordingStateChange,
	selectedSaveLocation,
}: RecordingControlsProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);
	const [recorder] = useState(() => new ScreenRecorderManager());

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

	const handleStartRecording = async () => {
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
			await recorder.startRecording(selectedSourceId, selectedSaveLocation);
			setIsRecording(true);
		} catch (error) {
			console.error("Erro ao iniciar gravação:", error);
			alert("Erro ao iniciar gravação. Verifique as permissões.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleStopRecording = async () => {
		try {
			setIsLoading(true);
			await recorder.stopRecording();
			setIsRecording(false);
		} catch (error) {
			console.error("Erro ao parar gravação:", error);
			alert("Erro ao parar gravação.");
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
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h3 className="text-lg font-semibold">Controles de Gravação</h3>
					<p className="text-sm text-muted-foreground">
						{isRecording ? "Gravando..." : "Pronto para gravar"}
					</p>
				</div>

				{isRecording && (
					<div className="flex items-center space-x-2">
						<div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
						<span className="font-mono text-lg font-bold">
							{formatTime(recordingTime)}
						</span>
					</div>
				)}
			</div>

			<div className="flex space-x-4">
				{!isRecording ? (
					<Button
						onClick={handleStartRecording}
						disabled={!selectedSourceId || !selectedSaveLocation || isLoading}
						className="flex-1"
						size="lg"
					>
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Play className="mr-2 h-4 w-4" />
						)}
						{isLoading ? "Iniciando..." : "Iniciar Gravação"}
					</Button>
				) : (
					<Button
						onClick={handleStopRecording}
						disabled={isLoading}
						variant="destructive"
						className="flex-1"
						size="lg"
					>
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Square className="mr-2 h-4 w-4" />
						)}
						{isLoading ? "Parando..." : "Parar Gravação"}
					</Button>
				)}
			</div>

			{(!selectedSourceId || !selectedSaveLocation) && (
				<div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
					<div className="space-y-1">
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
