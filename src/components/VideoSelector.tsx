import React, { useState, useCallback } from "react";
import { VideoSelectComponent } from "./VideoSelectComponent";
import { S3ConfigDialog } from "./S3ConfigDialog";

interface VideoSelectorProps {
  onVideoConfigChange: (config: {
    introVideo: { key: string; url: string };
    outroVideo: { key: string; url: string };
  }) => void;
  className?: string;
}

export function VideoSelector({
  onVideoConfigChange,
  className = "",
}: VideoSelectorProps) {
  const [introVideo, setIntroVideo] = useState({ key: "", url: "" });
  const [outroVideo, setOutroVideo] = useState({ key: "", url: "" });

  // Lidar com mudança do vídeo de introdução
  const handleIntroVideoChange = useCallback(
    (key: string, url: string) => {
      const newIntroVideo = { key, url };
      setIntroVideo(newIntroVideo);

      // Notificar mudança para o componente pai
      onVideoConfigChange({
        introVideo: newIntroVideo,
        outroVideo,
      });
    },
    [outroVideo, onVideoConfigChange],
  );

  // Lidar com mudança do vídeo de encerramento
  const handleOutroVideoChange = useCallback(
    (key: string, url: string) => {
      const newOutroVideo = { key, url };
      setOutroVideo(newOutroVideo);

      // Notificar mudança para o componente pai
      onVideoConfigChange({
        introVideo,
        outroVideo: newOutroVideo,
      });
    },
    [introVideo, onVideoConfigChange],
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              🎬 Seleção de Vídeos
            </h2>
            <p className="text-sm text-gray-600">
              Escolha os vídeos de introdução e encerramento que serão usados na
              concatenação.
            </p>
          </div>
          <S3ConfigDialog
            trigger={
              <button className="flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                <span>⚙️</span>
                <span>Config AWS</span>
              </button>
            }
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <VideoSelectComponent
              label="🎬 Vídeo de Introdução"
              selectedVideo={introVideo.key}
              onVideoChange={handleIntroVideoChange}
              placeholder="Selecione o vídeo de abertura..."
              className="h-full"
            />
          </div>

          <div className="space-y-2">
            <VideoSelectComponent
              label="🎭 Vídeo de Encerramento"
              selectedVideo={outroVideo.key}
              onVideoChange={handleOutroVideoChange}
              placeholder="Selecione o vídeo de fechamento..."
              className="h-full"
            />
          </div>
        </div>

        {/* Status da configuração */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  introVideo.url ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
              <span
                className={introVideo.url ? "text-green-700" : "text-gray-500"}
              >
                Vídeo de Introdução:{" "}
                {introVideo.url ? "Configurado" : "Não selecionado"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  outroVideo.url ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
              <span
                className={outroVideo.url ? "text-green-700" : "text-gray-500"}
              >
                Vídeo de Encerramento:{" "}
                {outroVideo.url ? "Configurado" : "Não selecionado"}
              </span>
            </div>
          </div>

          {introVideo.url && outroVideo.url && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 text-green-600">✅</div>
                <p className="text-sm text-green-800">
                  <strong>Configuração completa!</strong> Os vídeos estão
                  prontos para serem usados na concatenação.
                </p>
              </div>
            </div>
          )}

          {(!introVideo.url || !outroVideo.url) && (
            <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 text-yellow-600">⚠️</div>
                <p className="text-sm text-yellow-800">
                  Selecione ambos os vídeos para utilizar a funcionalidade de
                  concatenação.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-medium text-blue-900">💡 Como funciona:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>
            • Os vídeos são carregados automaticamente da sua conta AWS S3
          </li>
          <li>
            • Formato esperado: huc.mp4, intro.mp4, hsjb.mp4, cliniimagem.mp4,
            hsj.mp4
          </li>
          <li>
            • A sequência final será: Introdução → Vídeo Gravado → Encerramento
          </li>
          <li>• URLs são geradas automaticamente e válidas por 1 hora</li>
          <li>• Configure suas credenciais AWS nas configurações do app</li>
        </ul>
      </div>
    </div>
  );
}
