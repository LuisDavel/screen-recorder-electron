// Arquivo de debug para testar concatenação

export function debugConcatenationSystem() {
    console.log('🔍 === DEBUG CONCATENATION SYSTEM ===');

    // 1. Verificar se APIs estão disponíveis
    console.log('🔍 videoConcatAPI disponível:', !!window.videoConcatAPI);
    console.log('🔍 electronAPI disponível:', !!window.electronAPI);

    // 2. Verificar se FFmpeg está disponível
    if (window.videoConcatAPI) {
        window.videoConcatAPI.checkFFmpeg().then(result => {
            console.log('🔍 FFmpeg status:', result);
        }).catch(error => {
            console.error('🔍 Erro ao verificar FFmpeg:', error);
        });
    }

    // 3. Testar evento window
    console.log('🔍 Testando evento window...');
    const testEvent = new CustomEvent('video-concat:start-auto-concatenation', {
        detail: {
            recordedVideoPath: '/tmp/debug-test.mp4'
        }
    });

    console.log('🔍 Evento criado:', testEvent);
    window.dispatchEvent(testEvent);
    console.log('🔍 Evento disparado');

    // 4. Verificar listeners
    console.log('🔍 Verificando listeners...');

    return {
        videoConcatAPI: !!window.videoConcatAPI,
        electronAPI: !!window.electronAPI,
        eventDispatched: true
    };
}

// Expor no window para uso no console
if (typeof window !== 'undefined') {
    (window as any).debugConcat = debugConcatenationSystem;
    console.log('🔍 Debug function exposed: window.debugConcat()');
}

// Função para testar concatenação com arquivo real
export async function testRealConcatenation(videoPath: string) {
    console.log('🧪 === TESTE COM ARQUIVO REAL ===');
    console.log('🧪 Caminho do vídeo:', videoPath);

    if (!window.videoConcatAPI) {
        console.error('❌ videoConcatAPI não disponível');
        return false;
    }

    try {
        // Testar método padrão
        console.log('🧪 Testando método padrão...');
        const result = await window.videoConcatAPI.autoConcatenate({
            recordedVideoPath: videoPath
        });

        console.log('🧪 Resultado método padrão:', result);
        return result;

    } catch (error) {
        console.error('🧪 Erro no método padrão:', error);

        try {
            // Testar método alternativo
            console.log('🧪 Testando método alternativo...');
            const result = await window.videoConcatAPI.autoConcatenateAlt({
                recordedVideoPath: videoPath
            });

            console.log('🧪 Resultado método alternativo:', result);
            return result;

        } catch (altError) {
            console.error('🧪 Erro no método alternativo:', altError);
            return false;
        }
    }
}

// Expor função de teste real
if (typeof window !== 'undefined') {
    (window as any).testRealConcat = testRealConcatenation;
    console.log('🧪 Função de teste real exposta: window.testRealConcat(videoPath)');
}