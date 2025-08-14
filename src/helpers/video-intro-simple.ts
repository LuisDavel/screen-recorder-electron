// Versão simplificada do sistema de vídeos de introdução para teste

export const HOSPITAL_VIDEOS = {
    "Hospital São Jose": "hsj.mp4",
    "Samuel Cesconetto": "me.mp4",
    "Unimed": "unimed.mp4",
    "Hospital São João Batista": "hsj.mp4",
    "Hospital São Donato": "hsd.mp4",
    "CliniImagem": "clini.mp4",
} as const;

export type HospitalName = keyof typeof HOSPITAL_VIDEOS;

/**
 * Verifica se existe vídeo para uma instituição (versão simplificada)
 */
export function hasIntroVideoSimple(institutionName: string): boolean {
    return institutionName in HOSPITAL_VIDEOS;
}

/**
 * Obtém o nome do arquivo de vídeo para uma instituição
 */
export function getVideoFileName(institutionName: string): string | null {
    return HOSPITAL_VIDEOS[institutionName as HospitalName] || null;
}

/**
 * Lista todas as instituições disponíveis
 */
export function getAvailableInstitutionsSimple(): HospitalName[] {
    return Object.keys(HOSPITAL_VIDEOS) as HospitalName[];
}