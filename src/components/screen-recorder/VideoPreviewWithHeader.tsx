import React, { useRef, useEffect } from "react";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { PreviewHeader } from "../recording-header/PreviewHeader";

interface VideoPreviewWithHeaderProps {
	stream: MediaStream | null;
	isRecording?: boolean;
	className?: string;
}

export default function VideoPreviewWithHeader({
	stream,
	isRecording = false,
	className = "",
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

	return (
		<div className={`relative h-full w-full bg-black ${className}`}>
			{/* Preview do vídeo */}
			<video
				ref={videoRef}
				className="h-full w-full object-contain"
				autoPlay
				muted
				playsInline
			/>

			{/* Indicador de gravação */}
			{isRecording && (
				<div className="absolute top-2 right-2 z-[90] flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
					<div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
					<span className="text-sm font-medium">REC</span>
				</div>
			)}

			{/* Indicador quando não há stream */}
			{!stream && (
				<div className="absolute inset-0 flex items-center justify-center text-gray-500">
					<div className="text-center">
						<p className="text-lg">Nenhuma fonte selecionada</p>
						<p className="mt-2 text-sm">
							Selecione uma fonte para visualizar o preview
						</p>
					</div>
				</div>
			)}

			{/* Header sobreposto na parte superior - Preview específico */}
			{stream && headerConfig.isEnabled && (
				<PreviewHeader
					isVisible={true}
					className="absolute top-0 right-0 left-0 z-50"
				/>
			)}
		</div>
	);
}
