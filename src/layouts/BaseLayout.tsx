import React from "react";
import { VideoConcatenationOverlay } from "../components/VideoConcatenationOverlay";
import { useVideoConcatenation } from "../hooks/useVideoConcatenation";

interface BaseLayoutProps {
  children: React.ReactNode;
}

export default function BaseLayout({ children }: BaseLayoutProps) {
  const { isOverlayVisible, recordedVideoPath, closeOverlay } =
    useVideoConcatenation();

  // Função de teste para simular evento de concatenação
  const testConcatenation = () => {
    console.log("🧪 Testando concatenação...");
    const testVideoPath = "/tmp/test-video.mp4";

    window.dispatchEvent(
      new CustomEvent("video-concat:start-auto-concatenation", {
        detail: {
          recordedVideoPath: testVideoPath,
        },
      }),
    );
  };

  return (
    <>
      {/* Conteúdo principal */}
      <>{children}</>

      {/* Botão de teste temporário - REMOVER EM PRODUÇÃO */}

      {/* Overlay de concatenação global */}
      <VideoConcatenationOverlay
        isVisible={isOverlayVisible}
        recordedVideoPath={recordedVideoPath || undefined}
        onClose={closeOverlay}
      />
    </>
  );
}
