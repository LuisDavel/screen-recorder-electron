import React, { useState } from "react";
import { useS3ConfigStore } from "@/store/store-s3-config";
import { testS3Connection } from "@/helpers/s3-upload-helper";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Eye, EyeOff, Cloud, Settings } from "lucide-react";

interface S3ConfigDialogProps {
	trigger?: React.ReactNode;
}

export function S3ConfigDialog({ trigger }: S3ConfigDialogProps) {
	const {
		config,
		setEnabled,
		setCredentials,
		setRegion,
		setBucketName,
		setFolderPrefix,
		resetConfig,
	} = useS3ConfigStore();

	const [isOpen, setIsOpen] = useState(false);
	const [showSecretKey, setShowSecretKey] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const [formData, setFormData] = useState({
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		region: config.region,
		bucketName: config.bucketName,
		folderPrefix: config.folderPrefix || "",
	});

	const handleTestConnection = async () => {
		setIsTesting(true);
		setTestResult(null);

		try {
			console.log("🔍 Iniciando teste de conexão S3...");

			// Salvar temporariamente as configurações para teste
			setCredentials(formData.accessKeyId, formData.secretAccessKey);
			setRegion(formData.region);
			setBucketName(formData.bucketName);
			setFolderPrefix(formData.folderPrefix);

			console.log("🔧 Configurações salvas, testando conexão...");
			const result = await testS3Connection();
			console.log("📋 Resultado do teste:", result);

			setTestResult(result);
		} catch (error) {
			console.error("❌ Erro no teste de conexão:", error);
			setTestResult({
				success: false,
				message: error instanceof Error ? error.message : "Erro desconhecido",
			});
		} finally {
			setIsTesting(false);
		}
	};

	const handleSave = () => {
		setCredentials(formData.accessKeyId, formData.secretAccessKey);
		setRegion(formData.region);
		setBucketName(formData.bucketName);
		setFolderPrefix(formData.folderPrefix);
		setIsOpen(false);
	};

	const handleReset = () => {
		resetConfig();
		setFormData({
			accessKeyId: "",
			secretAccessKey: "",
			region: "us-east-1",
			bucketName: "",
			folderPrefix: "",
		});
		setTestResult(null);
	};

	const awsRegions = [
		{ value: "us-east-1", label: "US East (N. Virginia)" },
		{ value: "us-west-2", label: "US West (Oregon)" },
		{ value: "us-west-1", label: "US West (N. California)" },
		{ value: "eu-west-1", label: "Europe (Ireland)" },
		{ value: "eu-central-1", label: "Europe (Frankfurt)" },
		{ value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
		{ value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
		{ value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
		{ value: "sa-east-1", label: "South America (São Paulo)" },
	];

	const defaultTrigger = (
		<Button variant="outline" size="sm">
			<Settings className="w-4 h-4 mr-2" />
			Configurar S3
		</Button>
	);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Cloud className="w-5 h-5" />
						Configuração Amazon S3
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Status e Toggle */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>Status do Upload S3</span>
								<div className="flex items-center gap-2">
									<Badge variant={config.isEnabled ? "default" : "secondary"}>
										{config.isEnabled ? "Habilitado" : "Desabilitado"}
									</Badge>
									<Badge
										variant={config.isConfigured ? "default" : "destructive"}
									>
										{config.isConfigured ? "Configurado" : "Não configurado"}
									</Badge>
								</div>
							</CardTitle>
							<CardDescription>
								Ative o upload automático para S3 após cada gravação
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center space-x-2">
								<Switch
									checked={config.isEnabled}
									onCheckedChange={setEnabled}
									disabled={!config.isConfigured}
								/>
								<Label htmlFor="s3-enabled">Upload automático para S3</Label>
							</div>
							{config.isEnabled && !config.isConfigured && (
								<Alert className="mt-3">
									<AlertDescription>
										Complete a configuração abaixo para habilitar o upload
										automático.
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>

					{/* Credenciais AWS */}
					<Card>
						<CardHeader>
							<CardTitle>Credenciais AWS</CardTitle>
							<CardDescription>
								Insira suas credenciais de acesso à AWS
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="accessKeyId">Access Key ID</Label>
								<Input
									id="accessKeyId"
									placeholder="AKIAIOSFODNN7EXAMPLE"
									value={formData.accessKeyId}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											accessKeyId: e.target.value,
										}))
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="secretAccessKey">Secret Access Key</Label>
								<div className="relative">
									<Input
										id="secretAccessKey"
										type={showSecretKey ? "text" : "password"}
										placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
										value={formData.secretAccessKey}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												secretAccessKey: e.target.value,
											}))
										}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-2 top-1/2 transform -translate-y-1/2"
										onClick={() => setShowSecretKey(!showSecretKey)}
									>
										{showSecretKey ? (
											<EyeOff className="w-4 h-4" />
										) : (
											<Eye className="w-4 h-4" />
										)}
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Configurações do Bucket */}
					<Card>
						<CardHeader>
							<CardTitle>Configurações do Bucket</CardTitle>
							<CardDescription>
								Configure o bucket S3 e organização dos arquivos
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="region">Região AWS</Label>
								<select
									id="region"
									className="w-full p-2 border rounded-md"
									value={formData.region}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, region: e.target.value }))
									}
								>
									{awsRegions.map((region) => (
										<option key={region.value} value={region.value}>
											{region.label}
										</option>
									))}
								</select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="bucketName">Nome do Bucket</Label>
								<Input
									id="bucketName"
									placeholder="meu-bucket-gravacoes"
									value={formData.bucketName}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											bucketName: e.target.value,
										}))
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="folderPrefix">
									Prefixo da Pasta (opcional)
								</Label>
								<Input
									id="folderPrefix"
									placeholder="recordings"
									value={formData.folderPrefix}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											folderPrefix: e.target.value,
										}))
									}
								/>
								<p className="text-sm text-gray-500">
									Os arquivos serão salvos em:{" "}
									{formData.folderPrefix || "recordings"}/timestamp-filename.ext
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Teste de Conexão */}
					<Card>
						<CardHeader>
							<CardTitle>Teste de Conexão</CardTitle>
							<CardDescription>
								Verifique se as configurações estão corretas
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<Button
									onClick={handleTestConnection}
									disabled={
										isTesting ||
										!formData.accessKeyId ||
										!formData.secretAccessKey ||
										!formData.bucketName
									}
									className="w-full"
								>
									{isTesting ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Testando...
										</>
									) : (
										"Testar Conexão"
									)}
								</Button>

								{testResult && (
									<Alert
										variant={testResult.success ? "default" : "destructive"}
									>
										<div className="flex items-center gap-2">
											{testResult.success ? (
												<Check className="w-4 h-4 text-green-600" />
											) : (
												<X className="w-4 h-4 text-red-600" />
											)}
											<AlertDescription>{testResult.message}</AlertDescription>
										</div>
									</Alert>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Ações */}
					<div className="flex justify-between">
						<Button variant="outline" onClick={handleReset}>
							Limpar Configurações
						</Button>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => setIsOpen(false)}>
								Cancelar
							</Button>
							<Button onClick={handleSave}>Salvar Configurações</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default S3ConfigDialog;
