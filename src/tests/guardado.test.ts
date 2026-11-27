/**
 * guardado.test.ts
 * Tests de la Fase 5: Guardado automático, exportación, validación robusta
 * de archivos importados y reinicio de partida.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MotorJuego } from '../core/motor-juego';
import { SAVE_VERSION } from '../config/game-config';
import type { EstadoJuego } from '../core/tipos';

describe('Fase 5: Guardado, Exportar e Importar', () => {
  let motor: MotorJuego;

  beforeEach(() => {
    motor = new MotorJuego();
  });

  it('exporta el estado con la versión correcta y todas las propiedades requeridas', () => {
    motor.comprarInsumo('masa', 15);
    motor.comprarInsumo('salsa', 15);
    motor.comprarInsumo('queso', 15);
    motor.producirPizza('margarita', 5);
    motor.contratarEmpleado('cocinero');
    motor.fijarPrecio('margarita', 42);

    const estado = motor.exportarEstado();

    expect(estado.version).toBe(SAVE_VERSION);
    expect(estado.capital).toBe(motor.capital);
    expect(estado.dia).toBe(1);
    expect(estado.nivel).toBe(1);
    expect(estado.inventarioInsumos['masa']).toBe(10);
    expect(estado.inventarioPizzas['margarita']).toBe(5);
    expect(estado.empleados['cocinero']).toBe(1);
    expect(estado.preciosVenta['margarita']).toBe(42);
  });

  it('restaura fielmente un estado válido previamente exportado', () => {
    motor.comprarInsumo('pepperoni', 20);
    motor.contratarEmpleado('cajero');
    motor.fijarPrecio('pepperoni', 50);

    const backup = motor.exportarEstado();

    // Crear otro motor y cargar el estado
    const otroMotor = new MotorJuego();
    const res = otroMotor.importarEstado(backup);

    expect(res.exito).toBe(true);
    expect(otroMotor.capital).toBe(motor.capital);
    expect(otroMotor.obtenerInsumo('pepperoni')).toBe(20);
    expect(otroMotor.obtenerEmpleados('cajero')).toBe(1);
    expect(otroMotor.obtenerPrecioVenta('pepperoni')).toBe(50);
  });

  it('rechaza importaciones si la versión del esquema no coincide', () => {
    const estado = motor.exportarEstado();
    estado.version = 999; // Versión incompatible

    const res = motor.importarEstado(estado);
    expect(res.exito).toBe(false);
    expect(res.mensaje).toContain('Versión incompatible');
  });

  it('rechaza importaciones si el estado es null o no es un objeto', () => {
    const resNull = motor.importarEstado(null as unknown as EstadoJuego);
    expect(resNull.exito).toBe(false);

    const resString = motor.importarEstado('texto_invalido' as unknown as EstadoJuego);
    expect(resString.exito).toBe(false);
  });

  it('rechaza archivos con campos numéricos corrompidos o ausentes', () => {
    const estadoInvalido1 = {
      version: SAVE_VERSION,
      capital: 'no_es_numero',
      dia: 1,
      nivel: 1,
    } as unknown as EstadoJuego;

    const res1 = motor.importarEstado(estadoInvalido1);
    expect(res1.exito).toBe(false);

    const estadoInvalido2 = {
      version: SAVE_VERSION,
      capital: 2000,
      dia: -5, // Día negativo inválido
      nivel: 1,
      mejorasCompradas: 0,
      inventarioInsumos: {},
      inventarioPizzas: {},
      empleados: {},
      preciosVenta: {},
    } as unknown as EstadoJuego;

    const res2 = motor.importarEstado(estadoInvalido2);
    expect(res2.exito).toBe(false);
  });

  it('rechaza archivos a los que les faltan objetos de inventarios o precios', () => {
    const estadoSinInventarios = {
      version: SAVE_VERSION,
      capital: 2000,
      dia: 1,
      nivel: 1,
      mejorasCompradas: 0,
      // Faltan inventarioInsumos, inventarioPizzas, etc.
    } as unknown as EstadoJuego;

    const res = motor.importarEstado(estadoSinInventarios);
    expect(res.exito).toBe(false);
    expect(res.mensaje).toContain('estructura o campos inválidos');
  });

  it('reiniciar limpia inventarios, compras, empleados e historial dejando el capital base', () => {
    motor.comprarInsumo('masa', 10);
    motor.producirPizza('margarita', 5);
    motor.contratarEmpleado('cocinero');

    motor.reiniciar();

    expect(motor.capital).toBe(2000);
    expect(motor.dia).toBe(1);
    expect(motor.fase).toBe('preparar');
    expect(motor.nivel).toBe(1);
    expect(motor.obtenerTotalBodega()).toBe(0);
    expect(motor.obtenerPizzas('margarita')).toBe(0);
    expect(motor.obtenerEmpleados('cocinero')).toBe(0);
    expect(motor.obtenerHistorial().length).toBe(0);
  });
});

