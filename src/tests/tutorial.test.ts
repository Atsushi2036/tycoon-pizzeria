/**
 * tutorial.test.ts
 * Tests de la Fase 12: Progreso del tutorial con máscara de bits,
 * metas automáticas, saltar, repetir y guardado v4.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MotorJuego } from '../core/motor-juego';
import { consultarBit } from '../core/mascara-bits';
import { TUTORIAL_BIT_COMPLETADO, SAVE_VERSION } from '../config/game-config';
import type { EstadoJuego } from '../core/tipos';

describe('Fase 12: Tutorial guiado y máscara de bits', () => {
  let motor: MotorJuego;

  beforeEach(() => {
    motor = new MotorJuego();
  });

  it('inicia con el tutorial activo y máscara en 0', () => {
    expect(motor.tutorialActivo()).toBe(true);
    expect(motor.tutorialProgreso).toBe(0);
  });

  it('activa los bits de los pasos conforme se cumplen las metas', () => {
    // Paso 0: comprar insumos
    motor.comprarInsumo('masa', 10);
    motor.comprarInsumo('salsa', 10);
    motor.comprarInsumo('queso', 10);
    motor.evaluarProgresoTutorial();
    expect(consultarBit(motor.tutorialProgreso, 0)).toBe(true);
    expect(consultarBit(motor.tutorialProgreso, 1)).toBe(false);

    // Paso 1: producir 10 margaritas
    motor.producirPizza('margarita', 10);
    motor.evaluarProgresoTutorial();
    expect(consultarBit(motor.tutorialProgreso, 1)).toBe(true);

    // Paso 2: visitar mostrador
    motor.evaluarProgresoTutorial('mostrador');
    expect(consultarBit(motor.tutorialProgreso, 2)).toBe(true);

    // Paso 3: abrir pizzería
    motor.abrirPizzeria();
    motor.evaluarProgresoTutorial();
    expect(consultarBit(motor.tutorialProgreso, 3)).toBe(true);
    expect(consultarBit(motor.tutorialProgreso, TUTORIAL_BIT_COMPLETADO)).toBe(true);
    expect(motor.tutorialActivo()).toBe(false);
  });

  it('permite saltar y repetir el tutorial', () => {
    motor.saltarTutorial();
    expect(motor.tutorialActivo()).toBe(false);
    expect(consultarBit(motor.tutorialProgreso, TUTORIAL_BIT_COMPLETADO)).toBe(true);

    motor.reiniciarTutorial();
    expect(motor.tutorialActivo()).toBe(true);
    expect(motor.tutorialProgreso).toBe(0);
  });

  it('guarda el progreso del tutorial y migra partidas v3 → v4', () => {
    motor.completarPasoTutorial(0);
    const estado = motor.exportarEstado();
    expect(estado.version).toBe(SAVE_VERSION);
    expect(consultarBit(estado.tutorialProgreso, 0)).toBe(true);

    const otro = new MotorJuego();
    expect(otro.importarEstado(estado).exito).toBe(true);
    expect(consultarBit(otro.tutorialProgreso, 0)).toBe(true);

    // Simular guardado v3 en día 3 (debe migrar marcando tutorial completado)
    const estadoV3 = {
      ...estado,
      dia: 3,
      version: 3,
    } as Record<string, unknown>;
    delete estadoV3.tutorialProgreso;

    const motorMigrado = new MotorJuego();
    expect(motorMigrado.importarEstado(estadoV3 as unknown as EstadoJuego).exito).toBe(true);
    expect(motorMigrado.tutorialActivo()).toBe(false);
  });
});
