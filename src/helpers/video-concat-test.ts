// Arquivo de teste para verificar se a concatenação com vídeo remoto está funcionando

export async function testVideoConcatenationSystem() {
    console.log('🧪 Testando sistema de concatenação de vídeos...');

    // 1. Verificar se a API está disponível
    if (!window.videoConcatAPI) {
        console.error('❌ videoConcatAPI não está disponível');
        return false;
    }

    // 2. Verificar FFmpeg
    try {
        const ffmpegCheck = await window.videoConcatAPI.checkFFmpeg();
        console.log('🔍 Status do FFmpeg:', ffmpegCheck);

        if (!ffmpegCheck.available) {
            console.error('❌ FFmpeg não está disponível:', ffmpegCheck.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar FFmpeg:', error);
        return false;
    }

    // 3. Simular evento de auto-concatenação
    console.log('🎬 Simulando evento de auto-concatenação...');

    // Simular um caminho de vídeo (para teste)
    const testVideoPath = '/tmp/test-video.mp4';

    // Disparar evento
    window.dispatchEvent(new CustomEvent('video-concat:start-auto-concatenation', {
        detail: {
            recordedVideoPath: testVideoPath
        }
    }));

    console.log('✅ Evento disparado com sucesso');
    return true;
}

// Função para testar concatenação manual
export async function testManualConcatenation(
    localVideoPath: string,
    outputPath: string
) {
    console.log('🧪 Testando concatenação manual...');

    if (!window.videoConcatAPI) {
        throw new Error('videoConcatAPI não está disponível');
    }

    const remoteVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4';

    try {
        const result = await window.videoConcatAPI.concatenateVideos({
            remoteVideoUrl,
            localVideoPath,
            outputPath
        });

        console.log('✅ Concatenação manual concluída:', result);
        return result;
    } catch (error) {
        console.error('❌ Erro na concatenação manual:', error);
        throw error;
    }
}

// Expor funções no window para teste no console
if (typeof window !== 'undefined') {
    (window as any).testVideoConcatenation = testVideoConcatenationSystem;
    (window as any).testManualConcatenation = testManualConcatenation;

    console.log('🧪 Funções de teste expostas:');
    console.log('  - window.testVideoConcatenation()');
    console.log('  - window.testManualConcatenation(localPath, outputPath)');
}