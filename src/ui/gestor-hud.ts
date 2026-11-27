import type { MotorJuego } from '../core/motor-juego';

/**
 * Gestor del HUD superior de la pantalla.
 */
export class GestorHUD {
  private motor: MotorJuego;
  private contenedor: HTMLElement;
  private alAbrirPizzeria: () => void;
  private alGestionPartida: () => void;

  constructor(motor: MotorJuego, alAbrirPizzeria: () => void, alGestionPartida: () => void) {
    this.motor = motor;
    this.alAbrirPizzeria = alAbrirPizzeria;
    this.alGestionPartida = alGestionPartida;

    this.contenedor = document.createElement('div');
    this.contenedor.id = 'hud-container';
    document.getElementById('app')?.appendChild(this.contenedor);

    this.render();
  }

  render(): void {
    const capital = this.motor.capital;
    const dia = this.motor.dia;
    const nombreDia = this.motor.nombreDia;
    const nivel = this.motor.nivel;
    const fase = this.motor.fase;

    const btnTexto = fase === 'preparar' ? '🍕 Abrir Pizzería' : (fase === 'abrir' ? 'Simulando...' : 'Ver Resumen');
    const btnDisabled = fase === 'abrir' ? 'disabled' : '';

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
        <button id="btn-partida" class="btn-secondary">💾 Partida</button>
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

  private obtenerTotalPizzasTerminadas(): number {
    let total = 0;
    const inv = this.motor.obtenerInventarioPizzas();
    for (const cant of inv.values()) {
      total += cant;
    }
    return total;
  }
}

