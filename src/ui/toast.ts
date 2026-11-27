/**
 * Notificador simple de mensajes efímeros (toasts)
 */
export class Toast {
  private static elemento: HTMLElement | null = null;
  private static timeoutId: number | null = null;

  static inicializar(): void {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.getElementById('app')?.appendChild(el);
    }
    this.elemento = el;
  }

  static mostrar(mensaje: string, duracionMs: number = 2500): void {
    if (!this.elemento) this.inicializar();
    if (!this.elemento) return;

    this.elemento.textContent = mensaje;
    this.elemento.classList.add('show');

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      this.elemento?.classList.remove('show');
      this.timeoutId = null;
    }, duracionMs);
  }
}

