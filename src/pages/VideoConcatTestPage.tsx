import React from "react";
import { VideoConcatenationTest } from "../components/VideoConcatenationTest";
import { VideoConcatenationOverlay } from "../components/VideoConcatenationOverlay";
import { VideoConcatDebug } from "../components/VideoConcatDebug";
import { useVideoConcatenation } from "../hooks/useVideoConcatenation";

export function VideoConcatTestPage() {
	const { isOverlayVisible, recordedVideoPath, closeOverlay } =
		useVideoConcatenation();

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						🎬 Sistema de Concatenação de Vídeos
					</h1>
					<p className="text-gray-600">
						Teste e demonstração da funcionalidade de concatenação automática
					</p>
				</div>

				{/* Componente de debug */}
				<VideoConcatDebug />

				{/* Componente de teste manual */}
				<VideoConcatenationTest />

				{/* Informações sobre o sistema */}
				<div className="mt-8 max-w-2xl mx-auto">
					<div className="bg-white p-6 rounded-lg shadow-sm">
						<h2 className="text-lg font-semibold mb-4">
							🔄 Como funciona o sistema:
						</h2>

						<div className="space-y-4">
							<div className="border-l-4 border-blue-500 pl-4">
								<h3 className="font-medium text-blue-900">
									1. Gravação Automática
								</h3>
								<p className="text-sm text-gray-600">
									Quando você grava e salva um vídeo, o sistema automaticamente
									inicia a concatenação
								</p>
							</div>

							<div className="border-l-4 border-green-500 pl-4">
								<h3 className="font-medium text-green-900">
									2. Vídeo Introdutório
								</h3>
								<p className="text-sm text-gray-600">
									O vídeo remoto é adicionado no início do seu vídeo gravado
								</p>
							</div>

							<div className="border-l-4 border-purple-500 pl-4">
								<h3 className="font-medium text-purple-900">
									3. Overlay de Loading
								</h3>
								<p className="text-sm text-gray-600">
									Um overlay aparece mostrando o progresso da concatenação em
									tempo real
								</p>
							</div>

							<div className="border-l-4 border-orange-500 pl-4">
								<h3 className="font-medium text-orange-900">
									4. Resultado Final
								</h3>
								<p className="text-sm text-gray-600">
									O vídeo final é salvo automaticamente com o sufixo
									"-concatenated&quot;
								</p>
							</div>
						</div>

						<div className="mt-6 p-4 bg-blue-50 rounded-md">
							<h3 className="font-medium text-blue-900 mb-2">
								💡 Recursos Técnicos:
							</h3>
							<ul className="text-sm text-blue-800 space-y-1">
								<li>• FFmpeg integrado via ffmpeg-static</li>
								<li>• Concatenação sem recodificação (copy codec)</li>
								<li>• Progresso em tempo real</li>
								<li>• Tratamento robusto de erros</li>
								<li>• Limpeza automática de arquivos temporários</li>
								<li>• Timeout de segurança (10 minutos)</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			{/* Overlay de concatenação automática */}
			<VideoConcatenationOverlay
				isVisible={isOverlayVisible}
				recordedVideoPath={recordedVideoPath || undefined}
				onClose={closeOverlay}
			/>
		</div>
	);
}
