import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface HeaderConfig {
	isEnabled: boolean;
	height: number;
	examName: string;
	examDate: string;
	patientName: string;
	patientSex: "Masculino" | "Feminino" | "" | undefined;
	patientAge: string;
	institutionName: string;
	requestingDoctor: string;
	crm: string;
	externalId: string;
}

export interface FooterConfig {
	isEnabled: boolean;
	height: number;
}

interface HeaderConfigStore {
	headerConfig: HeaderConfig;
	updateHeaderConfig: (config: Partial<HeaderConfig>) => void;
	resetHeaderConfig: () => void;
	footerConfig: FooterConfig;
	updateFooterConfig: (config: Partial<FooterConfig>) => void;
	resetFooterConfig: () => void;
}

const defaultHeaderConfig: HeaderConfig = {
	isEnabled: true,
	height: 120, // Aumentado de 80 para 120px
	examName: "Ultrassonografia Abdominal",
	examDate: "2025-07-05",
	patientName: "Nome completo do paciente",
	patientSex: "Masculino" as const,
	patientAge: "35 anos",
	institutionName: "Nome do hospital, clínica ou laboratório",
	requestingDoctor: "Nome do médico",
	crm: "12345/SP",
	externalId: "Código/ID",
};

const defaultFooterConfig: FooterConfig = {
	isEnabled: true, // Habilitado por padrão
	height: 30, // Diminuído de 40 para 30px
};

export const useHeaderConfigStore = create<HeaderConfigStore>()(
	persist(
		(set) => ({
			headerConfig: defaultHeaderConfig,
			updateHeaderConfig: (config) =>
				set((state) => ({
					headerConfig: { ...state.headerConfig, ...config },
				})),
			resetHeaderConfig: () => set({ headerConfig: defaultHeaderConfig }),
			footerConfig: defaultFooterConfig,
			updateFooterConfig: (config) =>
				set((state) => ({
					footerConfig: { ...state.footerConfig, ...config },
				})),
			resetFooterConfig: () => set({ footerConfig: defaultFooterConfig }),
		}),
		{
			name: "header-config-storage",
		},
	),
);
