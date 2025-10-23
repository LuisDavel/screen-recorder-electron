import { useState, useCallback } from "react";

/**
 * Hook para gerenciar vídeos de introdução/encerramento do bucket AWS fixo.
 *
 * IMPORTANTE: Este hook NÃO usa configuração do usuário.
 * Os vídeos vêm de um bucket AWS fixo (assets) configurado no backend.
 * A configuração S3 do usuário (store-s3-config) é usada APENAS para upload de gravações.
 */

interface S3Video {
  key: string;
  name: string;
  displayName: string;
  lastModified?: Date;
  size?: number;
}

interface S3VideosResult {
  success: boolean;
  message: string;
  videos?: S3Video[];
  error?: string;
}

interface S3UrlResult {
  success: boolean;
  message: string;
  url?: string;
  error?: string;
}

export function useS3Videos() {
  const [videos, setVideos] = useState<S3Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar lista de vídeos do bucket assets fixo
  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // NÃO passa configuração - o backend usa configuração fixa do bucket assets
      const result: S3VideosResult =
        await window.electronAPI.invoke("s3-videos:list");

      if (result.success) {
        setVideos(result.videos || []);
      } else {
        setError(result.message);
        setVideos([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Obter URL assinada para um vídeo do bucket assets fixo
  const getVideoUrl = useCallback(
    async (videoKey: string): Promise<string | null> => {
      try {
        // NÃO passa configuração - o backend usa configuração fixa do bucket assets
        const result: S3UrlResult = await window.electronAPI.invoke(
          "s3-videos:get-url",
          videoKey,
        );

        if (result.success) {
          return result.url || null;
        } else {
          setError(result.message);
          return null;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao obter URL do vídeo";
        setError(errorMessage);
        return null;
      }
    },
    [],
  );

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    videos,
    loading,
    error,
    loadVideos,
    getVideoUrl,
    clearError,
  };
}
