import { ipcMain, BrowserWindow } from "electron";
import { existsSync, unlinkSync, renameSync } from "fs";
import {
    FILE_SYSTEM_DELETE_FILE_CHANNEL,
    FILE_SYSTEM_EXISTS_CHANNEL,
    FILE_SYSTEM_MOVE_FILE_CHANNEL,
} from "./file-system-channels";

export function addFileSystemEventListeners(mainWindow: BrowserWindow) {
    // Deletar arquivo
    ipcMain.handle(FILE_SYSTEM_DELETE_FILE_CHANNEL, async (event, filePath: string) => {
        try {
            console.log("🗑️ Deletando arquivo:", filePath);

            if (!existsSync(filePath)) {
                return {
                    success: false,
                    message: `Arquivo não existe: ${filePath}`
                };
            }

            unlinkSync(filePath);
            console.log("✅ Arquivo deletado com sucesso:", filePath);

            return {
                success: true,
                message: "Arquivo deletado com sucesso"
            };
        } catch (error) {
            console.error("❌ Erro ao deletar arquivo:", error);
            return {
                success: false,
                message: `Erro ao deletar arquivo: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    });

    // Verificar se arquivo existe
    ipcMain.handle(FILE_SYSTEM_EXISTS_CHANNEL, async (event, filePath: string) => {
        try {
            const exists = existsSync(filePath);
            console.log("🔍 Verificando existência do arquivo:", { filePath, exists });
            return { exists };
        } catch (error) {
            console.error("❌ Erro ao verificar arquivo:", error);
            return { exists: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Mover/renomear arquivo
    ipcMain.handle(FILE_SYSTEM_MOVE_FILE_CHANNEL, async (event, { from, to }: { from: string; to: string }) => {
        try {
            console.log("📁 Movendo arquivo:", { from, to });

            if (!existsSync(from)) {
                return {
                    success: false,
                    message: `Arquivo origem não existe: ${from}`
                };
            }

            renameSync(from, to);
            console.log("✅ Arquivo movido com sucesso:", { from, to });

            return {
                success: true,
                message: "Arquivo movido com sucesso"
            };
        } catch (error) {
            console.error("❌ Erro ao mover arquivo:", error);
            return {
                success: false,
                message: `Erro ao mover arquivo: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    });
}