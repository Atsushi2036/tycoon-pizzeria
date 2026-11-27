import type { MotorJuego } from '../core/motor-juego';
import { consultarBit } from '../core/mascara-bits';
import { TUTORIAL_PASOS, type PasoTutorialConfig } from '../config/game-config';

/**
 * Asistente visual del tutorial guiado (Fase 12).
 * Lee el progreso desde la máscara de bits del núcleo.
 */
export class GestorTutorial {
  private motor: MotorJuego;
  private contenedor: HTMLElement;
  private alSaltar: () => void;

  constructor(motor: MotorJuego, alSaltar: () => void) {
    this.motor = motor;
    this.alSaltar = alSaltar;

    this.contenedor = document.createElement('div');
    this.contenedor.id = 'tutorial-assistant';
    this.contenedor.className = 'hidden';

    // Evitar propagación de clics hacia el canvas de Phaser
    this.contenedor.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.contenedor.addEventListener('mousedown', (e) => e.stopPropagation());
    this.contenedor.addEventListener('mouseup', (e) => e.stopPropagation());
    this.contenedor.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('app')?.appendChild(this.contenedor);
  }

  /** Retorna el paso actual pendiente, o null si el tutorial ya terminó */
  obtenerPasoActual(): PasoTutorialConfig | null {
    if (!this.motor.tutorialActivo()) return null;
    const mascara = this.motor.tutorialProgreso;
    return TUTORIAL_PASOS.find((p) => !consultarBit(mascara, p.bit)) ?? null;
  }

  /** Actualiza la tarjeta flotante del asistente según el estado del núcleo */
  render(ocultarTemporalmente = false): PasoTutorialConfig | null {
    const paso = this.obtenerPasoActual();
    if (!paso || ocultarTemporalmente) {
      this.contenedor.classList.add('hidden');
      return paso;
    }

    const completados = TUTORIAL_PASOS.filter((p) =>
      consultarBit(this.motor.tutorialProgreso, p.bit)
    ).length;

    this.contenedor.classList.remove('hidden');
    this.contenedor.innerHTML = `
      <div class="tut-header">
        <span class="tut-badge">🎓 Tutorial (${completados + 1}/${TUTORIAL_PASOS.length})</span>
        <button type="button" id="btn-saltar-tutorial" class="tut-skip">Saltar</button>
      </div>
      <div class="tut-title">${paso.titulo}</div>
      <div class="tut-meta">${paso.meta}</div>
    `;

    document.getElementById('btn-saltar-tutorial')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.alSaltar();
    });

    return paso;
  }
}
