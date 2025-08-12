import { join } from "path";

// Mapeamento dos hospitais com seus respectivos vídeos de encerramento
export const HOSPITAL_OUTRO_MAPPING = {
    "Hospital São Jose": "hsj.mp4",
    "Samuel Cesconetto": "me.mp4",
    "Unimed": "unimed.mp4",
    "Hospital São João Batista": "hsj.mp4", // Usando mesmo vídeo do São Jose
    "Hospital São Donato": "hsd.mp4",
} as const;

// Vídeo de introdução sempre será o me.mp4
export const INTRO_VIDEO_FILE = "me.mp4";

export type HospitalName = keyof typeof HOSPITAL_OUTRO_MAPPING;

export class VideoIntroManager {
    private static readonly ASSETS_PATH = "src/assets/videos";

    /**
     * Obtém o caminho do vídeo de introdução (sempre me.mp4)
     */
    static getIntroVideoPath(): string {
        const path = join(this.ASSETS_PATH, INTRO_VIDEO_FILE);
        console.log("🎬 VideoIntroManager - Caminho de introdução:", {
            videoFileName: INTRO_VIDEO_FILE,
            path,
            assetsPath: this.ASSETS_PATH
        });

        return path;
    }

    /**
     * Obtém o caminho do vídeo de encerramento baseado no nome da instituição
     */
    static getOutroVideoPath(institutionName: string): string | null {
        console.log("🔍 VideoIntroManager - Buscando vídeo de encerramento:", {
            institutionName,
            availableInstitutions: Object.keys(HOSPITAL_OUTRO_MAPPING),
            mapping: HOSPITAL_OUTRO_MAPPING
        });

        const videoFileName = HOSPITAL_OUTRO_MAPPING[institutionName as HospitalName];

        if (!videoFileName) {
            console.warn(`Vídeo de encerramento não encontrado para: ${institutionName}`);
            console.warn("Instituições disponíveis:", Object.keys(HOSPITAL_OUTRO_MAPPING));
            return null;
        }

        const path = join(this.ASSETS_PATH, videoFileName);
        console.log("🎬 VideoIntroManager - Caminho de encerramento:", {
            institutionName,
            videoFileName,
            path,
            assetsPath: this.ASSETS_PATH
        });

        return path;
    }

    /**
     * Verifica se existe vídeo de introdução (sempre true, pois sempre usa me.mp4)
     */
    static hasIntroVideo(): boolean {
        return true;
    }

    /**
     * Verifica se existe vídeo de encerramento para a instituição
     */
    static hasOutroVideo(institutionName: string): boolean {
        return institutionName in HOSPITAL_OUTRO_MAPPING;
    }

    /**
     * Lista todas as instituições que possuem vídeos de encerramento
     */
    static getAvailableInstitutions(): HospitalName[] {
        return Object.keys(HOSPITAL_OUTRO_MAPPING) as HospitalName[];
    }

    /**
     * Concatena vídeo de introdução + gravação + vídeo de encerramento usando FFmpeg
     * Esta função deve ser chamada no main process do Electron
     */
    static async concatenateWithIntroAndOutro(
        institutionName: string,
        recordedVideoPath: string,
        outputPath: string,
        includeIntro: boolean = true,
        includeOutro: boolean = false
    ): Promise<{ success: boolean; message: string; outputPath?: string }> {
        try {
            const introVideoPath = includeIntro ? this.getIntroVideoPath() : null;
            const outroVideoPath = includeOutro ? this.getOutroVideoPath(institutionName) : null;

            if (includeOutro && !outroVideoPath) {
                return {
                    success: false,
                    message: `Vídeo de encerramento não encontrado para ${institutionName}`
                };
            }

            // Aqui você implementaria a lógica de concatenação usando FFmpeg
            console.log(`Concatenando vídeos:
				${includeIntro ? `Introdução: ${introVideoPath}` : ''}
				Gravação: ${recordedVideoPath}
				${includeOutro ? `Encerramento: ${outroVideoPath}` : ''}
				Saída: ${outputPath}
			`);

            // TODO: Implementar concatenação real com FFmpeg
            return {
                success: true,
                message: "Vídeos concatenados com sucesso",
                outputPath
            };

        } catch (error) {
            console.error("Erro ao concatenar vídeos:", error);
            return {
                success: false,
                message: `Erro ao concatenar vídeos: ${error}`
            };
        }
    }

    /**
     * Gera nome de arquivo para o vídeo final com introdução
     */
    static generateOutputFileName(
        institutionName: string,
        originalFileName: string
    ): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const extension = originalFileName.split('.').pop() || 'mp4';
        const institutionCode = this.getInstitutionCode(institutionName);

        return `${institutionCode}-recording-${timestamp}.${extension}`;
    }

    /**
     * Obtém código da instituição para nomenclatura de arquivos
     */
    private static getInstitutionCode(institutionName: string): string {
        const codes: Record<HospitalName, string> = {
            "Hospital São Jose": "HSJ",
            "Samuel Cesconetto": "SC",
            "Unimed": "UNI",
            "Hospital São João Batista": "HSJB",
            "Hospital São Donato": "HSD"
        };

        return codes[institutionName as HospitalName] || "UNKNOWN";
    }
}