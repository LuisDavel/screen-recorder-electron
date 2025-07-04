import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScreenRecorderManager } from "@/helpers/screen_recorder_helpers";

export default function TestRecorder() {
	const [isRecording, setIsRecording] = useState(false);
	const [recorder] = useState(() => new ScreenRecorderManager());

	const testRecording = async () => {
		if (!isRecording) {
			try {
				console.log("=== INICIANDO TESTE DE GRAVAÇÃO ===");

				// Obter uma fonte de tela
				const sources = await window.screenRecorder.getSources();
				console.log("Fontes disponíveis:", sources.length);

				if (sources.length === 0) {
					alert("Nenhuma fonte de captura disponível");
					return;
				}

				// Usar a primeira fonte (normalmente a tela principal)
				const primarySource = sources[0];
				console.log("Usando fonte:", primarySource.name);

				// Iniciar gravação
				await recorder.startRecording(primarySource.id);
				setIsRecording(true);
				console.log("Gravação iniciada");
			} catch (error) {
				console.error("Erro ao iniciar teste:", error);
				alert("Erro ao iniciar gravação: " + error);
			}
		} else {
			try {
				console.log("=== PARANDO TESTE DE GRAVAÇÃO ===");
				await recorder.stopRecording();
				setIsRecording(false);
				console.log("Gravação parada");
			} catch (error) {
				console.error("Erro ao parar teste:", error);
				alert("Erro ao parar gravação: " + error);
			}
		}
	};

	return (
		<div className="p-4 border rounded-lg">
			<h3 className="text-lg font-bold mb-4">Teste de Gravação</h3>
			<p className="text-sm text-muted-foreground mb-4">
				Este é um teste simples para verificar se a gravação está funcionando.
				Abra o console do DevTools para ver os logs detalhados.
			</p>

			<Button
				onClick={testRecording}
				variant={isRecording ? "destructive" : "default"}
				size="lg"
			>
				{isRecording ? "🔴 Parar Teste" : "▶️ Iniciar Teste"}
			</Button>

			{isRecording && (
				<p className="mt-2 text-sm text-orange-600">
					⚠️ Gravando... Pare em alguns segundos para testar o salvamento
				</p>
			)}
		</div>
	);
}
