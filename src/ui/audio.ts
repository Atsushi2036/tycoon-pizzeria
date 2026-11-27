/**
 * audio.ts
 * Sonidos opcionales muy simples con WebAudio (compra, venta, subir de nivel)
 * con botón de silencio. No requiere archivos de audio externos.
 */

export class GestorAudio {
  private ctx: AudioContext | null = null;
  private silenciado = false;

  get estaSilenciado(): boolean {
    return this.silenciado;
  }

  alternarSilencio(): boolean {
    this.silenciado = !this.silenciado;
    return this.silenciado;
  }

  private obtenerContexto(): AudioContext | null {
    if (this.silenciado || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tocarTono(freq: number, duracion: number, tipo: OscillatorType = 'sine', ganancia = 0.08, delay = 0): void {
    try {
      const ctx = this.obtenerContexto();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const inicio = ctx.currentTime + delay;

      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, inicio);

      gain.gain.setValueAtTime(ganancia, inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, inicio + duracion);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(inicio);
      osc.stop(inicio + duracion);
    } catch {
      // Ignorar errores de WebAudio si el navegador bloquea reproducción
    }
  }

  reproducirCompra(): void {
    this.tocarTono(440, 0.07, 'triangle', 0.07, 0);
    this.tocarTono(587, 0.09, 'triangle', 0.07, 0.05);
  }

  reproducirVenta(): void {
    this.tocarTono(523, 0.06, 'sine', 0.06, 0);
    this.tocarTono(659, 0.08, 'sine', 0.06, 0.05);
  }

  reproducirSubirNivel(): void {
    this.tocarTono(523, 0.1, 'triangle', 0.09, 0);
    this.tocarTono(659, 0.1, 'triangle', 0.09, 0.09);
    this.tocarTono(784, 0.18, 'triangle', 0.1, 0.18);
  }
}

