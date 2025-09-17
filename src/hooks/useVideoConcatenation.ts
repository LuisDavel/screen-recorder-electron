import { useState, useEffect, useCallback } from 'react';

interface VideoConcatenationState {
    isOverlayVisible: boolean;
    recordedVideoPath: string | null;
    isProcessing: boolean;
}

interface VideoConcatAPI {
    autoConcatenate: (options: {
        recordedVideoPath: string;
        outputPath?: string;
    }) => Promise<{
        success: boolean;
        outputPath: string;
        message: string;
        fileSize?: number;
    }>;
    concatenateVideos: (options: {
        remoteVideoUrl: string;
        localVideoPath: string;
        outputPath: string;
    }) => Promise<{
        success: boolean;
        outputPath: string;
        message: string;
        fileSize?: number;
    }>;
    checkFFmpeg: () => Promise<{
        available: boolean;
        message: string;
        path?: string;
        version?: string;
    }>;
    onProgress: (callback: (progress: string) => void) => void;
    removeProgressListener: () => void;
}

declare global {
    interface Window {
        videoConcatAPI?: VideoConcatAPI;
        electronAPI?: {
            on: (channel: string, callback: (...args: unknown[]) => void) => void;
            removeAllListeners: (channel: string) => void;
        };
    }
}

export function useVideoConcatenation() {
    const [state, setState] = useState<VideoConcatenationState>({
        isOverlayVisible: false,
        recordedVideoPath: null,
        isProcessing: false
    });

    // Listener para quando um vídeo é salvo e deve ser concatenado
    useEffect(() => {
        console.log('🎬 useVideoConcatenation: Configurando listeners...');

        const handleAutoConcatenation = (event: unknown, data: { recordedVideoPath: string }) => {
            console.log('🎬 Recebido evento IPC de auto-concatenação:', data);
            setState(prev => ({
                ...prev,
                isOverlayVisible: true,
                recordedVideoPath: data.recordedVideoPath
            }));
        };

        const handleWindowEvent = (event: CustomEvent) => {
            console.log('🎬 Recebido evento window de auto-concatenação:', event.detail);
            setState(prev => ({
                ...prev,
                isOverlayVisible: true,
                recordedVideoPath: event.detail.recordedVideoPath
            }));
        };

        // Registrar listener usando electronAPI (IPC)
        if (window.electronAPI) {
            console.log('🎬 Registrando listener IPC...');
            window.electronAPI.on('video-concat:start-auto-concatenation', handleAutoConcatenation);
        } else {
            console.warn('⚠️ electronAPI não disponível');
        }

        // Registrar listener para eventos do window
        console.log('🎬 Registrando listener window...');
        window.addEventListener('video-concat:start-auto-concatenation', handleWindowEvent as EventListener);

        console.log('🎬 Listeners configurados com sucesso!');

        // Cleanup
        return () => {
            if (window.electronAPI) {
                window.electronAPI.removeAllListeners('video-concat:start-auto-concatenation');
            }
            window.removeEventListener('video-concat:start-auto-concatenation', handleWindowEvent as EventListener);
        };
    }, []);

    const closeOverlay = useCallback(() => {
        setState(prev => ({
            ...prev,
            isOverlayVisible: false,
            recordedVideoPath: null,
            isProcessing: false
        }));
    }, []);

    const startManualConcatenation = useCallback(async (options: {
        remoteVideoUrl: string;
        localVideoPath: string;
        outputPath: string;
    }) => {
        if (!window.videoConcatAPI) {
            throw new Error('API de concatenação não disponível');
        }

        setState(prev => ({ ...prev, isProcessing: true }));

        try {
            const result = await window.videoConcatAPI.concatenateVideos(options);
            return result;
        } finally {
            setState(prev => ({ ...prev, isProcessing: false }));
        }
    }, []);

    const checkFFmpegAvailability = useCallback(async () => {
        if (!window.videoConcatAPI) {
            return {
                available: false,
                message: 'API de concatenação não disponível'
            };
        }

        return await window.videoConcatAPI.checkFFmpeg();
    }, []);

    return {
        // Estado
        isOverlayVisible: state.isOverlayVisible,
        recordedVideoPath: state.recordedVideoPath,
        isProcessing: state.isProcessing,

        // Ações
        closeOverlay,
        startManualConcatenation,
        checkFFmpegAvailability
    };
}