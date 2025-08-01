// Sistema de vídeos de introdução para o renderer process
// Usa apenas IPC para comunicação com o main process

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

// Mapeamento local para verificação rápida (sem usar IPC)
const HOSPITAL_INTRO_MAPPING = {
    "Hospital São Jose": "hsj.mp4",
    "Samuel Cesconetto": "me.mp4",
    "Unimed": "unimed.mp4",
    "Hospital São João Batista": "hsj.mp4",
    "Hospital São Donato": "hsd.mp4",
} as const;

export type HospitalName = keyof typeof HOSPITAL_INTRO_MAPPING;

/**
 * Verifica se existe vídeo de introdução para uma instituição (verificação local)
 */
export function hasIntroVideo(institutionName: string): boolean {
    const hasVideo = institutionName in HOSPITAL_INTRO_MAPPING;
    console.log("🔍 Verificando vídeo de introdução:", { institutionName, hasVideo });
    return hasVideo;
}

/**
 * Obtém lista de instituições que possuem vídeos de introdução (verificação local)
 */
export function getAvailableInstitutions(): HospitalName[] {
    return Object.keys(HOSPITAL_INTRO_MAPPING) as HospitalName[];
}

/**
 * Obtém o nome do arquivo de vídeo para uma instituição
 */
export function getVideoFileName(institutionName: string): string | null {
    return HOSPITAL_INTRO_MAPPING[institutionName as HospitalName] || null;
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
 * Concatena vídeo de introdução com vídeo gravado (via IPC)
 * Esta função será implementada quando o IPC estiver funcionando
 */
export async function concatenateWithIntro(
    institutionName: string,
    recordedVideoPath: string,
    outputPath: string
): Promise<ConcatenateResult> {
    try {
        console.log("🎬 Iniciando concatenação via IPC:", {
            institutionName,
            recordedVideoPath,
            outputPath
        });

        // Usar IPC para concatenar no main process
        const result = await window.electronAPI.invoke("video-intro:concatenate", {
            institutionName,
            recordedVideoPath,
            outputPath,
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