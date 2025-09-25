/**
 * Helper para validar e renovar URLs S3 antes do processamento de vídeo
 */

export interface S3UrlValidationResult {
  isValid: boolean;
  error?: string;
  needsRefresh?: boolean;
}

export class S3UrlValidator {
  /**
   * Valida se uma URL S3 ainda está acessível
   */
  static async validateUrl(url: string): Promise<S3UrlValidationResult> {
    if (!url) {
      return { isValid: false, error: "URL não fornecida" };
    }

    try {
      // Fazer uma requisição HEAD para verificar se a URL é acessível
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 10000 // 10 segundos timeout
      });

      if (response.ok) {
        return { isValid: true };
      } else if (response.status === 403 || response.status === 401) {
        return {
          isValid: false,
          error: `Acesso negado (${response.status})`,
          needsRefresh: true
        };
      } else {
        return {
          isValid: false,
          error: `Erro HTTP ${response.status}`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      // Detectar se é um erro de expiração/assinatura
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        return {
          isValid: false,
          error: `Erro de rede: ${errorMessage}`,
          needsRefresh: false
        };
      }

      return {
        isValid: false,
        error: errorMessage,
        needsRefresh: true
      };
    }
  }

  /**
   * Valida múltiplas URLs em paralelo
   */
  static async validateUrls(urls: string[]): Promise<{ [url: string]: S3UrlValidationResult }> {
    const validationPromises = urls.map(async (url) => {
      const result = await this.validateUrl(url);
      return { url, result };
    });

    const results = await Promise.all(validationPromises);

    return results.reduce((acc, { url, result }) => {
      acc[url] = result;
      return acc;
    }, {} as { [url: string]: S3UrlValidationResult });
  }

  /**
   * Extrai informações da URL S3 (bucket, key, etc)
   */
  static parseS3Url(url: string): {
    bucket?: string;
    key?: string;
    region?: string;
    isS3Url: boolean;
  } {
    try {
      const urlObj = new URL(url);

      // URLs S3 podem ter diferentes formatos:
      // https://bucket.s3.region.amazonaws.com/key
      // https://s3.region.amazonaws.com/bucket/key
      // https://bucket.s3.amazonaws.com/key

      if (urlObj.hostname.includes('amazonaws.com')) {
        const hostParts = urlObj.hostname.split('.');

        if (hostParts[1] === 's3') {
          // Formato: bucket.s3.region.amazonaws.com
          return {
            bucket: hostParts[0],
            key: urlObj.pathname.slice(1), // Remove leading slash
            region: hostParts[2] || 'us-east-1',
            isS3Url: true
          };
        } else if (hostParts[0] === 's3') {
          // Formato: s3.region.amazonaws.com/bucket/key
          const pathParts = urlObj.pathname.slice(1).split('/');
          return {
            bucket: pathParts[0],
            key: pathParts.slice(1).join('/'),
            region: hostParts[1] || 'us-east-1',
            isS3Url: true
          };
        }
      }

      return { isS3Url: false };
    } catch {
      return { isS3Url: false };
    }
  }

  /**
   * Verifica se uma URL está próxima do vencimento (baseado em parâmetros de query)
   */
  static isUrlNearExpiry(url: string, marginMinutes: number = 5): boolean {
    try {
      const urlObj = new URL(url);
      const expiresParam = urlObj.searchParams.get('X-Amz-Expires') ||
                          urlObj.searchParams.get('Expires');

      if (!expiresParam) {
        return false; // Não conseguimos determinar
      }

      const expiresSeconds = parseInt(expiresParam);
      const now = Math.floor(Date.now() / 1000);
      const marginSeconds = marginMinutes * 60;

      return (now + marginSeconds) >= expiresSeconds;
    } catch {
      return false;
    }
  }
}
