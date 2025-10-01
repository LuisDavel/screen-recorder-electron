import path from "path";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";

/**
 * Função centralizada para encontrar o caminho correto do FFmpeg
 * Funciona tanto em desenvolvimento quanto em produção (app empacotado)
 * Suporta Windows, macOS e Linux
 */
export function getFFmpegPath(): string | null {
  console.log("🔍 [FFmpeg Path Resolver] Procurando FFmpeg...");
  console.log("🔍 [FFmpeg Path Resolver] ffmpeg-static retornou:", ffmpegStatic);
  console.log("🔍 [FFmpeg Path Resolver] Platform:", process.platform);
  console.log(
    "🔍 [FFmpeg Path Resolver] process.resourcesPath:",
    process.resourcesPath,
  );
  console.log("🔍 [FFmpeg Path Resolver] __dirname:", __dirname);
  console.log("🔍 [FFmpeg Path Resolver] process.cwd():", process.cwd());

  // Primeiro, tentar o caminho que ffmpeg-static retornou
  if (ffmpegStatic) {
    console.log(
      "🔍 [FFmpeg Path Resolver] Testando ffmpeg-static:",
      ffmpegStatic,
    );
    if (fs.existsSync(ffmpegStatic)) {
      console.log(
        "✅ [FFmpeg Path Resolver] FFmpeg encontrado via ffmpeg-static",
      );
      return ffmpegStatic;
    }

    // Se não existir, pode estar em app.asar.unpacked (app empacotado)
    const unpackedPath = ffmpegStatic.replace("app.asar", "app.asar.unpacked");
    console.log("🔍 [FFmpeg Path Resolver] Testando unpacked:", unpackedPath);
    if (fs.existsSync(unpackedPath)) {
      console.log(
        "✅ [FFmpeg Path Resolver] FFmpeg encontrado em app.asar.unpacked",
      );
      return unpackedPath;
    }
  }

  // Determinar extensão do executável baseado na plataforma
  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "ffmpeg.exe" : "ffmpeg";

  // Caminhos alternativos para procurar o FFmpeg
  const possiblePaths = [
    // Caminhos para app empacotado
    process.resourcesPath
      ? path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "node_modules",
          "ffmpeg-static",
          exeName,
        )
      : null,
    process.resourcesPath
      ? path.join(
          process.resourcesPath,
          "node_modules",
          "ffmpeg-static",
          exeName,
        )
      : null,
    // Caminhos para desenvolvimento
    path.join(process.cwd(), "node_modules", "ffmpeg-static", exeName),
    path.join(
      __dirname,
      "..",
      "..",
      "node_modules",
      "ffmpeg-static",
      exeName,
    ),
    // PATH do sistema (fallback)
    exeName,
  ].filter(Boolean) as string[];

  console.log("🔍 [FFmpeg Path Resolver] Testando caminhos:", possiblePaths);

  for (const testPath of possiblePaths) {
    console.log("🔍 [FFmpeg Path Resolver] Testando:", testPath);
    try {
      if (fs.existsSync(testPath)) {
        // Verificar se tem permissão de execução (exceto Windows)
        if (!isWindows) {
          try {
            fs.accessSync(testPath, fs.constants.X_OK);
          } catch {
            console.warn(
              "⚠️ [FFmpeg Path Resolver] Arquivo existe mas não tem permissão de execução:",
              testPath,
            );
            continue;
          }
        }
        console.log("✅ [FFmpeg Path Resolver] FFmpeg encontrado:", testPath);
        return testPath;
      }
    } catch (error) {
      console.warn(
        "⚠️ [FFmpeg Path Resolver] Erro ao verificar caminho:",
        testPath,
        error,
      );
    }
  }

  console.error(
    "❌ [FFmpeg Path Resolver] FFmpeg não encontrado em nenhum caminho",
  );
  console.error(
    "❌ [FFmpeg Path Resolver] Caminhos testados:",
    possiblePaths,
  );
  return null;
}

/**
 * Valida se o caminho do FFmpeg é válido e acessível
 */
export function validateFFmpegPath(ffmpegPath: string | null): boolean {
  if (!ffmpegPath) {
    console.error("❌ [FFmpeg Path Resolver] Caminho do FFmpeg é null");
    return false;
  }

  if (!fs.existsSync(ffmpegPath)) {
    console.error(
      "❌ [FFmpeg Path Resolver] FFmpeg não existe:",
      ffmpegPath,
    );
    return false;
  }

  // No Windows, não precisa verificar permissão de execução
  if (process.platform === "win32") {
    return true;
  }

  // No Unix-like, verificar permissão de execução
  try {
    fs.accessSync(ffmpegPath, fs.constants.X_OK);
    return true;
  } catch {
    console.error(
      "❌ [FFmpeg Path Resolver] FFmpeg existe mas não tem permissão de execução:",
      ffmpegPath,
    );
    return false;
  }
}
