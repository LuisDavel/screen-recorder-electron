import React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Download, AlertTriangle } from "lucide-react";
import {
	checkFFmpegAvailability,
	suggestFFmpegInstallation,
	autoInstallFFmpeg,
	type FFmpegInfo,
} from "@/helpers/ffmpeg-checker";
import { debugFFmpeg } from "@/helpers/ffmpeg-debug";

export function FFmpegStatus() {
	const [ffmpegInfo, setFFmpegInfo] = React.useState<FFmpegInfo | null>(null);
	const [isInstalling, setIsInstalling] = React.useState(false);
	const [installSuggestion, setInstallSuggestion] = React.useState<{
		canAutoInstall: boolean;
		installCommand?: string;
		instructions: string[];
	} | null>(null);

	// Verificar status do FFmpeg ao montar o componente
	React.useEffect(() => {
		checkFFmpegStatus();
	}, []);

	const checkFFmpegStatus = async () => {
		console.log("🔍 FFmpegStatus - Verificando status do FFmpeg...");
		const info = await checkFFmpegAvailability();
		console.log("🔍 FFmpegStatus - Resultado:", info);
		setFFmpegInfo(info);

		if (!info.isAvailable) {
			const suggestion = await suggestFFmpegInstallation();
			setInstallSuggestion(suggestion);
		}
	};

	const handleAutoInstall = async () => {
		setIsInstalling(true);
		try {
			const result = await autoInstallFFmpeg();

			if (result.success) {
				// Recheck status after installation
				await checkFFmpegStatus();
			}

			// Show result message (you might want to use a toast notification here)
			alert(result.message);
		} catch (error) {
			alert(
				`Erro na instalação: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			setIsInstalling(false);
		}
	};

	if (!ffmpegInfo) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Download className="h-5 w-5" />
						Verificando FFmpeg...
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						Verificando disponibilidade do FFmpeg...
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Download className="h-5 w-5" />
					Status do FFmpeg
					{ffmpegInfo.isAvailable ? (
						<Badge variant="default" className="ml-2">
							<CheckCircle className="h-3 w-3 mr-1" />
							Disponível
						</Badge>
					) : (
						<Badge variant="destructive" className="ml-2">
							<XCircle className="h-3 w-3 mr-1" />
							Não encontrado
						</Badge>
					)}
				</CardTitle>
				<CardDescription>
					FFmpeg é necessário para concatenar vídeos de introdução
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{ffmpegInfo.isAvailable ? (
					<div className="space-y-2">
						<p className="text-sm text-green-600 dark:text-green-400">
							✅ FFmpeg está disponível e funcionando
						</p>
						{ffmpegInfo.version && (
							<p className="text-sm text-muted-foreground">
								Versão: {ffmpegInfo.version}
							</p>
						)}
						<p className="text-sm text-muted-foreground">
							Vídeos de introdução podem ser concatenados automaticamente.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<Alert>
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								FFmpeg não foi encontrado. Vídeos de introdução não estarão
								disponíveis.
							</AlertDescription>
						</Alert>

						{installSuggestion && (
							<div className="space-y-3">
								<h4 className="font-medium">Como instalar:</h4>
								<ul className="text-sm text-muted-foreground space-y-1">
									{installSuggestion.instructions.map((instruction, index) => (
										<li key={index}>• {instruction}</li>
									))}
								</ul>

								{installSuggestion.canAutoInstall && (
									<Button
										onClick={handleAutoInstall}
										disabled={isInstalling}
										className="w-full"
									>
										{isInstalling ? (
											"Instalando..."
										) : (
											<>
												<Download className="h-4 w-4 mr-2" />
												Instalar FFmpeg automaticamente
											</>
										)}
									</Button>
								)}
							</div>
						)}

						<div className="space-y-2">
							<Button
								variant="outline"
								onClick={checkFFmpegStatus}
								className="w-full"
							>
								Verificar novamente
							</Button>
							<Button
								variant="outline"
								onClick={debugFFmpeg}
								className="w-full"
								size="sm"
							>
								Debug Completo (Console)
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
