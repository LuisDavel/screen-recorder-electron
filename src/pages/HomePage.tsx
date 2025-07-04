import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Play, Settings } from "lucide-react";
import ScreenPreview from "@/components/ScreenPreview";

export default function HomePage() {
	const { t } = useTranslation();

	return (
		<div className="flex h-full flex-col gap-4 p-4">
			<ScreenPreview />
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
				<Card className="transition-all duration-200 hover:shadow-lg">
					<CardHeader>
						<CardTitle className="flex items-center space-x-2">
							<Monitor className="h-6 w-6 text-primary" />
							<span>Gravador de Tela</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Grave sua tela ou janelas específicas com facilidade. Perfeito
								para tutoriais, apresentações e documentação.
							</p>
							<Link to="/screen-recorder">
								<Button className="w-full">
									<Play className="mr-2 h-4 w-4" />
									Começar Gravação
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>

				<Card className="transition-all duration-200 hover:shadow-lg">
					<CardHeader>
						<CardTitle className="flex items-center space-x-2">
							<Settings className="h-6 w-6 text-primary" />
							<span>Configurações</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Personalize suas preferências de gravação, qualidade e outros
								ajustes do aplicativo.
							</p>
							<Link to="/config">
								<Button variant="outline" className="w-full">
									<Settings className="mr-2 h-4 w-4" />
									Acessar Configurações
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
