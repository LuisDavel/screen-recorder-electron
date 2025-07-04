import React from "react";
import { SaveLocationSelector } from "@/components/screen-recorder/SaveLocationSelector";
import { useSaveLocationStore } from "@/store/store-local-path-video";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function SecondPage() {
	const { saveLocation, setSaveLocation } = useSaveLocationStore();

	const handleLocationSelected = (location: string) => {
		setSaveLocation(location);
	};

	return (
		<div className="flex h-full flex-col gap-4 p-4">
			<div className="flex flex-row gap-2 items-center">
				<Link to="/" className="w-fit flex items-center justify-center">
					<ArrowLeft className="h-6 w-6" />
				</Link>
				<h1 className="text-2xl font-bold">Configurações</h1>
			</div>
			<p className="text-sm text-muted-foreground">
				Personalize suas preferências de gravação, qualidade e outros ajustes do
				aplicativo.
			</p>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
				<SaveLocationSelector
					onLocationSelected={handleLocationSelected}
					selectedLocation={saveLocation}
				/>
			</div>
		</div>
	);
}
