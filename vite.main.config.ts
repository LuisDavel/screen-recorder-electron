import { defineConfig, loadEnv } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig(({ mode }) => {
  // Carregar variáveis de ambiente do arquivo .env
  const env = loadEnv(mode, process.cwd(), "");

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Injetar variáveis de ambiente no processo principal
    define: {
      "process.env.AWS_ASSETS_ACCESS_KEY_ID": JSON.stringify(
        env.AWS_ASSETS_ACCESS_KEY_ID,
      ),
      "process.env.AWS_ASSETS_SECRET_ACCESS_KEY": JSON.stringify(
        env.AWS_ASSETS_SECRET_ACCESS_KEY,
      ),
      "process.env.AWS_ASSETS_REGION": JSON.stringify(env.AWS_ASSETS_REGION),
      "process.env.AWS_ASSETS_BUCKET_NAME": JSON.stringify(
        env.AWS_ASSETS_BUCKET_NAME,
      ),
      "process.env.CARDIOPIC_API_KEY": JSON.stringify(env.CARDIOPIC_API_KEY),
      "process.env.S3_ACCESS_KEY_ID": JSON.stringify(env.S3_ACCESS_KEY_ID),
      "process.env.S3_SECRET_ACCESS_KEY": JSON.stringify(
        env.S3_SECRET_ACCESS_KEY,
      ),
    },
  };
});
