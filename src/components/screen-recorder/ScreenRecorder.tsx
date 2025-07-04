import React, { useState } from "react";
import SourceSelector from "./SourceSelector";
import RecordingControls from "./RecordingControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor } from "lucide-react";
import { useSaveLocationStore } from "@/store/store-local-path-video";

export default function ScreenRecorder() {
	const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const { saveLocation } = useSaveLocationStore();

	const handleSourceSelected = (sourceId: string) => {
		setSelectedSourceId(sourceId);
	};

	const handleRecordingStateChange = (recording: boolean) => {
		setIsRecording(recording);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center space-x-2">
				<Monitor className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold">Screen Recorder</h1>
					<p className="text-muted-foreground">
						Grave sua tela ou janelas específicas facilmente
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Fonte selecionada:</span>
							<span className="text-sm text-muted-foreground">
								{selectedSourceId
									? "✓ Fonte selecionada"
									: "Nenhuma fonte selecionada"}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Local de salvamento:</span>
							<span className="text-sm text-muted-foreground">
								{saveLocation
									? "✓ Local selecionado"
									: "Nenhum local selecionado"}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Estado da gravação:</span>
							<span
								className={`text-sm font-medium ${
									isRecording
										? "text-red-600 dark:text-red-400"
										: "text-green-600 dark:text-green-400"
								}`}
							>
								{isRecording ? "🔴 Gravando" : "⏹️ Parado"}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Informações */}
			{/* <Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Info className="h-5 w-5" />
						<span>Como usar</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm text-muted-foreground">
						<p>
							1. Selecione uma fonte de captura (tela inteira ou janela
							específica)
						</p>
						<p>
							2. Escolha onde salvar o vídeo (pasta recomendada ou
							personalizada)
						</p>
						<p>3. Clique em "Iniciar Gravação" para começar a gravar</p>
						<p>4. Clique em "Parar Gravação" quando terminar</p>
						<p>5. O vídeo será salvo automaticamente no local escolhido</p>
					</div>
				</CardContent>
			</Card> */}

			{/* Seletor de Fonte */}
			<Card>
				<CardHeader>
					<CardTitle>Fonte de Captura</CardTitle>
				</CardHeader>
				<CardContent>
					<SourceSelector
						onSourceSelected={handleSourceSelected}
						disabled={isRecording}
					/>
				</CardContent>
			</Card>

			{/* Local de Salvamento */}

			{/* Controles de Gravação */}
			<Card>
				<CardHeader>
					<CardTitle>Controles</CardTitle>
				</CardHeader>
				<CardContent>
					<RecordingControls
						selectedSourceId={selectedSourceId}
						onRecordingStateChange={handleRecordingStateChange}
						selectedSaveLocation={saveLocation}
					/>
				</CardContent>
			</Card>

			{/* Teste de Debug */}

			{/* Status */}
		</div>
	);
}
