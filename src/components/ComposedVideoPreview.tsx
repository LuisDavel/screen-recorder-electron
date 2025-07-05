import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { VideoComposer, createVideoComposer } from "@/helpers/video-composer";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useSourceVideoStore } from "@/store/store-source-video";
import { Play, Square, Camera, Monitor, RefreshCw } from "lucide-react";

interface ComposedVideoPreviewProps {
  className?: string;
  autoStart?: boolean;
  showControls?: boolean;
  width?: number;
  height?: number;
}

export function ComposedVideoPreview({
  className = "",
  autoStart = false,
  showControls = true,
  width = 640,
  height = 360,
}: ComposedVideoPreviewProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // States
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComposed, setShowComposed] = useState(true);
  const [videoComposer, setVideoComposer] = useState<VideoComposer | null>(
    null,
  );
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Store states
  const {
    isEnabled: cameraEnabled,
    mainStream: cameraStream,
    position: cameraPosition,
    size: cameraSize,
  } = useCameraConfigStore();
  const { sourceId } = useSourceVideoStore();

  // Get screen stream
  const getScreenStream = useCallback(async (): Promise<MediaStream | null> => {
    if (!sourceId?.id) {
      setError("Nenhuma fonte de tela selecionada");
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId.id,
          },
        } as MediaTrackConstraints,
      });

      console.log("Screen stream obtained for preview", {
        tracks: stream.getTracks().length,
      });

      return stream;
    } catch (err) {
      const errorMessage = `Erro ao obter stream da tela: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMessage);
      console.error("Screen stream error:", err);
      return null;
    }
  }, [sourceId?.id]);

  // Start preview composition
  const startPreview = useCallback(async () => {
    if (isActive || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("Starting composed video preview");

      // Get screen stream
      const newScreenStream = await getScreenStream();
      if (!newScreenStream) {
        throw new Error("Falha ao obter stream da tela");
      }

      setScreenStream(newScreenStream);

      if (showComposed && cameraEnabled && cameraStream) {
        // Create video composer
        console.log("Creating video composer for preview");
        const composer = await createVideoComposer(
          newScreenStream,
          cameraStream,
          cameraPosition,
          cameraSize,
        );

        const composed = composer.startComposition();
        setVideoComposer(composer);

        // Set composed stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = composed;
          videoRef.current.play();
        }

        console.log("Composed preview started successfully");
      } else {
        // Show only screen stream
        console.log("Showing screen-only preview");

        if (videoRef.current) {
          videoRef.current.srcObject = newScreenStream;
          videoRef.current.play();
        }
      }

      setIsActive(true);
    } catch (err) {
      const errorMessage = `Erro ao iniciar preview: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMessage);
      console.error("Preview start error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    isActive,
    isLoading,
    getScreenStream,
    showComposed,
    cameraEnabled,
    cameraStream,
    cameraPosition,
    cameraSize,
  ]);

  // Stop preview
  const stopPreview = useCallback(() => {
    console.log("Stopping composed video preview");

    if (videoComposer) {
      videoComposer.stopComposition();
      videoComposer.dispose();
      setVideoComposer(null);
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setError(null);

    console.log("Preview stopped");
  }, [videoComposer, screenStream]);

  // Restart preview when composition settings change
  const restartPreview = useCallback(async () => {
    if (isActive) {
      stopPreview();
      await new Promise((resolve) => setTimeout(resolve, 100));
      startPreview();
    }
  }, [isActive, stopPreview, startPreview]);

  // Effect for auto-start
  useEffect(() => {
    if (autoStart && !isActive && sourceId?.id) {
      startPreview();
    }
  }, [autoStart, isActive, sourceId?.id, startPreview]);

  // Effect for camera configuration changes
  useEffect(() => {
    if (isActive && showComposed) {
      console.log("Camera configuration changed, restarting preview");
      restartPreview();
    }
  }, [cameraPosition, cameraSize, cameraEnabled, showComposed, restartPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  // Format error message
  const getErrorDisplay = () => {
    if (!error) return null;

    return (
      <div className="flex h-full items-center justify-center rounded-md border border-red-200 bg-red-50 p-4">
        <div className="text-center">
          <div className="mb-2 text-sm font-medium text-red-600">
            Erro no Preview
          </div>
          <div className="mb-3 text-xs text-red-500">{error}</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              startPreview();
            }}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  };

  // Get status display
  const getStatusDisplay = () => {
    if (error) return "Erro";
    if (isLoading) return "Carregando...";
    if (isActive) {
      if (showComposed && cameraEnabled && cameraStream) {
        return "Preview Composto (Tela + Câmera)";
      }
      return "Preview da Tela";
    }
    return "Parado";
  };

  // Get status color
  const getStatusColor = () => {
    if (error) return "text-red-600";
    if (isLoading) return "text-yellow-600";
    if (isActive) return "text-green-600";
    return "text-gray-600";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Preview da Gravação</span>
          </div>
          <div className={`text-sm font-normal ${getStatusColor()}`}>
            {getStatusDisplay()}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div
          className="relative overflow-hidden rounded-md bg-black"
          style={{ aspectRatio: `${width}/${height}` }}
        >
          {error ? (
            getErrorDisplay()
          ) : (
            <>
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
                autoPlay
                muted
                playsInline
                style={{ display: isActive ? "block" : "none" }}
              />

              {!isActive && !isLoading && (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Monitor className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <div className="text-sm">Preview Parado</div>
                    <div className="mt-1 text-xs opacity-75">
                      Clique em Play para iniciar
                    </div>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <div className="text-center">
                    <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
                    <div className="text-sm">Iniciando Preview...</div>
                  </div>
                </div>
              )}

              {/* Status Overlay */}
              {isActive && (
                <div className="bg-opacity-75 absolute top-2 right-2 rounded bg-black px-2 py-1 text-xs font-medium text-white">
                  PREVIEW
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="space-y-3">
            {/* Composition Toggle */}
            <div className="bg-muted flex items-center justify-between rounded-lg p-3">
              <div className="flex items-center space-x-3">
                {showComposed && cameraEnabled ? (
                  <Camera className="h-4 w-4 text-green-600" />
                ) : (
                  <Monitor className="h-4 w-4 text-blue-600" />
                )}
                <div className="flex flex-col">
                  <Label
                    htmlFor="show-composed"
                    className="text-sm font-medium"
                  >
                    Preview Composto
                  </Label>
                  <span className="text-muted-foreground text-xs">
                    {showComposed
                      ? "Mostra tela + câmera como ficará na gravação"
                      : "Mostra apenas a tela"}
                  </span>
                </div>
              </div>
              <Switch
                id="show-composed"
                checked={showComposed}
                onCheckedChange={setShowComposed}
                disabled={!cameraEnabled || isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {!isActive ? (
                <Button
                  onClick={startPreview}
                  disabled={!sourceId?.id || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Iniciando..." : "Iniciar Preview"}
                </Button>
              ) : (
                <Button
                  onClick={stopPreview}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Parar Preview
                </Button>
              )}

              <Button
                onClick={restartPreview}
                variant="outline"
                disabled={!isActive || isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Warning Messages */}
        {!sourceId?.id && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="text-sm text-yellow-800">
              ⚠️ Selecione uma fonte de captura para ver o preview
            </div>
          </div>
        )}

        {showComposed && !cameraEnabled && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="text-sm text-blue-800">
              💡 Habilite a câmera para ver o preview composto
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
