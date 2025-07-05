import React, { useEffect, useRef, useState } from "react";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { cn } from "@/utils/tailwind";

export function CameraOverlay() {
  const {
    isEnabled,
    position,
    size,
    mainStream,
    selectedDeviceId,
    isInitializing,
    initializeMainStream,
  } = useCameraConfigStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [openConfig, setOpenConfig] = useState(false);
  // Force initialization when camera is enabled
  useEffect(() => {
    if (isEnabled && selectedDeviceId && !mainStream && !isInitializing) {
      console.log("CameraOverlay: Forcing camera initialization");
      initializeMainStream();
    }
  }, [
    isEnabled,
    selectedDeviceId,
    mainStream,
    isInitializing,
    initializeMainStream,
  ]);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && mainStream) {
      console.log("CameraOverlay: Setting video source");
      videoRef.current.srcObject = mainStream;
      videoRef.current.play().catch((err) => {
        console.error("CameraOverlay: Video play error:", err);
      });
    }
  }, [mainStream]);

  // Don't render if camera is not enabled
  if (!isEnabled) {
    return null;
  }

  // Position classes
  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  //Position header options
  const positionClassesOptions = {
    "top-left": "top-4 left-[130px]",
    "top-right": "top-4 right-[130px]",
    "bottom-left": "bottom-4 left-[130px]",
    "bottom-right": "bottom-4 right-[130px]",
  };
  // Size classes
  const sizeClasses = {
    small: "w-24 h-18", // 96x72px
    medium: "w-32 h-24", // 128x96px
    large: "w-40 h-30", // 160x120px
  };

  const handleClick = () => {
    setOpenConfig(!openConfig);
  };

  return (
    <>
      <div
        className={cn(
          "absolute z-10 overflow-hidden rounded-md border-2 border-white shadow-lg",
          positionClasses[position],
          sizeClasses[size],
        )}
      >
        {isInitializing && (
          <div className="flex h-full w-full items-center justify-center bg-gray-800 text-xs text-white">
            Carregando...
          </div>
        )}

        {mainStream && (
          <video
            ref={videoRef}
            className="h-full w-full object-cover p-0"
            autoPlay
            muted
            playsInline
          />
        )}
        {!mainStream && !isInitializing && (
          <div className="flex h-full w-full items-center justify-center bg-gray-600 text-xs text-white">
            Aguardando...
          </div>
        )}
      </div>
    </>
  );
}
