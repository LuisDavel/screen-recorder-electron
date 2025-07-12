import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCcw, Camera } from "lucide-react";
import { useSourceVideoStore } from "@/store/store-source-video";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CameraOverlay } from "./CameraOverlay";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { PreviewHeader } from "./recording-header/PreviewHeader";
import { PreviewFooter } from "./recording-header/PreviewFooter";
import { useCameraConfigStore } from "@/store/store-camera-config";

interface ScreenSource {
	id: string;
	name: string;
	thumbnail: string;
}

export function ScreenPreview() {
	const [sources, setSources] = useState<ScreenSource[]>([]);
	const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { setSourceId } = useSourceVideoStore();
	const { headerConfig, footerConfig } = useHeaderConfigStore();
	const { isEnabled: cameraEnabled, mainStream: cameraStream } =
		useCameraConfigStore();

	// Opção especial para câmera apenas
	const CAMERA_ONLY_SOURCE = {
		id: "camera-only",
		name: "📹 Apenas Câmera (Fullscreen)",
		thumbnail:
			"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjM0Y0RjVGIiByeD0iMTAiLz4KPHN2ZyB4PSIzMCIgeT0iMzAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KPHBhdGggZD0ibTIzIDcgMCA4LTYtMy41TDE3IDMuNVoiLz4KPHJlY3QgeD0iMSIgeT0iNSIgd2lkdGg9IjE1IiBoZWlnaHQ9IjE0IiByeD0iMiIgcnk9IjIiLz4KPC9zdmc+Cjwvc3ZnPgo=",
	};

	const loadSources = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const availableSources = await window.screenRecorder.getSources();
			setSources(availableSources);
		} catch (err) {
			setError("Erro ao carregar fontes de captura");
			console.error("Erro ao carregar fontes:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	const getScreenStream = useCallback(async () => {
		if (!selectedSourceId) return null;

		try {
			const constraints = {
				audio: false,
				video: {
					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: selectedSourceId,
					},
				},
			} as MediaStreamConstraints;

			const stream = await navigator.mediaDevices.getUserMedia(constraints);

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				videoRef.current.play().catch(console.error);
			}

			setError(null);
			return stream;
		} catch (err) {
			setError("Erro ao capturar tela");
			console.error("Erro ao capturar tela:", err);
			return null;
		}
	}, [selectedSourceId]);

	const getCameraStream = useCallback(async () => {
		if (!cameraEnabled || !cameraStream) return;

		try {
			if (videoRef.current) {
				videoRef.current.srcObject = cameraStream;
				videoRef.current.play().catch(console.error);
			}
			setError(null);
		} catch (err) {
			setError("Erro ao capturar câmera");
			console.error("Erro ao capturar câmera:", err);
		}
	}, [cameraEnabled, cameraStream]);

	useEffect(() => {
		loadSources();
	}, [loadSources]);

	// Update stream when source changes
	useEffect(() => {
		if (selectedSourceId) {
			if (selectedSourceId === "camera-only") {
				// Para câmera apenas, usar o stream da câmera
				getCameraStream();
			} else {
				// Para fontes de tela, usar getScreenStream
				getScreenStream();
			}
		}

		return () => {
			// Só parar streams de tela criados especificamente para preview
			// NUNCA parar o stream da câmera, pois ele é gerenciado pelo store
			if (videoRef.current && videoRef.current.srcObject) {
				const currentStream = videoRef.current.srcObject as MediaStream;

				// Só parar se for um stream de tela (não da câmera)
				if (
					selectedSourceId !== "camera-only" &&
					currentStream !== cameraStream
				) {
					currentStream.getTracks().forEach((track) => track.stop());
				}
			}
		};
	}, [selectedSourceId, getScreenStream, getCameraStream, cameraStream]);

	const handleSourceChange = useCallback(
		(value: string) => {
			setSelectedSourceId(value);

			if (value === "camera-only") {
				// Para câmera apenas, criar um objeto especial
				setSourceId({
					id: "camera-only",
					name: "📹 Apenas Câmera (Fullscreen)",
					thumbnail: CAMERA_ONLY_SOURCE.thumbnail,
				});
			} else {
				const selectedSource = sources.find((source) => source.id === value);
				if (selectedSource) {
					setSourceId(selectedSource);
				}
			}
		},
		[sources, setSourceId, setSourceId],
	);

	const handleRefresh = useCallback(() => {
		window.location.reload();
	}, []);

	// Combinar as fontes normais com a opção câmera apenas
	const allSources = [
		...(cameraEnabled ? [CAMERA_ONLY_SOURCE] : []),
		...sources.filter((source) => source.id && source.id.trim() !== ""),
	];

	// Verificar se deve mostrar aviso da câmera
	const isCameraOnlySelected = selectedSourceId === "camera-only";
	const shouldShowCameraWarning = isCameraOnlySelected && !cameraEnabled;

	return (
		<div className="h-fit w-full space-y-2 rounded-xl border p-2 transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					⚠️ {error}
				</div>
			)}

			{shouldShowCameraWarning && (
				<div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
					⚠️ Para usar &quot;Apenas Câmera&quot;, ative a câmera nas
					configurações à direita
				</div>
			)}

			<div
				ref={containerRef}
				className="relative flex w-fit justify-center overflow-hidden rounded-xl border-2 bg-black"
			>
				<video
					ref={videoRef}
					className="aspect-video w-full bg-black"
					autoPlay
					muted
				/>

				{/* Para câmera apenas, não mostrar overlay da câmera pois o vídeo principal já é da câmera */}
				{!isCameraOnlySelected && <CameraOverlay />}

				{/* Header informativo sobreposto - Preview específico */}
				{selectedSourceId && headerConfig.isEnabled && (
					<PreviewHeader
						isVisible={true}
						className="absolute top-0 right-0 left-0 z-50"
					/>
				)}

				{/* Footer informativo sobreposto - Preview específico */}
				{selectedSourceId && footerConfig.isEnabled && (
					<PreviewFooter
						isVisible={true}
						className="absolute bottom-0 right-0 left-0 z-30"
					/>
				)}

				{/* Indicador especial para modo câmera apenas */}
				{isCameraOnlySelected && cameraEnabled && (
					<div className="absolute top-2 left-2 z-[90] flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full">
						<Camera className="h-3 w-3" />
						<span className="text-xs font-medium">CÂMERA APENAS</span>
					</div>
				)}
			</div>
			{loading && (
				<div className="text-muted-foreground flex items-center gap-2">
					<div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
					Carregando preview...
				</div>
			)}
			<div className="flex w-full items-center justify-between gap-2">
				<div className="flex flex-col items-start gap-3">
					<label className="text-sm font-medium">
						Escolha a cena para gravar:
					</label>
					<div className="flex items-center gap-3">
						<Select
							value={selectedSourceId || undefined}
							onValueChange={handleSourceChange}
						>
							<SelectTrigger className="text-ellipsis overflow-hidden w-[350px]">
								<SelectValue
									className="text-ellipsis overflow-hidden"
									placeholder="Selecione uma fonte"
								/>
							</SelectTrigger>
							<SelectContent>
								{allSources.map((source) => (
									<SelectItem
										className="overflow-hidden text-left text-ellipsis"
										key={source.id}
										value={source.id}
									>
										{source.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<button
							className="hover:bg-accent hover:text-accent-foreground rounded-lg border p-2.5 transition-all"
							onClick={handleRefresh}
						>
							<RefreshCcw className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
