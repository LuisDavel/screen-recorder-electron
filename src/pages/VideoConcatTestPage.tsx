import React, { useState, useCallback } from "react";
import { VideoConcatenationTest } from "../components/VideoConcatenationTest";
import { VideoConcatenationOverlay } from "../components/VideoConcatenationOverlay";
import { VideoConcatDebug } from "../components/VideoConcatDebug";
import { ThreeVideoTest } from "../components/ThreeVideoTest";
import { VideoQualityTest } from "../components/VideoQualityTest";
import { FirstVideoTest } from "../components/FirstVideoTest";
import { VideoSelector } from "../components/VideoSelector";
import { S3VideoTest } from "../components/S3VideoTest";
import { useVideoConcatenation } from "../hooks/useVideoConcatenation";

export function VideoConcatTestPage() {
  const { isOverlayVisible, recordedVideoPath, closeOverlay } =
    useVideoConcatenation();

  const [videoConfig, setVideoConfig] = useState({
    introVideo: { key: "", url: "" },
    outroVideo: { key: "", url: "" },
  });

  const handleVideoConfigChange = useCallback(
    (config: {
      introVideo: { key: string; url: string };
      outroVideo: { key: string; url: string };
    }) => {
      setVideoConfig(config);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            🎬 Sistema de Concatenação de 3 Vídeos
          </h1>
          <p className="text-gray-600">
            Vídeo Remoto 1 + Vídeo Gravado + Vídeo Remoto 2
          </p>
        </div>

        {/* Seletor de Vídeos S3 */}
        <VideoSelector
          onVideoConfigChange={handleVideoConfigChange}
          className="mb-8"
        />

        {/* Teste com vídeos S3 selecionados */}
        <S3VideoTest videoConfig={videoConfig} />

        {/* Componente de debug */}
        <VideoConcatDebug />

        {/* Componente de diagnóstico do primeiro vídeo */}
        <FirstVideoTest />

        {/* Componente de teste de qualidade melhorada */}
        <VideoQualityTest />

        {/* Componente de teste de 3 vídeos */}
        <ThreeVideoTest />

        {/* Componente de teste manual */}
        <VideoConcatenationTest />

        {/* Informações sobre o sistema */}
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
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
                  2. Sequência de 3 Vídeos
                </h3>
                <p className="text-sm text-gray-600">
                  Vídeo remoto 1 (início) + Seu vídeo gravado (meio) + Vídeo
                  remoto 2 (fim)
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
                  &quot;-FINAL-3VIDEOS.mp4&quot;
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-md bg-blue-50 p-4">
              <h3 className="mb-2 font-medium text-blue-900">
                💡 Recursos Técnicos:
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
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
