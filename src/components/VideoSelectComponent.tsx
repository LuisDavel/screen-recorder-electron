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
  const { videos, loading, error, loadVideos, getVideoUrl, clearError } =
    useS3Videos();

  const [urlCache, setUrlCache] = useState<{ [key: string]: string }>({});
  console.log(urlCache);

  // Carregar vídeos quando o componente montar
  useEffect(() => {
    if (videos.length === 0 && !loading && !error) {
      loadVideos();
    }
  }, []);

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

  return (
    <div className={`space-y-3 ${className}`}>
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
    </div>
  );
}
