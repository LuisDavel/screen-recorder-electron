import React, { useState, useEffect } from "react";
import { getScreenSources } from "@/helpers/screen_recorder_helpers";
import { Button } from "@/components/ui/button";

interface SourceSelectorProps {
	onSourceSelected: (sourceId: string) => void;
	disabled?: boolean;
}

export default function SourceSelector({
	onSourceSelected,
	disabled = false,
}: SourceSelectorProps) {
	const [sources, setSources] = useState<ScreenSource[]>([]);
	const [selectedSource, setSelectedSource] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Carregar fontes de captura
	const loadSources = async () => {
		try {
			setLoading(true);
			const availableSources = await getScreenSources();
			setSources(availableSources);
		} catch (error) {
			console.error("Erro ao carregar fontes:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadSources();
	}, []);

	const handleSourceSelect = (sourceId: string) => {
		setSelectedSource(sourceId);
		onSourceSelected(sourceId);
	};

	const handleRefresh = () => {
		loadSources();
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-muted-foreground">
					Carregando fontes de captura...
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">
					Selecione uma fonte para gravar
				</h3>
				<Button
					onClick={handleRefresh}
					variant="outline"
					size="sm"
					disabled={disabled}
				>
					Atualizar
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{sources.map((source) => (
					<div
						key={source.id}
						className={`
              relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
              ${
								selectedSource === source.id
									? "border-primary bg-primary/10"
									: "border-border hover:border-primary/50"
							}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
						onClick={() => !disabled && handleSourceSelect(source.id)}
					>
						<div className="space-y-2">
							<div className="aspect-video overflow-hidden rounded-md bg-muted">
								<img
									src={source.thumbnail}
									alt={`Thumbnail of ${source.name}`}
									className="h-full w-full object-cover"
								/>
							</div>
							<div className="space-y-1">
								<h4 className="font-medium leading-none">{source.name}</h4>
								<p className="text-sm text-muted-foreground">
									{source.id.includes("screen") ? "Tela" : "Janela"}
								</p>
							</div>
						</div>

						{selectedSource === source.id && (
							<div className="absolute right-2 top-2 h-4 w-4 rounded-full bg-primary" />
						)}
					</div>
				))}
			</div>

			{sources.length === 0 && !loading && (
				<div className="text-center py-8">
					<p className="text-muted-foreground">
						Nenhuma fonte de captura encontrada.
					</p>
					<Button
						onClick={handleRefresh}
						variant="outline"
						className="mt-4"
						disabled={disabled}
					>
						Tentar novamente
					</Button>
				</div>
			)}
		</div>
	);
}
