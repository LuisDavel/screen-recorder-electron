import { useState, useEffect, useCallback } from "react";

export interface BackgroundRecordingState {
	isRecording: boolean;
	keepAliveStatus: boolean;
	lastKeepAlive: number | null;
}

export interface BackgroundRecordingActions {
	syncRecordingStatus: (status: boolean) => Promise<void>;
	setWindowOpacity: (opacity: number) => Promise<void>;
	showWindow: () => Promise<void>;
	hideWindow: () => Promise<void>;
}

export function useBackgroundRecording(): BackgroundRecordingState &
	BackgroundRecordingActions {
	const [state, setState] = useState<BackgroundRecordingState>({
		isRecording: false,
		keepAliveStatus: false,
		lastKeepAlive: null,
	});

	// Verificar se a API está disponível
	const backgroundAPI = window.backgroundRecordingAPI;

	// Atualizar estado interno
	const updateState = useCallback(
		(updates: Partial<BackgroundRecordingState>) => {
			setState((prev) => ({ ...prev, ...updates }));
		},
		[],
	);

	// Sincronizar status de gravação
	const syncRecordingStatus = useCallback(
		async (status: boolean) => {
			if (!backgroundAPI) return;

			try {
				const result = await backgroundAPI.syncRecordingStatus(status);
				if (result.success) {
					updateState({ isRecording: result.isRecording });
					console.log(`🔄 Status de gravação sincronizado: ${status}`);

					// Ativar translucidez quando começar a gravar
					if (status) {
						await backgroundAPI.setWindowOpacity(0.8);
						console.log(
							"🌫️ Translucidez ativada automaticamente durante gravação",
						);

						// Reforçar bloqueio de minimização durante gravação
						await backgroundAPI.ensureMinimizationBlocked();
						console.log(
							"🔒 Bloqueio de minimização reforçado durante gravação",
						);
					} else {
						await backgroundAPI.setWindowOpacity(1.0);
						console.log("🌫️ Translucidez removida após parar gravação");

						// Manter bloqueio de minimização mesmo após parar
						await backgroundAPI.ensureMinimizationBlocked();
						console.log(
							"🔒 Bloqueio de minimização mantido após parar gravação",
						);
					}
				}
			} catch (error) {
				console.error("Erro ao sincronizar status de gravação:", error);
			}
		},
		[backgroundAPI, updateState],
	);

	// Controlar opacidade da janela
	const setWindowOpacity = useCallback(
		async (opacity: number) => {
			if (!backgroundAPI) return;

			try {
				const result = await backgroundAPI.setWindowOpacity(opacity);
				if (result.success) {
					console.log(`🌫️ Opacidade da janela definida para: ${opacity}`);
				}
			} catch (error) {
				console.error("Erro ao definir opacidade da janela:", error);
			}
		},
		[backgroundAPI],
	);

	// Mostrar janela
	const showWindow = useCallback(async () => {
		if (!backgroundAPI) return;

		try {
			const result = await backgroundAPI.showWindow();
			if (result.success) {
				console.log("🪟 Janela mostrada");
			}
		} catch (error) {
			console.error("Erro ao mostrar janela:", error);
		}
	}, [backgroundAPI]);

	// Ocultar janela
	const hideWindow = useCallback(async () => {
		if (!backgroundAPI) return;

		try {
			const result = await backgroundAPI.hideWindow();
			if (result.success) {
				console.log("🔲 Janela ocultada");
			}
		} catch (error) {
			console.error("Erro ao ocultar janela:", error);
		}
	}, [backgroundAPI]);

	// Keep alive system e bloqueio de minimização
	useEffect(() => {
		if (!backgroundAPI) return;

		const keepAliveInterval = setInterval(async () => {
			try {
				const result = await backgroundAPI.keepAlive();
				updateState({
					keepAliveStatus: result.alive,
					lastKeepAlive: result.timestamp,
				});

				// Reforçar bloqueio de minimização durante gravação
				if (state.isRecording) {
					await backgroundAPI.ensureMinimizationBlocked();
				}
			} catch (error) {
				console.error("Keep alive error:", error);
				updateState({ keepAliveStatus: false });
			}
		}, 30000); // A cada 30 segundos

		// Cleanup
		return () => {
			clearInterval(keepAliveInterval);
		};
	}, [backgroundAPI, updateState, state.isRecording]);

	return {
		...state,
		syncRecordingStatus,
		setWindowOpacity,
		showWindow,
		hideWindow,
	};
}
