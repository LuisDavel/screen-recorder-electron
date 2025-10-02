import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDMG } from "@electron-forge/maker-dmg";
// import { MakerSquirrel } from "@electron-forge/maker-squirrel"; // Desabilitado para cross-compilation
// import { MakerWix } from "@electron-forge/maker-wix"; // Desabilitado para cross-compilation

import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import * as path from "path";
import * as fs from "fs";

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/ffmpeg-static/**",
    },
    protocols: [
      {
        name: "Video Recorder",
        schemes: ["videorecorder"],
      },
    ],
    name: "Video Recorder",
    executableName: "VideoRecorder",
    appBundleId: "com.videorecorder.app",
    appCategoryType: "public.app-category.video",
    // macOS specific configuration for permissions
    extendInfo: {
      NSCameraUsageDescription:
        "Este aplicativo precisa de acesso à câmera para gravar vídeos com overlay da webcam.",
      NSMicrophoneUsageDescription:
        "Este aplicativo precisa de acesso ao microfone para gravar áudio junto com o vídeo.",
      NSScreenCaptureDescription:
        "Este aplicativo precisa de acesso à captura de tela para gravar a tela do seu computador.",
      NSSystemAdministrationUsageDescription:
        "Este aplicativo precisa de permissões administrativas para capturar a tela do sistema.",
      // Enable hardened runtime for notarization
      "com.apple.security.device.audio-input": true,
      "com.apple.security.device.camera": true,
      "com.apple.security.cs.allow-jit": true,
      "com.apple.security.cs.allow-unsigned-executable-memory": true,
      "com.apple.security.cs.disable-library-validation": true,
    },
    // Configurações para assinatura de código serão adicionadas posteriormente
    // quando necessário para distribuição

    // Windows specific configuration
    win32metadata: {
      CompanyName: "Video Recorder Inc",
      FileDescription: "Gravador de Vídeo com Overlay de Câmera",
      ProductName: "Video Recorder",
      InternalName: "VideoRecorder",
      OriginalFilename: "VideoRecorder.exe",
      "requested-execution-level": "asInvoker",
    },
  },
  rebuildConfig: {},
  makers: [
    // Universal ZIP (Windows and macOS) - Funciona para cross-compilation
    new MakerZIP({}, ["darwin", "win32"]),

    // macOS DMG
    new MakerDMG(
      {
        name: "Video Recorder",
        title: "Video Recorder",
        icon: "assets/icon.icns",
        background: "assets/dmg-background.png",
        format: "ULFO",
      },
      ["darwin"],
    ),

    // Windows installers - Requerem Windows ou Wine/Mono
    // Para usar no Windows, descomente as linhas abaixo:

    // Windows Squirrel (Auto-updater friendly)
    // new MakerSquirrel(
    // 	{
    // 		name: "VideoRecorder",
    // 		authors: "Video Recorder Inc",
    // 		description: "Gravador de Vídeo com Overlay de Câmera",
    // 		setupExe: "VideoRecorder-Setup.exe",
    // 		setupIcon: "assets/icon.ico",
    // 		loadingGif: "assets/install-spinner.gif",
    // 		iconUrl: "https://example.com/icon.ico",
    // 		noMsi: true,
    // 	},
    // 	["win32"],
    // ),

    // Windows MSI Installer
    // new MakerWix(
    // 	{
    // 		name: "Video Recorder",
    // 		description: "Gravador de Vídeo com Overlay de Câmera",
    // 		manufacturer: "Video Recorder Inc",
    // 		version: "1.0.0",
    // 		appUserModelId: "com.videorecorder.app",
    // 		programFilesFolderName: "Video Recorder",
    // 		shortcutFolderName: "Video Recorder",
    // 		exe: "VideoRecorder.exe",
    // 		arch: "x64",
    // 		language: 1046, // Português do Brasil
    // 		cultures: "pt-BR",
    // 		ui: {
    // 			chooseDirectory: true,
    // 			images: {
    // 				background: "assets/wix-background.bmp",
    // 				banner: "assets/wix-banner.bmp",
    // 			},
    // 		},
    // 	},
    // 	["win32"],
    // ),

    // Linux packages
    new MakerRpm({}, ["linux"]),
    new MakerDeb({}, ["linux"]),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),

    // Plugin para desempacotar binários nativos (ffmpeg, etc)
    new AutoUnpackNativesPlugin({}),

    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    postPackage: async (forgeConfig, options) => {
      console.log(
        `\n🔧 [postPackage] Platform: ${options.platform}, Arch: ${options.arch}`,
      );

      // Copiar o ffmpeg para resources
      if (options.platform === "win32") {
        console.log("📥 [postPackage] Preparando FFmpeg para Windows...");

        const resourcesPath = path.join(options.outputPaths[0], "resources");
        const ffmpegDestPath = path.join(resourcesPath, "ffmpeg.exe");

        console.log(`📁 [postPackage] Resources path: ${resourcesPath}`);
        console.log(`📁 [postPackage] FFmpeg dest: ${ffmpegDestPath}`);

        // Verificar se já existe um ffmpeg.exe baixado no cache
        const cachedFfmpegPath = path.join(
          process.cwd(),
          ".cache",
          "ffmpeg-win32-x64.exe",
        );

        try {
          // Se não existe no cache, baixar
          if (!fs.existsSync(cachedFfmpegPath)) {
            console.log(`📥 [postPackage] Baixando FFmpeg para Windows...`);

            // Criar diretório cache se não existir
            const cacheDir = path.dirname(cachedFfmpegPath);
            if (!fs.existsSync(cacheDir)) {
              fs.mkdirSync(cacheDir, { recursive: true });
            }

            // Executar script de download
            const { execSync } = require("child_process");
            execSync(
              `node scripts/download-ffmpeg-win.js "${cachedFfmpegPath}"`,
              {
                stdio: "inherit",
                cwd: process.cwd(),
              },
            );
          } else {
            console.log(
              `✅ [postPackage] Usando FFmpeg em cache: ${cachedFfmpegPath}`,
            );
          }

          // Copiar do cache para resources
          fs.copyFileSync(cachedFfmpegPath, ffmpegDestPath);
          console.log(`✅ [postPackage] FFmpeg copiado com sucesso!`);

          // Verificar se o arquivo existe
          if (fs.existsSync(ffmpegDestPath)) {
            const stats = fs.statSync(ffmpegDestPath);
            console.log(
              `✅ [postPackage] Arquivo criado: ${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            );
          } else {
            console.error(`❌ [postPackage] Arquivo não foi criado!`);
          }
        } catch (error) {
          console.error(`❌ [postPackage] Erro ao preparar FFmpeg:`, error);
        }
      } else {
        console.log(
          `ℹ️ [postPackage] Não é Windows, pulando preparação do FFmpeg`,
        );
      }
    },
  },
};

export default config;
