import { ipcMain, BrowserWindow } from "electron";
import {
    FFMPEG_CHECK_AVAILABILITY_CHANNEL,
    FFMPEG_GET_INSTALL_SUGGESTION_CHANNEL,
    FFMPEG_AUTO_INSTALL_CHANNEL,
} from "./ffmpeg-channels";
import {
    checkFFmpegAvailability,
    suggestFFmpegInstallation,
    autoInstallFFmpeg
} from "../../ffmpeg-checker-main";

export function addFFmpegEventListeners(mainWindow: BrowserWindow) {
    // Verificar disponibilidade do FFmpeg
    ipcMain.handle(FFMPEG_CHECK_AVAILABILITY_CHANNEL, async () => {
        try {
            return await checkFFmpegAvailability();
        } catch (error) {
            console.error("Erro ao verificar FFmpeg:", error);
            return {
                isAvailable: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    // Obter sugestões de instalação
    ipcMain.handle(FFMPEG_GET_INSTALL_SUGGESTION_CHANNEL, async () => {
        try {
            return await suggestFFmpegInstallation();
        } catch (error) {
            console.error("Erro ao obter sugestões de instalação:", error);
            return {
                canAutoInstall: false,
                instructions: [`Erro: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    });

    // Instalar FFmpeg automaticamente
    ipcMain.handle(FFMPEG_AUTO_INSTALL_CHANNEL, async () => {
        try {
            return await autoInstallFFmpeg();
        } catch (error) {
            console.error("Erro ao instalar FFmpeg:", error);
            return {
                success: false,
                message: `Erro na instalação: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    });
}