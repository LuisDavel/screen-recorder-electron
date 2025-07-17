import React, { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Settings, AlertCircle, UserCheck, FileText } from "lucide-react";
import { ScreenPreview } from "@/components/ScreenPreview";
import { RecordingControls } from "@/components/screen-recorder/RecordingControls";
import { useSaveLocationStore } from "@/store/store-local-path-video";
import { useSourceVideoStore } from "@/store/store-source-video";
import { CameraConfigDialog } from "@/components/CameraConfigDialog";
import { MicrophoneConfigDialog } from "@/components/MicrophoneConfigDialog";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";
import { usePermissionsInitializer } from "@/hooks/usePermissionsInitializer";
import { HeaderConfig } from "@/components/recording-header/HeaderConfig";
import { FooterConfig } from "@/components/recording-header/FooterConfig";
import { PermissionsManager } from "@/components/PermissionsManager";
import { useDeviceInitialization } from "@/hooks/useDeviceInitialization";
import { useDeviceNotifications } from "@/hooks/useDeviceNotifications";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { usePatientDataStore } from "@/store/store-patient-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Tipo para os dados recebidos via deep link
type DeepLinkData = {
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
};

export default function HomePage() {
	const { saveLocation } = useSaveLocationStore();
	const { sourceId } = useSourceVideoStore();
	const { isEnabled: cameraEnabled, mainStream } = useCameraConfigStore();
	const { isEnabled: microphoneEnabled, mainStream: microphoneStream } =
		useMicrophoneConfigStore();
	const { updateHeaderConfig } = useHeaderConfigStore();
	const { setPatientData } = usePatientDataStore();

	// Estado para o dialog de confirmação
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [deepLinkData, setDeepLinkData] = useState<DeepLinkData | null>(null);

	// Initialize permissions automatically when the app starts
	const { initializePermissions, allPermissionsGranted } =
		usePermissionsInitializer({
			autoRequestOnMount: true,
			retryCount: 2,
			retryDelay: 3000,
		});

	// Use the new centralized device initialization and notifications
	const { reconnectDevices, isAnyDeviceInitializing } = useDeviceInitialization(
		{
			devices: ["camera", "microphone"],
			autoInitialize: true,
		},
	);

	useDeviceNotifications({
		devices: ["camera", "microphone"],
	});

	// Função para mapear dados do deep link para o formato do header
	const mapDeepLinkToHeaderConfig = useCallback((data: DeepLinkData) => {
		// Formatar data do exame
		const examDate = new Date(data.dataExame).toLocaleDateString('pt-BR');
		
		// Formatar idade
		const age = `${data.pacienteIdade} anos`;
		
		// Mapear sexo
		const sex = data.pacienteSexo === 'M' ? 'Masculino' : 'Feminino';

		return {
			examName: data.terminologiaInterna || "Exame",
			examDate: examDate,
			patientName: data.pacienteNome,
			patientSex: sex as "Masculino" | "Feminino",
			patientAge: age,
			institutionName: data.intituicaoNome,
			requestingDoctor: data.requisitanteNome,
			crm: "", // Não disponível nos dados recebidos
			externalId: data.codigoAtendimento,
		};
	}, []);

	// Função para aceitar e aplicar os dados
	const handleAcceptData = useCallback(() => {
		if (deepLinkData) {
			// Armazenar dados do paciente no store
			setPatientData(deepLinkData);
			
			// Mapear e atualizar dados do header
			const headerData = mapDeepLinkToHeaderConfig(deepLinkData);
			updateHeaderConfig(headerData);
			
			setShowConfirmDialog(false);
			setDeepLinkData(null);
		}
	}, [deepLinkData, mapDeepLinkToHeaderConfig, updateHeaderConfig, setPatientData]);

	// Função para rejeitar os dados
	const handleRejectData = useCallback(() => {
		setShowConfirmDialog(false);
		setDeepLinkData(null);
	}, []);

	// Listener IPC para receber dados do deep link
	useEffect(() => {
		const handleDeepLinkData = (data: unknown) => {
			console.log('📡 Dados recebidos via deep link:', data);
			setDeepLinkData(data as DeepLinkData);
			setShowConfirmDialog(true);
		};

		// Registrar o listener
		window.deepLinkAPI?.onUserData(handleDeepLinkData);

		// Cleanup
		return () => {
			window.deepLinkAPI?.removeUserDataListener(handleDeepLinkData);
		};
	}, []);

	const handlePermissionsUpdated = useCallback(() => {
		// Trigger a re-check if needed
		if (!allPermissionsGranted) {
			setTimeout(() => initializePermissions(), 1000);
		}
	}, [allPermissionsGranted, initializePermissions]);

	// Manual reconnection handler
	const handleReconnectDevices = useCallback(async () => {
		await reconnectDevices();
	}, [reconnectDevices]);

	// Effect to reconnect camera when page is mounted
	useEffect(() => {
		const timer = setTimeout(() => {
			// Force reconnect camera if it's enabled but has no stream
			if (cameraEnabled && !mainStream) {
				console.log("🔄 HomePage: Tentando reconectar câmera...");
				handleReconnectDevices();
			}
		}, 1000);

		return () => clearTimeout(timer);
	}, [cameraEnabled, mainStream, handleReconnectDevices]);

	return (
		<div className="flex h-full flex-col gap-6 p-6">
			{/* Dialog de confirmação para dados do deep link */}
			<Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserCheck className="h-5 w-5" />
							Dados do Paciente Recebidos
						</DialogTitle>
						<DialogDescription>
							Recebemos dados de um exame via deep link. Deseja substituir as configurações atuais do cabeçalho?
						</DialogDescription>
					</DialogHeader>
					
					{deepLinkData && (
						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-lg">
										<FileText className="h-4 w-4" />
										Dados do Exame
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Exame
											</label>
											<p className="text-sm">{deepLinkData.terminologiaInterna}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Data do Exame
											</label>
											<p className="text-sm">{new Date(deepLinkData.dataExame).toLocaleDateString('pt-BR')}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Paciente
											</label>
											<p className="text-sm">{deepLinkData.pacienteNome}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Idade / Sexo
											</label>
											<p className="text-sm">{deepLinkData.pacienteIdade} anos / {deepLinkData.pacienteSexo === 'M' ? 'Masculino' : 'Feminino'}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Instituição
											</label>
											<p className="text-sm">{deepLinkData.intituicaoNome}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Médico Solicitante
											</label>
											<p className="text-sm">{deepLinkData.requisitanteNome}</p>
										</div>
										<div className="col-span-2">
											<label className="text-sm font-medium text-muted-foreground">
												Código do Atendimento
											</label>
											<p className="text-sm">{deepLinkData.codigoAtendimento}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={handleRejectData}>
									Cancelar
								</Button>
								<Button onClick={handleAcceptData}>
									Substituir Dados do Cabeçalho
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{!allPermissionsGranted ? (
				<div className="w-full max-w-2xl mx-auto">
					<PermissionsManager onPermissionsUpdated={handlePermissionsUpdated} />
				</div>
			) : (
				<>
					<div className="grid w-full grid-cols-2 gap-8">
						<ScreenPreview />
						<div className="space-y-4">
							<HeaderConfig />
							<FooterConfig />
						</div>
					</div>
					<div className="grid grid-cols-2 gap-8 w-full">
						<div>
							<RecordingControls
								selectedSourceId={sourceId}
								onRecordingStateChange={() => {}}
								selectedSaveLocation={saveLocation}
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Settings className="text-primary h-6 w-6" />
								<span>Configurações</span>
							</div>

							<div className="max-h-[calc(100vh-200px)] space-y-2 overflow-auto">
								<div className="grid grid-cols-2 gap-2">
									<CameraConfigDialog />
									<MicrophoneConfigDialog />
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="bg-muted/50 flex items-center justify-between rounded-xl backdrop-blur-sm p-3">
										<div className="flex items-center space-x-3">
											<div
												className={`h-3 w-3 rounded-full ${
													cameraEnabled && mainStream
														? "animate-pulse bg-green-500"
														: cameraEnabled
															? "bg-yellow-500"
															: "bg-gray-400"
												}`}
											/>
											<div className="flex flex-col">
												<span className="text-sm font-medium">
													Câmera:{" "}
													{cameraEnabled && mainStream
														? "Ativa"
														: cameraEnabled
															? "Configurada"
															: "Desabilitada"}
												</span>
											</div>
										</div>
										{cameraEnabled && mainStream && (
											<div className="flex items-center space-x-1">
												<div className="h-2 w-2 rounded-full bg-green-400"></div>
												<span className="text-xs text-green-600">LIVE</span>
											</div>
										)}
									</div>
									<div className="bg-muted/50 flex items-center justify-between rounded-xl backdrop-blur-sm p-3">
										<div className="flex items-center space-x-3">
											<div
												className={`h-3 w-3 rounded-full ${
													microphoneEnabled && microphoneStream
														? "animate-pulse bg-green-500"
														: microphoneEnabled
															? "bg-yellow-500"
															: "bg-gray-400"
												}`}
											/>
											<div className="flex flex-col">
												<span className="text-sm font-medium">
													Microfone:{" "}
													{microphoneEnabled && microphoneStream
														? "Ativo"
														: microphoneEnabled
															? "Configurado"
															: "Desabilitado"}
												</span>
											</div>
										</div>
										{microphoneEnabled && microphoneStream && (
											<div className="flex items-center space-x-1">
												<div className="h-2 w-2 rounded-full bg-green-400"></div>
												<span className="text-xs text-green-600">LIVE</span>
											</div>
										)}
									</div>
								</div>

								{/* Reconnect button for devices */}
								{((cameraEnabled && !mainStream) ||
									(microphoneEnabled && !microphoneStream)) && (
									<Button
										onClick={handleReconnectDevices}
										disabled={isAnyDeviceInitializing}
										variant="outline"
										className="w-full text-sm"
									>
										{isAnyDeviceInitializing
											? "Reconectando..."
											: "Reconectar Dispositivos"}
									</Button>
								)}

								<Link to="/config">
									<Button variant="outline" className="h-12 w-full text-base">
										<Settings className="mr-2 h-4 w-4" />
										Acessar Configurações
									</Button>
								</Link>

								{/* Show diagnostic alert if there are permission issues */}
								{!allPermissionsGranted && (
									<div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
										<AlertCircle className="h-4 w-4" />
										<span>
											Problemas de permissão detectados. Execute o diagnóstico
											para obter ajuda.
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
