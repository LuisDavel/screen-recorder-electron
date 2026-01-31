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

  // Carregar vídeos quando o componente montar
  useEffect(() => {
    console.log("🎬 VideoSelectComponent montado", {
      videosCount: videos.length,
      loading,
      error,
    });

    if (videos.length === 0 && !loading && !error) {
      console.log("📥 Iniciando carregamento de vídeos...");
      loadVideos();
    }
  }, []);

  // Log quando vídeos forem carregados
  useEffect(() => {
    console.log("🎬 Vídeos atualizados:", {
      count: videos.length,
      videos: videos.map((v) => v.displayName),
      loading,
      error,
    });
  }, [videos, loading, error]);

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
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

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

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <p className="mb-1 font-semibold">❌ Erro ao carregar vídeos:</p>
          <p className="mb-2">{error}</p>
          <button
            onClick={handleReload}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
          >
            🔄 Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
