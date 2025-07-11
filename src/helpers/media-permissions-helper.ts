// Helper for requesting media permissions in the renderer process
// This makes actual attempts to access devices to trigger permission dialogs

export interface MediaPermissionResult {
	camera: boolean;
	microphone: boolean;
	error?: string;
}

export class MediaPermissionsHelper {
	// Request camera and microphone permissions by actually accessing devices
	static async requestMediaPermissions(): Promise<MediaPermissionResult> {
		console.log(
			"Attempting to request media permissions by accessing devices...",
		);

		let cameraPermission = false;
		let microphonePermission = false;
		let error: string | undefined;

		try {
			// Try to access camera - this will trigger the permission dialog on macOS
			try {
				console.log("Attempting to access camera...");
				const cameraStream = await navigator.mediaDevices.getUserMedia({
					video: {
						width: { ideal: 1280, max: 1920 },
						height: { ideal: 720, max: 1080 },
						frameRate: { ideal: 30, max: 60 },
					},
					audio: false,
				});

				// If successful, we have permission
				cameraPermission = true;
				console.log("Camera permission granted");

				// Stop the stream immediately as we only needed it for permission
				cameraStream.getTracks().forEach((track) => {
					track.stop();
					console.log("Camera track stopped");
				});
			} catch (cameraError) {
				console.log("Camera permission denied or failed:", cameraError);
				cameraPermission = false;
			}

			// Small delay between requests to avoid conflicts
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Try to access microphone - this will trigger the permission dialog on macOS
			try {
				console.log("Attempting to access microphone...");
				const microphoneStream = await navigator.mediaDevices.getUserMedia({
					video: false,
					audio: {
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true,
					},
				});

				// If successful, we have permission
				microphonePermission = true;
				console.log("Microphone permission granted");

				// Stop the stream immediately as we only needed it for permission
				microphoneStream.getTracks().forEach((track) => {
					track.stop();
					console.log("Microphone track stopped");
				});
			} catch (micError) {
				console.log("Microphone permission denied or failed:", micError);
				microphonePermission = false;
			}
		} catch (generalError) {
			console.error(
				"General error requesting media permissions:",
				generalError,
			);
			error =
				generalError instanceof Error
					? generalError.message
					: String(generalError);
		}

		const result = {
			camera: cameraPermission,
			microphone: microphonePermission,
			error,
		};

		console.log("Media permissions request result:", result);
		return result;
	}

	// Check if media devices are available (doesn't trigger permissions)
	static async checkMediaDevicesAvailable(): Promise<{
		camera: boolean;
		microphone: boolean;
	}> {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const hasCamera = devices.some((device) => device.kind === "videoinput");
			const hasMicrophone = devices.some(
				(device) => device.kind === "audioinput",
			);

			return {
				camera: hasCamera,
				microphone: hasMicrophone,
			};
		} catch (error) {
			console.error("Error checking media devices:", error);
			return {
				camera: false,
				microphone: false,
			};
		}
	}

	// Test access to specific device types without keeping the stream
	static async testCameraAccess(): Promise<boolean> {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			stream.getTracks().forEach((track) => track.stop());
			return true;
		} catch (error) {
			console.log("Camera access test failed:", error);
			return false;
		}
	}

	static async testMicrophoneAccess(): Promise<boolean> {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach((track) => track.stop());
			return true;
		} catch (error) {
			console.log("Microphone access test failed:", error);
			return false;
		}
	}
}
