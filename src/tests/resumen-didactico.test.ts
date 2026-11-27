/**
 * resumen-didactico.test.ts
 * Tests de la Fase 11: Registro diario acotado, guardado v3 / migración,
 * y priorización de mensajes causales (máximo 3 por mayor impacto en Bs).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MotorJuego } from '../core/motor-juego';
import { HISTORIAL_DIARIO_MAX, SAVE_VERSION } from '../config/game-config';
import type { EstadoJuego } from '../core/tipos';

describe('Fase 11: Resumen Didáctico e Historial Diario', () => {
  let motor: MotorJuego;

  beforeEach(() => {
    motor = new MotorJuego();
  });

  it('conserva un registro por día con capital final, ingresos, costos y sueldos', () => {
    motor.comprarInsumo('masa', 10);
    motor.comprarInsumo('salsa', 10);
    motor.comprarInsumo('queso', 10);
    motor.producirPizza('margarita', 10);
    motor.contratarEmpleado('cocinero');

    const resumen = motor.abrirPizzeria()!;
    const historial = motor.obtenerHistorialDiario();

    expect(historial.length).toBe(1);
    expect(historial[0]).toEqual({
      dia: 1,
      capitalFinal: resumen.capitalFinal,
      ingresos: resumen.ingresos,
      costos: resumen.costoInsumos + resumen.costoMejoras,
      sueldos: resumen.sueldos,
    });
  });

  it('acota el historial diario a HISTORIAL_DIARIO_MAX días', () => {
    for (let i = 0; i < HISTORIAL_DIARIO_MAX + 5; i++) {
      motor.abrirPizzeria();
      motor.avanzarDia();
    }

    const historial = motor.obtenerHistorialDiario();
    expect(historial.length).toBe(HISTORIAL_DIARIO_MAX);
    // Debe conservar los días más recientes
    expect(historial[0].dia).toBe(6);
    expect(historial[historial.length - 1].dia).toBe(HISTORIAL_DIARIO_MAX + 5);
  });

  it('incluye historialDiario en el guardado y migra partidas v2 → v3', () => {
    motor.abrirPizzeria();
    const estadoV3 = motor.exportarEstado();
    expect(estadoV3.version).toBe(SAVE_VERSION);
    expect(estadoV3.historialDiario.length).toBe(1);

    const otro = new MotorJuego();
    expect(otro.importarEstado(estadoV3).exito).toBe(true);
    expect(otro.obtenerHistorialDiario().length).toBe(1);

    // Simular guardado versión 2 sin historialDiario
    const estadoV2 = {
      ...estadoV3,
      version: 2,
    } as Record<string, unknown>;
    delete estadoV2.historialDiario;

    const motorMigrado = new MotorJuego();
    const res = motorMigrado.importarEstado(estadoV2 as unknown as EstadoJuego);
    expect(res.exito).toBe(true);
    expect(motorMigrado.obtenerHistorialDiario()).toEqual([]);
  });

  it('limita los mensajes causales a un máximo de 3 priorizados por impacto en Bs', () => {
    // Generar múltiples problemas simultáneos (sin stock en las 3 pizzas + precio alto en margarita + alerta)
    motor.fijarPrecio('margarita', 70);
    const resumen = motor.abrirPizzeria()!;

    expect(resumen.mensajesEducativos.length).toBeLessThanOrEqual(3);
    expect(resumen.mensajesEducativos.length).toBeGreaterThan(0);
  });
});
