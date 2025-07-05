import React from "react";
import { SaveLocationSelector } from "@/components/screen-recorder/SaveLocationSelector";
import { useSaveLocationStore } from "@/store/store-local-path-video";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import HeaderConfig from "@/components/recording-header/HeaderConfig";

export default function SecondPage() {
  const { saveLocation, setSaveLocation } = useSaveLocationStore();

  const handleLocationSelected = (location: string) => {
    setSaveLocation(location);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-row items-center gap-2">
        <Link to="/" className="flex w-fit items-center justify-center">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Personalize suas preferências de gravação, qualidade e outros ajustes do
        aplicativo.
      </p>
      <div className="flex flex-col gap-4">
        <HeaderConfig />
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <SaveLocationSelector
            onLocationSelected={handleLocationSelected}
            selectedLocation={saveLocation}
          />
        </div>
      </div>
    </div>
  );
}
