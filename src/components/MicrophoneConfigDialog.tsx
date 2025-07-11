import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	useMicrophoneConfigStore,
	type MicrophoneGain,
} from "@/store/store-microphone-config";
import { Mic, Volume2 } from "lucide-react";
import { useDeviceInitialization } from "@/hooks/useDeviceInitialization";

interface MicrophoneConfigDialogProps {
	trigger?: React.ReactNode;
}

export function MicrophoneConfigDialog({
	trigger,
}: MicrophoneConfigDialogProps) {
	const {
		isEnabled,
		selectedDeviceId,
		devices,
		gain,
		noiseReduction,
		echoCancellation,
		autoGainControl,
		previewStream,
		setEnabled,
		setSelectedDeviceId,
		setDevices,
		setGain,
		setNoiseReduction,
		setEchoCancellation,
		setAutoGainControl,
		setIsPreviewActive,
		initializePreviewStream,
		stopPreviewStream,
	} = useMicrophoneConfigStore();

	const [isOpen, setIsOpen] = useState(false);
	const [audioLevel, setAudioLevel] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	// Use the new centralized device initialization hook
	const { initializeMicrophone } = useDeviceInitialization({
		devices: ["microphone"],
		autoInitialize: false, // Manual initialization for dialog
	});

	const loadMicrophoneDevices = useCallback(async () => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const audioDevices = devices
				.filter((device) => device.kind === "audioinput")
				.map((device) => ({
					deviceId: device.deviceId,
					label: device.label || `Microfone ${device.deviceId.slice(0, 8)}...`,
				}));

			setDevices(audioDevices);

			// Set default device if none selected
			if (!selectedDeviceId && audioDevices.length > 0) {
				setSelectedDeviceId(audioDevices[0].deviceId);
			}
		} catch (err: unknown) {
			setError(
				"Erro ao carregar dispositivos de microfone: " +
					(err instanceof Error ? err.message : String(err)),
			);
		}
	}, [selectedDeviceId, setDevices, setSelectedDeviceId]);

	// Load devices when dialog opens
	useEffect(() => {
		if (isOpen) {
			loadMicrophoneDevices();
		}
	}, [isOpen, loadMicrophoneDevices]);

	// Manage preview stream based on dialog state
	useEffect(() => {
		if (isOpen && selectedDeviceId) {
			setIsPreviewActive(true);
			initializePreviewStream();
		} else {
			setIsPreviewActive(false);
			stopPreviewStream();
		}

		// Cleanup on unmount
		return () => {
			if (isOpen) {
				stopPreviewStream();
				setIsPreviewActive(false);
			}
		};
	}, [
		isOpen,
		selectedDeviceId,
		setIsPreviewActive,
		initializePreviewStream,
		stopPreviewStream,
	]);

	// Set up audio level monitoring
	useEffect(() => {
		if (previewStream && isOpen) {
			const audioContext = new AudioContext();
			const analyser = audioContext.createAnalyser();
			const source = audioContext.createMediaStreamSource(previewStream);

			analyser.fftSize = 256;
			source.connect(analyser);

			audioContextRef.current = audioContext;
			analyserRef.current = analyser;

			const updateAudioLevel = () => {
				if (analyserRef.current) {
					const dataArray = new Uint8Array(
						analyserRef.current.frequencyBinCount,
					);
					analyserRef.current.getByteFrequencyData(dataArray);

					const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
					setAudioLevel(average);
				}

				animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
			};

			updateAudioLevel();
		}

		return () => {
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [previewStream, isOpen]);

	// Handle microphone enable/disable
	const handleEnabledChange = useCallback(
		(enabled: boolean) => {
			setEnabled(enabled);
			if (enabled && selectedDeviceId) {
				// Initialize main stream when enabled
				setTimeout(() => {
					initializeMicrophone();
				}, 200);
			}
		},
		[setEnabled, selectedDeviceId, initializeMicrophone],
	);

	// Handle gain change
	const handleGainChange = useCallback(
		(value: string) => {
			setGain(value as MicrophoneGain);
		},
		[setGain],
	);

	const gainOptions: { value: MicrophoneGain; label: string }[] = [
		{ value: "low", label: "Baixo" },
		{ value: "medium", label: "Médio" },
		{ value: "high", label: "Alto" },
	];

	const defaultTrigger = (
		<Button variant="outline" className="w-full">
			<Mic className="mr-2 h-4 w-4" />
			Configurar Microfone
		</Button>
	);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mic className="h-5 w-5" />
						Configurações do Microfone
					</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{error && (
						<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					)}

					{/* Microphone Enable/Disable */}
					<div className="flex items-center justify-between">
						<Label htmlFor="microphone-enabled">Ativar Microfone</Label>
						<Switch
							id="microphone-enabled"
							checked={isEnabled}
							onCheckedChange={handleEnabledChange}
						/>
					</div>

					{/* Device Selection */}
					<div className="grid gap-2">
						<Label>Dispositivo</Label>
						<Select
							value={selectedDeviceId || ""}
							onValueChange={setSelectedDeviceId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Selecione um microfone" />
							</SelectTrigger>
							<SelectContent>
								{devices?.map((device) => (
									<SelectItem key={device.deviceId} value={device.deviceId}>
										{device.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Audio Level Monitor */}
					{isEnabled && previewStream && (
						<div className="grid gap-2">
							<Label>Nível de Áudio</Label>
							<div className="flex items-center gap-2">
								<Volume2 className="h-4 w-4" />
								<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
									<div
										className="h-full bg-green-500 transition-all duration-100"
										style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
									/>
								</div>
								<span className="text-xs text-gray-500 w-8">
									{Math.round(audioLevel)}
								</span>
							</div>
						</div>
					)}

					{/* Gain Control */}
					<div className="grid gap-2">
						<Label>Ganho</Label>
						<Select value={gain} onValueChange={handleGainChange}>
							<SelectTrigger>
								<SelectValue placeholder="Selecione o ganho" />
							</SelectTrigger>
							<SelectContent>
								{gainOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Audio Processing Options */}
					<div className="grid gap-3">
						<Label>Processamento de Áudio</Label>

						<div className="flex items-center justify-between">
							<Label htmlFor="noise-reduction" className="text-sm">
								Redução de Ruído
							</Label>
							<Switch
								id="noise-reduction"
								checked={noiseReduction}
								onCheckedChange={setNoiseReduction}
							/>
						</div>

						<div className="flex items-center justify-between">
							<Label htmlFor="echo-cancellation" className="text-sm">
								Cancelamento de Eco
							</Label>
							<Switch
								id="echo-cancellation"
								checked={echoCancellation}
								onCheckedChange={setEchoCancellation}
							/>
						</div>

						<div className="flex items-center justify-between">
							<Label htmlFor="auto-gain" className="text-sm">
								Controle Automático de Ganho
							</Label>
							<Switch
								id="auto-gain"
								checked={autoGainControl}
								onCheckedChange={setAutoGainControl}
							/>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
