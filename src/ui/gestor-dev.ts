import type { MotorJuego } from '../core/motor-juego';
import type { ControladorReproduccion } from '../core/controlador-reproduccion';
import type { EventoCliente } from '../core/tipos';
import { consultarBit } from '../core/mascara-bits';
import {
  MEJORAS,
  HISTORIAL_TAMANO,
  HORA_INICIO_DIA,
  TUTORIAL_PASOS,
  TUTORIAL_BIT_COMPLETADO,
} from '../config/game-config';

/**
 * Panel oculto de Modo Desarrollador (Fase 13).
 * Activable con la tecla F2 o el botón discreto en pantalla.
 */
export class GestorDev {
  private motor: MotorJuego;
  private panel: HTMLElement;
  private botonDiscreto: HTMLButtonElement;
  private visible = false;
  private eventosDia: readonly EventoCliente[] = [];
  private controlador: ControladorReproduccion | null = null;

  constructor(motor: MotorJuego) {
    this.motor = motor;
    const app = document.getElementById('app');

    // Botón discreto en la esquina inferior izquierda
    this.botonDiscreto = document.createElement('button');
    this.botonDiscreto.id = 'btn-dev-toggle';
    this.botonDiscreto.type = 'button';
    this.botonDiscreto.textContent = '🛠 F2';
    this.botonDiscreto.title = 'Modo Desarrollador (F2)';
    this.botonDiscreto.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.botonDiscreto.addEventListener('click', (e) => {
      e.stopPropagation();
      this.alternar();
    });
    app?.appendChild(this.botonDiscreto);

    // Panel flotante de inspección en vivo
    this.panel = document.createElement('div');
    this.panel.id = 'dev-panel';
    this.panel.className = 'hidden';
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.panel.addEventListener('mousedown', (e) => e.stopPropagation());
    this.panel.addEventListener('mouseup', (e) => e.stopPropagation());
    this.panel.addEventListener('click', (e) => e.stopPropagation());
    app?.appendChild(this.panel);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        this.alternar();
      }
    });
  }

  alternar(): void {
    this.visible = !this.visible;
    this.panel.classList.toggle('hidden', !this.visible);
    if (this.visible) {
      this.render();
    }
  }

  setContextoDia(
    eventos: readonly EventoCliente[],
    controlador: ControladorReproduccion | null
  ): void {
    this.eventosDia = eventos;
    this.controlador = controlador;
    if (this.visible) {
      this.render();
    }
  }

  render(): void {
    if (!this.visible) return;

    // 1. Map de inventarios
    const insumosEntries = Array.from(this.motor.obtenerInventarioInsumos().entries())
      .map(([k, v]) => `<span>${k}: <b>${v}</b></span>`)
      .join(' ');
    const pizzasEntries = Array.from(this.motor.obtenerInventarioPizzas().entries())
      .map(([k, v]) => `<span>${k}: <b>${v}</b></span>`)
      .join(' ');

    // 2. Máscara de bits en binario con nombre de cada bit
    const mascaraMejoras = this.motor.mejorasCompradas;
    const binMejoras = mascaraMejoras.toString(2).padStart(MEJORAS.length, '0');
    const bitsMejorasHtml = MEJORAS.map((m) => {
      const on = consultarBit(mascaraMejoras, m.bit);
      return `<div class="dev-bit ${on ? 'on' : 'off'}">bit ${m.bit}: ${m.id} → <b>${on ? '1 (ON)' : '0 (OFF)'}</b></div>`;
    }).join('');

    const binTut = this.motor.tutorialProgreso.toString(2).padStart(TUTORIAL_PASOS.length + 1, '0');
    const tutDone = consultarBit(this.motor.tutorialProgreso, TUTORIAL_BIT_COMPLETADO);

    // 3. Buffer circular
    const historial = this.motor.obtenerHistorial();
    const ultimos = historial.slice(-6).reverse();
    const bufferHtml = ultimos.length === 0
      ? '<div class="dev-muted">Vacío (0 entradas)</div>'
      : ultimos.map((t) => `<div class="dev-line">[D${t.dia}] ${t.tipo}: ${t.descripcion} (${t.monto})</div>`).join('');

    // 4. Línea de tiempo del día en curso
    let timelineHtml = '<div class="dev-muted">Sin línea de tiempo activa (abre la pizzería para generarla).</div>';
    if (this.eventosDia.length > 0) {
      const minActual = this.controlador ? this.controlador.minutoActual : -1;
      const muestra = this.eventosDia.slice(0, 12).map((ev) => {
        const hh = String(HORA_INICIO_DIA + Math.floor(ev.horaLlegada / 60)).padStart(2, '0');
        const mm = String(Math.floor(ev.horaLlegada % 60)).padStart(2, '0');
        const pasado = minActual >= 0 && ev.horaLlegada <= minActual ? '✓' : '·';
        return `<div class="dev-line">${pasado} ${hh}:${mm} | ${ev.pizzaId} → <b>${ev.resultado}</b></div>`;
      }).join('');
      const extra = this.eventosDia.length > 12 ? `<div class="dev-muted">... y ${this.eventosDia.length - 12} eventos más</div>` : '';
      timelineHtml = `<div class="dev-muted">Total eventos: ${this.eventosDia.length}</div>${muestra}${extra}`;
    }

    this.panel.innerHTML = `
      <div class="dev-header">
        <strong>🛠 MODO DESARROLLADOR (F2)</strong>
        <button type="button" id="btn-dev-close" class="tut-skip">Cerrar</button>
      </div>
      <div class="dev-grid">
        <div class="dev-section">
          <div class="dev-sec-title">📦 Map Inventario (${this.motor.obtenerTotalBodega()}/${this.motor.obtenerCapacidadBodega()})</div>
          <div class="dev-kv">Insumos: ${insumosEntries}</div>
          <div class="dev-kv">Pizzas: ${pizzasEntries}</div>
        </div>
        <div class="dev-section">
          <div class="dev-sec-title">🔢 Máscara de Bits (0b${binMejoras} = ${mascaraMejoras})</div>
          ${bitsMejorasHtml}
          <div class="dev-muted" style="margin-top:4px;">Tutorial: 0b${binTut} (fin=${tutDone ? '1' : '0'})</div>
        </div>
        <div class="dev-section">
          <div class="dev-sec-title">🔄 Buffer Circular (${historial.length}/${HISTORIAL_TAMANO})</div>
          ${bufferHtml}
        </div>
        <div class="dev-section">
          <div class="dev-sec-title">⏱ Línea de Tiempo (Semilla: ${this.motor.semillaPartida})</div>
          ${timelineHtml}
        </div>
      </div>
    `;

    document.getElementById('btn-dev-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.alternar();
    });
  }
}
