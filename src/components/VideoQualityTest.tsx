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

export function VideoQualityTest() {
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<string>("");
	const [testVideoPath, setTestVideoPath] = useState("/tmp/test-recorded.mp4");

	const testVideoQuality = async () => {
		if (!window.videoConcatAPI) {
			setResult("❌ API de concatenação não disponível");
			return;
		}

		setIsProcessing(true);
		setResult(
			"🎬 Testando qualidade de concatenação (preservando duração completa)...\n",
		);

		try {
			const result = await window.videoConcatAPI.autoConcatenateRobust({
				recordedVideoPath: testVideoPath,
				outputPath: "/tmp/test-quality-output.mp4",
			});

			setResult(
				(prev) => prev + `✅ Sucesso!\n${JSON.stringify(result, null, 2)}\n\n`,
			);
			setResult((prev) => prev + `📊 Método usado: ${result.method}\n`);
			setResult((prev) => prev + `📁 Arquivo salvo em: ${result.outputPath}\n`);
			setResult(
				(prev) =>
					prev +
					`📏 Tamanho: ${((result.fileSize || 0) / 1024 / 1024).toFixed(2)} MB\n`,
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
				border: "2px solid #28a745",
				borderRadius: "8px",
				backgroundColor: "#f8fff9",
				margin: "20px",
			}}
		>
			<h3>✨ Teste de Qualidade - Preservação Completa</h3>

			<div style={{ marginBottom: "15px" }}>
				<p>
					<strong>🔧 Melhorias implementadas:</strong>
				</p>
				<ul style={{ fontSize: "14px", color: "#333", marginLeft: "20px" }}>
					<li>✅ Removido forçamento de FPS (preserva duração original)</li>
					<li>✅ Adicionado setpts/asetpts para sincronização correta</li>
					<li>✅ Método alternativo que preserva características originais</li>
					<li>✅ Múltiplos métodos de fallback</li>
				</ul>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label
					style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
				>
					Caminho do vídeo gravado:
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
			</div>

			<button
				onClick={testVideoQuality}
				disabled={isProcessing}
				style={{
					padding: "10px 20px",
					backgroundColor: isProcessing ? "#ccc" : "#28a745",
					color: "white",
					border: "none",
					borderRadius: "4px",
					cursor: isProcessing ? "not-allowed" : "pointer",
					fontSize: "16px",
				}}
			>
				{isProcessing ? "🔄 Processando..." : "✨ Testar Qualidade Melhorada"}
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
				<strong>🎯 O que foi corrigido:</strong>
				<ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
					<li>
						<strong>Duração preservada:</strong> Não força FPS, mantém duração
						original
					</li>
					<li>
						<strong>Sincronização:</strong> setpts/asetpts para timestamps
						corretos
					</li>
					<li>
						<strong>Fallbacks inteligentes:</strong> 4 métodos diferentes de
						concatenação
					</li>
					<li>
						<strong>Qualidade:</strong> Preserva características originais
						quando possível
					</li>
				</ul>
			</div>
		</div>
	);
}
