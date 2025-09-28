import React, { useState, useCallback } from "react";

interface S3VideoTestProps {
  videoConfig: {
    introVideo: { key: string; url: string };
    outroVideo: { key: string; url: string };
  };
}

export function S3VideoTest({ videoConfig }: S3VideoTestProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testVideoPath, setTestVideoPath] = useState(
    "/tmp/test-recorded-video.mp4",
  );

  const canTest = videoConfig.introVideo.url && videoConfig.outroVideo.url;

  const runTest = useCallback(async () => {
    if (!canTest) {
      setError(
        "Selecione ambos os vídeos (introdução e encerramento) antes de testar.",
      );
      return;
    }

    setTesting(true);
    setError(null);
    setResult(null);

    try {
      console.log("🧪 Iniciando teste com vídeos S3:");
      console.log("🎬 Vídeo de introdução:", videoConfig.introVideo);
      console.log("🎭 Vídeo de encerramento:", videoConfig.outroVideo);
      console.log("📁 Vídeo gravado (simulado):", testVideoPath);

      // Chamar o handler de concatenação com as URLs do S3
      const testResult = await window.electron.invoke(
        "video-concat:auto-concatenate-robust",
        {
          recordedVideoPath: testVideoPath,
          outputPath: "/tmp/test-s3-concatenation-output.mp4",
          introVideoUrl: videoConfig.introVideo.url,
          outroVideoUrl: videoConfig.outroVideo.url,
        },
      );

      console.log("✅ Resultado do teste:", testResult);
      setResult(testResult);
    } catch (err) {
      console.error("❌ Erro no teste:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      setTesting(false);
    }
  }, [canTest, videoConfig, testVideoPath]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          🧪 Teste de Concatenação com Vídeos S3
        </h2>
        <p className="text-sm text-gray-600">
          Teste a funcionalidade de concatenação usando os vídeos selecionados
          do S3.
        </p>
      </div>

      {/* Status da configuração */}
      <div className="mb-4 rounded-md bg-gray-50 p-3">
        <h3 className="mb-2 font-medium text-gray-900">
          Status da Configuração:
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${
                videoConfig.introVideo.url ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span>
              Vídeo de Introdução:{" "}
              {videoConfig.introVideo.url
                ? "✅ Configurado"
                : "❌ Não selecionado"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${
                videoConfig.outroVideo.url ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span>
              Vídeo de Encerramento:{" "}
              {videoConfig.outroVideo.url
                ? "✅ Configurado"
                : "❌ Não selecionado"}
            </span>
          </div>
        </div>
      </div>

      {/* Botão de teste */}

      {!canTest && (
        <p className="mt-2 text-sm text-red-600">
          Selecione ambos os vídeos (introdução e encerramento) para habilitar o
          teste.
        </p>
      )}

      {/* Resultado do teste */}
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-start space-x-2">
            <div className="mt-0.5 h-5 w-5 text-red-600">❌</div>
            <div className="flex-1">
              <h4 className="font-medium text-red-900">Erro no Teste:</h4>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-start space-x-2">
            <div className="mt-0.5 h-5 w-5 text-green-600">✅</div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900">
                Resultado do Teste:
              </h4>
              <div className="mt-2 space-y-1 text-sm text-green-800">
                <p>
                  <strong>Status:</strong>{" "}
                  {result.success ? "Sucesso" : "Falha"}
                </p>
                <p>
                  <strong>Mensagem:</strong> {result.message}
                </p>
                {result.outputPath && (
                  <p>
                    <strong>Arquivo de Saída:</strong> {result.outputPath}
                  </p>
                )}
                {result.fileSize && (
                  <p>
                    <strong>Tamanho:</strong>{" "}
                    {(result.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                {result.method && (
                  <p>
                    <strong>Método Usado:</strong> {result.method}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações adicionais */}
      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
        <h4 className="mb-2 font-medium text-blue-900">
          💡 Como funciona o teste:
        </h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Usa as URLs dos vídeos selecionados do S3</li>
          <li>• Substitui os vídeos demo pelos seus vídeos reais</li>
          <li>• Sequência: Introdução S3 → Vídeo Gravado → Encerramento S3</li>
          <li>• Mostra logs detalhados no console do Electron</li>
        </ul>
      </div>
    </div>
  );
}
