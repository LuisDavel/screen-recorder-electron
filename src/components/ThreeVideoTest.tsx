import React, { useState } from "react";

interface VideoConcatAPI {
	autoConcatenateRobust: (options: {
		recordedVideoPath: string;
		outputPath?: string;
	}) => Promise<{
		success: boolean;
		outputPath: string;
		message: string;
		fileSize?: number;
		method?: string;
	}>;
}

declare global {
	interface Window {
		videoConcatAPI?: VideoConcatAPI;
	}
}

export function ThreeVideoTest() {
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<string>("");
	const [testVideoPath, setTestVideoPath] = useState("/tmp/test-recorded.mp4");

	const testThreeVideos = async () => {
		if (!window.videoConcatAPI) {
			setResult("❌ API de concatenação não disponível");
			return;
		}

		setIsProcessing(true);
		setResult("🎬 Iniciando teste de concatenação de 3 vídeos...\n");

		try {
			// Simular um arquivo de vídeo gravado (você pode usar um caminho real)
			const result = await window.videoConcatAPI.autoConcatenateRobust({
				recordedVideoPath: testVideoPath,
				outputPath: "/tmp/test-3videos-output.mp4",
			});

			setResult(
				(prev) => prev + `✅ Sucesso!\n${JSON.stringify(result, null, 2)}`,
			);
		} catch (error) {
			setResult((prev) => prev + `❌ Erro: ${error}`);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div
			style={{
				padding: "20px",
				border: "2px solid #007acc",
				borderRadius: "8px",
				backgroundColor: "#f0f8ff",
				margin: "20px",
			}}
		>
			<h3>🎬 Teste de Concatenação de 3 Vídeos</h3>

			<div style={{ marginBottom: "15px" }}>
				<p>
					<strong>Sequência:</strong>
				</p>
				<ol style={{ fontSize: "14px", color: "#333" }}>
					<li>
						🌐 <strong>Vídeo Remoto 1:</strong> WhatCarCanYouGetForAGrand.mp4
					</li>
					<li>
						📹 <strong>Vídeo Gravado:</strong> Seu vídeo gravado
					</li>
					<li>
						🌐 <strong>Vídeo Remoto 2:</strong> TearsOfSteel.mp4
					</li>
				</ol>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label
					style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
				>
					Caminho do vídeo gravado (para teste):
				</label>
				<input
					type="text"
					value={testVideoPath}
					onChange={(e) => setTestVideoPath(e.target.value)}
					style={{
						width: "100%",
						padding: "8px",
						border: "1px solid #ccc",
						borderRadius: "4px",
						fontFamily: "monospace",
					}}
					placeholder="/caminho/para/seu/video.mp4"
				/>
				<small style={{ color: "#666" }}>
					💡 Use um caminho real de um vídeo existente para testar
				</small>
			</div>

			<button
				onClick={testThreeVideos}
				disabled={isProcessing}
				style={{
					padding: "10px 20px",
					backgroundColor: isProcessing ? "#ccc" : "#007acc",
					color: "white",
					border: "none",
					borderRadius: "4px",
					cursor: isProcessing ? "not-allowed" : "pointer",
					fontSize: "16px",
				}}
			>
				{isProcessing ? "🔄 Processando..." : "🎬 Testar 3 Vídeos"}
			</button>

			{result && (
				<div
					style={{
						marginTop: "15px",
						backgroundColor: "#000",
						color: "#0f0",
						padding: "15px",
						borderRadius: "4px",
						fontFamily: "monospace",
						fontSize: "12px",
						whiteSpace: "pre-wrap",
						maxHeight: "400px",
						overflowY: "auto",
					}}
				>
					{result}
				</div>
			)}

			<div style={{ marginTop: "15px", fontSize: "12px", color: "#666" }}>
				<strong>ℹ️ Informações:</strong>
				<ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
					<li>O sistema vai baixar e processar 2 vídeos remotos</li>
					<li>Todos os vídeos serão normalizados para 1920x1080, 30fps</li>
					<li>O arquivo final terá o sufixo "-FINAL-3VIDEOS.mp4"</li>
					<li>O processo pode demorar alguns minutos</li>
				</ul>
			</div>
		</div>
	);
}
