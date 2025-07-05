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
import { Mic, Settings, Volume2 } from "lucide-react";
import {
  useMicrophoneConfigStore,
  MicrophoneGain,
} from "@/store/store-microphone-config";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface MicrophoneConfigDialogProps {
  trigger?: React.ReactNode;
}

export function MicrophoneConfigDialog({
  trigger,
}: MicrophoneConfigDialogProps) {
  const {
    isEnabled,
    selectedDeviceId,
    devices,
    gain,
    noiseReduction,
    echoCancellation,
    autoGainControl,
    previewStream,
    isInitializing,
    setEnabled,
    setSelectedDeviceId,
    setDevices,
    setGain,
    setNoiseReduction,
    setEchoCancellation,
    setAutoGainControl,
    setIsPreviewActive,
    initializePreviewStream,
    stopPreviewStream,
    initializeMainStream,
  } = useMicrophoneConfigStore();

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load available microphone devices
  useEffect(() => {
    async function loadMicrophoneDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices
          .filter((device) => device.kind === "audioinput")
          .map((device) => ({
            deviceId: device.deviceId,
            label:
              device.label || `Microfone ${device.deviceId.slice(0, 8)}...`,
          }));

        setDevices(audioDevices);

        // Set default device if none selected
        if (!selectedDeviceId && audioDevices.length > 0) {
          setSelectedDeviceId(audioDevices[0].deviceId);
        }
      } catch (err: unknown) {
        setError(
          "Erro ao carregar dispositivos de microfone: " +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }

    if (isOpen) {
      loadMicrophoneDevices();
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

  // Initialize main stream when microphone is enabled
  useEffect(() => {
    if (isEnabled && selectedDeviceId) {
      console.log(
        "MicrophoneConfigDialog: Microphone enabled, initializing main stream",
      );
      setTimeout(() => {
        initializeMainStream();
      }, 200);
    }
  }, [isEnabled, selectedDeviceId, initializeMainStream]);

  // Set up audio level monitoring
  useEffect(() => {
    if (previewStream && isOpen) {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source =
          audioContextRef.current.createMediaStreamSource(previewStream);
        source.connect(analyserRef.current);

        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateAudioLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            setAudioLevel(average);
          }
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
      } catch (err) {
        console.error("Erro ao configurar análise de áudio:", err);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [previewStream, isOpen]);

  const gainOptions: { value: MicrophoneGain; label: string }[] = [
    { value: "low", label: "Baixo" },
    { value: "medium", label: "Médio" },
    { value: "high", label: "Alto" },
  ];

  const defaultTrigger = (
    <Button variant="outline" className="w-full">
      <Mic className="mr-2 h-4 w-4" />
      Configurar Microfone
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Configurações do Microfone
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
              {/* Enable/Disable Microphone */}
              <div className="flex items-center justify-between">
                <Label htmlFor="microphone-enabled">Habilitar Microfone</Label>
                <Switch
                  id="microphone-enabled"
                  checked={isEnabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              {/* Microphone Device Selection */}
              <div className="space-y-2">
                <Label>Dispositivo de Microfone</Label>
                <Select
                  value={selectedDeviceId || ""}
                  onValueChange={setSelectedDeviceId}
                  disabled={!isEnabled}
                >
                  <SelectTrigger className="w-full overflow-hidden text-ellipsis">
                    <SelectValue placeholder="Selecione um microfone" />
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

              {/* Gain Selection */}
              <div className="space-y-2">
                <Label>Ganho do Microfone</Label>
                <Select
                  value={gain}
                  onValueChange={(value: MicrophoneGain) => setGain(value)}
                  disabled={!isEnabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gainOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audio Enhancement Options */}
              <div className="space-y-4">
                <Label>Melhorias de Áudio</Label>

                <div className="flex items-center justify-between">
                  <Label htmlFor="noise-reduction" className="text-sm">
                    Redução de Ruído
                  </Label>
                  <Switch
                    id="noise-reduction"
                    checked={noiseReduction}
                    onCheckedChange={setNoiseReduction}
                    disabled={!isEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="echo-cancellation" className="text-sm">
                    Cancelamento de Eco
                  </Label>
                  <Switch
                    id="echo-cancellation"
                    checked={echoCancellation}
                    onCheckedChange={setEchoCancellation}
                    disabled={!isEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-gain-control" className="text-sm">
                    Controle Automático de Ganho
                  </Label>
                  <Switch
                    id="auto-gain-control"
                    checked={autoGainControl}
                    onCheckedChange={setAutoGainControl}
                    disabled={!isEnabled}
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Monitor de Áudio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-4 rounded-md border bg-gray-50 p-6">
                  {isInitializing && (
                    <div className="text-sm text-gray-500">
                      Carregando microfone...
                    </div>
                  )}
                  {!isEnabled && !isInitializing && (
                    <div className="text-sm text-gray-500">
                      Microfone desabilitado
                    </div>
                  )}
                  {isEnabled && !isInitializing && !previewStream && !error && (
                    <div className="text-sm text-gray-500">
                      Nenhum microfone selecionado
                    </div>
                  )}
                  {isEnabled && previewStream && (
                    <div className="flex flex-col items-center space-y-3">
                      <Mic className="h-8 w-8 text-blue-500" />
                      <div className="text-sm font-medium">Nível de Áudio</div>

                      {/* Audio Level Meter */}
                      <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-100"
                          style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                        />
                      </div>

                      {/* Audio Level Text */}
                      <div className="text-xs text-gray-600">
                        Nível: {Math.round(audioLevel)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  <p>
                    <strong>Ganho:</strong>{" "}
                    {gainOptions.find((g) => g.value === gain)?.label}
                  </p>
                  <p>
                    <strong>Redução de Ruído:</strong>{" "}
                    {noiseReduction ? "Ativada" : "Desativada"}
                  </p>
                  <p>
                    <strong>Cancelamento de Eco:</strong>{" "}
                    {echoCancellation ? "Ativado" : "Desativado"}
                  </p>
                  <p>
                    <strong>Controle Automático:</strong>{" "}
                    {autoGainControl ? "Ativado" : "Desativado"}
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
