import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Play, Square, Pause, Eye } from "lucide-react";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

export function GlobalShortcutsInfo() {
	const { shortcuts } = useGlobalShortcuts();

	const shortcutInfo = [
		{
			key: "start",
			label: "Iniciar Gravação",
			icon: <Play className="h-4 w-4" />,
			description: "Inicia uma nova gravação",
		},
		{
			key: "pause",
			label: "Pausar/Continuar",
			icon: <Pause className="h-4 w-4" />,
			description: "Pausa ou continua a gravação atual",
		},
		{
			key: "stop",
			label: "Parar Gravação",
			icon: <Square className="h-4 w-4" />,
			description: "Para a gravação e salva o arquivo",
		},
		{
			key: "toggleWindow",
			label: "Mostrar/Ocultar",
			icon: <Eye className="h-4 w-4" />,
			description: "Mostra ou oculta a janela do aplicativo",
		},
	];

	if (Object.keys(shortcuts).length === 0) {
		return null;
	}

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Keyboard className="h-4 w-4" />
					Atalhos Globais
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{shortcutInfo.map((info) => {
					const shortcut = shortcuts[info.key];
					if (!shortcut) return null;

					return (
						<div
							key={info.key}
							className="flex items-center justify-between py-1"
						>
							<div className="flex items-center gap-2">
								{info.icon}
								<div>
									<div className="text-sm font-medium">{info.label}</div>
									<div className="text-xs text-muted-foreground">
										{info.description}
									</div>
								</div>
							</div>
							<Badge variant="secondary" className="font-mono text-xs">
								{shortcut}
							</Badge>
						</div>
					);
				})}
				<div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
					Os atalhos funcionam mesmo quando a janela está minimizada ou em
					segundo plano.
				</div>
			</CardContent>
		</Card>
	);
}
