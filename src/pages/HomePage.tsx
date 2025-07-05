import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Settings } from "lucide-react";
import { ScreenPreview } from "@/components/ScreenPreview";
import { RecordingControls } from "@/components/screen-recorder/RecordingControls";
import { useSaveLocationStore } from "@/store/store-local-path-video";
import { useSourceVideoStore } from "@/store/store-source-video";
import { CameraConfigDialog } from "@/components/CameraConfigDialog";
import { MicrophoneConfigDialog } from "@/components/MicrophoneConfigDialog";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useMicrophoneConfigStore } from "@/store/store-microphone-config";
import { useCameraNotifications } from "@/hooks/useCameraNotifications";
import { useMicrophoneNotifications } from "@/hooks/useMicrophoneNotifications";
import { HeaderConfig } from "@/components/recording-header/HeaderConfig";

export default function HomePage() {
  const { saveLocation } = useSaveLocationStore();
  const { sourceId } = useSourceVideoStore();
  const { isEnabled: cameraEnabled, mainStream } = useCameraConfigStore();
  const { isEnabled: microphoneEnabled, mainStream: microphoneStream } =
    useMicrophoneConfigStore();

  // Set up camera notifications
  useCameraNotifications();
  useMicrophoneNotifications();
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="grid w-full grid-cols-2 items-start gap-6">
        <ScreenPreview />
        <Card className="h-full transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-xl">
              <Settings className="text-primary h-6 w-6" />
              <span>Configurações</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[calc(100vh-200px)] space-y-2 overflow-auto">
              <CameraConfigDialog />

              {/* Camera Status Indicator */}
              <div className="bg-muted/50 flex items-center justify-between rounded-xl backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      cameraEnabled && mainStream
                        ? "animate-pulse bg-green-500"
                        : cameraEnabled
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      Câmera:{" "}
                      {cameraEnabled && mainStream
                        ? "Ativa"
                        : cameraEnabled
                          ? "Configurada"
                          : "Desabilitada"}
                    </span>
                  </div>
                </div>
                {cameraEnabled && mainStream && (
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                    <span className="text-xs text-green-600">LIVE</span>
                  </div>
                )}
              </div>

              <MicrophoneConfigDialog />
              <HeaderConfig />

              {/* Microphone Status Indicator */}
              <div className="bg-muted/50 flex items-center justify-between rounded-xl backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      microphoneEnabled && microphoneStream
                        ? "animate-pulse bg-blue-500"
                        : microphoneEnabled
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      Microfone:{" "}
                      {microphoneEnabled && microphoneStream
                        ? "Ativo"
                        : microphoneEnabled
                          ? "Configurado"
                          : "Desabilitado"}
                    </span>
                  </div>
                </div>
                {microphoneEnabled && microphoneStream && (
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                    <span className="text-xs text-blue-600">LIVE</span>
                  </div>
                )}
              </div>

              <Link to="/config">
                <Button variant="outline" className="h-12 w-full text-base">
                  <Settings className="mr-2 h-4 w-4" />
                  Acessar Configurações
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid w-full max-w-6xl grid-cols-1 md:grid-cols-2">
        <Card className="transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
          <CardHeader className="mb-0">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <Play className="text-primary h-6 w-6" />
              <span>Controle de transmissão</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecordingControls
              selectedSourceId={sourceId}
              onRecordingStateChange={() => {}}
              selectedSaveLocation={saveLocation}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
