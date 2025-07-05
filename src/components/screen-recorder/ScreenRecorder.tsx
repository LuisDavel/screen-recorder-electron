import React, { useState, useEffect } from "react";
import SourceSelector from "./SourceSelector";
import { RecordingControls } from "./RecordingControls";
import VideoPreviewWithHeader from "./VideoPreviewWithHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor } from "lucide-react";
import { useSaveLocationStore } from "@/store/store-local-path-video";

export default function ScreenRecorder() {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const { saveLocation } = useSaveLocationStore();

  const handleSourceSelected = async (sourceId: string) => {
    setSelectedSourceId(sourceId);

    // Get preview stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        } as MediaTrackConstraints & {
          mandatory: { chromeMediaSource: string; chromeMediaSourceId: string };
        },
        audio: false,
      });
      setPreviewStream(stream);
    } catch (error) {
      console.error("Error getting preview stream:", error);
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Monitor className="text-primary h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Screen Recorder</h1>
          <p className="text-muted-foreground">
            Grave sua tela ou janelas específicas facilmente
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fonte selecionada:</span>
              <span className="text-muted-foreground text-sm">
                {selectedSourceId
                  ? "✓ Fonte selecionada"
                  : "Nenhuma fonte selecionada"}
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

      {/* Video Preview */}
      {(selectedSourceId || isRecording) && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-border aspect-video overflow-hidden rounded-lg border">
              <VideoPreviewWithHeader
                stream={previewStream}
                isRecording={isRecording}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fonte de Captura</CardTitle>
        </CardHeader>
        <CardContent>
          <SourceSelector
            onSourceSelected={handleSourceSelected}
            disabled={isRecording}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controles</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordingControls
            selectedSourceId={selectedSourceId}
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
