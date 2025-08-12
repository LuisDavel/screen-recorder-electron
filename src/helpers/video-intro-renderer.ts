// Sistema de vídeos de introdução para o renderer process

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

// Mapeamento de hospitais para arquivos de vídeo de encerramento
const HOSPITAL_OUTRO_MAPPING = {
    "Hospital São Jose": "hsj.mp4",
    "Samuel Cesconetto": "me.mp4",
    "Unimed": "unimed.mp4",
    "Hospital São João Batista": "hsj.mp4", // Usando mesmo vídeo do São Jose
    "Hospital São Donato": "hsd.mp4",
} as const;

// Vídeo de introdução sempre será o me.mp4
const INTRO_VIDEO_FILE = "me.mp4";

export type HospitalName = keyof typeof HOSPITAL_OUTRO_MAPPING;

/**
 * Verifica se existe vídeo de introdução (sempre true, pois sempre usa me.mp4)
 */
export function hasIntroVideo(): boolean {
    console.log("🔍 Vídeo de introdução sempre disponível (me.mp4)");
    return true;
}

/**
 * Verifica se existe vídeo de encerramento para uma instituição
 */
export function hasOutroVideo(institutionName: string): boolean {
    const hasVideo = institutionName in HOSPITAL_OUTRO_MAPPING;
    console.log("🔍 Verificando vídeo de encerramento:", { institutionName, hasVideo });
    return hasVideo;
}

/**
 * Obtém lista de instituições que possuem vídeos de encerramento
 */
export function getAvailableInstitutions(): HospitalName[] {
    return Object.keys(HOSPITAL_OUTRO_MAPPING) as HospitalName[];
}

/**
 * Obtém o nome do arquivo de vídeo de encerramento para uma instituição
 */
export function getOutroVideoFileName(institutionName: string): string | null {
    return HOSPITAL_OUTRO_MAPPING[institutionName as HospitalName] || null;
}

/**
 * Obtém o nome do arquivo de vídeo de introdução (sempre me.mp4)
 */
export function getIntroVideoFileName(): string {
    return INTRO_VIDEO_FILE;
}

/**
 * Gera nome de arquivo para vídeo com introdução
 */
export function generateIntroVideoFileName(
    institutionName: string,
    originalFileName: string
): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = 'mp4'; // Sempre usar MP4 para compatibilidade com H.264

    // Códigos das instituições
    const institutionCodes: Record<string, string> = {
        "Hospital São Jose": "HSJ",
        "Samuel Cesconetto": "SC",
        "Unimed": "UNI",
        "Hospital São João Batista": "HSJB",
        "Hospital São Donato": "HSD"
    };

    const code = institutionCodes[institutionName] || "UNKNOWN";
    return `${code}-intro-recording-${timestamp}.${extension}`;
}

/**
 * Concatena vídeos (introdução + gravação + encerramento) via IPC
 */
export async function concatenateWithIntroAndOutro(
    institutionName: string,
    recordedVideoPath: string,
    outputPath: string,
    includeIntro: boolean = true,
    includeOutro: boolean = false
): Promise<ConcatenateResult> {
    try {
        console.log("🎬 Iniciando concatenação via IPC:", {
            institutionName,
            recordedVideoPath,
            outputPath,
            includeIntro,
            includeOutro
        });

        // Usar IPC para concatenar no main process
        const result = await window.electronAPI.invoke("video-intro:concatenate", {
            institutionName,
            recordedVideoPath,
            outputPath,
            includeIntro,
            includeOutro,
        });

        console.log("🎬 Resultado da concatenação:", result);
        return result;
    } catch (error) {
        console.error("❌ Erro ao concatenar vídeos:", error);
        return {
            success: false,
            message: `Erro ao concatenar vídeos: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Concatena apenas vídeo de introdução com vídeo gravado (compatibilidade)
 */
export async function concatenateWithIntro(
    institutionName: string,
    recordedVideoPath: string,
    outputPath: string
): Promise<ConcatenateResult> {
    return concatenateWithIntroAndOutro(institutionName, recordedVideoPath, outputPath, true, false);
}