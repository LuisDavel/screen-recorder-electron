import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Camera,
	Mic,
	Monitor,
	CheckCircle,
	XCircle,
	AlertCircle,
} from "lucide-react";
import { MediaPermissionsHelper } from "@/helpers/media-permissions-helper";

interface PermissionStatus {
	camera: boolean;
	microphone: boolean;
	screenCapture: boolean;
}

interface PermissionsManagerProps {
	onPermissionsUpdated?: (permissions: PermissionStatus) => void;
}

export function PermissionsManager({
	onPermissionsUpdated,
}: PermissionsManagerProps) {
	const [permissions, setPermissions] = useState<PermissionStatus>({
		camera: false,
		microphone: false,
		screenCapture: false,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Check permissions on component mount
	useEffect(() => {
		checkPermissions();
	}, []);

	const checkPermissions = async () => {
		try {
			setIsLoading(true);
			setError(null);

			const result = await window.permissions.checkPermissions();
			setPermissions(result);
			onPermissionsUpdated?.(result);
		} catch (err) {
			console.error("Error checking permissions:", err);
			setError("Erro ao verificar permissões do sistema");
		} finally {
			setIsLoading(false);
		}
	};

	const requestPermissions = async () => {
		try {
			setIsLoading(true);
			setError(null);

			console.log("Starting permission request process...");

			// First, try to access media devices directly (this triggers macOS permission dialogs)
			const mediaResult =
				await MediaPermissionsHelper.requestMediaPermissions();
			console.log("Media permissions result:", mediaResult);

			if (mediaResult.error) {
				console.warn("Media permissions error:", mediaResult.error);
			}

			// Then check system-level permissions
			const systemResult = await window.permissions.requestPermissions();
			console.log("System permissions result:", systemResult);

			// Combine results - prioritize the actual media access results
			const combinedResult = {
				camera: mediaResult.camera || systemResult.camera,
				microphone: mediaResult.microphone || systemResult.microphone,
				screenCapture: systemResult.screenCapture,
			};

			setPermissions(combinedResult);
			onPermissionsUpdated?.(combinedResult);

			// If screen capture is not granted, guide user to system preferences
			if (!combinedResult.screenCapture) {
				console.log(
					"Screen capture not granted, opening system preferences...",
				);
				const openResult =
					await window.permissions.openScreenRecordingPreferences();
				if (openResult.success) {
					// Wait a moment and check again
					setTimeout(() => {
						checkPermissions();
					}, 2000);
				}
			}
		} catch (err) {
			console.error("Error requesting permissions:", err);
			setError("Erro ao solicitar permissões do sistema");
		} finally {
			setIsLoading(false);
		}
	};

	const openScreenRecordingPreferences = async () => {
		try {
			const result = await window.permissions.openScreenRecordingPreferences();
			if (result.success) {
				// Wait a moment and check again
				setTimeout(() => {
					checkPermissions();
				}, 2000);
			} else {
				setError("Erro ao abrir preferências do sistema");
			}
		} catch (err) {
			console.error("Error opening screen recording preferences:", err);
			setError("Erro ao abrir preferências do sistema");
		}
	};

	const getPermissionIcon = (granted: boolean) => {
		return granted ? (
			<CheckCircle className="h-5 w-5 text-green-500" />
		) : (
			<XCircle className="h-5 w-5 text-red-500" />
		);
	};

	const allPermissionsGranted =
		permissions.camera && permissions.microphone && permissions.screenCapture;

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AlertCircle className="h-5 w-5" />
					Permissões do Sistema
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{!allPermissionsGranted && (
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Este aplicativo precisa de permissões do sistema para funcionar
							corretamente. No macOS, você será solicitado a conceder permissões
							para câmera, microfone e captura de tela.
						</AlertDescription>
					</Alert>
				)}

				<div className="space-y-3">
					{/* Camera Permission */}
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
						<div className="flex items-center gap-3">
							<Camera className="h-5 w-5 text-blue-500" />
							<div>
								<p className="font-medium">Câmera</p>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Para gravação com overlay da webcam
								</p>
							</div>
						</div>
						{getPermissionIcon(permissions.camera)}
					</div>

					{/* Microphone Permission */}
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
						<div className="flex items-center gap-3">
							<Mic className="h-5 w-5 text-green-500" />
							<div>
								<p className="font-medium">Microfone</p>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Para gravação de áudio
								</p>
							</div>
						</div>
						{getPermissionIcon(permissions.microphone)}
					</div>

					{/* Screen Capture Permission */}
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
						<div className="flex items-center gap-3">
							<Monitor className="h-5 w-5 text-purple-500" />
							<div>
								<p className="font-medium">Captura de Tela</p>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Para gravação da tela
								</p>
							</div>
						</div>
						{getPermissionIcon(permissions.screenCapture)}
					</div>
				</div>

				<div className="flex gap-2">
					<Button
						onClick={requestPermissions}
						disabled={isLoading}
						className="flex-1"
					>
						{isLoading ? "Solicitando..." : "Solicitar Permissões"}
					</Button>

					<Button
						onClick={checkPermissions}
						variant="outline"
						disabled={isLoading}
					>
						Verificar
					</Button>
				</div>

				{!permissions.screenCapture && (
					<Button
						onClick={openScreenRecordingPreferences}
						variant="outline"
						className="w-full"
					>
						Abrir Preferências de Captura de Tela
					</Button>
				)}

				{allPermissionsGranted && (
					<Alert>
						<CheckCircle className="h-4 w-4" />
						<AlertDescription>
							Todas as permissões foram concedidas! O aplicativo está pronto
							para usar.
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}
