import type { MotorJuego } from '../core/motor-juego';
import type { ControladorReproduccion, VelocidadReproduccion } from '../core/controlador-reproduccion';
import { VELOCIDADES_REPRODUCCION } from '../config/game-config';

export interface CallbacksReproduccionHUD {
  alAlternarPausa: () => void;
  alCambiarVelocidad: (v: VelocidadReproduccion) => void;
  alSaltarDia: () => void;
}

/**
 * Gestor del HUD superior y la barra de reproducción en vivo de la jornada.
 */
export class GestorHUD {
  private motor: MotorJuego;
  private contenedor: HTMLElement;
  private barraReproduccion: HTMLElement;
  private alAbrirPizzeria: () => void;
  private alGestionPartida: () => void;
  private enReproduccion = false;

  constructor(motor: MotorJuego, alAbrirPizzeria: () => void, alGestionPartida: () => void) {
    this.motor = motor;
    this.alAbrirPizzeria = alAbrirPizzeria;
    this.alGestionPartida = alGestionPartida;

    const app = document.getElementById('app');

    this.contenedor = document.createElement('div');
    this.contenedor.id = 'hud-container';
    app?.appendChild(this.contenedor);

    this.barraReproduccion = document.createElement('div');
    this.barraReproduccion.id = 'playback-bar';
    this.barraReproduccion.className = 'hidden';
    app?.appendChild(this.barraReproduccion);

    this.render();
  }

  setEnReproduccion(activo: boolean): void {
    this.enReproduccion = activo;
    if (!activo) {
      this.barraReproduccion.classList.add('hidden');
      this.barraReproduccion.innerHTML = '';
    } else {
      this.barraReproduccion.classList.remove('hidden');
    }
    this.render();
  }

  render(): void {
    const capital = this.motor.capital;
    const dia = this.motor.dia;
    const nombreDia = this.motor.nombreDia;
    const nivel = this.motor.nivel;
    const fase = this.motor.fase;

    let btnTexto = '🍕 Abrir Pizzería';
    let btnDisabled = '';

    if (this.enReproduccion) {
      btnTexto = '⏳ Abierta...';
      btnDisabled = 'disabled';
    } else if (fase === 'abrir') {
      btnTexto = 'Simulando...';
      btnDisabled = 'disabled';
    } else if (fase === 'cerrar') {
      btnTexto = '📊 Ver Resumen';
    }

    this.contenedor.innerHTML = `
      <div class="hud-item">
        <span class="hud-label">Capital</span>
        <span class="hud-value hud-capital">Bs ${capital.toLocaleString('es-BO')}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Día ${dia}</span>
        <span class="hud-value">${nombreDia}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Nivel</span>
        <span class="hud-value">⭐ ${nivel}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Insumos / Pizzas</span>
        <span class="hud-value" style="font-size: 15px;">
          📦 ${this.motor.obtenerTotalBodega()}/${this.motor.obtenerCapacidadBodega()} | 🍕 ${this.obtenerTotalPizzasTerminadas()}
        </span>
      </div>
      <div class="hud-actions">
        <button id="btn-partida" class="btn-secondary" ${this.enReproduccion ? 'disabled' : ''}>💾 Partida</button>
        <button id="btn-abrir-pizzeria" class="btn-action" ${btnDisabled}>${btnTexto}</button>
      </div>
    `;

    document.getElementById('btn-abrir-pizzeria')?.addEventListener('click', () => {
      this.alAbrirPizzeria();
    });

    document.getElementById('btn-partida')?.addEventListener('click', () => {
      this.alGestionPartida();
    });
  }

  renderReproduccion(
    ctrl: ControladorReproduccion,
    callbacks: CallbacksReproduccionHUD
  ): void {
    const hora = ctrl.obtenerHoraFormateada();
    const progresoPct = Math.round(ctrl.obtenerProgreso() * 100);
    const vel = ctrl.velocidad;

    const botonesVel = VELOCIDADES_REPRODUCCION.map(
      (v) =>
        `<button class="btn-vel ${vel === v ? 'active' : ''}" data-vel="${v}">×${v}</button>`
    ).join('');

    this.barraReproduccion.innerHTML = `
      <div class="pb-reloj">
        <span>🕒 <strong>${hora}</strong></span>
        <div class="pb-progress-track">
          <div class="pb-progress-fill" style="width: ${progresoPct}%"></div>
        </div>
      </div>
      <div class="pb-stats">
        <span>🍕 ${ctrl.ventasEnVivo}</span>
        <span>💰 Bs ${ctrl.ingresosEnVivo}</span>
        <span>❌ ${ctrl.perdidosEnVivo}</span>
      </div>
      <div class="pb-controls">
        <button id="btn-pb-pausa" class="btn-vel">${ctrl.pausado ? '▶' : '⏸'}</button>
        ${botonesVel}
        <button id="btn-pb-saltar" class="btn-skip">⏭ Saltar</button>
      </div>
    `;

    document.getElementById('btn-pb-pausa')?.addEventListener('click', () => {
      callbacks.alAlternarPausa();
    });

    this.barraReproduccion.querySelectorAll('.btn-vel[data-vel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = Number((btn as HTMLElement).dataset.vel) as VelocidadReproduccion;
        callbacks.alCambiarVelocidad(v);
      });
    });

    document.getElementById('btn-pb-saltar')?.addEventListener('click', () => {
      callbacks.alSaltarDia();
    });
  }

  private obtenerTotalPizzasTerminadas(): number {
    let total = 0;
    const inv = this.motor.obtenerInventarioPizzas();
    for (const cant of inv.values()) {
      total += cant;
    }
    return total;
  }
}
