import {
  FFMPEG_CHECK_AVAILABILITY_CHANNEL,
  FFMPEG_GET_INSTALL_SUGGESTION_CHANNEL,
  FFMPEG_AUTO_INSTALL_CHANNEL,
  FFMPEG_GET_DEBUG_LOGS_CHANNEL,
} from "./ipc/ffmpeg/ffmpeg-channels";

export interface FFmpegInfo {
  isAvailable: boolean;
  version?: string;
  error?: string;
}

/**
 * Verifica se o FFmpeg está disponível no sistema (RENDERER PROCESS)
 */
export async function checkFFmpegAvailability(): Promise<FFmpegInfo> {
  try {
    // Verificar se a electronAPI está disponível
    if (!window.electronAPI) {
      console.error("❌ window.electronAPI não está disponível");
      return {
        isAvailable: false,
        error:
          "ElectronAPI não está disponível. Verifique se o preload está funcionando.",
      };
    }

    console.log("🔍 Chamando FFmpeg check via IPC...");
    const result = await window.electronAPI.invoke(
      FFMPEG_CHECK_AVAILABILITY_CHANNEL,
    );
    console.log("🔍 Resultado do FFmpeg check:", result);
    return result;
  } catch (error) {
    console.error("❌ Erro ao verificar FFmpeg:", error);
    return {
      isAvailable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Obtém sugestões de instalação do FFmpeg (RENDERER PROCESS)
 */
export async function suggestFFmpegInstallation(): Promise<{
  canAutoInstall: boolean;
  installCommand?: string;
  instructions: string[];
}> {
  try {
    if (!window.electronAPI) {
      return {
        canAutoInstall: false,
        instructions: ["ElectronAPI não está disponível"],
      };
    }

    return await window.electronAPI.invoke(
      FFMPEG_GET_INSTALL_SUGGESTION_CHANNEL,
    );
  } catch (error) {
    return {
      canAutoInstall: false,
      instructions: [
        `Erro: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Tenta instalar FFmpeg automaticamente (RENDERER PROCESS)
 */
export async function autoInstallFFmpeg(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!window.electronAPI) {
      return {
        success: false,
        message: "ElectronAPI não está disponível",
      };
    }

    return await window.electronAPI.invoke(FFMPEG_AUTO_INSTALL_CHANNEL);
  } catch (error) {
    return {
      success: false,
      message: `Erro na instalação: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Obtém logs de debug do FFmpeg (RENDERER PROCESS)
 */
export async function getFFmpegDebugLogs(): Promise<{
  logs: string[];
  platform?: string;
  arch?: string;
  cwd?: string;
  resourcesPath?: string;
}> {
  try {
    if (!window.electronAPI) {
      return {
        logs: ["ElectronAPI não está disponível"],
      };
    }

    return await window.electronAPI.invoke(FFMPEG_GET_DEBUG_LOGS_CHANNEL);
  } catch (error) {
    return {
      logs: [
        `Erro ao obter logs: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}
