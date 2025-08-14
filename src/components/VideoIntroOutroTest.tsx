import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { concatenateWithIntroAndOutro } from "@/helpers/video-intro-renderer";

export function VideoIntroOutroTest() {
	const [testResult, setTestResult] = React.useState<string>("");
	const [isLoading, setIsLoading] = React.useState(false);
	const [selectedInstitution, setSelectedInstitution] = React.useState("Hospital São Jose");
	const [includeIntro, setIncludeIntro] = React.useState(true);
	const [includeOutro, setIncludeOutro] = React.useState(true);

	const institutions = [
		"Hospital São Jose",
		"Samuel Cesconetto", 
		"Unimed",
		"Hospital São João Batista",
		"Hospital São Donato",
		"CliniImagem"
	];

	const runTest = async () => {
		setIsLoading(true);
		setTestResult("Iniciando teste...");

		try {
			// Simular caminhos de teste
			const recordedVideoPath = "/tmp/test_recorded.mp4";
			const outputPath = "/tmp/test_output.mp4";

			console.log("🧪 Teste - Parâmetros:", {
				selectedInstitution,
				includeIntro,
				includeOutro,
				recordedVideoPath,
				outputPath
			});

			const result = await concatenateWithIntroAndOutro(
				selectedInstitution,
				recordedVideoPath,
				outputPath,
				includeIntro,
				includeOutro
			);

			console.log("🧪 Teste - Resultado:", result);

			if (result.success) {
				setTestResult(`✅ Sucesso: ${result.message}`);
			} else {
				setTestResult(`❌ Erro: ${result.message}`);
			}
		} catch (error) {
			console.error("Erro no teste:", error);
			setTestResult(`❌ Erro: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Teste de Vídeos de Introdução e Encerramento</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<Label htmlFor="institution">Instituição</Label>
					<Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{institutions.map((institution) => (
								<SelectItem key={institution} value={institution}>
									{institution}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center space-x-2">
					<Switch
						id="intro"
						checked={includeIntro}
						onCheckedChange={setIncludeIntro}
					/>
					<Label htmlFor="intro">Incluir vídeo de introdução</Label>
				</div>

				<div className="flex items-center space-x-2">
					<Switch
						id="outro"
						checked={includeOutro}
						onCheckedChange={setIncludeOutro}
					/>
					<Label htmlFor="outro">Incluir vídeo de encerramento</Label>
				</div>

				<Button 
					onClick={runTest} 
					disabled={isLoading}
					className="w-full"
				>
					{isLoading ? "Testando..." : "Executar Teste"}
				</Button>

				{testResult && (
					<div className="p-3 bg-muted rounded-md">
						<pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
					</div>
				)}
			</CardContent>
		</Card>
	);
}