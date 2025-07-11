import React, { useEffect, useRef, useState, useCallback } from "react";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { cn } from "@/utils/tailwind";
import { useDeviceInitialization } from "@/hooks/useDeviceInitialization";

export function CameraOverlay() {
	const { isEnabled, position, size, mainStream } = useCameraConfigStore();

	const videoRef = useRef<HTMLVideoElement>(null);
	const [openConfig, setOpenConfig] = useState(false);

	// Use the new centralized device initialization hook
	useDeviceInitialization({
		devices: ["camera"],
		autoInitialize: true,
	});

	// Update video element when stream changes
	useEffect(() => {
		if (videoRef.current && mainStream) {
			videoRef.current.srcObject = mainStream;
			videoRef.current.play().catch((err) => {
				console.error("CameraOverlay: Video play error:", err);
			});
		}
	}, [mainStream]);

	const handleClick = useCallback(() => {
		setOpenConfig(!openConfig);
	}, [openConfig]);

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

	// Size classes
	const sizeClasses = {
		small: "w-24 h-18", // 96x72px
		medium: "w-32 h-24", // 128x96px
		large: "w-40 h-30", // 160x120px
	};

	return (
		<div
			className={cn(
				"absolute z-10 overflow-hidden rounded-lg border-2 border-white/30 bg-black",
				positionClasses[position],
				sizeClasses[size],
			)}
			onClick={handleClick}
		>
			{mainStream ? (
				<video
					ref={videoRef}
					className="h-full w-full object-cover"
					autoPlay
					muted
					playsInline
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center bg-gray-800">
					<div className="text-center">
						<div className="mb-1 text-xs text-white opacity-75">Câmera</div>
						<div className="text-[10px] text-white opacity-50">
							Desconectada
						</div>
					</div>
				</div>
			)}

			{/* Loading indicator */}
			{isEnabled && !mainStream && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
					<div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
				</div>
			)}
		</div>
	);
}
