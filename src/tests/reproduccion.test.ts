/**
 * reproduccion.test.ts
 * Tests de la Fase 9: Cola FIFO para la fila del mostrador y
 * ControladorReproduccion (manejo de velocidad, pausa y salto sin Phaser).
 */
import { describe, it, expect } from 'vitest';
import { ColaFIFO } from '../core/cola-fifo';
import { ControladorReproduccion } from '../core/controlador-reproduccion';
import { MotorJuego } from '../core/motor-juego';
import { generarLineaTiempo } from '../core/generador-linea-tiempo';
import { DURACION_REPRODUCCION_SEGUNDOS } from '../config/game-config';

describe('Fase 9: ColaFIFO', () => {
  it('mantiene el orden estricto FIFO (First-In, First-Out)', () => {
    const cola = new ColaFIFO<string>();
    expect(cola.estaVacia()).toBe(true);
    expect(cola.tamano()).toBe(0);
    expect(cola.frente()).toBeUndefined();
    expect(cola.desencolar()).toBeUndefined();

    cola.encolar('cliente-1');
    cola.encolar('cliente-2');
    cola.encolar('cliente-3');

    expect(cola.estaVacia()).toBe(false);
    expect(cola.tamano()).toBe(3);
    expect(cola.frente()).toBe('cliente-1');
    expect(cola.obtenerTodos()).toEqual(['cliente-1', 'cliente-2', 'cliente-3']);

    expect(cola.desencolar()).toBe('cliente-1');
    expect(cola.desencolar()).toBe('cliente-2');
    expect(cola.tamano()).toBe(1);
    expect(cola.frente()).toBe('cliente-3');

    cola.limpiar();
    expect(cola.estaVacia()).toBe(true);
    expect(cola.tamano()).toBe(0);
  });
});

describe('Fase 9: ControladorReproduccion (velocidad, pausa, salto)', () => {
  function crearEscenario() {
    const motor = new MotorJuego();
    motor.comprarInsumo('masa', 15);
    motor.comprarInsumo('salsa', 15);
    motor.comprarInsumo('queso', 15);
    motor.producirPizza('margarita', 10);

    const precios = motor.obtenerPreciosVenta();
    const resumen = motor.abrirPizzeria()!;
    const eventos = generarLineaTiempo(resumen, 12345, resumen.dia);

    const ctrl = new ControladorReproduccion({
      eventos,
      resumen,
      preciosVenta: precios,
    });

    return { motor, resumen, eventos, ctrl };
  }

  it('inicia a las 08:00 con progreso 0 y sin terminar', () => {
    const { ctrl } = crearEscenario();
    expect(ctrl.obtenerHoraFormateada()).toBe('08:00');
    expect(ctrl.obtenerProgreso()).toBe(0);
    expect(ctrl.velocidad).toBe(1);
    expect(ctrl.pausado).toBe(false);
    expect(ctrl.terminado).toBe(false);
  });

  it('a velocidad ×1 el día dura DURACION_REPRODUCCION_SEGUNDOS (60s)', () => {
    const { ctrl, resumen } = crearEscenario();

    // Mitad del día (30s → 14:00)
    ctrl.avanzar(DURACION_REPRODUCCION_SEGUNDOS / 2);
    expect(ctrl.obtenerHoraFormateada()).toBe('14:00');
    expect(ctrl.obtenerProgreso()).toBeCloseTo(0.5);
    expect(ctrl.terminado).toBe(false);

    // Resto del día (30s → 20:00)
    ctrl.avanzar(DURACION_REPRODUCCION_SEGUNDOS / 2);
    expect(ctrl.obtenerHoraFormateada()).toBe('20:00');
    expect(ctrl.obtenerProgreso()).toBe(1);
    expect(ctrl.terminado).toBe(true);

    // Totales confirmados con el núcleo
    const vendidasNucleo = resumen.ventas.reduce((s, v) => s + v.vendidas, 0);
    expect(ctrl.ventasEnVivo).toBe(vendidasNucleo);
    expect(ctrl.ingresosEnVivo).toBe(resumen.ingresos);
  });

  it('respeta las velocidades ×2 y ×4', () => {
    const { ctrl: ctrl2 } = crearEscenario();
    ctrl2.fijarVelocidad(2);
    ctrl2.avanzar(15); // 15s × 2 = 30s equivalentes = mitad del día (14:00)
    expect(ctrl2.obtenerHoraFormateada()).toBe('14:00');
    expect(ctrl2.obtenerProgreso()).toBeCloseTo(0.5);

    const { ctrl: ctrl4 } = crearEscenario();
    ctrl4.fijarVelocidad(4);
    ctrl4.avanzar(15); // 15s × 4 = 60s equivalentes = día completo (20:00)
    expect(ctrl4.obtenerHoraFormateada()).toBe('20:00');
    expect(ctrl4.terminado).toBe(true);
  });

  it('pausa detiene el avance del tiempo y reanudar lo continúa', () => {
    const { ctrl } = crearEscenario();
    ctrl.avanzar(10);
    const minutoAntesPausa = ctrl.minutoActual;
    const ventasAntesPausa = ctrl.ventasEnVivo;

    ctrl.pausar();
    expect(ctrl.pausado).toBe(true);
    const despachadosEnPausa = ctrl.avanzar(20);
    expect(despachadosEnPausa).toEqual([]);
    expect(ctrl.minutoActual).toBe(minutoAntesPausa);
    expect(ctrl.ventasEnVivo).toBe(ventasAntesPausa);

    ctrl.reanudar();
    expect(ctrl.pausado).toBe(false);
    ctrl.avanzar(10);
    expect(ctrl.minutoActual).toBeGreaterThan(minutoAntesPausa);
  });

  it('saltar finaliza inmediatamente y confirma los totales exactos del núcleo', () => {
    const { ctrl, resumen } = crearEscenario();
    ctrl.avanzar(5);
    ctrl.saltar();

    expect(ctrl.terminado).toBe(true);
    expect(ctrl.obtenerHoraFormateada()).toBe('20:00');
    expect(ctrl.obtenerProgreso()).toBe(1);

    const vendidasNucleo = resumen.ventas.reduce((s, v) => s + v.vendidas, 0);
    const sinStockNucleo = resumen.ventas.reduce((s, v) => s + v.perdidaPorStock, 0);
    const sinCajerosNucleo = resumen.ventas.reduce((s, v) => s + v.perdidaPorCajeros, 0);

    expect(ctrl.ventasEnVivo).toBe(vendidasNucleo);
    expect(ctrl.ingresosEnVivo).toBe(resumen.ingresos);
    expect(ctrl.perdidosStockEnVivo).toBe(sinStockNucleo);
    expect(ctrl.perdidosCajerosEnVivo).toBe(sinCajerosNucleo);
  });
});
