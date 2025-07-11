import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
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
	const { headerConfig } = useHeaderConfigStore();

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
		if (!selectedSourceId) return;

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
		} catch (err) {
			setError("Erro ao capturar tela");
			console.error("Erro ao capturar tela:", err);
		}
	}, [selectedSourceId]);

	useEffect(() => {
		loadSources();
	}, [loadSources]);

	// Update screen stream when source changes
	useEffect(() => {
		let stream: MediaStream | null = null;

		if (selectedSourceId) {
			getScreenStream();
		}

		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				stream = videoRef.current.srcObject as MediaStream;
				stream.getTracks().forEach((track) => track.stop());
			}
		};
	}, [selectedSourceId, getScreenStream]);

	const handleSourceChange = useCallback(
		(value: string) => {
			setSelectedSourceId(value);
			const selectedSource = sources.find((source) => source.id === value);
			if (selectedSource) {
				setSourceId(selectedSource);
			}
		},
		[sources, setSourceId],
	);

	const handleRefresh = useCallback(() => {
		window.location.reload();
	}, []);

	return (
		<div className="h-fit w-full space-y-2 rounded-xl border p-2 transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					⚠️ Necessário permissão para capturar a tela
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
				<CameraOverlay />

				{/* Header informativo sobreposto - Preview específico */}
				{selectedSourceId && headerConfig.isEnabled && (
					<PreviewHeader
						isVisible={true}
						className="absolute top-0 right-0 left-0 z-50"
					/>
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
								{sources &&
									sources
										.filter((source) => source.id && source.id.trim() !== "")
										.map((source) => (
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
