import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Configuração S3 do usuário para UPLOAD de gravações.
 *
 * IMPORTANTE: Esta configuração NÃO é usada para buscar vídeos de intro/outro.
 * Os vídeos de introdução e encerramento vêm de um bucket AWS fixo (assets)
 * configurado no backend via variáveis de ambiente.
 *
 * Este store é usado APENAS para:
 * - Configurar onde os vídeos gravados serão salvos (upload)
 * - Definir credenciais do bucket de destino do usuário
 */
export interface S3Config {
  isEnabled: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  folderPrefix?: string; // Pasta onde os vídeos gravados serão salvos
  isConfigured: boolean;
}

interface S3ConfigState {
  config: S3Config;
  setEnabled: (enabled: boolean) => void;
  setCredentials: (accessKeyId: string, secretAccessKey: string) => void;
  setRegion: (region: string) => void;
  setBucketName: (bucketName: string) => void;
  setFolderPrefix: (prefix: string) => void;
  isValidConfig: () => boolean;
  resetConfig: () => void;
}

const defaultConfig: S3Config = {
  isEnabled: true,
  accessKeyId: "",
  secretAccessKey: "",
  region: "us-east-1",
  bucketName: "", // Bucket onde os vídeos gravados serão salvos
  folderPrefix: "gravacoes", // Pasta para organizar as gravações
  isConfigured: false, // Será true quando credenciais forem configuradas
};

export const useS3ConfigStore = create<S3ConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,

      setEnabled: (enabled: boolean) => {
        set((state) => ({
          config: {
            ...state.config,
            isEnabled: enabled,
          },
        }));
      },

      setCredentials: (accessKeyId: string, secretAccessKey: string) => {
        set((state) => {
          const newConfig = {
            ...state.config,
            accessKeyId,
            secretAccessKey,
          };
          return {
            config: {
              ...newConfig,
              isConfigured: validateConfig(newConfig),
            },
          };
        });
      },

      setRegion: (region: string) => {
        set((state) => {
          const newConfig = {
            ...state.config,
            region,
          };
          return {
            config: {
              ...newConfig,
              isConfigured: validateConfig(newConfig),
            },
          };
        });
      },

      setBucketName: (bucketName: string) => {
        set((state) => {
          const newConfig = {
            ...state.config,
            bucketName,
          };
          return {
            config: {
              ...newConfig,
              isConfigured: validateConfig(newConfig),
            },
          };
        });
      },

      setFolderPrefix: (prefix: string) => {
        set((state) => ({
          config: {
            ...state.config,
            folderPrefix: prefix,
          },
        }));
      },

      isValidConfig: () => {
        return validateConfig(get().config);
      },

      resetConfig: () => {
        set({ config: defaultConfig });
      },
    }),
    {
      name: "s3-config-storage",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migrar de 'gravações' para 'assets'
          if (persistedState?.config?.folderPrefix === "gravações") {
            persistedState.config.folderPrefix = "assets";
          }
        }
        return persistedState;
      },
    },
  ),
);

function validateConfig(config: S3Config): boolean {
  return !!(
    config.accessKeyId &&
    config.secretAccessKey &&
    config.region &&
    config.bucketName
  );
}

export type { S3ConfigState };
