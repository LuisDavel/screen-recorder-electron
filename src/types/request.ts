export type ClientRequest = {
    error: number;
    data: [
        {
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
    ]
}