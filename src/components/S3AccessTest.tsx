import React, { useState } from "react";
import { Play, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface S3AccessTestProps {
  videoUrl?: string;
  videoName?: string;
  testLabel?: string;
}

interface TestResult {
  success: boolean;
  exitCode?: number;
  stderr?: string;
  videoInfo?: {
    duration?: string;
    resolution?: string;
    videoCodec?: string;
    audioCodec?: string;
  };
  error?: string;
  testName?: string;
}

export function S3AccessTest({
  videoUrl,
  videoName = "Vídeo",
  testLabel = "Testar Acesso FFmpeg"
}: S3AccessTestProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    if (!videoUrl) {
      setResult({
        success: false,
        error: "URL não fornecida"
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      console.log("🧪 Iniciando teste de acesso S3 via FFmpeg...");
      console.log("📋 URL:", videoUrl);

      const testResult = await window.videoConcatAPI?.testS3Access({
        videoUrl,
        testName: videoName
      });

      console.log("📊 Resultado do teste:", testResult);
      setResult(testResult);
    } catch (error) {
      console.error("❌ Erro no teste:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    } finally {
      setTesting(false);
    }
  };

  if (!videoUrl) {
    return (
      <div className="p-3 bg-gray-50 rounded-md border">
        <p className="text-sm text-gray-600">URL não configurada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Botão de teste */}
      <button
        onClick={runTest}
        disabled={testing}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
          testing
            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {testing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Testando...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            {testLabel}
          </>
        )}
      </button>

      {/* Resultado */}
      {result && (
        <div className={`p-3 rounded-md border ${
          result.success
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-sm ${
                result.success ? "text-green-900" : "text-red-900"
              }`}>
                {result.success ? "✅ FFmpeg conseguiu acessar" : "❌ FFmpeg não conseguiu acessar"}
              </h4>

              {result.success && result.videoInfo && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-green-800">
                    <strong>Informações do vídeo:</strong>
                  </p>
                  {result.videoInfo.duration && (
                    <p className="text-xs text-green-700">
                      ⏱️ Duração: {result.videoInfo.duration}
                    </p>
                  )}
                  {result.videoInfo.resolution && (
                    <p className="text-xs text-green-700">
                      📐 Resolução: {result.videoInfo.resolution}
                    </p>
                  )}
                  {result.videoInfo.videoCodec && (
                    <p className="text-xs text-green-700">
                      🎥 Codec Vídeo: {result.videoInfo.videoCodec}
                    </p>
                  )}
                  {result.videoInfo.audioCodec && (
                    <p className="text-xs text-green-700">
                      🔊 Codec Áudio: {result.videoInfo.audioCodec}
                    </p>
                  )}
                </div>
              )}

              {!result.success && (
                <div className="mt-2">
                  <p className="text-xs text-red-800">
                    <strong>Erro:</strong> {result.error}
                  </p>
                  {result.exitCode !== undefined && (
                    <p className="text-xs text-red-700 mt-1">
                      Código de saída: {result.exitCode}
                    </p>
                  )}
                  {result.stderr && (
                    <div className="mt-2">
                      <p className="text-xs text-red-800 font-medium">Log do FFmpeg:</p>
                      <pre className="text-xs text-red-700 mt-1 p-2 bg-red-100 rounded overflow-x-auto whitespace-pre-wrap">
                        {result.stderr.split('\n').slice(-10).join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info adicional */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>📄 <strong>Arquivo:</strong> {videoName}</p>
        <p>🔗 <strong>URL:</strong> {videoUrl.substring(0, 60)}...</p>
        <p className="text-gray-500">
          ℹ️ Este teste verifica se o FFmpeg consegue acessar diretamente a URL S3.
        </p>
      </div>
    </div>
  );
}

// Tipos globais para TypeScript
declare global {
  interface Window {
    videoConcatAPI?: {
      testS3Access: (options: {
        videoUrl: string;
        testName: string;
      }) => Promise<TestResult>;
    };
  }
}
