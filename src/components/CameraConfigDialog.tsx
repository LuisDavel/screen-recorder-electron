import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Settings } from "lucide-react";
import {
  useCameraConfigStore,
  CameraPosition,
  CameraSize,
} from "@/store/store-camera-config";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface CameraConfigDialogProps {
  trigger?: React.ReactNode;
}

export function CameraConfigDialog({ trigger }: CameraConfigDialogProps) {
  const {
    isEnabled,
    position,
    size,
    selectedDeviceId,
    devices,
    previewStream,
    isInitializing,
    setEnabled,
    setPosition,
    setSize,
    setSelectedDeviceId,
    setDevices,
    setIsPreviewActive,
    initializePreviewStream,
    stopPreviewStream,
    initializeMainStream,
  } = useCameraConfigStore();

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load available camera devices
  useEffect(() => {
    async function loadCameraDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((device) => device.kind === "videoinput")
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Câmera ${device.deviceId.slice(0, 8)}...`,
          }));

        setDevices(videoDevices);

        // Set default device if none selected
        if (!selectedDeviceId && videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err: unknown) {
        setError(
          "Erro ao carregar dispositivos de câmera: " +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }

    if (isOpen) {
      loadCameraDevices();
    }
  }, [isOpen, selectedDeviceId, setDevices, setSelectedDeviceId]);

  // Manage preview stream based on dialog state
  useEffect(() => {
    if (isOpen && selectedDeviceId) {
      setIsPreviewActive(true);
      initializePreviewStream();
    } else {
      setIsPreviewActive(false);
      stopPreviewStream();
    }

    // Cleanup on unmount
    return () => {
      if (isOpen) {
        stopPreviewStream();
        setIsPreviewActive(false);
      }
    };
  }, [
    isOpen,
    selectedDeviceId,
    setIsPreviewActive,
    initializePreviewStream,
    stopPreviewStream,
  ]);

  // Initialize main stream when camera is enabled
  useEffect(() => {
    if (isEnabled && selectedDeviceId) {
      console.log(
        "CameraConfigDialog: Camera enabled, initializing main stream",
      );
      setTimeout(() => {
        initializeMainStream();
      }, 200);
    }
  }, [isEnabled, selectedDeviceId, initializeMainStream]);

  // Update video ref when preview stream changes
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
      videoRef.current.play().catch(console.error);
    }
  }, [previewStream]);

  const positionOptions: { value: CameraPosition; label: string }[] = [
    { value: "top-left", label: "Superior Esquerdo" },
    { value: "top-right", label: "Superior Direito" },
    { value: "bottom-left", label: "Inferior Esquerdo" },
    { value: "bottom-right", label: "Inferior Direito" },
  ];

  const sizeOptions: { value: CameraSize; label: string }[] = [
    { value: "small", label: "Pequeno" },
    { value: "medium", label: "Médio" },
    { value: "large", label: "Grande" },
  ];

  const defaultTrigger = (
    <Button variant="outline" className="w-full">
      <Camera className="mr-2 h-4 w-4" />
      Configurar Câmera
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Configurações da Câmera
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Camera */}
              <div className="flex items-center justify-between">
                <Label htmlFor="camera-enabled">Habilitar Câmera</Label>
                <Switch
                  id="camera-enabled"
                  checked={isEnabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              {/* Camera Device Selection */}
              <div className="space-y-2">
                <Label>Dispositivo de Câmera</Label>
                <Select
                  value={selectedDeviceId || ""}
                  onValueChange={setSelectedDeviceId}
                  disabled={!isEnabled}
                >
                  <SelectTrigger className="w-full overflow-hidden text-ellipsis">
                    <SelectValue placeholder="Selecione uma câmera" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position Selection */}
              <div className="space-y-2">
                <Label>Posição da Câmera</Label>
                <Select
                  value={position}
                  onValueChange={(value: CameraPosition) => setPosition(value)}
                  disabled={!isEnabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size Selection */}
              <div className="space-y-2">
                <Label>Tamanho da Câmera</Label>
                <Select
                  value={size}
                  onValueChange={(value: CameraSize) => setSize(value)}
                  disabled={!isEnabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border bg-gray-100">
                  {isInitializing && (
                    <div className="text-sm text-gray-500">
                      Carregando câmera...
                    </div>
                  )}
                  {!isEnabled && !isInitializing && (
                    <div className="text-sm text-gray-500">
                      Câmera desabilitada
                    </div>
                  )}
                  {isEnabled && !isInitializing && !previewStream && !error && (
                    <div className="text-sm text-gray-500">
                      Nenhuma câmera selecionada
                    </div>
                  )}
                  {isEnabled && previewStream && (
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  <p>
                    <strong>Posição:</strong>{" "}
                    {positionOptions.find((p) => p.value === position)?.label}
                  </p>
                  <p>
                    <strong>Tamanho:</strong>{" "}
                    {sizeOptions.find((s) => s.value === size)?.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
          <Button onClick={() => setIsOpen(false)}>Salvar Configurações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
