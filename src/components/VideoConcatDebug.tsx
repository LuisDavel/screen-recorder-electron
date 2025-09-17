import React, { useState } from "react";

interface VideoConcatAPI {
	test: () => Promise<{ success: boolean; message: string }>;
	testRobust: () => Promise<unknown>;
	checkFFmpeg: () => Promise<{ available: boolean; message: string }>;
	debugPaths: () => Promise<unknown>;
	debugThreeVideos: () => Promise<unknown>;
}

declare global {
	interface Window {
		videoConcatAPI?: VideoConcatAPI;
	}
}

export function VideoConcatDebug() {
	const [results, setResults] = useState<string[]>([]);

	const addResult = (message: string) => {
		setResults((prev) => [
			...prev,
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	};

	const testHandler = async () => {
		try {
			addResult("🧪 Testando handler de teste...");
			if (!window.videoConcatAPI) {
				addResult("❌ videoConcatAPI não disponível");
				return;
			}

			const result = await window.videoConcatAPI.test();
			addResult(`✅ Teste bem-sucedido: ${JSON.stringify(result)}`);
		} catch (error) {
			addResult(`❌ Erro no teste: ${error}`);
		}
	};

	const testRobustHandler = async () => {
		try {
			addResult("🧪 Testando handler robusto...");
			if (!window.videoConcatAPI) {
				addResult("❌ videoConcatAPI não disponível");
				return;
			}

			const result = await window.videoConcatAPI.testRobust();
			addResult(`✅ Teste robusto: ${JSON.stringify(result)}`);
		} catch (error) {
			addResult(`❌ Erro no teste robusto: ${error}`);
		}
	};

	const testFFmpeg = async () => {
		try {
			addResult("🧪 Testando FFmpeg...");
			if (!window.videoConcatAPI) {
				addResult("❌ videoConcatAPI não disponível");
				return;
			}

			const result = await window.videoConcatAPI.checkFFmpeg();
			addResult(`✅ FFmpeg: ${JSON.stringify(result)}`);
		} catch (error) {
			addResult(`❌ Erro FFmpeg: ${error}`);
		}
	};

	const debugPaths = async () => {
		try {
			addResult("🔍 Debugando caminhos do FFmpeg...");
			if (!window.videoConcatAPI) {
				addResult("❌ videoConcatAPI não disponível");
				return;
			}

			const result = await window.videoConcatAPI.debugPaths();
			addResult(`🔍 Debug paths: ${JSON.stringify(result, null, 2)}`);
		} catch (error) {
			addResult(`❌ Erro debug paths: ${error}`);
		}
	};

	const debugThreeVideos = async () => {
		try {
			addResult("🔍 Debugando configuração de 3 vídeos...");
			if (!window.videoConcatAPI) {
				addResult("❌ videoConcatAPI não disponível");
				return;
			}

			const result = await window.videoConcatAPI.debugThreeVideos();
			addResult(`🔍 Debug 3 vídeos: ${JSON.stringify(result, null, 2)}`);
		} catch (error) {
			addResult(`❌ Erro debug 3 vídeos: ${error}`);
		}
	};

	const clearResults = () => {
		setResults([]);
	};

	return (
		<div
			style={{
				padding: "20px",
				border: "2px solid #333",
				borderRadius: "8px",
				backgroundColor: "#f5f5f5",
				margin: "20px",
			}}
		>
			<h3>🔧 Debug Video Concat Handlers</h3>

			<div style={{ marginBottom: "20px" }}>
				<button onClick={testHandler} style={{ marginRight: "10px" }}>
					🧪 Testar Handler Básico
				</button>
				<button onClick={debugPaths} style={{ marginRight: "10px" }}>
					🔍 Debug Caminhos FFmpeg
				</button>
				<button onClick={debugThreeVideos} style={{ marginRight: "10px" }}>
					🔍 Debug 3 Vídeos
				</button>
				<button onClick={testFFmpeg} style={{ marginRight: "10px" }}>
					🧪 Testar FFmpeg
				</button>
				<button onClick={testRobustHandler} style={{ marginRight: "10px" }}>
					🧪 Testar Handler Robusto
				</button>
				<button onClick={clearResults}>🗑️ Limpar</button>
			</div>

			<div
				style={{
					backgroundColor: "#000",
					color: "#0f0",
					padding: "10px",
					borderRadius: "4px",
					fontFamily: "monospace",
					fontSize: "12px",
					maxHeight: "300px",
					overflowY: "auto",
				}}
			>
				{results.length === 0 ? (
					<div>Clique nos botões acima para testar os handlers...</div>
				) : (
					results.map((result, index) => <div key={index}>{result}</div>)
				)}
			</div>

			<div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
				<strong>Status da API:</strong>{" "}
				{window.videoConcatAPI ? "✅ Disponível" : "❌ Não disponível"}
			</div>
		</div>
	);
}
