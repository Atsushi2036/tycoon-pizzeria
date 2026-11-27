import Phaser from 'phaser';
import { MotorJuego } from './core/motor-juego';
import { GestorHUD } from './ui/gestor-hud';
import { GestorPaneles, type TipoEstacion } from './ui/gestor-paneles';
import { EscenaPrincipal } from './scenes/escena-principal';
import { Toast } from './ui/toast';
import { SAVE_KEY } from './config/game-config';
import { ANCHO_JUEGO, ALTO_JUEGO } from './config/escena-config';
import type { EstadoJuego } from './core/tipos';
import './style.css';

class AplicacionJuego {
  private motor: MotorJuego;
  private hud!: GestorHUD;
  private paneles!: GestorPaneles;
  private juegoPhaser!: Phaser.Game;

  constructor() {
    this.motor = new MotorJuego();
    this.cargarPartidaAuto();

    // 1. Crear primero el contenedor de Phaser en el DOM
    const app = document.getElementById('app');
    if (app) {
      const gameContainer = document.createElement('div');
      gameContainer.id = 'game-container';
      app.appendChild(gameContainer);
    }

    Toast.inicializar();
    // 2. Iniciar UI (HUD y modales superpuestos)
    this.iniciarUI();
    // 3. Iniciar Phaser en #game-container
    this.iniciarPhaser();
  }

  private iniciarUI(): void {
    this.hud = new GestorHUD(
      this.motor,
      () => this.manejarBotonPrincipal(),
      () => this.paneles.abrir('partida')
    );

    this.paneles = new GestorPaneles(
      this.motor,
      () => this.actualizarTodo(),
      () => this.avanzarDia(),
      () => this.reiniciarPartida(),
      () => this.exportarPartida(),
      (archivo) => this.importarPartida(archivo)
    );
  }

  private iniciarPhaser(): void {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: ANCHO_JUEGO,
      height: ALTO_JUEGO,
      backgroundColor: '#121420',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [EscenaPrincipal],
    };

    this.juegoPhaser = new Phaser.Game(config);

    // Conectar eventos cuando la escena esté lista
    this.juegoPhaser.events.once('ready', () => {
      const escena = this.juegoPhaser.scene.getScene('EscenaPrincipal') as EscenaPrincipal;
      escena.scene.restart({
        alSeleccionarEstacion: (estacion: TipoEstacion) => {
          if (this.motor.fase === 'preparar') {
            this.paneles.abrir(estacion);
          } else if (this.motor.fase === 'cerrar') {
            Toast.mostrar('La jornada está cerrada. Revisa el resumen o inicia el día siguiente.');
          }
        },
      });
    });
  }

  private manejarBotonPrincipal(): void {
    if (this.motor.fase === 'preparar') {
      const resumen = this.motor.abrirPizzeria();
      if (resumen) {
        this.guardarPartidaAuto();
        this.actualizarTodo();
        this.paneles.abrir('resumen', resumen);
      }
    } else if (this.motor.fase === 'cerrar') {
      // Reabrir resumen de la jornada
      Toast.mostrar('Avanza al siguiente día para continuar operando.');
    }
  }

  private avanzarDia(): void {
    this.motor.avanzarDia();
    this.actualizarTodo();
    Toast.mostrar(`Comenzando ${this.motor.nombreDia}. ¡Buena suerte con las ventas!`);
  }

  private actualizarTodo(): void {
    this.hud.render();
  }

  // ─── Guardado y Persistencia ───
  private guardarPartidaAuto(): void {
    try {
      const estado = this.motor.exportarEstado();
      localStorage.setItem(SAVE_KEY, JSON.stringify(estado));
    } catch (e) {
      console.warn('No se pudo guardar automáticamente en localStorage', e);
    }
  }

  private cargarPartidaAuto(): void {
    try {
      const datos = localStorage.getItem(SAVE_KEY);
      if (datos) {
        const parsed = JSON.parse(datos) as EstadoJuego;
        this.motor.importarEstado(parsed);
      }
    } catch (e) {
      console.warn('Error cargando guardado automático', e);
    }
  }

  private reiniciarPartida(): void {
    localStorage.removeItem(SAVE_KEY);
    this.motor.reiniciar();
    this.actualizarTodo();
    Toast.mostrar('Partida reiniciada desde cero.');
  }

  private exportarPartida(): void {
    const estado = this.motor.exportarEstado();
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pizzeria_save_dia${this.motor.dia}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.mostrar('Partida descargada exitosamente.');
  }

  private importarPartida(archivo: File): void {
    const lector = new FileReader();
    lector.onload = (e) => {
      try {
        const contenido = e.target?.result as string;
        const estado = JSON.parse(contenido) as EstadoJuego;
        const res = this.motor.importarEstado(estado);
        if (res.exito) {
          this.guardarPartidaAuto();
          this.actualizarTodo();
          Toast.mostrar(res.mensaje);
        } else {
          alert(`Error al importar: ${res.mensaje}`);
        }
      } catch (err) {
        alert('El archivo seleccionado no es un JSON válido.');
      }
    };
    lector.readAsText(archivo);
  }
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  new AplicacionJuego();
});
