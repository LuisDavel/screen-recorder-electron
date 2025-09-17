import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import {
	Loader2,
	Video,
	Download,
	AlertCircle,
	CheckCircle,
	Play,
} from "lucide-react";
import { useVideoConcatenation } from "../hooks/useVideoConcatenation";

export function VideoConcatenationTest() {
	const [localVideoPath, setLocalVideoPath] = useState("");
	const [outputPath, setOutputPath] = useState("");
	const [progress, setProgress] = useState("");
	const [result, setResult] = useState<{
		success: boolean;
		message: string;
		outputPath?: string;
	} | null>(null);
	const [ffmpegStatus, setFfmpegStatus] = useState<{
		available: boolean;
		message: string;
	} | null>(null);

	const { isProcessing, startManualConcatenation, checkFFmpegAvailability } =
		useVideoConcatenation();

	// URL do vídeo remoto (fixo conforme solicitado)
	const remoteVideoUrl =
		"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4";

	// Verificar FFmpeg ao montar o componente
	useEffect(() => {
		checkFFmpeg();

		// Configurar listener de progresso
		if (window.videoConcatAPI) {
			window.videoConcatAPI.onProgress((progressData: string) => {
				setProgress(progressData);
			});
		}

		// Cleanup
		return () => {
			if (window.videoConcatAPI) {
				window.videoConcatAPI.removeProgressListener();
			}
		};
	}, []);

	const checkFFmpeg = async () => {
		try {
			const status = await checkFFmpegAvailability();
			setFfmpegStatus(status);
		} catch (error) {
			console.error("Erro ao verificar FFmpeg:", error);
			setFfmpegStatus({
				available: false,
				message: "Erro ao verificar FFmpeg",
			});
		}
	};

	const handleConcatenate = async () => {
		if (!localVideoPath || !outputPath) {
			setResult({
				success: false,
				message: "Por favor, preencha todos os campos obrigatórios.",
			});
			return;
		}

		setProgress("");
		setResult(null);

		try {
			const result = await startManualConcatenation({
				remoteVideoUrl,
				localVideoPath,
				outputPath,
			});

			setResult({
				success: result.success,
				message: result.message,
				outputPath: result.outputPath,
			});
		} catch (error) {
			setResult({
				success: false,
				message: error instanceof Error ? error.message : "Erro desconhecido",
			});
		} finally {
			setProgress("");
		}
	};

	// Se FFmpeg não estiver disponível, mostrar aviso
	if (ffmpegStatus && !ffmpegStatus.available) {
		return (
			<Card className="w-full max-w-2xl mx-auto">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-red-500" />
						FFmpeg Não Disponível
					</CardTitle>
					<CardDescription>
						O FFmpeg é necessário para concatenar vídeos
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							{ffmpegStatus.message}
							<br />
							<strong>Solução:</strong> Certifique-se de que o ffmpeg-static
							está instalado corretamente.
						</AlertDescription>
					</Alert>
					<Button onClick={checkFFmpeg} className="mt-4">
						Verificar Novamente
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Video className="h-5 w-5" />
					Teste de Concatenação Manual
				</CardTitle>
				<CardDescription>
					Teste a funcionalidade de concatenação de vídeos manualmente
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Status do FFmpeg */}
				{ffmpegStatus && ffmpegStatus.available && (
					<Alert className="border-green-200 bg-green-50">
						<CheckCircle className="h-4 w-4 text-green-600" />
						<AlertDescription className="text-green-800">
							✅ FFmpeg disponível e funcionando
						</AlertDescription>
					</Alert>
				)}

				{/* Vídeo Remoto (somente leitura) */}
				<div className="space-y-2">
					<Label htmlFor="remote-video">Vídeo Remoto</Label>
					<Input
						id="remote-video"
						value={remoteVideoUrl}
						readOnly
						className="bg-gray-50"
					/>
					<p className="text-xs text-gray-500">
						Vídeo de exemplo do Google Cloud Storage
					</p>
				</div>

				{/* Vídeo Local */}
				<div className="space-y-2">
					<Label htmlFor="local-video">Caminho do Vídeo Local *</Label>
					<Input
						id="local-video"
						placeholder="/Users/seu-usuario/Videos/meu-video.mp4"
						value={localVideoPath}
						onChange={(e) => setLocalVideoPath(e.target.value)}
						disabled={isProcessing}
					/>
					<p className="text-xs text-gray-500">
						Caminho completo para o arquivo de vídeo local
					</p>
				</div>

				{/* Arquivo de Saída */}
				<div className="space-y-2">
					<Label htmlFor="output-path">Caminho do Arquivo Final *</Label>
					<Input
						id="output-path"
						placeholder="/Users/seu-usuario/Videos/video-concatenado.mp4"
						value={outputPath}
						onChange={(e) => setOutputPath(e.target.value)}
						disabled={isProcessing}
					/>
					<p className="text-xs text-gray-500">
						Onde salvar o vídeo concatenado
					</p>
				</div>

				{/* Botão de Concatenar */}
				<Button
					onClick={handleConcatenate}
					disabled={isProcessing || !localVideoPath || !outputPath}
					className="w-full"
				>
					{isProcessing ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Concatenando...
						</>
					) : (
						<>
							<Play className="mr-2 h-4 w-4" />
							Concatenar Vídeos
						</>
					)}
				</Button>

				{/* Progresso */}
				{progress && (
					<div className="space-y-2">
						<Label>Progresso:</Label>
						<div className="bg-gray-100 p-3 rounded-md max-h-32 overflow-y-auto">
							<pre className="text-xs text-gray-700 whitespace-pre-wrap">
								{progress.split("\n").slice(-10).join("\n")}
							</pre>
						</div>
					</div>
				)}

				{/* Resultado */}
				{result && (
					<Alert
						className={
							result.success
								? "border-green-200 bg-green-50"
								: "border-red-200 bg-red-50"
						}
					>
						{result.success ? (
							<CheckCircle className="h-4 w-4 text-green-600" />
						) : (
							<AlertCircle className="h-4 w-4 text-red-600" />
						)}
						<AlertDescription
							className={result.success ? "text-green-800" : "text-red-800"}
						>
							{result.message}
							{result.success && result.outputPath && (
								<div className="mt-2 p-2 bg-white rounded border">
									<strong>Arquivo salvo em:</strong>
									<br />
									<code className="text-xs">{result.outputPath}</code>
								</div>
							)}
						</AlertDescription>
					</Alert>
				)}

				{/* Informações */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<h3 className="font-medium text-blue-900 mb-2">ℹ️ Como funciona:</h3>
					<ul className="text-sm text-blue-800 space-y-1">
						<li>• O vídeo remoto será reproduzido primeiro</li>
						<li>• Seu vídeo local será reproduzido em seguida</li>
						<li>• O resultado será salvo no caminho especificado</li>
						<li>• A concatenação é automática após cada gravação</li>
					</ul>
				</div>
			</CardContent>
		</Card>
	);
}
