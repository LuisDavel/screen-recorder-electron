import React, { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RefreshCcw } from "lucide-react";
import { useSourceVideoStore } from "@/store/store-source-video";
import { CameraOverlay } from "./CameraOverlay";
import { useCameraConfigStore } from "@/store/store-camera-config";

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

export function ScreenPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const { setSourceId } = useSourceVideoStore();
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    isEnabled: cameraEnabled,
    selectedDeviceId: cameraDeviceId,
    initializeMainStream,
  } = useCameraConfigStore();

  useEffect(() => {
    async function loadSources() {
      try {
        const availableSources = await window.screenRecorder.getSources();
        setSources(availableSources);
        if (availableSources.length > 0) {
          setSelectedSourceId(availableSources[0].id);
          setSourceId(availableSources[0]);
        }
      } catch (err: unknown) {
        setError(
          "Erro ao buscar fontes de tela: " +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }
    loadSources();
  }, []);

  useEffect(() => {
    let stream: MediaStream;
    async function getScreenStream() {
      if (!selectedSourceId) return;
      setLoading(true);
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: selectedSourceId,
            },
          } as MediaTrackConstraints,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err: unknown) {
        setError(
          "Erro ao capturar a tela: " +
            (err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setLoading(false);
      }
    }
    getScreenStream();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [selectedSourceId]);

  // Monitor camera state and force initialization when enabled
  useEffect(() => {
    if (cameraEnabled && cameraDeviceId) {
      console.log("ScreenPreview: Camera enabled, forcing initialization");
      setTimeout(() => {
        initializeMainStream();
      }, 500);
    }
  }, [cameraEnabled, cameraDeviceId, initializeMainStream]);

  return (
    <div className="h-full w-full space-y-6 rounded-xl border p-6 transition-all duration-200 hover:shadow-lg/20 hover:shadow-lg">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          ⚠️ Necessário permissão para capturar a tela
        </div>
      )}
      <div
        ref={containerRef}
        className="relative flex w-fit justify-center overflow-hidden rounded-xl border-2 bg-black"
      >
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          autoPlay
          muted
        />
        <CameraOverlay />
      </div>
      {loading && (
        <div className="text-muted-foreground flex items-center gap-2">
          <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
          Carregando preview...
        </div>
      )}
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          <label className="text-sm font-medium">
            Escolha a cena para gravar:
          </label>
          <div className="flex items-center gap-3">
            <Select
              value={selectedSourceId || ""}
              onValueChange={(value) => setSelectedSourceId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma fonte" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem
                    className="overflow-hidden text-left text-ellipsis"
                    key={source.id}
                    value={source.id}
                  >
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              className="hover:bg-accent hover:text-accent-foreground rounded-lg border p-2.5 transition-all"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
