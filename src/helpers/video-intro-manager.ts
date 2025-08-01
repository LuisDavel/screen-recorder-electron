import { join } from "path";

// Mapeamento dos hospitais com seus respectivos vídeos de introdução
export const HOSPITAL_INTRO_MAPPING = {
    "Hospital São Jose": "hsj.mp4",
    "Samuel Cesconetto": "me.mp4",
    "Unimed": "unimed.mp4",
    "Hospital São João Batista": "hsj.mp4", // Usando o mesmo vídeo do São Jose por enquanto
    "Hospital São Donato": "hsd.mp4",
} as const;

export type HospitalName = keyof typeof HOSPITAL_INTRO_MAPPING;

export class VideoIntroManager {
    private static readonly ASSETS_PATH = "assets";

    /**
     * Obtém o caminho do vídeo de introdução baseado no nome da instituição
     */
    static getIntroVideoPath(institutionName: string): string | null {
        const videoFileName = HOSPITAL_INTRO_MAPPING[institutionName as HospitalName];

        if (!videoFileName) {
            console.warn(`Vídeo de introdução não encontrado para: ${institutionName}`);
            return null;
        }

        const path = join(this.ASSETS_PATH, videoFileName);
        console.log("🎬 VideoIntroManager - Caminho gerado:", {
            institutionName,
            videoFileName,
            path,
            assetsPath: this.ASSETS_PATH
        });

        return path;
    }

    /**
     * Verifica se existe vídeo de introdução para a instituição
     */
    static hasIntroVideo(institutionName: string): boolean {
        return institutionName in HOSPITAL_INTRO_MAPPING;
    }

    /**
     * Lista todas as instituições que possuem vídeos de introdução
     */
    static getAvailableInstitutions(): HospitalName[] {
        return Object.keys(HOSPITAL_INTRO_MAPPING) as HospitalName[];
    }

    /**
     * Concatena o vídeo de introdução com o vídeo gravado usando FFmpeg
     * Esta função deve ser chamada no main process do Electron
     */
    static async concatenateWithIntro(
        institutionName: string,
        recordedVideoPath: string,
        outputPath: string
    ): Promise<{ success: boolean; message: string; outputPath?: string }> {
        try {
            const introVideoPath = this.getIntroVideoPath(institutionName);

            if (!introVideoPath) {
                return {
                    success: false,
                    message: `Vídeo de introdução não encontrado para ${institutionName}`
                };
            }

            // Aqui você implementaria a lógica de concatenação usando FFmpeg
            // Por enquanto, vamos retornar uma simulação
            console.log(`Concatenando vídeos:
				Introdução: ${introVideoPath}
				Gravação: ${recordedVideoPath}
				Saída: ${outputPath}
			`);

            // TODO: Implementar concatenação real com FFmpeg
            // const ffmpegCommand = `ffmpeg -i "${introVideoPath}" -i "${recordedVideoPath}" -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" "${outputPath}"`;

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