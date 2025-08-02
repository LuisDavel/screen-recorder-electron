import { useEffect, useCallback, useState } from "react";

interface GlobalShortcutsHook {
    shortcuts: Record<string, string>;
    registerShortcutHandlers: (handlers: {
        onStartRecording?: () => void;
        onStopRecording?: () => void;
        onTogglePause?: () => void;
    }) => void;
}

export function useGlobalShortcuts(): GlobalShortcutsHook {
    const registerShortcutHandlers = useCallback((handlers: {
        onStartRecording?: () => void;
        onStopRecording?: () => void;
        onTogglePause?: () => void;
    }) => {
        // Registrar listeners para os atalhos globais usando eventos customizados
        const handleStartRecording = () => {
            console.log("🎹 Atalho start-recording recebido");
            handlers.onStartRecording?.();
        };

        const handleStopRecording = () => {
            console.log("🎹 Atalho stop-recording recebido");
            handlers.onStopRecording?.();
        };

        const handleTogglePause = () => {
            console.log("🎹 Atalho toggle-pause recebido");
            handlers.onTogglePause?.();
        };

        // Registrar listeners para eventos customizados
        window.addEventListener('shortcut:start-recording', handleStartRecording);
        window.addEventListener('shortcut:stop-recording', handleStopRecording);
        window.addEventListener('shortcut:toggle-pause', handleTogglePause);

        // Cleanup function
        return () => {
            window.removeEventListener('shortcut:start-recording', handleStartRecording);
            window.removeEventListener('shortcut:stop-recording', handleStopRecording);
            window.removeEventListener('shortcut:toggle-pause', handleTogglePause);
        };
    }, []);

    // Obter lista de atalhos registrados
    const [shortcuts, setShortcuts] = useState<Record<string, string>>({});

    useEffect(() => {
        const getShortcuts = async () => {
            try {
                if (window.electronAPI) {
                    const result = await window.electronAPI.invoke('get-global-shortcuts');
                    if (result.success) {
                        setShortcuts(result.shortcuts);
                    }
                }
            } catch (error) {
                console.error("Erro ao obter atalhos:", error);
            }
        };

        getShortcuts();
    }, []);

    return {
        shortcuts,
        registerShortcutHandlers
    };
}