/**
 * linea-tiempo.test.ts
 * Tests de la Fase 7: Generador de línea de tiempo del día y PRNG con semilla.
 *
 * Verifica:
 * (a) Mismos datos y semilla producen exactamente la misma línea de tiempo.
 * (b) Los totales de la línea de tiempo coinciden EXACTAMENTE con el resultado del núcleo.
 * (c) Todos los eventos están ordenados cronológicamente dentro de 08:00–20:00.
 * (d) Día sin stock y día sin cajeros (reproduciendo el reparto secuencial del núcleo).
 * (e) Día con demanda cero.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MotorJuego } from '../core/motor-juego';
import { generarLineaTiempo } from '../core/generador-linea-tiempo';
import { mulberry32, calcularSemillaDia } from '../core/prng';
import { DURACION_DIA_HORAS, PRECIO_VENTA_MAX } from '../config/game-config';
import type { ResumenJornada } from '../core/tipos';

/** Helper para contar totales a partir de una línea de tiempo */
function contarTotalesLineaTiempo(
  eventos: ReturnType<typeof generarLineaTiempo>,
  motor: MotorJuego,
) {
  let totalClientes = 0;
  let totalAtendidos = 0;
  let totalSinStock = 0;
  let totalSinCajeros = 0;
  let totalIngresos = 0;

  const porPizza: Record<
    string,
    { demanda: number; vendidas: number; perdidaPorStock: number; perdidaPorCajeros: number }
  > = {};

  for (const ev of eventos) {
    totalClientes++;
    if (!porPizza[ev.pizzaId]) {
      porPizza[ev.pizzaId] = {
        demanda: 0,
        vendidas: 0,
        perdidaPorStock: 0,
        perdidaPorCajeros: 0,
      };
    }

    porPizza[ev.pizzaId].demanda++;
    if (ev.resultado === 'atendido') {
      totalAtendidos++;
      porPizza[ev.pizzaId].vendidas++;
      totalIngresos += motor.obtenerPrecioVenta(ev.pizzaId);
    } else if (ev.resultado === 'sin_stock') {
      totalSinStock++;
      porPizza[ev.pizzaId].perdidaPorStock++;
    } else {
      totalSinCajeros++;
      porPizza[ev.pizzaId].perdidaPorCajeros++;
    }
  }

  return {
    totalClientes,
    totalAtendidos,
    totalSinStock,
    totalSinCajeros,
    totalIngresos,
    porPizza,
  };
}

describe('Fase 7: PRNG y Generador de Línea de Tiempo', () => {
  let motor: MotorJuego;

  beforeEach(() => {
    motor = new MotorJuego();
  });

  it('PRNG mulberry32 produce valores deterministas en [0, 1)', () => {
    const rng1 = mulberry32(123456);
    const rng2 = mulberry32(123456);
    const rng3 = mulberry32(654321);

    const seq1 = Array.from({ length: 20 }, () => rng1());
    const seq2 = Array.from({ length: 20 }, () => rng2());
    const seq3 = Array.from({ length: 20 }, () => rng3());

    expect(seq1).toEqual(seq2);
    expect(seq1).not.toEqual(seq3);
    for (const v of seq1) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }

    // Semillas de distintos días deben diferir
    expect(calcularSemillaDia(42, 1)).not.toBe(calcularSemillaDia(42, 2));
  });

  it('(a) mismos datos y semilla producen exactamente la misma línea de tiempo', () => {
    motor.comprarInsumo('masa', 15);
    motor.comprarInsumo('salsa', 15);
    motor.comprarInsumo('queso', 15);
    motor.producirPizza('margarita', 10);

    const resumen = motor.abrirPizzeria()!;
    const semilla = 98765;

    const lt1 = generarLineaTiempo(resumen, semilla, 1);
    const lt2 = generarLineaTiempo(resumen, semilla, 1);
    const ltOtroDia = generarLineaTiempo(resumen, semilla, 2);

    expect(lt1).toEqual(lt2);
    expect(lt1.length).toBeGreaterThan(0);
    // Con otro día la secuencia de tiempos debe cambiar
    expect(lt1).not.toEqual(ltOtroDia);
  });

  it('(b) los totales de la línea de tiempo coinciden EXACTAMENTE con el núcleo en múltiples escenarios', () => {
    // Escenario 1: producción mixta, sin empleados (límite de atención 15)
    motor.comprarInsumo('masa', 20);
    motor.comprarInsumo('salsa', 20);
    motor.comprarInsumo('queso', 20);
    motor.comprarInsumo('pepperoni', 8);
    motor.comprarInsumo('jamon', 4);
    motor.comprarInsumo('pina', 4);

    motor.producirPizza('margarita', 8);
    motor.producirPizza('pepperoni', 8);
    motor.producirPizza('hawaiana', 4);

    const resumen1 = motor.abrirPizzeria()!;
    const lt1 = generarLineaTiempo(resumen1, 111, 1);
    const totales1 = contarTotalesLineaTiempo(lt1, motor);

    const demandaNucleo1 = resumen1.ventas.reduce((s, v) => s + v.demanda, 0);
    const vendidasNucleo1 = resumen1.ventas.reduce((s, v) => s + v.vendidas, 0);
    const sinStockNucleo1 = resumen1.ventas.reduce((s, v) => s + v.perdidaPorStock, 0);
    const sinCajerosNucleo1 = resumen1.ventas.reduce((s, v) => s + v.perdidaPorCajeros, 0);

    expect(totales1.totalClientes).toBe(demandaNucleo1);
    expect(totales1.totalAtendidos).toBe(vendidasNucleo1);
    expect(totales1.totalSinStock).toBe(sinStockNucleo1);
    expect(totales1.totalSinCajeros).toBe(sinCajerosNucleo1);
    expect(totales1.totalIngresos).toBe(resumen1.ingresos);

    for (const v of resumen1.ventas) {
      if (v.demanda === 0) continue;
      expect(totales1.porPizza[v.pizzaId]).toEqual({
        demanda: v.demanda,
        vendidas: v.vendidas,
        perdidaPorStock: v.perdidaPorStock,
        perdidaPorCajeros: v.perdidaPorCajeros,
      });
    }

    // Escenario 2: avanzar a día 6 (Sábado, factor 1.5), contratar cajero y cocinero
    motor.avanzarDia(); // día 2
    for (let d = 2; d < 6; d++) {
      motor.abrirPizzeria();
      motor.avanzarDia();
    }
    motor.contratarEmpleado('cocinero');
    motor.contratarEmpleado('cajero');
    motor.comprarInsumo('masa', 30);
    motor.comprarInsumo('salsa', 30);
    motor.comprarInsumo('queso', 30);
    motor.comprarInsumo('pepperoni', 15);
    motor.producirPizza('margarita', 15);
    motor.producirPizza('pepperoni', 15);

    const resumen2 = motor.abrirPizzeria()!;
    const lt2 = generarLineaTiempo(resumen2, 222, 6);
    const totales2 = contarTotalesLineaTiempo(lt2, motor);

    expect(totales2.totalClientes).toBe(resumen2.ventas.reduce((s, v) => s + v.demanda, 0));
    expect(totales2.totalAtendidos).toBe(resumen2.ventas.reduce((s, v) => s + v.vendidas, 0));
    expect(totales2.totalSinStock).toBe(resumen2.ventas.reduce((s, v) => s + v.perdidaPorStock, 0));
    expect(totales2.totalSinCajeros).toBe(resumen2.ventas.reduce((s, v) => s + v.perdidaPorCajeros, 0));
    expect(totales2.totalIngresos).toBe(resumen2.ingresos);
  });

  it('(c) todos los eventos están ordenados cronológicamente y dentro del horario 08:00–20:00', () => {
    motor.comprarInsumo('masa', 10);
    motor.comprarInsumo('salsa', 10);
    motor.comprarInsumo('queso', 10);
    motor.producirPizza('margarita', 10);

    const resumen = motor.abrirPizzeria()!;
    const lt = generarLineaTiempo(resumen, 54321, 1);

    const maxMinutos = DURACION_DIA_HORAS * 60; // 720
    for (let i = 0; i < lt.length; i++) {
      expect(lt[i].horaLlegada).toBeGreaterThanOrEqual(0);
      expect(lt[i].horaLlegada).toBeLessThan(maxMinutos);
      if (i > 0) {
        expect(lt[i].horaLlegada).toBeGreaterThanOrEqual(lt[i - 1].horaLlegada);
      }
    }
  });

  it('(d) día sin stock y día sin cajeros suficientes reproducen las causas exactas', () => {
    // Día sin stock: no producimos nada
    const resumenSinStock = motor.abrirPizzeria()!;
    const ltSinStock = generarLineaTiempo(resumenSinStock, 777, 1);

    const demandaTotal = resumenSinStock.ventas.reduce((s, v) => s + v.demanda, 0);
    expect(ltSinStock.length).toBe(demandaTotal);
    expect(ltSinStock.every(e => e.resultado === 'sin_stock')).toBe(true);

    // Día sin cajeros suficientes: producimos más pizzas que capacidad de atención (15)
    // Usando un ResumenJornada controlado con 20 margaritas en stock, 0 cajeros extra (cap=15)
    const motorCajeros = new MotorJuego();
    motorCajeros.comprarInsumo('masa', 20);
    motorCajeros.comprarInsumo('salsa', 20);
    motorCajeros.comprarInsumo('queso', 20);
    motorCajeros.producirPizza('margarita', 20);

    // Subir precio de pepperoni y hawaiana para centrar demanda en margarita y verificar pérdida por cajeros
    motorCajeros.fijarPrecio('margarita', 20); // precio bajo -> alta demanda (>15)
    motorCajeros.fijarPrecio('pepperoni', PRECIO_VENTA_MAX);
    motorCajeros.fijarPrecio('hawaiana', PRECIO_VENTA_MAX);

    const resumenSinCajeros = motorCajeros.abrirPizzeria()!;
    const margarita = resumenSinCajeros.ventas.find(v => v.pizzaId === 'margarita')!;
    expect(margarita.vendidas).toBe(15);
    expect(margarita.perdidaPorCajeros).toBeGreaterThan(0);

    const ltSinCajeros = generarLineaTiempo(resumenSinCajeros, 888, 1);
    const eventosMarg = ltSinCajeros.filter(e => e.pizzaId === 'margarita');

    expect(eventosMarg.filter(e => e.resultado === 'atendido').length).toBe(margarita.vendidas);
    expect(eventosMarg.filter(e => e.resultado === 'sin_cajeros').length).toBe(margarita.perdidaPorCajeros);
    expect(eventosMarg.filter(e => e.resultado === 'sin_stock').length).toBe(margarita.perdidaPorStock);
  });

  it('(e) día con demanda cero genera una línea de tiempo vacía', () => {
    // Subir todos los precios al máximo para que factorPrecio sea 0 → demanda = 0
    motor.fijarPrecio('margarita', PRECIO_VENTA_MAX);
    motor.fijarPrecio('pepperoni', PRECIO_VENTA_MAX);
    motor.fijarPrecio('hawaiana', PRECIO_VENTA_MAX);

    const resumen = motor.abrirPizzeria()!;
    const demandaTotal = resumen.ventas.reduce((s, v) => s + v.demanda, 0);
    expect(demandaTotal).toBe(0);

    const lt = generarLineaTiempo(resumen, 999, 1);
    expect(lt).toEqual([]);
  });

  it('generarLineaTiempo funciona con un ResumenJornada sintético de múltiples causas mixtas', () => {
    const resumenSintetico: ResumenJornada = {
      dia: 1,
      nombreDia: 'Lunes',
      ingresos: 500,
      costoInsumos: 100,
      sueldos: 0,
      costoMejoras: 0,
      ganancia: 400,
      capitalFinal: 2400,
      ventas: [
        { pizzaId: 'margarita', demanda: 12, vendidas: 10, ingreso: 350, perdidaPorStock: 2, perdidaPorCajeros: 0 },
        { pizzaId: 'pepperoni', demanda: 8, vendidas: 5, ingreso: 225, perdidaPorStock: 0, perdidaPorCajeros: 3 },
        { pizzaId: 'hawaiana', demanda: 5, vendidas: 0, ingreso: 0, perdidaPorStock: 1, perdidaPorCajeros: 4 },
      ],
      mensajesEducativos: [],
      quiebra: false,
    };

    const lt = generarLineaTiempo(resumenSintetico, 1234, 1);
    expect(lt.length).toBe(25);

    const marg = lt.filter(e => e.pizzaId === 'margarita');
    expect(marg.filter(e => e.resultado === 'atendido').length).toBe(10);
    expect(marg.filter(e => e.resultado === 'sin_stock').length).toBe(2);
    expect(marg.filter(e => e.resultado === 'sin_cajeros').length).toBe(0);

    const pep = lt.filter(e => e.pizzaId === 'pepperoni');
    expect(pep.filter(e => e.resultado === 'atendido').length).toBe(5);
    expect(pep.filter(e => e.resultado === 'sin_stock').length).toBe(0);
    expect(pep.filter(e => e.resultado === 'sin_cajeros').length).toBe(3);

    const haw = lt.filter(e => e.pizzaId === 'hawaiana');
    expect(haw.filter(e => e.resultado === 'atendido').length).toBe(0);
    expect(haw.filter(e => e.resultado === 'sin_stock').length).toBe(1);
    expect(haw.filter(e => e.resultado === 'sin_cajeros').length).toBe(4);
  });
});
