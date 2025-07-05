import React, { useState, useEffect } from "react";

import { RecordingControls } from "./RecordingControls";
import VideoPreviewWithHeader from "./VideoPreviewWithHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, ArrowLeft } from "lucide-react";
import { useSaveLocationStore } from "@/store/store-local-path-video";
import { useSourceVideoStore } from "@/store/store-source-video";
import { Link } from "@tanstack/react-router";

export default function ScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const { saveLocation } = useSaveLocationStore();
  const { sourceId } = useSourceVideoStore();

  // Sync preview stream with selected source from store
  useEffect(() => {
    if (!sourceId?.id) {
      setPreviewStream(null);
      return;
    }

    const getPreviewStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId.id,
            },
          } as MediaTrackConstraints & {
            mandatory: {
              chromeMediaSource: string;
              chromeMediaSourceId: string;
            };
          },
          audio: false,
        });
        setPreviewStream(stream);
      } catch (error) {
        console.error("Error getting preview stream:", error);
        setPreviewStream(null);
      }
    };

    getPreviewStream();
  }, [sourceId?.id]);

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewStream]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Monitor className="text-primary h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Screen Recorder</h1>
          <p className="text-muted-foreground">
            Grave sua tela ou janelas específicas facilmente
          </p>
        </div>
      </div>

      <Card className="transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fonte selecionada:</span>
              <span className="text-muted-foreground text-sm">
                {sourceId ? "✓ Fonte selecionada" : "Nenhuma fonte selecionada"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Local de salvamento:</span>
              <span className="text-muted-foreground text-sm">
                {saveLocation
                  ? "✓ Local selecionado"
                  : "Nenhum local selecionado"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado da gravação:</span>
              <span
                className={`text-sm font-medium ${
                  isRecording
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {isRecording ? "🔴 Gravando" : "⏹️ Parado"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informação sobre seleção de fonte */}
      {!sourceId && (
        <Card className="border-orange-200 bg-orange-50 transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg dark:border-orange-800 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="text-lg text-orange-800 dark:text-orange-200">
              ℹ️ Selecione uma fonte de captura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-orange-700 dark:text-orange-300">
                Para usar o gravador de tela, primeiro selecione uma fonte de
                captura na <strong>página inicial</strong> usando o seletor
                "Escolha a cena para gravar". Depois retorne aqui para
                configurar e iniciar a gravação.
              </p>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Ir para página inicial
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Preview */}
      {(sourceId || isRecording) && (
        <Card className="transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-border relative aspect-video overflow-hidden rounded-xl border-2">
              <VideoPreviewWithHeader
                stream={previewStream}
                isRecording={isRecording}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Controles</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordingControls
            selectedSourceId={sourceId}
            onRecordingStateChange={handleRecordingStateChange}
            selectedSaveLocation={saveLocation}
          />
        </CardContent>
      </Card>

      {/* Teste de Debug */}

      {/* Status */}
    </div>
  );
}
