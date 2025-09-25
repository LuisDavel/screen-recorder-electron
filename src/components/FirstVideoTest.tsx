import React, { useState } from "react";

interface VideoConcatAPI {
	testFirstVideo: (options?: { outputPath?: string }) => Promise<{
		success: boolean;
		outputPath: string;
		message: string;
		fileSize?: number;
	}>;
}

declare global {
	interface Window {
		videoConcatAPI?: VideoConcatAPI;
	}
}

export function FirstVideoTest() {
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<string>("");

	const testFirstVideoOnly = async () => {
		if (!window.videoConcatAPI) {
			setResult("❌ API de concatenação não disponível");
			return;
		}

		setIsProcessing(true);
		setResult("🔍 Testando apenas o primeiro vídeo (diagnóstico)...\n");

		try {
			const result = await window.videoConcatAPI.testFirstVideo({
				outputPath: "/tmp/diagnostic-first-video.mp4",
			});

			setResult(
				(prev) => prev + `✅ Sucesso!\n${JSON.stringify(result, null, 2)}\n\n`,
			);
			setResult((prev) => prev + `📁 Arquivo salvo em: ${result.outputPath}\n`);
			setResult(
				(prev) =>
					prev +
					`📏 Tamanho: ${((result.fileSize || 0) / 1024 / 1024).toFixed(2)} MB\n\n`,
			);
			setResult(
				(prev) =>
					prev +
					`🎯 DIAGNÓSTICO: Se este vídeo estiver completo, o problema está na concatenação.\n`,
			);
			setResult(
				(prev) =>
					prev +
					`Se este vídeo também estiver cortado, o problema está no vídeo original.\n`,
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
				border: "2px solid #dc3545",
				borderRadius: "8px",
				backgroundColor: "#fff5f5",
				margin: "20px",
			}}
		>
			<h3>🔍 Diagnóstico - Teste do Primeiro Vídeo</h3>

			<div style={{ marginBottom: "15px" }}>
				<p>
					<strong>🎯 Objetivo do teste:</strong>
				</p>
				<ul style={{ fontSize: "14px", color: "#333", marginLeft: "20px" }}>
					<li>Baixar e processar APENAS o primeiro vídeo remoto</li>
					<li>
						Verificar se o problema está no vídeo original ou na concatenação
					</li>
					<li>Usar o comando FFmpeg mais simples possível</li>
				</ul>
			</div>

			<div
				style={{
					marginBottom: "15px",
					padding: "10px",
					backgroundColor: "#fff3cd",
					borderRadius: "4px",
				}}
			>
				<strong>📋 Vídeo testado:</strong>
				<br />
				<code style={{ fontSize: "12px" }}>
					https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4
				</code>
			</div>

			<button
				onClick={testFirstVideoOnly}
				disabled={isProcessing}
				style={{
					padding: "10px 20px",
					backgroundColor: isProcessing ? "#ccc" : "#dc3545",
					color: "white",
					border: "none",
					borderRadius: "4px",
					cursor: isProcessing ? "not-allowed" : "pointer",
					fontSize: "16px",
				}}
			>
				{isProcessing ? "🔄 Processando..." : "🔍 Testar Primeiro Vídeo"}
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
				<strong>🔬 Como interpretar o resultado:</strong>
				<ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
					<li>
						<strong>Se o vídeo estiver completo:</strong> O problema está na
						concatenação
					</li>
					<li>
						<strong>Se o vídeo estiver cortado:</strong> O problema está no
						vídeo original ou na rede
					</li>
					<li>
						<strong>Se der erro:</strong> Problema de conectividade ou FFmpeg
					</li>
				</ul>
			</div>
		</div>
	);
}
