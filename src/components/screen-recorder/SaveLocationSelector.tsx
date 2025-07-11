import React, { useState, useEffect } from "react";
import {
	getDefaultSaveLocations,
	chooseSaveLocation,
} from "@/helpers/screen_recorder_helpers";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Folder,
	FolderOpen,
	Monitor,
	FileText,
	Download,
	Check,
	Settings,
} from "lucide-react";

// Import type from types.d.ts
interface DefaultSaveLocations {
	desktop: string;
	documents: string;
	videos: string;
	downloads: string;
}

interface SaveLocationSelectorProps {
	onLocationSelected: (location: string) => void;
	selectedLocation: string | null;
}

export function SaveLocationSelector({
	onLocationSelected,
	selectedLocation,
}: SaveLocationSelectorProps) {
	const [defaultLocations, setDefaultLocations] =
		useState<DefaultSaveLocations | null>(null);
	const [loading, setLoading] = useState(true);
	const [customLocation, setCustomLocation] = useState<string | null>(null);

	useEffect(() => {
		loadDefaultLocations();
	}, []);

	const loadDefaultLocations = async () => {
		try {
			setLoading(true);
			const locations = await getDefaultSaveLocations();
			setDefaultLocations(locations);
		} catch (error) {
			console.error("Erro ao carregar locais padrão:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleChooseCustomLocation = async () => {
		try {
			const result = await chooseSaveLocation();
			if (result.success && result.path) {
				setCustomLocation(result.path);
				onLocationSelected(result.path);
			}
		} catch (error) {
			console.error("Erro ao escolher local personalizado:", error);
		}
	};

	const handleLocationSelect = (location: string) => {
		onLocationSelected(location);
	};

	const getLocationLabel = (type: string) => {
		switch (type) {
			case "desktop":
				return {
					label: "Área de Trabalho",
					icon: <Monitor className="h-5 w-5" />,
				};
			case "documents":
				return { label: "Documentos", icon: <FileText className="h-5 w-5" /> };
			case "videos":
				return { label: "Vídeos", icon: <FolderOpen className="h-5 w-5" /> };
			case "downloads":
				return { label: "Downloads", icon: <Download className="h-5 w-5" /> };
			default:
				return {
					label: "Local personalizado",
					icon: <Folder className="h-5 w-5" />,
				};
		}
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Local de Salvamento</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-4">
						<div className="text-muted-foreground">
							Carregando locais disponíveis...
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const defaultLocationsData = defaultLocations
		? [
				...Object.entries(defaultLocations).map(([key, path]) => ({
					value: path,
					label: `${getLocationLabel(key).label} - ${path}`,
					icon: getLocationLabel(key).icon,
				})),
				// Só adiciona o local personalizado se houver um valor válido
				...(customLocation
					? [
							{
								value: customLocation,
								label: `Local personalizado - ${customLocation}`,
								icon: <Folder className="h-5 w-5" />,
							},
						]
					: []),
			]
		: [];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center space-x-2">
					<Folder className="h-5 w-5" />
					<span>Escolha onde salvar o vídeo</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="overflow-y-auto max-h-[calc(100vh-450px)]">
				<h4 className="text-sm font-medium">Locais recomendados</h4>
				<Select
					value={selectedLocation || undefined}
					onValueChange={handleLocationSelect}
				>
					<SelectTrigger>
						<SelectValue placeholder="Selecione um local" />
					</SelectTrigger>
					<SelectContent>
						{defaultLocationsData.map((location) => (
							<SelectItem key={location.value} value={location.value}>
								<div className="flex items-center space-x-2">
									{location.icon}
									<span>{location.label}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</CardContent>
			<CardFooter>
				<div className="space-y-2 w-full">
					<h4 className="text-sm font-medium">Local personalizado</h4>
					{customLocation && (
						<button
							onClick={() => handleLocationSelect(customLocation)}
							className={`
                  flex items-center justify-between p-3 rounded-lg border transition-all duration-200 w-full
                  ${
										selectedLocation === customLocation
											? "border-primary bg-primary/10 text-primary"
											: "border-border hover:border-primary/50"
									}
                `}
						>
							<div className="flex items-center space-x-3">
								<Settings className="h-5 w-5" />
								<div className="text-left">
									<div className="font-medium">Local personalizado</div>
									<div className="text-xs text-muted-foreground truncate max-w-[200px]">
										{customLocation}
									</div>
								</div>
							</div>
							{selectedLocation === customLocation && (
								<Check className="h-4 w-4 text-primary" />
							)}
						</button>
					)}
					<Button
						onClick={handleChooseCustomLocation}
						variant="outline"
						className="w-full"
					>
						<Settings className="mr-2 h-4 w-4" />
						{customLocation
							? "Alterar local de salvamento"
							: "Escolher pasta personalizada"}
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
