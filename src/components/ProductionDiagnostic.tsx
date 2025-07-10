import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
	AlertTriangle,
	CheckCircle,
	XCircle,
	AlertCircle,
	RefreshCw,
	Wrench,
	Info,
	Monitor,
	Settings,
	FileText,
} from "lucide-react";
import type {
	DiagnosticSummary,
	DiagnosticResult,
} from "../helpers/production-diagnostic";

interface ProductionDiagnosticProps {
	onClose?: () => void;
}

export function ProductionDiagnostic({ onClose }: ProductionDiagnosticProps) {
	const [diagnostic, setDiagnostic] = useState<DiagnosticSummary | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [isFixing, setIsFixing] = useState(false);
	const [fixResults, setFixResults] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const runDiagnostic = async () => {
		try {
			setIsRunning(true);
			setError(null);

			const result = await window.diagnostic.runDiagnostic();
			setDiagnostic(result);
		} catch (err) {
			console.error("Error running diagnostic:", err);
			setError("Erro ao executar diagnóstico: " + String(err));
		} finally {
			setIsRunning(false);
		}
	};

	const autoFixPermissions = async () => {
		try {
			setIsFixing(true);
			setError(null);
			setFixResults(null);

			const result = await window.diagnostic.autoFixPermissions();

			if (result.success) {
				setFixResults(
					"Correções aplicadas com sucesso! Reinicie o aplicativo para confirmar.",
				);
				// Executar diagnóstico novamente após 2 segundos
				setTimeout(() => {
					runDiagnostic();
				}, 2000);
			} else {
				setFixResults(
					`Erro ao aplicar correções: ${result.error || "Erro desconhecido"}`,
				);
			}
		} catch (err) {
			console.error("Error auto-fixing:", err);
			setError("Erro ao executar correções automáticas: " + String(err));
		} finally {
			setIsFixing(false);
		}
	};

	useEffect(() => {
		// Executar diagnóstico automaticamente ao montar o componente
		runDiagnostic();
	}, []);

	const getCategoryIcon = (category: DiagnosticResult["category"]) => {
		switch (category) {
			case "permissions":
				return <Settings className="h-4 w-4" />;
			case "logs":
				return <FileText className="h-4 w-4" />;
			case "system":
				return <Monitor className="h-4 w-4" />;
			case "configuration":
				return <Settings className="h-4 w-4" />;
			default:
				return <Info className="h-4 w-4" />;
		}
	};

	const getLevelIcon = (level: DiagnosticResult["level"]) => {
		switch (level) {
			case "error":
				return <XCircle className="h-4 w-4 text-red-500" />;
			case "warning":
				return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
			case "info":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			default:
				return <Info className="h-4 w-4 text-blue-500" />;
		}
	};

	const getLevelColor = (level: DiagnosticResult["level"]) => {
		switch (level) {
			case "error":
				return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20";
			case "warning":
				return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20";
			case "info":
				return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20";
			default:
				return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20";
		}
	};

	const hasAutoFixableIssues = diagnostic?.results.some(
		(result) => result.autoFixAvailable && result.level === "error",
	);

	return (
		<div className="w-full max-w-4xl mx-auto space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5" />
						Diagnóstico de Produção
					</CardTitle>
					<div className="flex gap-2">
						<Button
							onClick={runDiagnostic}
							disabled={isRunning || isFixing}
							variant="outline"
							size="sm"
						>
							{isRunning ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
							{isRunning ? "Executando..." : "Executar Diagnóstico"}
						</Button>
						{hasAutoFixableIssues && (
							<Button
								onClick={autoFixPermissions}
								disabled={isRunning || isFixing}
								variant="default"
								size="sm"
							>
								{isFixing ? (
									<RefreshCw className="h-4 w-4 animate-spin" />
								) : (
									<Wrench className="h-4 w-4" />
								)}
								{isFixing ? "Corrigindo..." : "Corrigir Automaticamente"}
							</Button>
						)}
						{onClose && (
							<Button onClick={onClose} variant="ghost" size="sm">
								Fechar
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{error && (
						<Alert variant="destructive" className="mb-4">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{fixResults && (
						<Alert className="mb-4">
							<AlertDescription>{fixResults}</AlertDescription>
						</Alert>
					)}

					{diagnostic && (
						<div className="space-y-4">
							{/* Resumo */}
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
								<div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
									<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{diagnostic.totalIssues}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-400">
										Total de Itens
									</div>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
									<div className="text-2xl font-bold text-red-600 dark:text-red-400">
										{diagnostic.criticalIssues}
									</div>
									<div className="text-sm text-red-600 dark:text-red-400">
										Problemas Críticos
									</div>
								</div>
								<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
									<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
										{diagnostic.warningIssues}
									</div>
									<div className="text-sm text-yellow-600 dark:text-yellow-400">
										Avisos
									</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
									<div className="text-2xl font-bold text-green-600 dark:text-green-400">
										{diagnostic.infoIssues}
									</div>
									<div className="text-sm text-green-600 dark:text-green-400">
										Informações
									</div>
								</div>
							</div>

							{/* Informações do Sistema */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">
										Informações do Sistema
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="font-medium">Plataforma:</span>{" "}
											{diagnostic.systemInfo.platform}
										</div>
										<div>
											<span className="font-medium">Versão do App:</span>{" "}
											{diagnostic.systemInfo.appVersion}
										</div>
										<div>
											<span className="font-medium">Versão do Electron:</span>{" "}
											{diagnostic.systemInfo.electronVersion}
										</div>
										<div>
											<span className="font-medium">Web Security:</span>{" "}
											{diagnostic.systemInfo.webSecurity
												? "Habilitado"
												: "Desabilitado"}
										</div>
										<div>
											<span className="font-medium">Arquivo de Log:</span>{" "}
											{diagnostic.systemInfo.logFileExists
												? "Existe"
												: "Não existe"}
										</div>
										<div>
											<span className="font-medium">Tamanho do Log:</span>{" "}
											{diagnostic.systemInfo.logFileSize} bytes
										</div>
									</div>
									{diagnostic.systemInfo.lastLogEntry && (
										<div className="mt-4">
											<div className="text-sm font-medium mb-2">
												Última Entrada do Log:
											</div>
											<div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono">
												{diagnostic.systemInfo.lastLogEntry}
											</div>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Resultados do Diagnóstico */}
							<div className="space-y-4">
								<h3 className="text-lg font-semibold">
									Resultados do Diagnóstico
								</h3>
								{diagnostic.results.map((result, index) => (
									<Card
										key={index}
										className={`border-l-4 ${getLevelColor(result.level)}`}
									>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													{getCategoryIcon(result.category)}
													<h4 className="font-medium">{result.title}</h4>
												</div>
												<div className="flex items-center gap-2">
													{getLevelIcon(result.level)}
													{result.autoFixAvailable && (
														<span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
															Auto-correção disponível
														</span>
													)}
												</div>
											</div>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
												{result.description}
											</p>

											{result.solutions.length > 0 && (
												<div className="mb-3">
													<h5 className="text-sm font-medium mb-2">
														Soluções Recomendadas:
													</h5>
													<ul className="list-disc list-inside text-sm space-y-1">
														{result.solutions.map((solution, solutionIndex) => (
															<li
																key={solutionIndex}
																className="text-gray-600 dark:text-gray-300"
															>
																{solution}
															</li>
														))}
													</ul>
												</div>
											)}

											{result.details &&
												Object.keys(result.details).length > 0 && (
													<details className="mt-3">
														<summary className="text-sm font-medium cursor-pointer text-blue-600 dark:text-blue-400">
															Detalhes Técnicos
														</summary>
														<pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
															{JSON.stringify(result.details, null, 2)}
														</pre>
													</details>
												)}
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					)}

					{!diagnostic && !isRunning && (
						<div className="text-center py-8">
							<AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600 dark:text-gray-400">
								Clique em &quot;Executar Diagnóstico&quot; para analisar o
								sistema
							</p>
						</div>
					)}

					{isRunning && (
						<div className="text-center py-8">
							<RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
							<p className="text-gray-600 dark:text-gray-400">
								Executando diagnóstico completo...
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
