import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useHeaderConfigStore } from "@/store/store-header-config";
import {
	FileText,
	User,
	Building,
	Hash,
	Calendar,
	Settings,
} from "lucide-react";
import { cn } from "@/utils/tailwind";
import {
	Dialog,
	DialogHeader,
	DialogContent,
	DialogTrigger,
	DialogTitle,
} from "../ui/dialog";
import { Switch } from "../ui/switch";
import {
	hasIntroVideo as hasIntroVideoFn,
	hasOutroVideo as hasOutroVideoFn,
	getAvailableInstitutions,
} from "@/helpers/video-intro-renderer";
import { Badge } from "../ui/badge";

export function HeaderConfig() {
	const { headerConfig, updateHeaderConfig } = useHeaderConfigStore();
	const [isOpen, setIsOpen] = React.useState(false);
	const [hasIntroVideo, setHasIntroVideo] = React.useState(true); // Sempre true
	const [hasOutroVideo, setHasOutroVideo] = React.useState(false);
	const [availableInstitutions, setAvailableInstitutions] = React.useState<
		string[]
	>([]);
	const handleInputChange = (
		field: string,
		value: string | number | boolean,
	) => {
		console.log("🔍 HeaderConfig - Atualizando campo:", field, "valor:", value);
		updateHeaderConfig({ [field]: value });

		// Log adicional para debug
		if (field === "institutionName") {
			console.log("🏥 Instituição alterada para:", value);
		}
		if (field === "includeIntroVideo") {
			console.log("🎬 Vídeo de introdução alterado para:", value);
		}
		if (field === "includeOutroVideo") {
			console.log("🎬 Vídeo de encerramento alterado para:", value);
		}
	};

	const toggleHeader = () => {
		// setIsOpen(!headerConfig.isEnabled);
		updateHeaderConfig({ isEnabled: !headerConfig.isEnabled });
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	// Carregar instituições disponíveis ao montar o componente
	React.useEffect(() => {
		const institutions = getAvailableInstitutions();
		setAvailableInstitutions(institutions);
	}, []);

	// Verificar se existe vídeo de encerramento quando a instituição muda
	React.useEffect(() => {
		if (headerConfig.institutionName) {
			const hasOutro = hasOutroVideoFn(headerConfig.institutionName);
			console.log("🔍 HeaderConfig - Verificando vídeo de encerramento:", {
				institutionName: headerConfig.institutionName,
				hasOutro
			});
			setHasOutroVideo(hasOutro);
		}
	}, [headerConfig.institutionName]);

	// Log do estado atual para debug
	React.useEffect(() => {
		console.log("🔍 HeaderConfig - Estado atual:", {
			includeIntroVideo: headerConfig.includeIntroVideo,
			includeOutroVideo: headerConfig.includeOutroVideo,
			institutionName: headerConfig.institutionName,
			hasIntroVideo,
			hasOutroVideo
		});
	}, [headerConfig.includeIntroVideo, headerConfig.includeOutroVideo, headerConfig.institutionName, hasIntroVideo, hasOutroVideo]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<div className="flex flex-col items-start gap-2">
				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						<p>Header Informativo</p>
					</div>
					<DialogTrigger asChild>
						<Button
							disabled={!headerConfig.isEnabled}
							variant={headerConfig.isEnabled ? "default" : "outline"}
							size="icon"
							onClick={() => handleOpenChange(!isOpen)}
						>
							<Settings className="h-4 w-4" />
						</Button>
					</DialogTrigger>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						checked={headerConfig.isEnabled}
						onCheckedChange={toggleHeader}
					/>
					<p>{headerConfig.isEnabled ? "Ativo" : "Inativo"}</p>
				</div>
			</div>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Configuração do Header</DialogTitle>
				</DialogHeader>
				<div
					className={cn(
						"space-y-6 px-4 max-h-[calc(100vh-200px)] overflow-auto",
					)}
				>
					<div>
						<p className="text-muted-foreground mb-4 text-sm">
							Preencha as informações que aparecerão no header superior da
							gravação
						</p>

						{/* Altura do Header */}
						<div className="mb-6">
							<Label className="mb-2" htmlFor="height">
								Altura do Header (px)
							</Label>
							<Input
								id="height"
								type="number"
								placeholder="80"
								value={headerConfig.height}
								onChange={(e) =>
									handleInputChange("height", parseInt(e.target.value) || 80)
								}
								className="max-w-[200px]"
							/>
						</div>

						{/* Nome e Data do Exame */}
						<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<Label
									htmlFor="examName"
									className="flex items-center gap-2 mb-2"
								>
									<FileText className="h-4 w-4" />
									Nome do Exame
								</Label>
								<Input
									id="examName"
									placeholder="Ex: Ultrassonografia Abdominal"
									value={headerConfig.examName}
									onChange={(e) =>
										handleInputChange("examName", e.target.value)
									}
								/>
							</div>
							<div>
								<Label
									htmlFor="examDate"
									className="flex items-center gap-2 mb-2"
								>
									<Calendar className="h-4 w-4" />
									Data do Exame
								</Label>
								<Input
									id="examDate"
									type="date"
									value={headerConfig.examDate}
									onChange={(e) =>
										handleInputChange("examDate", e.target.value)
									}
								/>
							</div>
						</div>

						{/* Dados do Paciente */}
						<div className="mb-6 space-y-4">
							<div>
								<Label
									htmlFor="patientName"
									className="flex items-center gap-2 mb-2"
								>
									<User className="h-4 w-4" />
									Nome do Paciente
								</Label>
								<Input
									id="patientName"
									placeholder="Nome completo do paciente"
									value={headerConfig.patientName}
									onChange={(e) =>
										handleInputChange("patientName", e.target.value)
									}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<Label htmlFor="sex" className="flex items-center gap-2 mb-2">
										<User className="h-4 w-4" />
										Sexo
									</Label>
									<Select
										value={headerConfig.patientSex || undefined}
										onValueChange={(value) =>
											handleInputChange("patientSex", value)
										}
									>
										<SelectTrigger id="sex">
											<SelectValue placeholder="Sexo" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Masculino">Masculino</SelectItem>
											<SelectItem value="Feminino">Feminino</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="age" className="flex items-center gap-2 mb-2">
										<User className="h-4 w-4" />
										Idade
									</Label>
									<Input
										id="age"
										placeholder="Ex: 35 anos"
										value={headerConfig.patientAge}
										onChange={(e) =>
											handleInputChange("patientAge", e.target.value)
										}
									/>
								</div>
							</div>
						</div>

						{/* Dados da Instituição */}
						<div className="mb-6 space-y-4">
							<div>
								<Label
									htmlFor="institution"
									className="flex items-center gap-2 mb-2"
								>
									<Building className="h-4 w-4" />
									Nome da Instituição
								</Label>
								<Select
									value={headerConfig.institutionName || undefined}
									onValueChange={(value) =>
										handleInputChange("institutionName", value)
									}
								>
									<SelectTrigger id="institution">
										<SelectValue placeholder="Selecione a instituição" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Hospital São Jose">
											<div className="flex items-center justify-between w-full">
												Hospital São Jose
												<div className="flex gap-1 ml-2">
													<Badge variant="secondary" className="text-xs">
														Intro
													</Badge>
													{availableInstitutions.includes(
														"Hospital São Jose",
													) && (
														<Badge variant="outline" className="text-xs">
															Outro
														</Badge>
													)}
												</div>
											</div>
										</SelectItem>
										<SelectItem value="Samuel Cesconetto">
											<div className="flex items-center justify-between w-full">
												Samuel Cesconetto
												<div className="flex gap-1 ml-2">
													<Badge variant="secondary" className="text-xs">
														Intro
													</Badge>
													{availableInstitutions.includes(
														"Samuel Cesconetto",
													) && (
														<Badge variant="outline" className="text-xs">
															Outro
														</Badge>
													)}
												</div>
											</div>
										</SelectItem>
										<SelectItem value="Unimed">
											<div className="flex items-center justify-between w-full">
												Unimed
												<div className="flex gap-1 ml-2">
													<Badge variant="secondary" className="text-xs">
														Intro
													</Badge>
													{availableInstitutions.includes("Unimed") && (
														<Badge variant="outline" className="text-xs">
															Outro
														</Badge>
													)}
												</div>
											</div>
										</SelectItem>
										<SelectItem value="Hospital São João Batista">
											<div className="flex items-center justify-between w-full">
												Hospital São João Batista
												<div className="flex gap-1 ml-2">
													<Badge variant="secondary" className="text-xs">
														Intro
													</Badge>
													{availableInstitutions.includes(
														"Hospital São João Batista",
													) && (
														<Badge variant="outline" className="text-xs">
															Outro
														</Badge>
													)}
												</div>
											</div>
										</SelectItem>
										<SelectItem value="Hospital São Donato">
											<div className="flex items-center justify-between w-full">
												Hospital São Donato
												<div className="flex gap-1 ml-2">
													<Badge variant="secondary" className="text-xs">
														Intro
													</Badge>
													{availableInstitutions.includes(
														"Hospital São Donato",
													) && (
														<Badge variant="outline" className="text-xs">
															Outro
														</Badge>
													)}
												</div>
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Médico e CRM */}
						<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<Label
									htmlFor="doctor"
									className="flex items-center gap-2 mb-2"
								>
									<User className="h-4 w-4" />
									Médico Requisitante
								</Label>
								<Input
									id="doctor"
									placeholder="Nome do médico"
									value={headerConfig.requestingDoctor}
									onChange={(e) =>
										handleInputChange("requestingDoctor", e.target.value)
									}
								/>
							</div>
							<div>
								<Label htmlFor="crm" className="flex items-center gap-2 mb-2">
									<Hash className="h-4 w-4" />
									CRM
								</Label>
								<Input
									id="crm"
									placeholder="Ex: 12345/SP"
									value={headerConfig.crm}
									onChange={(e) => handleInputChange("crm", e.target.value)}
								/>
							</div>
						</div>

						{/* ID Externo */}
						<div>
							<Label
								htmlFor="externalId"
								className="flex items-center gap-2 mb-2"
							>
								<Hash className="h-4 w-4" />
								ID Externo
							</Label>
							<Input
								id="externalId"
								placeholder="Código ou ID do sistema externo"
								value={headerConfig.externalId}
								onChange={(e) =>
									handleInputChange("externalId", e.target.value)
								}
							/>
						</div>

						{/* Vídeo de Introdução */}
						<div className="flex items-center border p-4 rounded-md mb-4 mt-4 justify-between">
							<div>
								<Label className="flex items-center gap-2 mb-2">
									<FileText className="h-4 w-4" />
									Vídeo de Introdução
								</Label>
								<p className="text-sm text-muted-foreground">
									Sempre usa o vídeo me.mp4
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={headerConfig.includeIntroVideo}
									onCheckedChange={(checked) => {
										handleInputChange("includeIntroVideo", checked);
									}}
								/>
							</div>
						</div>

						{/* Vídeo de Encerramento */}
						<div className="flex items-center border p-4 rounded-md mb-4 justify-between">
							<div>
								<Label className="flex items-center gap-2 mb-2">
									<FileText className="h-4 w-4" />
									Vídeo de Encerramento
								</Label>
								<p className="text-sm text-muted-foreground">
									{hasOutroVideo
										? `Usa o vídeo da instituição: ${headerConfig.institutionName}`
										: "Não disponível para esta instituição"}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={headerConfig.includeOutroVideo && hasOutroVideo}
									onCheckedChange={(checked) => {
										// Só permitir ativar se há vídeo disponível
										if (checked && !hasOutroVideo) {
											return;
										}
										handleInputChange("includeOutroVideo", checked);
									}}
									disabled={!hasOutroVideo}
								/>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
