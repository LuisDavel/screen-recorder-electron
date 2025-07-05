import React, { useRef, useEffect } from 'react';
import RecordingHeader from '../recording-header/RecordingHeader';
import { useHeaderConfigStore } from '@/store/store-header-config';

interface VideoPreviewWithHeaderProps {
  stream: MediaStream | null;
  isRecording?: boolean;
  className?: string;
}

export default function VideoPreviewWithHeader({
  stream,
  isRecording = false,
  className = ''
}: VideoPreviewWithHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { headerConfig } = useHeaderConfigStore();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  const videoStyle: React.CSSProperties = headerConfig.isEnabled && isRecording
    ? {
        marginTop: `${headerConfig.height}px`,
        height: `calc(100% - ${headerConfig.height}px)`
      }
    : {};

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {/* Header sobreposto */}
      {isRecording && <RecordingHeader isVisible={true} />}

      {/* Preview do vídeo */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        style={videoStyle}
        autoPlay
        muted
        playsInline
      />

      {/* Indicador quando não há stream */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg">Nenhuma fonte selecionada</p>
            <p className="text-sm mt-2">Selecione uma fonte para visualizar o preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
