import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	checkIntroVideo,
	getAvailableInstitutions,
} from "@/helpers/video-intro-helpers";

export function VideoIntroTest() {
	const [testResult, setTestResult] = React.useState<string>("");

	const testIntroSystem = async () => {
		try {
			setTestResult("Testando sistema de vídeos de introdução...");

			// Testar verificação de vídeo
			const introCheck = await checkIntroVideo("Hospital São Jose");
			console.log("Resultado da verificação:", introCheck);

			// Testar lista de instituições
			const institutions = await getAvailableInstitutions();
			console.log("Instituições disponíveis:", institutions);

			setTestResult(`
				Verificação: ${introCheck.hasIntro ? "✅ Vídeo encontrado" : "❌ Vídeo não encontrado"}
				Instituições: ${institutions.success ? `${institutions.institutions.length} encontradas` : "Erro ao carregar"}
			`);
		} catch (error) {
			console.error("Erro no teste:", error);
			setTestResult(
				`Erro: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Teste do Sistema de Vídeos de Introdução</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Button onClick={testIntroSystem}>Testar Sistema</Button>
				{testResult && (
					<pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">
						{testResult}
					</pre>
				)}
			</CardContent>
		</Card>
	);
}
