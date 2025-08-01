// Debug helper para testar FFmpeg

export async function debugFFmpeg(): Promise<void> {
    console.log("🔍 DEBUG FFmpeg - Iniciando testes...");

    try {
        // Teste 1: Verificar se o FFmpeg está no PATH
        const result = await window.electronAPI.invoke("ffmpeg:check-availability");
        console.log("🔍 Teste 1 - Verificação padrão:", result);

        // Teste 2: Tentar executar comando direto
        console.log("🔍 Teste 2 - Tentando comando direto...");

        // Teste 3: Verificar se os vídeos de introdução existem
        const institutions = await window.electronAPI.invoke("video-intro:get-available");
        console.log("🔍 Teste 3 - Vídeos disponíveis:", institutions);

        // Teste 4: Tentar concatenação de teste
        console.log("🔍 Teste 4 - Teste de concatenação...");
        const concatTest = await window.electronAPI.invoke("video-intro:concatenate", {
            institutionName: "Hospital São Jose",
            recordedVideoPath: "/tmp/test_recorded.mp4",
            outputPath: "/tmp/test_output.mp4"
        });
        console.log("🔍 Resultado da concatenação de teste:", concatTest);

    } catch (error) {
        console.error("❌ Erro no debug:", error);
    }
}

// Função para testar no console do browser
(window as any).debugFFmpeg = debugFFmpeg;