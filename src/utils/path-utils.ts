/**
 * Utilitários de path para o renderer process
 * Substitui o uso do módulo 'path' do Node.js que não está disponível no browser
 */

/**
 * Une segmentos de caminho usando separador apropriado
 */
export function joinPath(...segments: string[]): string {
    return segments
        .filter(segment => segment && segment.length > 0)
        .join('/')
        .replace(/\/+/g, '/'); // Remove barras duplas
}

/**
 * Obtém a extensão de um arquivo
 */
export function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot + 1);
}

/**
 * Obtém o nome do arquivo sem extensão
 */
export function getFileNameWithoutExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.slice(0, lastDot);
}