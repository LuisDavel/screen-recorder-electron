import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { RefreshCcw } from "lucide-react";

interface ScreenSource {
	id: string;
	name: string;
	thumbnail: string;
}

export default function ScreenPreview() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [sources, setSources] = useState<ScreenSource[]>([]);
	const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Carregar fontes de tela/janela disponíveis
	useEffect(() => {
		async function loadSources() {
			try {
				const availableSources = await window.screenRecorder.getSources();
				setSources(availableSources);
				if (availableSources.length > 0) {
					setSelectedSourceId(availableSources[0].id);
				}
			} catch (err: any) {
				setError("Erro ao buscar fontes de tela: " + err.message);
			}
		}
		loadSources();
	}, []);

	// Atualizar preview ao trocar de fonte
	useEffect(() => {
		let stream: MediaStream;
		async function getScreenStream() {
			if (!selectedSourceId) return;
			setLoading(true);
			setError(null);
			try {
				stream = await (navigator.mediaDevices as any).getUserMedia({
					audio: false,
					video: {
						mandatory: {
							chromeMediaSource: "desktop",
							chromeMediaSourceId: selectedSourceId,
						},
					},
				});
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					videoRef.current.play();
				}
			} catch (err: any) {
				setError("Erro ao capturar a tela: " + err.message);
			} finally {
				setLoading(false);
			}
		}
		getScreenStream();
		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				(videoRef.current.srcObject as MediaStream)
					.getTracks()
					.forEach((track) => track.stop());
			}
		};
	}, [selectedSourceId]);

	return (
		<div className="space-y-4">
			{error && <div className="text-red-500">{error}</div>}
			<div className="rounded-lg  w-fit overflow-hidden justify-center flex border bg-black">
				<video
					ref={videoRef}
					className="w-[80%] aspect-video bg-black"
					autoPlay
					muted
				/>
			</div>
			{loading && (
				<div className="text-muted-foreground">Carregando preview...</div>
			)}
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex flex-col items-start gap-1">
					<label className="font-medium">Fonte para Preview:</label>
					<div className="flex items-center gap-2">
						<Select
							value={selectedSourceId || ""}
							onValueChange={(value) => setSelectedSourceId(value)}
						>
							<SelectTrigger className="w-[400px]">
								<SelectValue placeholder="Selecione uma fonte" />
							</SelectTrigger>
							<SelectContent>
								{sources.map((source) => (
									<SelectItem
										className="text-left text-ellipsis overflow-hidden"
										key={source.id}
										value={source.id}
									>
										{source.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<button className="p-2" onClick={() => window.location.reload()}>
							<RefreshCcw className="h-4 w-4	" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
