import React, { useEffect, useRef, useState, useCallback } from "react";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { RefreshCcw } from "lucide-react";
import { useSourceVideoStore } from "@/store/store-source-video";
import { CameraOverlay } from "./CameraOverlay";
import { useDeviceInitialization } from "@/hooks/useDeviceInitialization";
import { useHeaderConfigStore } from "@/store/store-header-config";

interface ScreenSource {
	id: string;
	name: string;
	thumbnail: string;
}

export function ScreenPreview() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [sources, setSources] = useState<ScreenSource[]>([]);
	const { setSourceId } = useSourceVideoStore();
	const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const { headerConfig } = useHeaderConfigStore();

	// Use the new centralized device initialization hook
	useDeviceInitialization({
		devices: ["camera"],
		autoInitialize: true,
	});

	const loadSources = useCallback(async () => {
		try {
			const availableSources = await window.screenRecorder.getSources();
			setSources(availableSources);
			if (availableSources.length > 0) {
				const firstSource = availableSources[0];
				setSelectedSourceId(firstSource.id);
				setSourceId(firstSource);
			}
		} catch (err: unknown) {
			setError(
				"Erro ao buscar fontes de tela: " +
					(err instanceof Error ? err.message : String(err)),
			);
		}
	}, [setSourceId]);

	const getScreenStream = useCallback(async () => {
		if (!selectedSourceId) return;

		setLoading(true);
		setError(null);

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: selectedSourceId,
					},
				} as MediaTrackConstraints,
			});

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				videoRef.current.play();
			}
		} catch (err: unknown) {
			setError(
				"Erro ao capturar a tela: " +
					(err instanceof Error ? err.message : String(err)),
			);
		} finally {
			setLoading(false);
		}
	}, [selectedSourceId]);

	// Load sources on mount
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

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("pt-BR");
		} catch {
			return dateString;
		}
	};

	const getSexAge = () => {
		if (headerConfig.patientSex && headerConfig.patientAge) {
			return `${headerConfig.patientSex} / ${headerConfig.patientAge}`;
		}
		return (
			headerConfig.patientSex || headerConfig.patientAge || "Não informado"
		);
	};

	return (
		<div className="h-fit w-full space-y-4 rounded-xl border p-6 transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
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

				{/* Header informativo sobreposto */}
				{selectedSourceId && headerConfig.isEnabled && (
					<div
						className="absolute top-0 right-0 left-0 z-50 bg-gray-900/95 text-white shadow-lg backdrop-blur-sm"
						style={{ height: `${headerConfig.height}px` }}
					>
						<div className="flex h-full items-center px-6">
							<div className="grid w-full grid-cols-12 gap-4">
								{/* Nome do Exame */}
								<div className="col-span-3">
									<div className="mb-1 text-xs text-gray-400">Exame</div>
									<div className="truncate text-sm font-medium">
										{headerConfig.examName || "Não informado"}
									</div>
								</div>

								{/* Data do Exame */}
								<div className="col-span-2">
									<div className="mb-1 text-xs text-gray-400">Data</div>
									<div className="text-sm font-medium">
										{formatDate(headerConfig.examDate) || "Não informada"}
									</div>
								</div>

								{/* Nome do Paciente */}
								<div className="col-span-3">
									<div className="mb-1 text-xs text-gray-400">Paciente</div>
									<div className="truncate text-sm font-medium">
										{headerConfig.patientName || "Não informado"}
									</div>
								</div>

								{/* Sexo e Idade */}
								<div className="col-span-2">
									<div className="mb-1 text-xs text-gray-400">Sexo / Idade</div>
									<div className="text-sm font-medium">{getSexAge()}</div>
								</div>

								{/* ID Externo */}
								<div className="col-span-2">
									<div className="mb-1 text-xs text-gray-400">ID</div>
									<div className="truncate text-sm font-medium">
										{headerConfig.externalId || "Não informado"}
									</div>
								</div>
							</div>
						</div>

						{/* Segunda linha com informações adicionais se a altura permitir */}
						{headerConfig.height > 60 && (
							<div className="absolute right-0 bottom-0 left-0 px-6 pt-2">
								<div className="grid w-full grid-cols-12 gap-4 text-xs">
									{/* Instituição */}
									<div className="col-span-4">
										<span className="text-gray-400">Instituição: </span>
										<span className="font-medium">
											{headerConfig.institutionName || "Não informada"}
										</span>
									</div>

									{/* Médico Requisitante */}
									<div className="col-span-4">
										<span className="text-gray-400">Médico: </span>
										<span className="font-medium">
											{headerConfig.requestingDoctor || "Não informado"}
										</span>
									</div>

									{/* CRM */}
									<div className="col-span-4">
										<span className="text-gray-400">CRM: </span>
										<span className="font-medium">
											{headerConfig.crm || "Não informado"}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
			{loading && (
				<div className="text-muted-foreground flex items-center gap-2">
					<div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
					Carregando preview...
				</div>
			)}
			<div className="flex w-full items-center justify-between gap-4">
				<div className="flex flex-col items-start gap-3">
					<label className="text-sm font-medium">
						Escolha a cena para gravar:
					</label>
					<div className="flex items-center gap-3">
						<Select
							value={selectedSourceId || undefined}
							onValueChange={handleSourceChange}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Selecione uma fonte" />
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
