import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVideoFormatStore } from "@/store/store-video-format";
import {
  Settings,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock,
  HardDrive
} from "lucide-react";

export function VideoQualityDebugger() {
  const {
    format,
    quality,
    getQualityBasedSettings,
    getQualityDescription,
    setQuality,
  } = useVideoFormatStore();

  const [isWindows, setIsWindows] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<string>("");

  useEffect(() => {
    // Detectar plataforma
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent;
    setIsWindows(platform.includes("win"));
    setPlatformInfo(`${platform} - ${userAgent.split(" ")[0]}`);
  }, []);

  const currentSettings = getQualityBasedSettings();
  const currentDescription = getQualityDescription();

  const qualityOptions: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];

  const getQualityColor = (qualityLevel: string) => {
    switch (qualityLevel) {
      case "low":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "high":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getOptimizationIcon = () => {
    if (format === "mp4" && isWindows) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else if (format === "mp4") {
      return <Info className="h-4 w-4 text-blue-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getPerformanceRating = () => {
    const bitrate = currentSettings.bitrate;
    const frameRate = currentSettings.frameRate;
    const chunkSize = currentSettings.chunkSize;

    // Calcular score baseado nas configurações
    let score = 0;

    // Bitrate score (0-40 pontos)
    if (bitrate < 1000000) score += 40; // Muito baixo = melhor performance
    else if (bitrate < 2000000) score += 30;
    else if (bitrate < 3000000) score += 20;
    else score += 10;

    // Frame rate score (0-30 pontos)
    if (frameRate <= 15) score += 30;
    else if (frameRate <= 24) score += 20;
    else if (frameRate <= 30) score += 10;
    else score += 5;

    // Chunk size score (0-30 pontos)
    if (chunkSize >= 10000) score += 30; // Chunks maiores = melhor para MP4
    else if (chunkSize >= 5000) score += 20;
    else score += 10;

    if (score >= 80) return { level: "Excelente", color: "text-green-600", icon: "🚀" };
    if (score >= 60) return { level: "Boa", color: "text-blue-600", icon: "⚡" };
    if (score >= 40) return { level: "Regular", color: "text-yellow-600", icon: "⚠️" };
    return { level: "Baixa", color: "text-red-600", icon: "🐌" };
  };

  const performanceRating = getPerformanceRating();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Debug de Configurações de Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações da Plataforma */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Informações da Plataforma
              </h4>
              <div className="text-sm space-y-1">
                <p><strong>Sistema:</strong> {isWindows ? "Windows" : "Outros"}</p>
                <p><strong>Plataforma:</strong> {platformInfo}</p>
                <p><strong>Formato:</strong> {format.toUpperCase()}</p>
                <p><strong>Otimização Aplicada:</strong> {currentSettings.optimizedFor}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                {getOptimizationIcon()}
                Status de Otimização
              </h4>
              <div className="space-y-2">
                <Badge
                  variant={format === "mp4" && isWindows ? "destructive" : "default"}
                  className="w-fit"
                >
                  {format === "mp4" && isWindows
                    ? "Modo Conservador (MP4 + Windows)"
                    : format === "mp4"
                    ? "Modo Otimizado (MP4)"
                    : "Modo Padrão (WebM)"
                  }
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{performanceRating.icon}</span>
                  <span className={`font-medium ${performanceRating.color}`}>
                    Performance: {performanceRating.level}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Configurações Atuais */}
          <div className="space-y-4">
            <h4 className="font-medium">Configurações Ativas</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Bitrate</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(currentSettings.bitrate / 1000)} Kbps
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentSettings.bitrate < 1000000 ? "Conservador" :
                     currentSettings.bitrate < 2500000 ? "Equilibrado" : "Alto"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Frame Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {currentSettings.frameRate} FPS
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentSettings.frameRate <= 15 ? "Baixo" :
                     currentSettings.frameRate <= 25 ? "Médio" : "Alto"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Chunk Size</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(currentSettings.chunkSize / 1000)}s
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentSettings.chunkSize >= 10000 ? "Otimizado" :
                     currentSettings.chunkSize >= 5000 ? "Padrão" : "Rápido"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comparação de Qualidades */}
          <div className="space-y-4">
            <h4 className="font-medium">Comparação de Qualidades</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {qualityOptions.map((qualityLevel) => {
                const isActive = quality === qualityLevel;
                return (
                  <Card
                    key={qualityLevel}
                    className={`cursor-pointer transition-all ${
                      isActive ? "ring-2 ring-primary" : "hover:shadow-md"
                    }`}
                    onClick={() => setQuality(qualityLevel)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getQualityColor(qualityLevel)}>
                          {qualityLevel.toUpperCase()}
                        </Badge>
                        {isActive && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>

                      {/* Simular configurações para esta qualidade */}
                      {(() => {
                        const tempStore = useVideoFormatStore.getState();
                        tempStore.setQuality(qualityLevel);
                        const settings = tempStore.getQualityBasedSettings();
                        const description = tempStore.getQualityDescription();

                        return (
                          <div className="space-y-2">
                            <div className="text-sm space-y-1">
                              <p><strong>Bitrate:</strong> {description.bitrate}</p>
                              <p><strong>FPS:</strong> {description.frameRate}</p>
                              <p><strong>Chunk:</strong> {Math.round(settings.chunkSize / 1000)}s</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {description.suitableFor}
                            </p>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Avisos e Recomendações */}
          {(format === "mp4" && isWindows) && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Otimizações para MP4 no Windows Ativas
                  </h5>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Para evitar travamentos, as seguintes otimizações foram aplicadas:
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 list-disc list-inside space-y-1">
                    <li>Bitrate reduzido em ~40% comparado ao WebM</li>
                    <li>Chunks maiores ({Math.round(currentSettings.chunkSize / 1000)}s) para melhor estabilidade</li>
                    <li>Frame rate limitado a {currentSettings.frameRate} FPS</li>
                    <li>Configurações conservadoras para o MediaRecorder</li>
                  </ul>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    <strong>Recomendação:</strong> Para melhor qualidade e performance, considere usar WebM.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Informações Técnicas */}
          <div className="space-y-2">
            <h4 className="font-medium">Informações Técnicas</h4>
            <div className="text-sm space-y-1 font-mono bg-muted p-3 rounded">
              <p><strong>Current Quality:</strong> {currentDescription.label}</p>
              <p><strong>Target Bitrate:</strong> {currentSettings.bitrate} bps</p>
              <p><strong>Frame Rate:</strong> {currentSettings.frameRate} fps</p>
              <p><strong>Chunk Interval:</strong> {currentSettings.chunkSize} ms</p>
              <p><strong>Format:</strong> {currentSettings.format}</p>
              <p><strong>Platform:</strong> {currentSettings.platform}</p>
              <p><strong>Optimization:</strong> {currentSettings.optimizedFor}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
