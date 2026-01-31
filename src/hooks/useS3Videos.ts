import { useState, useCallback } from "react";
import { useS3ConfigStore } from "../store/store-s3-config";

/**
 * Hook para gerenciar vídeos de introdução/encerramento do bucket AWS.
 *
 * MUDANÇA: Agora usa a configuração S3 do usuário (store-s3-config)
 * para buscar vídeos na pasta "assets/" do mesmo bucket.
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
  const { config } = useS3ConfigStore();
  const [videos, setVideos] = useState<S3Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar lista de vídeos usando configuração S3 do usuário
  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔍 useS3Videos - Carregando vídeos com config:", {
        bucketName: config.bucketName,
        region: config.region,
        hasCredentials: !!(config.accessKeyId && config.secretAccessKey),
      });

      // Criar configuração para buscar vídeos na pasta "assets/"
      const assetsConfig = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        bucketName: config.bucketName,
        folderPrefix: "assets", // Vídeos ficam na pasta assets/
      };

      const result: S3VideosResult = await window.electronAPI.invoke(
        "s3-videos:list",
        assetsConfig,
      );

      if (result.success) {
        console.log("✅ Vídeos carregados:", result.videos?.length || 0);
        setVideos(result.videos || []);
      } else {
        console.error("❌ Erro ao carregar vídeos:", result.message);
        setError(result.message);
        setVideos([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      console.error("❌ Exceção ao carregar vídeos:", errorMessage);
      setError(errorMessage);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Obter URL assinada para um vídeo usando configuração S3 do usuário
  const getVideoUrl = useCallback(
    async (videoKey: string): Promise<string | null> => {
      try {
        // Criar configuração para buscar vídeos na pasta "assets/"
        const assetsConfig = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          region: config.region,
          bucketName: config.bucketName,
          folderPrefix: "assets",
        };

        const result: S3UrlResult = await window.electronAPI.invoke(
          "s3-videos:get-url",
          videoKey,
          assetsConfig,
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
    [config],
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
