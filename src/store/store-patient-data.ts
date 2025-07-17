import { create } from "zustand";

export interface PatientData {
	id: number;
	idExterno: null;
	dataCadastro: string;
	dataExame: string;
	dataLaudo: string;
	dataImagem: null;
	dataEntrega: null;
	codigoAtendimento: string;
	exameCodigo: string;
	terminologiaInterna: string;
	abreviacao: null;
	codPaciente: string;
	pacienteNome: string;
	pacienteIdade: number;
	pacienteSexo: string;
	dataNasc: string;
	horasRestantes: string;
	intituicaoNome: string;
	instituicaoSigla: string;
	requisitanteNome: string;
	responsavelNome: string;
	digitadoraNome: null;
	idstatus: number;
	status: string;
	statusCor: string;
	tipoatendimento: null;
	prontuario: string;
	achadoCritico: string;
	fluxoCor: null;
	fluxo: null;
	idtipoexame: number;
}

interface PatientDataState {
	patientData: PatientData | null;
	setPatientData: (data: PatientData) => void;
	clearPatientData: () => void;
	getPatientId: () => number | null;
	hasPatientData: () => boolean;
}

export const usePatientDataStore = create<PatientDataState>((set, get) => ({
	patientData: null,
	
	setPatientData: (data: PatientData) => {
		console.log('📊 Armazenando dados do paciente no store:', data);
		set({ patientData: data });
	},
	
	clearPatientData: () => {
		console.log('🗑️ Limpando dados do paciente do store');
		set({ patientData: null });
	},
	
	getPatientId: () => {
		const state = get();
		return state.patientData?.id || null;
	},
	
	hasPatientData: () => {
		const state = get();
		return state.patientData !== null;
	},
})); 