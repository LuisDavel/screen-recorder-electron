import { useState, useCallback, useEffect } from "react";
import { useS3ConfigStore } from "@/store/store-s3-config";

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  folderPrefix?: string;
}

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
  const { config: s3StoreConfig, isValidConfig } = useS3ConfigStore();

  // Obter configuração S3 válida do store
  const s3Config = isValidConfig()
    ? {
        accessKeyId: s3StoreConfig.accessKeyId,
        secretAccessKey: s3StoreConfig.secretAccessKey,
        region: s3StoreConfig.region,
        bucketName: s3StoreConfig.bucketName,
        folderPrefix: s3StoreConfig.folderPrefix,
      }
    : null;

  // Buscar lista de vídeos
  const loadVideos = useCallback(
    async (config?: S3Config) => {
      const configToUse = config || s3Config;

      if (!configToUse) {
        setError("Configuração S3 não encontrada");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result: S3VideosResult = await window.electronAPI.invoke(
          "s3-videos:list",
          configToUse,
        );

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
    },
    [s3Config],
  );

  // Obter URL assinada para um vídeo
  const getVideoUrl = useCallback(
    async (videoKey: string, config?: S3Config): Promise<string | null> => {
      const configToUse = config || s3Config;

      if (!configToUse) {
        setError("Configuração S3 não encontrada");
        return null;
      }

      try {
        const result: S3UrlResult = await window.electronAPI.invoke(
          "s3-videos:get-url",
          configToUse,
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
    [s3Config],
  );

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    videos,
    loading,
    error,
    s3Config,
    loadVideos,
    getVideoUrl,
    clearError,
  };
}
