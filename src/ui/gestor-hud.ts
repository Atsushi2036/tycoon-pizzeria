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
  private barraInicializada = false;
  private callbacksReproduccion: CallbacksReproduccionHUD | null = null;

  constructor(motor: MotorJuego, alAbrirPizzeria: () => void, alGestionPartida: () => void) {
    this.motor = motor;
    this.alAbrirPizzeria = alAbrirPizzeria;
    this.alGestionPartida = alGestionPartida;

    const app = document.getElementById('app');

    this.contenedor = document.createElement('div');
    this.contenedor.id = 'hud-container';
    this.contenedor.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.contenedor.addEventListener('mousedown', (e) => e.stopPropagation());
    this.contenedor.addEventListener('click', (e) => e.stopPropagation());
    app?.appendChild(this.contenedor);

    this.barraReproduccion = document.createElement('div');
    this.barraReproduccion.id = 'playback-bar';
    this.barraReproduccion.className = 'hidden';
    this.barraReproduccion.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.barraReproduccion.addEventListener('mousedown', (e) => e.stopPropagation());
    this.barraReproduccion.addEventListener('mouseup', (e) => e.stopPropagation());
    this.barraReproduccion.addEventListener('click', (e) => e.stopPropagation());
    app?.appendChild(this.barraReproduccion);

    this.render();
  }

  setEnReproduccion(activo: boolean): void {
    this.enReproduccion = activo;
    if (!activo) {
      this.barraReproduccion.classList.add('hidden');
      this.barraReproduccion.innerHTML = '';
      this.barraInicializada = false;
      this.callbacksReproduccion = null;
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
    this.callbacksReproduccion = callbacks;

    if (!this.barraInicializada) {
      this.inicializarDOMReproduccion();
      this.barraInicializada = true;
    }

    const hora = ctrl.obtenerHoraFormateada();
    const progresoPct = Math.round(ctrl.obtenerProgreso() * 100);
    const vel = ctrl.velocidad;

    const elHora = document.getElementById('pb-hora');
    const elFill = document.getElementById('pb-fill');
    const elVentas = document.getElementById('pb-ventas');
    const elIngresos = document.getElementById('pb-ingresos');
    const elPerdidos = document.getElementById('pb-perdidos');
    const btnPausa = document.getElementById('btn-pb-pausa');

    if (elHora) elHora.textContent = hora;
    if (elFill) elFill.style.width = `${progresoPct}%`;
    if (elVentas) elVentas.textContent = String(ctrl.ventasEnVivo);
    if (elIngresos) elIngresos.textContent = String(ctrl.ingresosEnVivo);
    if (elPerdidos) elPerdidos.textContent = String(ctrl.perdidosEnVivo);
    if (btnPausa) btnPausa.textContent = ctrl.pausado ? '▶' : '⏸';

    this.barraReproduccion.querySelectorAll('.btn-vel[data-vel]').forEach((btn) => {
      const v = Number((btn as HTMLElement).dataset.vel);
      btn.classList.toggle('active', v === vel);
    });
  }

  private inicializarDOMReproduccion(): void {
    const botonesVel = VELOCIDADES_REPRODUCCION.map(
      (v) => `<button type="button" class="btn-vel" data-vel="${v}">×${v}</button>`
    ).join('');

    this.barraReproduccion.innerHTML = `
      <div class="pb-reloj">
        <span>🕒 <strong id="pb-hora">08:00</strong></span>
        <div class="pb-progress-track">
          <div id="pb-fill" class="pb-progress-fill" style="width: 0%"></div>
        </div>
      </div>
      <div class="pb-stats">
        <span>🍕 <span id="pb-ventas">0</span></span>
        <span>💰 Bs <span id="pb-ingresos">0</span></span>
        <span>❌ <span id="pb-perdidos">0</span></span>
      </div>
      <div class="pb-controls">
        <button type="button" id="btn-pb-pausa" class="btn-vel">⏸</button>
        ${botonesVel}
        <button type="button" id="btn-pb-saltar" class="btn-skip">⏭ Saltar</button>
      </div>
    `;

    document.getElementById('btn-pb-pausa')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacksReproduccion?.alAlternarPausa();
    });

    this.barraReproduccion.querySelectorAll('.btn-vel[data-vel]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = Number((btn as HTMLElement).dataset.vel) as VelocidadReproduccion;
        this.callbacksReproduccion?.alCambiarVelocidad(v);
      });
    });

    document.getElementById('btn-pb-saltar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacksReproduccion?.alSaltarDia();
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
