import React, { useState, useEffect } from "react";
import {
  Loader2,
  Video,
  CheckCircle,
  AlertCircle,
  X,
  Upload,
  Cloud,
} from "lucide-react";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { S3UrlValidator } from "@/helpers/s3-url-validator";
import { useS3ConfigStore } from "@/store/store-s3-config";

interface VideoConcatenationOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  recordedVideoPath?: string;
}

interface ConcatenationState {
  isProcessing: boolean;
  progress: string;
  result: {
    success: boolean;
    message: string;
    outputPath?: string;
  } | null;
  isUploading: boolean;
  uploadProgress: number;
  uploadResult: {
    success: boolean;
    message: string;
    s3Url?: string;
  } | null;
}

// Tipos para a API
interface VideoConcatAPI {
  autoConcatenate: (options: {
    recordedVideoPath: string;
    outputPath?: string;
  }) => Promise<{
    success: boolean;
    outputPath: string;
    message: string;
    fileSize?: number;
  }>;
  autoConcatenateAlt: (options: {
    recordedVideoPath: string;
    outputPath?: string;
  }) => Promise<{
    success: boolean;
    outputPath: string;
    message: string;
    fileSize?: number;
  }>;
  autoConcatenateRobust: (options: {
    recordedVideoPath: string;
    outputPath?: string;
    introVideoUrl?: string;
    outroVideoUrl?: string;
  }) => Promise<{
    success: boolean;
    outputPath: string;
    message: string;
    fileSize?: number;
  }>;
  fastConcatenate: (options: {
    recordedVideoPath: string;
    outputPath?: string;
    introVideoUrl?: string;
    outroVideoUrl?: string;
  }) => Promise<{
    success: boolean;
    outputPath: string;
    message: string;
    fileSize?: number;
    method?: string;
  }>;
  simpleConcatenate: (options: {
    recordedVideoPath: string;
    outputPath?: string;
    introVideoUrl?: string;
    outroVideoUrl?: string;
  }) => Promise<{
    success: boolean;
    outputPath: string;
    message: string;
    fileSize?: number;
    method?: string;
  }>;
  onProgress: (callback: (progress: string) => void) => void;
  removeProgressListener: () => void;
}

declare global {
  interface Window {
    videoConcatAPI?: VideoConcatAPI;
  }
}

export function VideoConcatenationOverlay({
  isVisible,
  onClose,
  recordedVideoPath,
}: VideoConcatenationOverlayProps) {
  const { headerConfig } = useHeaderConfigStore();
  const { config: s3Config } = useS3ConfigStore();
  const [state, setState] = useState<ConcatenationState>({
    isProcessing: false,
    progress: "",
    result: null,
    isUploading: false,
    uploadProgress: 0,
    uploadResult: null,
  });

  console.log("🎬 VideoConcatenationOverlay render:", {
    isVisible,
    recordedVideoPath,
  });

  useEffect(() => {
    console.log("🎬 VideoConcatenationOverlay useEffect:", {
      isVisible,
      recordedVideoPath,
      hasAPI: !!window.videoConcatAPI,
    });

    if (isVisible && recordedVideoPath && window.videoConcatAPI) {
      console.log("🎬 Iniciando concatenação...");
      startConcatenation();
    } else {
      console.log("🎬 Não iniciando concatenação:", {
        isVisible,
        hasRecordedVideoPath: !!recordedVideoPath,
        hasAPI: !!window.videoConcatAPI,
      });
    }

    // Configurar listener de progresso da concatenação
    if (window.videoConcatAPI) {
      window.videoConcatAPI.onProgress((progress: string) => {
        setState((prev) => ({ ...prev, progress }));
      });
    }

    // Configurar listeners de progresso do upload S3
    if (window.s3Upload) {
      window.s3Upload.onProgress((_event: any, progress: any) => {
        setState((prev) => ({
          ...prev,
          uploadProgress: progress.percentage,
        }));
      });
    }

    // Cleanup
    return () => {
      if (window.videoConcatAPI) {
        window.videoConcatAPI.removeProgressListener();
      }
      if (window.s3Upload) {
        window.s3Upload.removeAllListeners();
      }
    };
  }, [isVisible, recordedVideoPath]);

  const startConcatenation = async () => {
    if (!recordedVideoPath || !window.videoConcatAPI) return;

    // Verificar configuração de vídeos primeiro
    const hasS3Videos =
      headerConfig.introVideo?.url && headerConfig.outroVideo?.url;
    const initialMessage = hasS3Videos
      ? "🚀 Usando vídeos S3 otimizados (rápido)..."
      : "⚠️ Usando vídeos demo (mais lento - configure vídeos S3)...";

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      progress: initialMessage,
      result: null,
    }));

    try {
      // Verificar se temos URLs de vídeos S3 configuradas
      const hasS3Videos =
        headerConfig.introVideo?.url && headerConfig.outroVideo?.url;
      console.log("🎬 Configuração de vídeos:", {
        hasS3Videos,
        introVideoUrl: headerConfig.introVideo?.url,
        outroVideoUrl: headerConfig.outroVideo?.url,
      });

      let result;

      if (!hasS3Videos) {
        throw new Error(
          "Vídeos S3 não configurados. Configure os vídeos de introdução e encerramento nas configurações do header antes de gravar.",
        );
      }

      // PROCESSAR DIRETAMENTE - FFmpeg já provou que consegue acessar as URLs
      // (Validação fetch() falha devido a CORS, mas FFmpeg acessa normalmente)
      console.log("✅ URLs S3 válidas, processando com método otimizado!");
      console.log("📹 Vídeo de Introdução:", headerConfig.introVideo!.url);
      console.log("🎭 Vídeo de Encerramento:", headerConfig.outroVideo!.url);

      setState((prev) => ({
        ...prev,
        progress: "🚀 Iniciando concatenação sequencial (5 etapas)...",
      }));

      // USAR MÉTODO SIMPLES (demuxer) - mais confiável que filter_complex
      result = await window.videoConcatAPI.simpleConcatenate({
        recordedVideoPath,
        introVideoUrl: headerConfig.introVideo!.url,
        outroVideoUrl: headerConfig.outroVideo!.url,
      });
      console.log("🎯 RESULTADO RECEBIDO no overlay:", result);

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        result: {
          success: result.success,
          message: result.message,
          outputPath: result.outputPath,
        },
      }));

      // Se concatenação foi bem-sucedida e S3 está configurado, fazer upload
      if (result.success && result.outputPath && s3Config.isConfigured) {
        console.log("📤 Iniciando upload do vídeo concatenado para S3...");

        setState((prev) => ({
          ...prev,
          isUploading: true,
          uploadProgress: 0,
        }));

        try {
          const uploadResult = await window.s3Upload.uploadFile(
            result.outputPath,
            {
              accessKeyId: s3Config.accessKeyId!,
              secretAccessKey: s3Config.secretAccessKey!,
              region: s3Config.region,
              bucketName: s3Config.bucketName,
              folderPrefix: s3Config.folderPrefix,
            },
          );

          console.log("✅ Upload concluído:", uploadResult);

          setState((prev) => ({
            ...prev,
            isUploading: false,
            uploadResult: {
              success: uploadResult.success,
              message: uploadResult.message,
              s3Url: uploadResult.s3Url,
            },
          }));
        } catch (uploadError) {
          console.error("❌ Erro no upload:", uploadError);
          setState((prev) => ({
            ...prev,
            isUploading: false,
            uploadResult: {
              success: false,
              message: `Erro no upload: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
            },
          }));
        }
      }
    } catch (error) {
      console.error("❌ Ambos os métodos falharam:", error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        result: {
          success: false,
          message: `Erro na concatenação: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        },
      }));
    }
  };

  const handleClose = () => {
    setState({
      isProcessing: false,
      progress: "",
      result: null,
      isUploading: false,
      uploadProgress: 0,
      uploadResult: null,
    });
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            <h3 className="font-semibold">Concatenação de Vídeo</h3>
          </div>
          {!state.isProcessing && (
            <button
              onClick={handleClose}
              className="text-white transition-colors hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Aviso sobre configuração de vídeos */}
          {!state.isProcessing && !state.result && (
            <div
              className={`mb-4 rounded-lg border p-3 ${
                headerConfig.introVideo?.url && headerConfig.outroVideo?.url
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start space-x-2">
                <div
                  className={`mt-0.5 h-5 w-5 ${
                    headerConfig.introVideo?.url && headerConfig.outroVideo?.url
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {headerConfig.introVideo?.url && headerConfig.outroVideo?.url
                    ? "🚀"
                    : "❌"}
                </div>
                <div className="flex-1">
                  {headerConfig.introVideo?.url &&
                  headerConfig.outroVideo?.url ? (
                    <>
                      <h4 className="font-medium text-green-900">
                        Vídeos S3 Configurados
                      </h4>
                      <p className="mt-1 text-sm text-green-800">
                        Usando seus vídeos personalizados (~10 seg cada).
                        Processamento será rápido!
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium text-red-900">
                        Configuração Obrigatória
                      </h4>
                      <p className="mt-1 text-sm text-red-800">
                        Configure os vídeos S3 nas configurações do header antes
                        de gravar. Sem os vídeos configurados, a concatenação
                        falhará.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {state.isProcessing || state.isUploading ? (
            // Loading State
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                {state.isUploading ? (
                  <Upload className="h-12 w-12 animate-bounce text-blue-500" />
                ) : (
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                )}
              </div>
              <h4 className="mb-2 text-lg font-medium text-gray-900">
                {state.isUploading ? "Enviando para S3" : "Processando Vídeo"}
              </h4>
              <p className="mb-4 text-gray-600">
                {state.isUploading
                  ? "Fazendo upload do vídeo concatenado para o bucket S3..."
                  : "Combinando seu vídeo com o vídeo introdutório..."}
              </p>

              {/* Progress de upload S3 */}
              {state.isUploading && state.uploadProgress > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progresso do Upload</span>
                    <span className="font-medium text-blue-600">
                      {state.uploadProgress}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${state.uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Progress de concatenação */}
              {!state.isUploading && state.progress && (
                <div className="mb-4 rounded-lg bg-gray-100 p-3">
                  <div className="max-h-20 overflow-y-auto font-mono text-xs text-gray-600">
                    {state.progress.split("\n").slice(-3).join("\n")}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                {state.isUploading
                  ? "Aguarde enquanto enviamos o arquivo..."
                  : "Este processo pode levar alguns minutos..."}
              </div>
            </div>
          ) : state.result ? (
            // Result State
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                {state.result.success ? (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-red-500" />
                )}
              </div>

              <h4
                className={`mb-2 text-lg font-medium ${
                  state.result.success ? "text-green-900" : "text-red-900"
                }`}
              >
                {state.result.success ? "Sucesso!" : "Erro"}
              </h4>

              <p
                className={`mb-4 ${
                  state.result.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {state.result.message}
              </p>

              {state.result.success && state.result.outputPath && (
                <div className="mb-4 space-y-3">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm text-green-800">
                      <strong>Arquivo local salvo em:</strong>
                    </p>
                    <p className="font-mono text-xs break-all text-green-600">
                      {state.result.outputPath}
                    </p>
                  </div>

                  {/* Resultado do upload S3 */}
                  {state.uploadResult && (
                    <div
                      className={`rounded-lg border p-3 ${
                        state.uploadResult.success
                          ? "border-blue-200 bg-blue-50"
                          : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {state.uploadResult.success ? (
                          <Cloud className="mt-0.5 h-5 w-5 text-blue-600" />
                        ) : (
                          <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                        )}
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${
                              state.uploadResult.success
                                ? "text-blue-900"
                                : "text-yellow-900"
                            }`}
                          >
                            {state.uploadResult.success
                              ? "✅ Upload para S3 concluído!"
                              : "⚠️ Upload para S3 falhou"}
                          </p>
                          {state.uploadResult.s3Url && (
                            <p className="mt-1 font-mono text-xs break-all text-blue-600">
                              {state.uploadResult.s3Url}
                            </p>
                          )}
                          {!state.uploadResult.success && (
                            <p className="mt-1 text-xs text-yellow-700">
                              {state.uploadResult.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-2">
                <button
                  onClick={handleClose}
                  className={`rounded-lg px-6 py-2 font-medium transition-colors ${
                    state.result.success
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-gray-500 text-white hover:bg-gray-600"
                  }`}
                >
                  {state.result.success ? "Fechar" : "Voltar ao Gravador"}
                </button>

                {!state.result.success && (
                  <button
                    onClick={() => {
                      // Abrir configurações do header
                      window.dispatchEvent(
                        new CustomEvent("open-header-config"),
                      );
                      handleClose();
                    }}
                    className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
                  >
                    Configurar Vídeos
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Initial State
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Video className="h-12 w-12 text-gray-400" />
              </div>
              <h4 className="mb-2 text-lg font-medium text-gray-900">
                Preparando Concatenação
              </h4>
              <p className="text-gray-600">
                Aguarde enquanto preparamos a concatenação do seu vídeo...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
