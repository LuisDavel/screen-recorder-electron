import { useEffect, useState } from "react";
import { MediaPermissionsHelper } from "@/helpers/media-permissions-helper";
import { ManualPermissionTrigger } from "@/helpers/manual-permission-trigger";

interface PermissionStatus {
	camera: boolean;
	microphone: boolean;
	screenCapture: boolean;
}

interface UsePermissionsInitializerOptions {
	autoRequestOnMount?: boolean;
	retryCount?: number;
	retryDelay?: number;
}

export function usePermissionsInitializer(
	options: UsePermissionsInitializerOptions = {},
) {
	const {
		autoRequestOnMount = false,
		retryCount = 1,
		retryDelay = 2000,
	} = options;

	const [permissions, setPermissions] = useState<PermissionStatus>({
		camera: false,
		microphone: false,
		screenCapture: false,
	});
	const [isInitializing, setIsInitializing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasAttemptedInit, setHasAttemptedInit] = useState(false);

	// Check permissions using the system API
	const checkSystemPermissions = async (): Promise<PermissionStatus> => {
		try {
			if (window.permissions?.checkPermissions) {
				return await window.permissions.checkPermissions();
			}
			return { camera: false, microphone: false, screenCapture: false };
		} catch (err) {
			console.error("Error checking system permissions:", err);
			return { camera: false, microphone: false, screenCapture: false };
		}
	};

	// Initialize permissions by attempting device access
	const initializePermissions = async (
		attemptNumber = 1,
	): Promise<PermissionStatus> => {
		console.log(
			`Initializing permissions (attempt ${attemptNumber}/${retryCount + 1})...`,
		);
		setIsInitializing(true);
		setError(null);

		try {
			// First, try to access media devices to trigger permission dialogs
			console.log(
				"Attempting to access media devices for permission initialization...",
			);

			// Try manual permission trigger first (forces native dialogs)
			const manualResult =
				await ManualPermissionTrigger.requestBothPermissions();

			// Fallback to original method if manual trigger fails
			const mediaResult =
				manualResult.camera || manualResult.microphone
					? manualResult
					: await MediaPermissionsHelper.requestMediaPermissions();

			// Then check system-level permissions
			const systemResult = await checkSystemPermissions();

			// Combine results
			const combinedResult: PermissionStatus = {
				camera: mediaResult.camera || systemResult.camera,
				microphone: mediaResult.microphone || systemResult.microphone,
				screenCapture: systemResult.screenCapture,
			};

			console.log("Permission initialization result:", combinedResult);
			setPermissions(combinedResult);
			setHasAttemptedInit(true);

			return combinedResult;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error("Error initializing permissions:", errorMessage);
			setError(errorMessage);

			// Retry if we haven't exhausted attempts
			if (attemptNumber <= retryCount) {
				console.log(`Retrying permission initialization in ${retryDelay}ms...`);
				setTimeout(() => {
					initializePermissions(attemptNumber + 1);
				}, retryDelay);
			} else {
				setHasAttemptedInit(true);
			}

			return { camera: false, microphone: false, screenCapture: false };
		} finally {
			setIsInitializing(false);
		}
	};

	// Just check permissions without triggering dialogs
	const checkPermissions = async () => {
		try {
			const result = await checkSystemPermissions();
			setPermissions(result);
			return result;
		} catch (err) {
			console.error("Error checking permissions:", err);
			return permissions;
		}
	};

	// Auto-initialize on mount if requested
	useEffect(() => {
		if (autoRequestOnMount && !hasAttemptedInit && !isInitializing) {
			console.log("Auto-requesting permissions on mount...");
			initializePermissions();
		}
	}, [autoRequestOnMount, hasAttemptedInit, isInitializing]);

	// Check permissions status periodically
	useEffect(() => {
		const interval = setInterval(() => {
			if (!isInitializing) {
				checkPermissions();
			}
		}, 5000); // Check every 5 seconds

		return () => clearInterval(interval);
	}, [isInitializing]);

	return {
		permissions,
		isInitializing,
		error,
		hasAttemptedInit,
		initializePermissions: () => initializePermissions(),
		checkPermissions,
		// Utility methods
		allPermissionsGranted:
			permissions.camera && permissions.microphone && permissions.screenCapture,
		hasAnyPermission:
			permissions.camera || permissions.microphone || permissions.screenCapture,
		missingPermissions: {
			camera: !permissions.camera,
			microphone: !permissions.microphone,
			screenCapture: !permissions.screenCapture,
		},
	};
}
