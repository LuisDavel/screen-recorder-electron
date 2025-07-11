import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useVideoFormatStore } from "@/store/store-video-format";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

export function VideoFormatDebugger() {
	const [supportedFormats, setSupportedFormats] = useState<
		Array<{
			format: string;
			supported: boolean;
		}>
	>([]);
	const [browserInfo, setBrowserInfo] = useState<string>("");
	const [testResults, setTestResults] = useState<
		Array<{
			format: string;
			mimeType: string;
			supported: boolean;
			error?: string;
		}>
	>([]);

	const { format, codec, getMimeType } = useVideoFormatStore();

	useEffect(() => {
		checkFormatSupport();
		getBrowserInfo();
	}, []);

	const checkFormatSupport = () => {
		const formatsToTest = [
			"video/webm",
			"video/webm; codecs=vp9",
			"video/webm; codecs=vp8",
			"video/webm; codecs=av01",
			"video/mp4",
			"video/mp4; codecs=h264",
			"video/mp4; codecs=avc1",
			"video/mp4; codecs=h264,aac",
			"video/mp4; codecs=avc1.42E01E",
			"video/mp4; codecs=avc1.42001E",
		];

		const results = formatsToTest.map((format) => ({
			format,
			supported:
				typeof MediaRecorder !== "undefined" &&
				MediaRecorder.isTypeSupported(format),
		}));

		setSupportedFormats(results);
	};

	const getBrowserInfo = () => {
		const info = `${navigator.userAgent} - MediaRecorder: ${typeof MediaRecorder !== "undefined" ? "Disponível" : "Não disponível"}`;
		setBrowserInfo(info);
	};

	const testCurrentFormat = async () => {
		const currentMimeType = getMimeType();
		const results = [];

		// Test current format
		try {
			const isSupported = MediaRecorder.isTypeSupported(currentMimeType);
			results.push({
				format: "Formato Atual",
				mimeType: currentMimeType,
				supported: isSupported,
			});

			// Try to create a test MediaRecorder
			if (isSupported) {
				try {
					const canvas = document.createElement("canvas");
					canvas.width = 100;
					canvas.height = 100;
					const stream = canvas.captureStream();
					const recorder = new MediaRecorder(stream, {
						mimeType: currentMimeType,
					});
					results.push({
						format: "Teste de Criação",
						mimeType: currentMimeType,
						supported: true,
					});
					recorder.stop();
				} catch (error) {
					results.push({
						format: "Teste de Criação",
						mimeType: currentMimeType,
						supported: false,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		} catch (error) {
			results.push({
				format: "Formato Atual",
				mimeType: currentMimeType,
				supported: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		setTestResults(results);
	};

	const getStatusIcon = (supported: boolean) => {
		return supported ? (
			<CheckCircle className="h-4 w-4 text-green-500" />
		) : (
			<XCircle className="h-4 w-4 text-red-500" />
		);
	};

	return (
		<Card className="w-full max-w-4xl mx-auto">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Info className="h-5 w-5" />
					Debug de Formatos de Vídeo
				</CardTitle>
				<CardDescription>
					Verifique quais formatos de vídeo são suportados pelo seu navegador
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Browser Info */}
				<div>
					<h3 className="font-semibold mb-2">Informações do Navegador</h3>
					<p className="text-sm text-muted-foreground break-all">
						{browserInfo}
					</p>
				</div>

				{/* Current Format Info */}
				<div>
					<h3 className="font-semibold mb-2">Formato Atual Selecionado</h3>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="font-medium">Formato:</span>{" "}
							{format.toUpperCase()}
						</div>
						<div>
							<span className="font-medium">Codec:</span> {codec}
						</div>
						<div className="col-span-2">
							<span className="font-medium">MIME Type:</span> {getMimeType()}
						</div>
					</div>
				</div>

				{/* Test Current Format Button */}
				<div>
					<Button onClick={testCurrentFormat} className="mb-4">
						Testar Formato Atual
					</Button>

					{testResults.length > 0 && (
						<div className="space-y-2">
							<h4 className="font-medium">Resultados do Teste:</h4>
							{testResults.map((result, index) => (
								<div
									key={index}
									className="flex items-center gap-2 p-2 bg-muted rounded"
								>
									{getStatusIcon(result.supported)}
									<span className="flex-1">
										{result.format}: {result.mimeType}
									</span>
									{result.error && (
										<span className="text-red-500 text-sm">
											({result.error})
										</span>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Supported Formats List */}
				<div>
					<h3 className="font-semibold mb-2">
						Formatos Suportados pelo MediaRecorder
					</h3>
					<div className="space-y-1 max-h-64 overflow-y-auto">
						{supportedFormats.map((item, index) => (
							<div
								key={index}
								className="flex items-center gap-2 p-2 bg-muted rounded"
							>
								{getStatusIcon(item.supported)}
								<span className="flex-1 font-mono text-sm">{item.format}</span>
							</div>
						))}
					</div>
				</div>

				{/* Recommendations */}
				<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
					<div className="flex items-center gap-2 mb-2">
						<AlertCircle className="h-4 w-4 text-yellow-600" />
						<span className="font-medium">Recomendações</span>
					</div>
					<ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
						<li>• Se MP4 não estiver funcionando, use WebM como alternativa</li>
						<li>• Chrome/Chromium geralmente suporta melhor WebM</li>
						<li>• Firefox pode ter suporte limitado para MP4</li>
						<li>• Safari pode ter comportamento diferente</li>
					</ul>
				</div>
			</CardContent>
		</Card>
	);
}
