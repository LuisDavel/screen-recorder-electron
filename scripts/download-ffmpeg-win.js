const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Seguir redirect
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);

      let totalBytes = parseInt(response.headers["content-length"], 10);
      let downloadedBytes = 0;

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes) {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const downloaded = (downloadedBytes / 1024 / 1024).toFixed(1);
          const total = (totalBytes / 1024 / 1024).toFixed(1);
          process.stdout.write(
            `\r📥 Baixando: ${percent}% (${downloaded}/${total} MB)`,
          );
        }
      });

      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        console.log("\n");
        resolve();
      });

      fileStream.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on("error", reject);
    request.setTimeout(120000, () => {
      request.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

async function main() {
  const destPath = process.argv[2];

  if (!destPath) {
    console.error("Usage: node download-ffmpeg-win.js <destination-path>");
    process.exit(1);
  }

  // Usar binário da BtbN (builds confiáveis do FFmpeg para Windows)
  // Este é um mirror estável e confiável
  const ffmpegUrl =
    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";

  console.log(`📥 Baixando FFmpeg do Windows...`);
  console.log(`🔗 URL: ${ffmpegUrl}`);
  console.log(`📁 Destino: ${destPath}`);

  try {
    // Criar diretório se não existir
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Baixar arquivo ZIP
    const zipPath = path.join(destDir, "ffmpeg-temp.zip");
    await downloadFile(ffmpegUrl, zipPath);

    console.log(`✅ FFmpeg ZIP baixado com sucesso!`);
    console.log(`📦 Extraindo ffmpeg.exe...`);

    // Descompactar usando adm-zip
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Procurar ffmpeg.exe no ZIP (geralmente está em bin/ffmpeg.exe)
    const ffmpegEntry = zipEntries.find(
      (entry) =>
        entry.entryName.includes("ffmpeg.exe") &&
        !entry.entryName.includes("ffmpeg_g.exe"),
    );

    if (!ffmpegEntry) {
      throw new Error("ffmpeg.exe não encontrado no arquivo ZIP");
    }

    console.log(`📦 Encontrado: ${ffmpegEntry.entryName}`);

    // Extrair direto para o destino
    const buffer = ffmpegEntry.getData();
    fs.writeFileSync(destPath, buffer);

    // Remover ZIP
    fs.unlinkSync(zipPath);

    console.log(`✅ FFmpeg extraído com sucesso!`);

    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      console.log(`✅ Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  } catch (error) {
    console.error(`❌ Erro ao baixar FFmpeg:`, error.message);
    process.exit(1);
  }
}

main();
