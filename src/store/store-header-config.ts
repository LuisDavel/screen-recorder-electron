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

interface HeaderConfigStore {
	headerConfig: HeaderConfig;
	updateHeaderConfig: (config: Partial<HeaderConfig>) => void;
	resetHeaderConfig: () => void;
}

const defaultHeaderConfig: HeaderConfig = {
	isEnabled: true,
	height: 80,
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

export const useHeaderConfigStore = create<HeaderConfigStore>()(
	persist(
		(set) => ({
			headerConfig: defaultHeaderConfig,
			updateHeaderConfig: (config) =>
				set((state) => ({
					headerConfig: { ...state.headerConfig, ...config },
				})),
			resetHeaderConfig: () => set({ headerConfig: defaultHeaderConfig }),
		}),
		{
			name: "header-config-storage",
		},
	),
);
