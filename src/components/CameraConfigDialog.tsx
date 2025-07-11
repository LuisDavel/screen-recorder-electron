import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera } from "lucide-react";
import {
	useCameraConfigStore,
	type CameraPosition,
	type CameraSize,
} from "@/store/store-camera-config";
import { ComboBox } from "./ComboBox";
import { useDeviceInitialization } from "@/hooks/useDeviceInitialization";

interface CameraConfigDialogProps {
	trigger?: React.ReactNode;
}

export function CameraConfigDialog({ trigger }: CameraConfigDialogProps) {
	const {
		isEnabled,
		position,
		size,
		selectedDeviceId,
		devices,
		previewStream,
		setEnabled,
		setPosition,
		setSize,
		setSelectedDeviceId,
		setDevices,
		setIsPreviewActive,
		initializePreviewStream,
		stopPreviewStream,
	} = useCameraConfigStore();

	const [isOpen, setIsOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	// Use the new centralized device initialization hook
	const { initializeCamera } = useDeviceInitialization({
		devices: ["camera"],
		autoInitialize: false, // Manual initialization for dialog
	});

	const loadCameraDevices = useCallback(async () => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices
				.filter((device) => device.kind === "videoinput")
				.map((device) => ({
					deviceId: device.deviceId,
					label: device.label || `Câmera ${device.deviceId.slice(0, 8)}...`,
				}));

			setDevices(videoDevices);

			// Set default device if none selected
			if (!selectedDeviceId && videoDevices.length > 0) {
				setSelectedDeviceId(videoDevices[0].deviceId);
			}
		} catch (err: unknown) {
			setError(
				"Erro ao carregar dispositivos de câmera: " +
					(err instanceof Error ? err.message : String(err)),
			);
		}
	}, [selectedDeviceId, setDevices, setSelectedDeviceId]);

	// Load devices when dialog opens
	useEffect(() => {
		if (isOpen) {
			loadCameraDevices();
		}
	}, [isOpen, loadCameraDevices]);

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

	// Update video ref when preview stream changes
	useEffect(() => {
		if (videoRef.current && previewStream) {
			videoRef.current.srcObject = previewStream;
			videoRef.current.play().catch(console.error);
		}
	}, [previewStream]);

	// Handle camera enable/disable
	const handleEnabledChange = useCallback(
		(enabled: boolean) => {
			setEnabled(enabled);
			if (enabled && selectedDeviceId) {
				// Initialize main stream when enabled
				setTimeout(() => {
					initializeCamera();
				}, 200);
			}
		},
		[setEnabled, selectedDeviceId, initializeCamera],
	);

	// Handle position change
	const handlePositionChange = useCallback(
		(value: string) => {
			setPosition(value as CameraPosition);
		},
		[setPosition],
	);

	// Handle size change
	const handleSizeChange = useCallback(
		(value: string) => {
			setSize(value as CameraSize);
		},
		[setSize],
	);

	const positionOptions: { value: CameraPosition; label: string }[] = [
		{ value: "top-left", label: "Superior Esquerdo" },
		{ value: "top-right", label: "Superior Direito" },
		{ value: "bottom-left", label: "Inferior Esquerdo" },
		{ value: "bottom-right", label: "Inferior Direito" },
	];

	const sizeOptions: { value: CameraSize; label: string }[] = [
		{ value: "small", label: "Pequeno" },
		{ value: "medium", label: "Médio" },
		{ value: "large", label: "Grande" },
	];

	const defaultTrigger = (
		<Button variant="outline" className="w-full">
			<Camera className="mr-2 h-4 w-4" />
			Configurar Câmera
		</Button>
	);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Camera className="h-5 w-5" />
						Configurações da Câmera
					</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{error && (
						<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					)}

					{/* Camera Enable/Disable */}
					<div className="flex items-center justify-between">
						<Label htmlFor="camera-enabled">Ativar Câmera</Label>
						<Switch
							id="camera-enabled"
							checked={isEnabled}
							onCheckedChange={handleEnabledChange}
						/>
					</div>

					{/* Device Selection */}
					<div className="grid gap-2">
						<Label>Dispositivo</Label>
						<ComboBox
							data={
								devices?.map((device) => ({
									value: device.deviceId,
									label: device.label,
								})) || []
							}
							value={selectedDeviceId || ""}
							onChange={setSelectedDeviceId}
							placeholder="Selecione uma câmera"
						/>
					</div>

					{/* Camera Preview */}
					{isEnabled && (
						<div className="grid gap-2">
							<Label>Preview</Label>
							<div className="relative overflow-hidden rounded-lg border bg-black">
								<video
									ref={videoRef}
									className="h-48 w-full object-cover"
									autoPlay
									muted
									playsInline
								/>
								{!previewStream && (
									<div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
										<div className="text-center">
											<div className="mb-2">📷</div>
											<div className="text-sm">Aguardando câmera...</div>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Position */}
					<div className="grid gap-2">
						<Label>Posição</Label>
						<ComboBox
							data={positionOptions}
							value={position}
							onChange={handlePositionChange}
							placeholder="Selecione uma posição"
						/>
					</div>

					{/* Size */}
					<div className="grid gap-2">
						<Label>Tamanho</Label>
						<ComboBox
							data={sizeOptions}
							value={size}
							onChange={handleSizeChange}
							placeholder="Selecione um tamanho"
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
