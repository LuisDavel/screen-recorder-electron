import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Monitor,
	Camera,
	Mic,
	Minimize2,
	Maximize2,
	Square,
	Clock,
	AlertCircle,
	Eye,
	EyeOff,
} from "lucide-react";
import { useRecordingMonitorStore } from "@/helpers/recording-monitor";
import { cn } from "@/utils/tailwind";

interface BackgroundRecordingStatusProps {
	onRestoreWindow?: () => void;
	onStopRecording?: () => void;
	className?: string;
}

export function BackgroundRecordingStatus({
	onRestoreWindow,
	onStopRecording,
	className = "",
}: BackgroundRecordingStatusProps) {
	const { isAnyRecordingActive, backgroundMode, sessions, windowVisible } =
		useRecordingMonitorStore();

	const [isMinimized, setIsMinimized] = useState(false);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [showFullStatus, setShowFullStatus] = useState(true);

	// Calculate recording duration
	useEffect(() => {
		if (!isAnyRecordingActive) {
			setRecordingDuration(0);
			return;
		}

		const activeSession = sessions.find((s) => s.isActive);
		if (!activeSession) return;

		const interval = setInterval(() => {
			const elapsed = Date.now() - activeSession.startTime.getTime();
			setRecordingDuration(Math.floor(elapsed / 1000));
		}, 1000);

		return () => clearInterval(interval);
	}, [isAnyRecordingActive, sessions]);

	// Don't show if not recording or window is visible
	if (!isAnyRecordingActive || (!backgroundMode && windowVisible)) {
		return null;
	}

	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	};

	const hasCamera = sessions.some((s) => s.isActive && s.hasCamera);
	const hasMicrophone = sessions.some((s) => s.isActive && s.hasMicrophone);
	const recordingCount = sessions.filter((s) => s.isActive).length;

	const handleToggleMinimize = () => {
		setIsMinimized(!isMinimized);
	};

	const handleRestoreWindow = () => {
		if (onRestoreWindow) {
			onRestoreWindow();
		} else {
			// Fallback: try to focus the window
			if (typeof window !== "undefined") {
				window.focus();
			}
		}
	};

	const handleStopRecording = () => {
		if (onStopRecording) {
			onStopRecording();
		}
	};

	const handleToggleVisibility = () => {
		setShowFullStatus(!showFullStatus);
	};

	if (isMinimized) {
		return (
			<div
				className={cn(
					"fixed top-4 right-4 z-50 transition-all duration-300",
					className,
				)}
			>
				<Button
					onClick={handleToggleMinimize}
					size="sm"
					variant="secondary"
					className="bg-red-600 text-white shadow-lg hover:bg-red-700"
				>
					<div className="flex items-center space-x-2">
						<div className="h-2 w-2 animate-pulse rounded-full bg-white" />
						<span className="font-mono text-sm">
							{formatDuration(recordingDuration)}
						</span>
						<Maximize2 className="h-3 w-3" />
					</div>
				</Button>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"fixed top-4 right-4 z-50 max-w-sm transition-all duration-300",
				className,
			)}
		>
			<Card className="border-red-200 bg-red-50 shadow-xl">
				<CardContent className="p-4">
					<div className="space-y-3">
						{/* Header */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
								<span className="font-semibold text-red-800">
									Gravação em Background
								</span>
							</div>
							<div className="flex items-center space-x-1">
								<Button
									onClick={handleToggleVisibility}
									size="sm"
									variant="ghost"
									className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
								>
									{showFullStatus ? (
										<EyeOff className="h-3 w-3" />
									) : (
										<Eye className="h-3 w-3" />
									)}
								</Button>
								<Button
									onClick={handleToggleMinimize}
									size="sm"
									variant="ghost"
									className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
								>
									<Minimize2 className="h-3 w-3" />
								</Button>
							</div>
						</div>

						{showFullStatus && (
							<>
								{/* Recording Info */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											<Clock className="h-4 w-4 text-red-600" />
											<span className="text-sm text-red-700">Duração:</span>
										</div>
										<span className="font-mono text-sm font-semibold text-red-800">
											{formatDuration(recordingDuration)}
										</span>
									</div>

									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											<Monitor className="h-4 w-4 text-red-600" />
											<span className="text-sm text-red-700">Tela:</span>
										</div>
										<span className="text-sm text-red-800">Capturando</span>
									</div>

									{hasCamera && (
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-2">
												<Camera className="h-4 w-4 text-red-600" />
												<span className="text-sm text-red-700">Câmera:</span>
											</div>
											<span className="text-sm text-red-800">Incluída</span>
										</div>
									)}

									{hasMicrophone && (
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-2">
												<Mic className="h-4 w-4 text-red-600" />
												<span className="text-sm text-red-700">Microfone:</span>
											</div>
											<span className="text-sm text-red-800">Incluído</span>
										</div>
									)}

									{recordingCount > 1 && (
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-2">
												<AlertCircle className="h-4 w-4 text-red-600" />
												<span className="text-sm text-red-700">Sessões:</span>
											</div>
											<span className="text-sm text-red-800">
												{recordingCount} ativas
											</span>
										</div>
									)}
								</div>

								{/* Warning Message */}
								<div className="rounded-md border border-red-200 bg-red-100 p-3">
									<div className="flex items-start space-x-2">
										<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
										<div className="text-xs text-red-700">
											<p className="mb-1 font-medium">
												Gravação Ativa em Background
											</p>
											<p>
												A gravação continua mesmo com a janela minimizada. Evite
												fechar o aplicativo ou desligar o computador.
											</p>
										</div>
									</div>
								</div>

								{/* Action Buttons */}
								<div className="flex space-x-2">
									<Button
										onClick={handleRestoreWindow}
										size="sm"
										variant="outline"
										className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
									>
										<Maximize2 className="mr-1 h-3 w-3" />
										Restaurar
									</Button>
									<Button
										onClick={handleStopRecording}
										size="sm"
										variant="destructive"
										className="flex-1"
									>
										<Square className="mr-1 h-3 w-3" />
										Parar
									</Button>
								</div>

								{/* Performance Hint */}
								<div className="text-center text-xs text-red-600">
									💡 Dica: Mantenha o computador ligado durante a gravação
								</div>
							</>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Hook para usar o componente facilmente
export function useBackgroundRecordingStatus() {
	const { isAnyRecordingActive, backgroundMode } = useRecordingMonitorStore();

	return {
		shouldShow: isAnyRecordingActive && backgroundMode,
		isRecording: isAnyRecordingActive,
		isBackground: backgroundMode,
	};
}

// Componente wrapper para uso automático
export function BackgroundRecordingStatusWrapper() {
	const { shouldShow } = useBackgroundRecordingStatus();

	const handleRestoreWindow = () => {
		// Try multiple methods to restore window
		if (typeof window !== "undefined") {
			// Focus the window
			window.focus();

			// Try to bring to front
			if (
				(window as unknown as { electronAPI?: { restoreWindow?: () => void } })
					.electronAPI?.restoreWindow
			) {
				(
					window as unknown as { electronAPI: { restoreWindow: () => void } }
				).electronAPI.restoreWindow();
			}

			// Remove minimized class if present
			document.body.classList.remove("window-minimized");
		}
	};

	const handleStopAllRecordings = () => {
		// This would need to be connected to your recording manager
		// You can emit an event or call a global function
		const event = new CustomEvent("stop-all-recordings");
		window.dispatchEvent(event);
	};

	if (!shouldShow) {
		return null;
	}

	return (
		<BackgroundRecordingStatus
			onRestoreWindow={handleRestoreWindow}
			onStopRecording={handleStopAllRecordings}
		/>
	);
}
