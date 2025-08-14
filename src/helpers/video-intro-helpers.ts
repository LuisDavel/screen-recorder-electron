import {
    VIDEO_INTRO_CONCATENATE_CHANNEL,
    VIDEO_INTRO_GET_AVAILABLE_CHANNEL,
    VIDEO_INTRO_CHECK_INTRO_CHANNEL,
} from "./ipc/video-intro/video-intro-channels";

export interface IntroVideoInfo {
    hasIntro: boolean;
    path: string | null;
    institutionName?: string;
    error?: string;
}

export interface AvailableInstitution {
    name: string;
    videoPath: string;
    videoFile: string;
}

export interface ConcatenateResult {
    success: boolean;
    message: string;
    outputPath?: string;
}

/**
 * Verifica se existe vídeo de introdução para uma instituição
 */
export async function checkIntroVideo(institutionName: string): Promise<IntroVideoInfo> {
    try {
        return await window.electronAPI.invoke(VIDEO_INTRO_CHECK_INTRO_CHANNEL, institutionName);
    } catch (error) {
        console.error("Erro ao verificar vídeo de introdução:", error);
        return {
            hasIntro: false,
            path: null,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Obtém lista de instituições que possuem vídeos de introdução
 */
export async function getAvailableInstitutions(): Promise<{
    success: boolean;
    institutions: AvailableInstitution[];
    error?: string;
}> {
    try {
        return await window.electronAPI.invoke(VIDEO_INTRO_GET_AVAILABLE_CHANNEL);
    } catch (error) {
        console.error("Erro ao obter instituições disponíveis:", error);
        return {
            success: false,
            institutions: [],
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Concatena vídeo de introdução com vídeo gravado
 */
export async function concatenateWithIntro(
    institutionName: string,
    recordedVideoPath: string,
    outputPath: string
): Promise<ConcatenateResult> {
    try {
        return await window.electronAPI.invoke(VIDEO_INTRO_CONCATENATE_CHANNEL, {
            institutionName,
            recordedVideoPath,
            outputPath,
        });
    } catch (error) {
        console.error("Erro ao concatenar vídeos:", error);
        return {
            success: false,
            message: `Erro ao concatenar vídeos: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Gera nome de arquivo para vídeo com introdução
 */
export function generateIntroVideoFileName(
    institutionName: string,
    originalFileName: string
): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = originalFileName.split('.').pop() || 'mp4';

    // Códigos das instituições
    const institutionCodes: Record<string, string> = {
        "Hospital São Jose": "HSJ",
        "Samuel Cesconetto": "SC",
        "Unimed": "UNI",
        "Hospital São João Batista": "HSJB",
        "Hospital São Donato": "HSD",
        "CliniImagem": "CLI"
    };

    const code = institutionCodes[institutionName] || "UNKNOWN";
    return `${code}-intro-recording-${timestamp}.${extension}`;
}