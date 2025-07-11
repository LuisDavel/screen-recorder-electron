import React, {
	useRef,
	useState,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { Button } from "./ui/button";
import { Play, Square, RotateCcw } from "lucide-react";
import { VideoComposer } from "@/helpers/video-composer";
import { useCameraConfigStore } from "@/store/store-camera-config";
import { useSourceVideoStore } from "@/store/store-source-video";

interface ComposedVideoPreviewProps {
	className?: string;
	autoStart?: boolean;
	showControls?: boolean;
	width?: number;
	height?: number;
}

export const ComposedVideoPreview = React.memo(function ComposedVideoPreview({
	className = "",
	autoStart = false,
	showControls = true,
	width = 640,
	height = 360,
}: ComposedVideoPreviewProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoComposer, setVideoComposer] = useState<VideoComposer | null>(
		null,
	);
	const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
	const [isActive, setIsActive] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Store states
	const { sourceId } = useSourceVideoStore();
	const {
		isEnabled: cameraEnabled,
		mainStream: cameraStream,
		position: cameraPosition,
		size: cameraSize,
	} = useCameraConfigStore();

	// Memoized values
	const showComposed = useMemo(() => {
		return cameraEnabled && !!cameraStream;
	}, [cameraEnabled, cameraStream]);

	const cameraConfig = useMemo(
		() => ({
			enabled: cameraEnabled,
			stream: cameraStream,
			position: cameraPosition,
			size: cameraSize,
		}),
		[cameraEnabled, cameraStream, cameraPosition, cameraSize],
	);

	// Start preview
	const startPreview = useCallback(async () => {
		if (!sourceId?.id) {
			setError("Nenhuma fonte selecionada");
			return;
		}

		console.log("Starting composed video preview");
		setError(null);

		try {
			// Get screen stream
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: sourceId.id,
					},
				} as MediaTrackConstraints & {
					mandatory: {
						chromeMediaSource: string;
						chromeMediaSourceId: string;
					};
				},
				audio: false,
			});

			setScreenStream(stream);

			// Create video composer
			const composer = new VideoComposer({
				screenStream: stream,
				cameraStream: showComposed && cameraStream ? cameraStream : undefined,
				cameraPosition: cameraPosition,
				cameraSize: cameraSize,
			});

			// Start composition
			const composedStream = composer.startComposition();

			if (videoRef.current) {
				videoRef.current.srcObject = composedStream;
				await videoRef.current.play();
			}

			setVideoComposer(composer);
			setIsActive(true);

			console.log("Preview started successfully");
		} catch (err) {
			console.error("Error starting preview:", err);
			setError(err instanceof Error ? err.message : String(err));
		}
	}, [sourceId?.id, showComposed, cameraStream, cameraPosition, cameraSize]);

	// Stop preview
	const stopPreview = useCallback(() => {
		console.log("Stopping composed video preview");

		if (videoComposer) {
			videoComposer.stopComposition();
			videoComposer.dispose();
			setVideoComposer(null);
		}

		if (screenStream) {
			screenStream.getTracks().forEach((track) => track.stop());
			setScreenStream(null);
		}

		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}

		setIsActive(false);
		setError(null);

		console.log("Preview stopped");
	}, [videoComposer, screenStream]);

	// Restart preview when composition settings change
	const restartPreview = useCallback(async () => {
		if (isActive) {
			stopPreview();
			await new Promise((resolve) => setTimeout(resolve, 100));
			startPreview();
		}
	}, [isActive, stopPreview, startPreview]);

	// Effect for auto-start
	useEffect(() => {
		if (autoStart && !isActive && sourceId?.id) {
			startPreview();
		}
	}, [autoStart, isActive, sourceId?.id, startPreview]);

	// Effect for camera configuration changes - using memoized config
	useEffect(() => {
		if (isActive && showComposed) {
			console.log("Camera configuration changed, restarting preview");
			restartPreview();
		}
	}, [cameraConfig, showComposed, restartPreview, isActive]);

	// Cleanup on unmount
	useEffect(() => {
		return stopPreview;
	}, [stopPreview]);

	const handleToggle = useCallback(() => {
		if (isActive) {
			stopPreview();
		} else {
			startPreview();
		}
	}, [isActive, stopPreview, startPreview]);

	return (
		<div className={`space-y-4 ${className}`}>
			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					Erro: {error}
				</div>
			)}

			<div className="relative overflow-hidden rounded-lg border bg-black">
				<video
					ref={videoRef}
					className="h-full w-full object-contain"
					style={{ width, height }}
					autoPlay
					muted
					playsInline
				/>

				{!isActive && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
						<div className="text-center">
							<div className="mb-2 text-4xl">📹</div>
							<div className="text-sm opacity-75">Preview não iniciado</div>
						</div>
					</div>
				)}
			</div>

			{showControls && (
				<div className="flex justify-center gap-2">
					<Button
						variant={isActive ? "destructive" : "default"}
						size="sm"
						onClick={handleToggle}
						disabled={!sourceId?.id}
					>
						{isActive ? (
							<>
								<Square className="mr-2 h-4 w-4" />
								Parar Preview
							</>
						) : (
							<>
								<Play className="mr-2 h-4 w-4" />
								Iniciar Preview
							</>
						)}
					</Button>

					{isActive && (
						<Button variant="outline" size="sm" onClick={restartPreview}>
							<RotateCcw className="mr-2 h-4 w-4" />
							Reiniciar
						</Button>
					)}
				</div>
			)}
		</div>
	);
});
