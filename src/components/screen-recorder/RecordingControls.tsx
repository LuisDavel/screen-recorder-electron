import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AdvancedScreenRecorderManager } from "@/helpers/advanced-screen-recorder";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { useToastHelpers } from "@/components/Toast";
import {
  Play,
  Square,
  Loader2,
  Camera,
  CameraOff,
  FileText,
} from "lucide-react";

interface RecordingControlsProps {
  selectedSourceId: { id: string; name: string; thumbnail: string } | null;
  onRecordingStateChange: (isRecording: boolean) => void;
  selectedSaveLocation: string | null;
}

export function RecordingControls({
  selectedSourceId,
  onRecordingStateChange,
  selectedSaveLocation,
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recorder] = useState(() => new AdvancedScreenRecorderManager());
  const [includeCameraOverlay, setIncludeCameraOverlay] = useState(true);
  const [includeHeader, setIncludeHeader] = useState(false);

  // Camera store e notifications
  const { isEnabled: cameraEnabled, mainStream: cameraStream } =
    useCameraConfigStore();
  const { headerConfig } = useHeaderConfigStore();
  const { showSuccess, showError, showInfo } = useToastHelpers();

  // Timer para mostrar o tempo de gravação
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Notificar mudanças no estado de gravação
  useEffect(() => {
    onRecordingStateChange(isRecording);
  }, [isRecording, onRecordingStateChange]);

  const handleStartRecording = async () => {
    if (!selectedSourceId) {
      alert("Por favor, selecione uma fonte para gravar");
      return;
    }

    if (!selectedSaveLocation) {
      alert("Por favor, selecione um local para salvar o vídeo");
      return;
    }

    try {
      setIsLoading(true);

      // Verificar se câmera está habilitada mas usuário quer incluir overlay
      if (includeCameraOverlay && !cameraEnabled) {
        showError(
          "Câmera deve estar habilitada para incluir overlay na gravação",
        );
        return;
      }

      if (includeCameraOverlay && cameraEnabled && !cameraStream) {
        showError(
          "Stream da câmera não disponível. Verifique as configurações da câmera",
        );
        return;
      }

      const options = AdvancedScreenRecorderManager.getRecommendedOptions(
        selectedSourceId.id,
        selectedSaveLocation,
      );

      options.includeCameraOverlay = includeCameraOverlay && cameraEnabled;
      options.includeHeader = true; // Forçado para teste
      options.headerConfig = headerConfig;

      // Debug completo das opções
      console.log("🎬 INICIANDO GRAVAÇÃO - Opções completas:", {
        sourceId: options.sourceId,
        includeHeader: options.includeHeader,
        headerConfig: options.headerConfig,
        headerEnabled: headerConfig.isEnabled,
        headerHeight: headerConfig.height,
        examName: headerConfig.examName,
      });

      // Validação do header
      if (options.includeHeader && (!headerConfig || !headerConfig.isEnabled)) {
        console.error("❌ ERRO: Header solicitado mas configuração inválida");
        showError("Header inválido - verifique as configurações");
        return;
      }

      if (options.includeHeader && headerConfig.isEnabled) {
        console.log("✅ HEADER VALIDADO - Será aplicado à gravação");
      }

      await recorder.startRecording(options);
      setIsRecording(true);

      let message = "Gravação iniciada";
      if (includeCameraOverlay && cameraEnabled) {
        message += " com câmera";
      }
      if (options.includeHeader && headerConfig.isEnabled) {
        message += " com header informativo";
        console.log("🎯 HEADER APLICADO: Gravação incluirá header sobreposto");
      }
      showSuccess(message);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      showError(
        `Erro ao iniciar gravação: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsLoading(true);
      await recorder.stopRecording();
      setIsRecording(false);
      showInfo("Gravação finalizada e salva com sucesso");
    } catch (error) {
      console.error("Erro ao parar gravação:", error);
      showError(
        `Erro ao parar gravação: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {isRecording && "Gravando..."}
        </p>

        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-lg font-bold">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </div>

      {/* Camera Overlay Option */}
      {!isRecording && (
        <div className="bg-muted/50 flex items-center justify-between rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            {includeCameraOverlay && cameraEnabled ? (
              <Camera className="h-4 w-4 text-green-600" />
            ) : (
              <CameraOff className="h-4 w-4 text-gray-400" />
            )}
            <div className="flex flex-col">
              <Label htmlFor="camera-overlay" className="text-sm font-medium">
                Incluir câmera na gravação
              </Label>
              <span className="text-muted-foreground text-xs">
                {cameraEnabled
                  ? "Câmera será sobreposta ao vídeo"
                  : "Habilite a câmera primeiro"}
              </span>
            </div>
          </div>
          <Switch
            id="camera-overlay"
            checked={includeCameraOverlay}
            onCheckedChange={setIncludeCameraOverlay}
            disabled={!cameraEnabled}
          />
        </div>
      )}

      {/* Header Option */}
      {!isRecording && (
        <div className="bg-muted/50 flex items-center justify-between rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <FileText
              className={`h-4 w-4 ${includeHeader && headerConfig.isEnabled ? "text-blue-600" : "text-gray-400"}`}
            />
            <div className="flex flex-col">
              <Label htmlFor="header-overlay" className="text-sm font-medium">
                Incluir header informativo
              </Label>
              <span className="text-muted-foreground text-xs">
                {headerConfig.isEnabled
                  ? "Header será adicionado na parte superior do vídeo"
                  : "Configure o header nas configurações"}
              </span>
            </div>
          </div>
          <Switch
            id="header-overlay"
            checked={includeHeader}
            onCheckedChange={setIncludeHeader}
            disabled={!headerConfig.isEnabled}
          />
        </div>
      )}

      {!isRecording ? (
        <Button
          onClick={handleStartRecording}
          disabled={!selectedSourceId || !selectedSaveLocation || isLoading}
          className="h-12 text-base"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Iniciando..." : "Iniciar Gravação"}
        </Button>
      ) : (
        <Button
          onClick={handleStopRecording}
          disabled={isLoading}
          variant="destructive"
          className="h-12 text-base"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Square className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Parando..." : "Parar Gravação"}
        </Button>
      )}

      {(!selectedSourceId || !selectedSaveLocation) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="space-y-2">
            {!selectedSourceId && (
              <p className="text-sm text-orange-800 dark:text-orange-200">
                ⚠️ Selecione uma fonte de captura antes de iniciar a gravação.
              </p>
            )}
            {!selectedSaveLocation && (
              <p className="text-sm text-orange-800 dark:text-orange-200">
                ⚠️ Selecione um local para salvar o vídeo antes de iniciar a
                gravação.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
