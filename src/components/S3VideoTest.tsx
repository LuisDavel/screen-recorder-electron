import React, { useState, useCallback } from "react";

interface S3VideoTestProps {
	videoConfig: {
		introVideo: { key: string; url: string };
		outroVideo: { key: string; url: string };
	};
}

export function S3VideoTest({ videoConfig }: S3VideoTestProps) {
	const [testing, setTesting] = useState(false);
	const [result, setResult] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [testVideoPath, setTestVideoPath] = useState("/tmp/test-recorded-video.mp4");

	const canTest = videoConfig.introVideo.url && videoConfig.outroVideo.url;

	const runTest = useCallback(async () => {
		if (!canTest) {
			setError("Selecione ambos os vídeos (introdução e encerramento) antes de testar.");
			return;
		}

		setTesting(true);
		setError(null);
		setResult(null);

		try {
			console.log("🧪 Iniciando teste com vídeos S3:");
			console.log("🎬 Vídeo de introdução:", videoConfig.introVideo);
			console.log("🎭 Vídeo de encerramento:", videoConfig.outroVideo);
			console.log("📁 Vídeo gravado (simulado):", testVideoPath);

			// Chamar o handler de concatenação com as URLs do S3
			const testResult = await window.electron.invoke(
				"video-concat:auto-concatenate-robust",
				{
					recordedVideoPath: testVideoPath,
					outputPath: "/tmp/test-s3-concatenation-output.mp4",
					introVideoUrl: videoConfig.introVideo.url,
					outroVideoUrl: videoConfig.outroVideo.url,
				}
			);

			console.log("✅ Resultado do teste:", testResult);
			setResult(testResult);
		} catch (err) {
			console.error("❌ Erro no teste:", err);
			const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
			setError(errorMessage);
		} finally {
			setTesting(false);
		}
	}, [canTest, videoConfig, testVideoPath]);

	return (
		<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
			<div className="mb-4">
				<h2 className="text-lg font-semibold text-gray-900 mb-2">
					🧪 Teste de Concatenação com Vídeos S3
				</h2>
				<p className="text-gray-600 text-sm">
					Teste a funcionalidade de concatenação usando os vídeos selecionados do S3.
				</p>
			</div>

			{/* Status da configuração */}
			<div className="mb-4 p-3 bg-gray-50 rounded-md">
				<h3 className="font-medium text-gray-900 mb-2">Status da Configuração:</h3>
				<div className="space-y-2 text-sm">
					<div className="flex items-center space-x-2">
						<div className={`w-3 h-3 rounded-full ${
							videoConfig.introVideo.url ? "bg-green-500" : "bg-red-500"
						}`}></div>
						<span>
							Vídeo de Introdução: {videoConfig.introVideo.url ? "✅ Configurado" : "❌ Não selecionado"}
						</span>
					</div>
					<div className="flex items-center space-x-2">
						<div className={`w-3 h-3 rounded-full ${
							videoConfig.outroVideo.url ? "bg-green-500" : "bg-red-500"
						}`}></div>
						<span>
							Vídeo de Encerramento: {videoConfig.outroVideo.url ? "✅ Configurado" : "❌ Não selecionado"}
						</span>
					</div>
				</div>
			</div>

			{/* Campo para caminho do vídeo gravado (simulado) */}
			<div className="mb-4">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Caminho do Vídeo Gravado (para teste):
				</label>
				<input
					type="text"
					value={testVideoPath}
					onChange={(e) => setTestVideoPath(e.target.value)}
					placeholder="/caminho/para/video-gravado.mp4"
					className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
				<p className="text-xs text-gray-500 mt-1">
					Para teste, você pode usar qualquer arquivo de vídeo existente no sistema.
				</p>
			</div>

			{/* Botão de teste */}
			<button
				onClick={runTest}
				disabled={!canTest || testing}
				className={`w-full py-2 px-4 rounded-md font-medium ${
					canTest && !testing
						? "bg-blue-600 text-white hover:bg-blue-700"
						: "bg-gray-300 text-gray-500 cursor-not-allowed"
				}`}
			>
				{testing ? (
					<div className="flex items-center justify-center space-x-2">
						<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						<span>Testando Concatenação...</span>
					</div>
				) : (
					"🧪 Testar Concatenação com Vídeos S3"
				)}
			</button>

			{!canTest && (
				<p className="text-sm text-red-600 mt-2">
					Selecione ambos os vídeos (introdução e encerramento) para habilitar o teste.
				</p>
			)}

			{/* Resultado do teste */}
			{error && (
				<div className="mt-4 p-4 bg-red-50 rounded-md border border-red-200">
					<div className="flex items-start space-x-2">
						<div className="w-5 h-5 text-red-600 mt-0.5">❌</div>
						<div className="flex-1">
							<h4 className="font-medium text-red-900">Erro no Teste:</h4>
							<p className="text-sm text-red-800 mt-1">{error}</p>
						</div>
					</div>
				</div>
			)}

			{result && (
				<div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
					<div className="flex items-start space-x-2">
						<div className="w-5 h-5 text-green-600 mt-0.5">✅</div>
						<div className="flex-1">
							<h4 className="font-medium text-green-900">Resultado do Teste:</h4>
							<div className="text-sm text-green-800 mt-2 space-y-1">
								<p><strong>Status:</strong> {result.success ? "Sucesso" : "Falha"}</p>
								<p><strong>Mensagem:</strong> {result.message}</p>
								{result.outputPath && (
									<p><strong>Arquivo de Saída:</strong> {result.outputPath}</p>
								)}
								{result.fileSize && (
									<p><strong>Tamanho:</strong> {(result.fileSize / 1024 / 1024).toFixed(2)} MB</p>
								)}
								{result.method && (
									<p><strong>Método Usado:</strong> {result.method}</p>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Informações adicionais */}
			<div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
				<h4 className="font-medium text-blue-900 mb-2">💡 Como funciona o teste:</h4>
				<ul className="text-sm text-blue-800 space-y-1">
					<li>• Usa as URLs dos vídeos selecionados do S3</li>
					<li>• Substitui os vídeos demo pelos seus vídeos reais</li>
					<li>• Sequência: Introdução S3 → Vídeo Gravado → Encerramento S3</li>
					<li>• Mostra logs detalhados no console do Electron</li>
				</ul>
			</div>
		</div>
	);
}
