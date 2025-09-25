import React, { useState, useEffect, useCallback } from "react";
import { useS3Videos } from "../hooks/useS3Videos";

interface VideoSelectProps {
  label: string;
  selectedVideo: string;
  onVideoChange: (videoKey: string, videoUrl: string) => void;
  placeholder?: string;
  className?: string;
}

export function VideoSelectComponent({
  label,
  selectedVideo,
  onVideoChange,
  placeholder = "Selecione um vídeo...",
  className = "",
}: VideoSelectProps) {
  const {
    videos,
    loading,
    error,
    s3Config,
    loadVideos,
    getVideoUrl,
    clearError,
  } = useS3Videos();

  const [urlCache, setUrlCache] = useState<{ [key: string]: string }>({});
  console.log(urlCache);
  // Carregar vídeos quando o componente montar ou a configuração S3 mudar
  useEffect(() => {
    if (s3Config && videos.length === 0 && !loading && !error) {
      loadVideos();
    }
  }, [s3Config]);

  // Lidar com mudança de seleção
  const handleVideoChange = useCallback(
    async (videoKey: string) => {
      if (!videoKey) {
        onVideoChange("", "");
        return;
      }

      try {
        // Verificar se já temos a URL no cache
        let videoUrl = urlCache[videoKey];

        if (!videoUrl) {
          // Obter URL assinada se não estiver em cache
          videoUrl = await getVideoUrl(videoKey);

          if (videoUrl) {
            // Atualizar cache
            setUrlCache((prev) => ({ ...prev, [videoKey]: videoUrl }));
          }
        }

        if (videoUrl) {
          onVideoChange(videoKey, videoUrl);
        } else {
          console.error("Não foi possível obter URL para o vídeo:", videoKey);
        }
      } catch (err) {
        console.error("Erro ao obter URL do vídeo:", err);
      }
    },
    [getVideoUrl, onVideoChange, urlCache],
  );

  // Recarregar vídeos manualmente
  const handleReload = useCallback(() => {
    clearError();
    setUrlCache({});
    loadVideos();
  }, [loadVideos, clearError]);

  if (!s3Config) {
    return (
      <div
        className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${className}`}
      >
        <div className="flex items-center space-x-2">
          <div className="h-5 w-5 text-yellow-600">⚠️</div>
          <div>
            <h3 className="font-medium text-yellow-800">{label}</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Configure suas credenciais AWS para ver os vídeos disponíveis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>

        <button
          onClick={handleReload}
          disabled={loading}
          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          <span className={loading ? "animate-spin" : ""}>🔄</span>
          <span>Recarregar</span>
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="flex items-start space-x-2">
            <div className="mt-0.5 h-4 w-4 text-red-600">❌</div>
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="mt-1 text-xs text-red-600 hover:text-red-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <select
          value={selectedVideo}
          onChange={(e) => handleVideoChange(e.target.value)}
          disabled={loading || videos.length === 0}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">{placeholder}</option>
          {videos.map((video) => (
            <option key={video.key} value={video.key}>
              {video.displayName}
            </option>
          ))}
        </select>

        {loading && (
          <div className="absolute top-1/2 right-8 -translate-y-1/2 transform">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {videos.length === 0 && !loading && (
        <p className="text-sm text-gray-500 italic">
          Nenhum vídeo encontrado no bucket S3.
        </p>
      )}

      {selectedVideo && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-start space-x-2">
            <div className="mt-0.5 h-4 w-4 text-blue-600">✅</div>
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                <strong>Vídeo selecionado:</strong>{" "}
                {videos.find((v) => v.key === selectedVideo)?.displayName}
              </p>
              {urlCache[selectedVideo] && (
                <p className="mt-1 font-mono text-xs break-all text-blue-600">
                  URL: {urlCache[selectedVideo].substring(0, 80)}...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>
          <strong>Vídeos disponíveis:</strong> {videos.length} encontrados
        </p>
        {videos.length > 0 && (
          <p className="mt-1">
            <strong>Formatos aceitos:</strong> huc, intro, hsjb, cliniimagem,
            hsj
          </p>
        )}
      </div>
    </div>
  );
}
