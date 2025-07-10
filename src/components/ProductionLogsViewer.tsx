import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

interface LogInfo {
	logDirectory: string;
	logFile: string;
	exists: boolean;
}

export const ProductionLogsViewer: React.FC = () => {
	const [logInfo, setLogInfo] = useState<LogInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchLogInfo = async () => {
			try {
				const info = await window.electronAPI.getLogInfo();
				setLogInfo(info);
			} catch (error) {
				console.error("Error fetching log info:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchLogInfo();
	}, []);

	const openLogDirectory = async () => {
		if (logInfo?.logDirectory) {
			try {
				await window.electronAPI.openLogDirectory();
			} catch (error) {
				console.error("Error opening log directory:", error);
			}
		}
	};

	const openLogFile = async () => {
		if (logInfo?.logFile) {
			try {
				await window.electronAPI.openLogFile();
			} catch (error) {
				console.error("Error opening log file:", error);
			}
		}
	};

	if (isLoading) {
		return <div>Carregando informações de logs...</div>;
	}

	if (!logInfo) {
		return (
			<Alert>
				<AlertDescription>
					Não foi possível obter informações dos logs.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Logs de Produção</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						Os logs de produção são salvos automaticamente para diagnóstico.
					</p>

					<div className="bg-muted p-3 rounded-lg">
						<p className="text-sm font-mono break-all">
							<strong>Diretório:</strong> {logInfo.logDirectory}
						</p>
						<p className="text-sm font-mono break-all mt-1">
							<strong>Arquivo atual:</strong> {logInfo.logFile}
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={openLogDirectory}
						className="flex-1"
					>
						Abrir Pasta de Logs
					</Button>

					{logInfo.exists && (
						<Button variant="outline" onClick={openLogFile} className="flex-1">
							Abrir Arquivo de Log
						</Button>
					)}
				</div>

				<Alert>
					<AlertDescription>
						<strong>Nota:</strong> Os logs incluem informações sobre:
						<ul className="mt-2 ml-4 list-disc text-sm">
							<li>Status das permissões de sistema</li>
							<li>Solicitações de permissão</li>
							<li>Erros e avisos</li>
							<li>Informações de inicialização</li>
						</ul>
					</AlertDescription>
				</Alert>
			</CardContent>
		</Card>
	);
};
