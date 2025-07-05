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
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-row items-center gap-3">
        <Link to="/" className="flex w-fit items-center justify-center">
          <ArrowLeft className="h-6 w-6 transition-transform hover:scale-110" />
        </Link>
        <h1 className="text-3xl font-bold">Configurações</h1>
      </div>
      <p className="text-muted-foreground text-base">
        Personalize suas preferências de gravação, qualidade e outros ajustes do
        aplicativo.
      </p>
      <div className="flex flex-col gap-6">
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          <SaveLocationSelector
            onLocationSelected={handleLocationSelected}
            selectedLocation={saveLocation}
          />
        </div>
      </div>
    </div>
  );
}
