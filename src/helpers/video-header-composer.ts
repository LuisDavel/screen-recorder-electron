import type { HeaderConfig } from '@/store/store-header-config';

export class VideoHeaderComposer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private video: HTMLVideoElement;
  private animationFrameId: number | null = null;
  private stream: MediaStream | null = null;
  private headerConfig: HeaderConfig;

  constructor(headerConfig: HeaderConfig) {
    this.headerConfig = headerConfig;

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;

    // Create video element for source stream
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.muted = true;
  }

  async composeWithHeader(sourceStream: MediaStream, width: number, height: number): Promise<MediaStream> {
    // Set canvas dimensions
    this.canvas.width = width;
    this.canvas.height = height;

    // Set video source
    this.video.srcObject = sourceStream;
    await this.video.play();

    // Start composition loop
    this.startComposition();

    // Create and return the output stream
    this.stream = this.canvas.captureStream(30);
    return this.stream;
  }

  private startComposition() {
    const draw = () => {
      if (!this.headerConfig.isEnabled) {
        // If header is disabled, just draw the video
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      } else {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate video position with header
        const headerHeight = this.headerConfig.height;
        const videoY = headerHeight;
        const videoHeight = this.canvas.height - headerHeight;

        // Draw video below header
        this.ctx.drawImage(
          this.video,
          0, 0, this.video.videoWidth, this.video.videoHeight, // source
          0, videoY, this.canvas.width, videoHeight // destination
        );

        // Draw header
        this.drawHeader();
      }

      this.animationFrameId = requestAnimationFrame(draw);
    };

    draw();
  }

  private drawHeader() {
    const headerHeight = this.headerConfig.height;

    // Draw header background
    this.ctx.fillStyle = 'rgba(17, 24, 39, 0.95)'; // gray-900 with opacity
    this.ctx.fillRect(0, 0, this.canvas.width, headerHeight);

    // Set text properties
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textBaseline = 'middle';

    const padding = 24;
    const columnWidth = this.canvas.width / 12;
    let y = headerHeight / 2;

    // If height allows for two rows
    if (headerHeight > 60) {
      y = headerHeight / 3;
    }

    // Draw main information row
    this.drawTextColumn('Exame', this.headerConfig.examName || 'Não informado', 0, y, 3, columnWidth, padding);
    this.drawTextColumn('Data', this.formatDate(this.headerConfig.examDate) || 'Não informada', 3, y, 2, columnWidth, padding);
    this.drawTextColumn('Paciente', this.headerConfig.patientName || 'Não informado', 5, y, 3, columnWidth, padding);
    this.drawTextColumn('Sexo / Idade', this.getSexAge(), 8, y, 2, columnWidth, padding);
    this.drawTextColumn('ID', this.headerConfig.externalId || 'Não informado', 10, y, 2, columnWidth, padding);

    // Draw second row if height allows
    if (headerHeight > 60) {
      y = (headerHeight / 3) * 2;

      // Smaller font for second row
      this.ctx.font = '11px system-ui, -apple-system, sans-serif';

      // Institution
      this.drawInlineInfo('Instituição:', this.headerConfig.institutionName || 'Não informada', 0, y, 4, columnWidth, padding);

      // Doctor
      this.drawInlineInfo('Médico:', this.headerConfig.requestingDoctor || 'Não informado', 4, y, 4, columnWidth, padding);

      // CRM
      this.drawInlineInfo('CRM:', this.headerConfig.crm || 'Não informado', 8, y, 4, columnWidth, padding);
    }
  }

  private drawTextColumn(label: string, value: string, colStart: number, y: number, colSpan: number, columnWidth: number, padding: number) {
    const x = colStart * columnWidth + padding;
    const maxWidth = colSpan * columnWidth - padding * 2;

    // Draw label
    this.ctx.font = '11px system-ui, -apple-system, sans-serif';
    this.ctx.fillStyle = '#9CA3AF'; // gray-400
    this.ctx.fillText(label, x, y - 10);

    // Draw value
    this.ctx.font = '13px system-ui, -apple-system, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';

    // Truncate text if too long
    const truncatedValue = this.truncateText(value, maxWidth);
    this.ctx.fillText(truncatedValue, x, y + 5);
  }

  private drawInlineInfo(label: string, value: string, colStart: number, y: number, colSpan: number, columnWidth: number, padding: number) {
    const x = colStart * columnWidth + padding;
    const maxWidth = colSpan * columnWidth - padding * 2;

    // Draw label
    this.ctx.fillStyle = '#9CA3AF'; // gray-400
    const labelWidth = this.ctx.measureText(label).width;
    this.ctx.fillText(label, x, y);

    // Draw value
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '11px system-ui, -apple-system, sans-serif';

    const valueX = x + labelWidth + 5;
    const truncatedValue = this.truncateText(value, maxWidth - labelWidth - 5);
    this.ctx.fillText(truncatedValue, valueX, y);
  }

  private truncateText(text: string, maxWidth: number): string {
    const metrics = this.ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      return text;
    }

    let truncated = text;
    while (this.ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }

    return truncated + '...';
  }

  private getSexAge(): string {
    if (this.headerConfig.patientSex && this.headerConfig.patientAge) {
      return `${this.headerConfig.patientSex} / ${this.headerConfig.patientAge}`;
    }
    return this.headerConfig.patientSex || this.headerConfig.patientAge || 'Não informado';
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.video.srcObject) {
      const tracks = (this.video.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  updateHeaderConfig(newConfig: HeaderConfig) {
    this.headerConfig = newConfig;
  }
}
