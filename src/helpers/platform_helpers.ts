// Tipo para as plataformas suportadas
export type PlatformType = "darwin" | "win32" | "linux" | "freebsd" | "openbsd" | "sunos" | "aix";

// Função para obter a plataforma atual
export async function getPlatform(): Promise<PlatformType> {
  return await window.platform.get();
}

// Função para verificar se é macOS
export async function isMacOS(): Promise<boolean> {
  return await window.platform.isMacOS();
}

// Função para verificar se é Windows
export async function isWindows(): Promise<boolean> {
  return await window.platform.isWindows();
}

// Função para verificar se é Linux
export async function isLinux(): Promise<boolean> {
  return await window.platform.isLinux();
}

// Função para obter o nome amigável da plataforma
export async function getPlatformName(): Promise<string> {
  const platform = await getPlatform();
  
  switch (platform) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    case "freebsd":
      return "FreeBSD";
    case "openbsd":
      return "OpenBSD";
    case "sunos":
      return "Solaris";
    case "aix":
      return "AIX";
    default:
      return "Sistema Desconhecido";
  }
} 