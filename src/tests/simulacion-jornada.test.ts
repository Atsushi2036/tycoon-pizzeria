/**
 * simulacion-jornada.test.ts
 * Tests específicos para la Fase 2: Simulación de jornada, demanda,
 * desglose de pérdidas por stock vs cajeros, ciclo semanal y mensajes educativos.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MotorJuego } from '../core/motor-juego';
import { FACTOR_DIA, NOMBRES_DIAS } from '../config/game-config';

describe('Fase 2: Simulación detallada de jornada y economía', () => {
  let motor: MotorJuego;

  beforeEach(() => {
    motor = new MotorJuego();
  });

  it('calcula la demanda para cada día de la semana según FACTOR_DIA', () => {
    // Probar los 7 días de la semana y sus factores
    for (let d = 0; d < 7; d++) {
      expect(motor.nombreDia).toBe(NOMBRES_DIAS[d]);
      expect(motor.factorDia).toBe(FACTOR_DIA[d]);

      // Margarita: 40 * factor * 0.4 * 1.0 (precio de ref = 35)
      const demandaEsperada = Math.floor(40 * FACTOR_DIA[d] * 0.4);
      expect(motor.calcularDemanda('margarita')).toBe(demandaEsperada);

      // Simular apertura sin stock para avanzar
      motor.abrirPizzeria();
      motor.avanzarDia();
    }
    // El día 8 vuelve a ser Lunes
    expect(motor.dia).toBe(8);
    expect(motor.nombreDia).toBe('Lunes');
  });

  it('desglosa correctamente la demanda perdida por stock', () => {
    // Lunes: Demanda margarita = 12. Demanda pepperoni = 11. Demanda hawaiana = 8.
    // Capacidad atención base = 15.
    // Stock margarita = 5. (Demanda 12, vende 5, perdidaPorStock = 7, perdidaPorCajeros = 0)
    motor.comprarInsumo('masa', 5);
    motor.comprarInsumo('salsa', 5);
    motor.comprarInsumo('queso', 5);
    motor.producirPizza('margarita', 5);

    const resumen = motor.abrirPizzeria()!;
    const margarita = resumen.ventas.find(v => v.pizzaId === 'margarita')!;

    expect(margarita.demanda).toBe(12);
    expect(margarita.vendidas).toBe(5);
    expect(margarita.perdidaPorStock).toBe(7);
    expect(margarita.perdidaPorCajeros).toBe(0);
  });

  it('desglosa correctamente la demanda perdida por cajeros', () => {
    // Lunes: Capacidad de cajeros = 15.
    // Si tenemos 15 margaritas y 10 pepperonis:
    // Margarita (primera en procesarse): demanda 12, stock 15 -> vende 12 (atención restante 15-12 = 3).
    // Pepperoni: demanda 11, stock 10 -> vende min(11, 10, 3) = 3.
    // Clientes con stock para pepperoni = min(11, 10) = 10.
    // perdidaPorCajeros = 10 - 3 = 7. perdidaPorStock = 11 - 10 = 1.
    motor.comprarInsumo('masa', 25);
    motor.comprarInsumo('salsa', 25);
    motor.comprarInsumo('queso', 25);
    motor.comprarInsumo('pepperoni', 10);
    // Debido a capacidad base de producción (20), contratamos 1 cocinero (+15 = 35)
    motor.contratarEmpleado('cocinero');

    motor.producirPizza('margarita', 15);
    motor.producirPizza('pepperoni', 10);

    const resumen = motor.abrirPizzeria()!;
    const margarita = resumen.ventas.find(v => v.pizzaId === 'margarita')!;
    const pepperoni = resumen.ventas.find(v => v.pizzaId === 'pepperoni')!;

    expect(margarita.vendidas).toBe(12);
    expect(pepperoni.vendidas).toBe(3);
    expect(pepperoni.perdidaPorStock).toBe(1);
    expect(pepperoni.perdidaPorCajeros).toBe(7);
  });

  it('genera mensajes educativos adecuados ante problemas de stock y precios', () => {
    // Fijar precio muy alto en margarita (ej: Bs 60 vs 35 ref) para probar mensaje de precio
    motor.fijarPrecio('margarita', 60);

    // Tener poco stock en pepperoni
    motor.comprarInsumo('masa', 2);
    motor.comprarInsumo('salsa', 2);
    motor.comprarInsumo('queso', 2);
    motor.comprarInsumo('pepperoni', 2);
    motor.producirPizza('pepperoni', 2);

    const resumen = motor.abrirPizzeria()!;

    // Debe contener mensaje de reducción de demanda por precio
    const mensajePrecio = resumen.mensajesEducativos.find(m => m.includes('redujo la demanda'));
    expect(mensajePrecio).toBeDefined();

    // Debe contener mensaje de pérdida por falta de stock de pepperoni
    const mensajeStock = resumen.mensajesEducativos.find(m => m.includes('falta de stock'));
    expect(mensajeStock).toBeDefined();
  });

  it('calcula la ganancia diaria exacta deduciendo insumos, sueldos y mejoras', () => {
    // Costo insumos: comprar 10 masas (40 Bs), 10 salsas (20 Bs), 10 quesos (60 Bs) = 120 Bs
    motor.comprarInsumo('masa', 10);
    motor.comprarInsumo('salsa', 10);
    motor.comprarInsumo('queso', 10);
    expect(motor.costoInsumosHoy).toBe(120);

    // Producir 10 margaritas
    motor.producirPizza('margarita', 10);

    // Contratar 1 cocinero (sueldo 120 Bs al cierre)
    motor.contratarEmpleado('cocinero');

    // Demanda margarita día 1 = 12. Vendemos 10 margaritas a Bs 35 = 350 Bs
    const resumen = motor.abrirPizzeria()!;

    expect(resumen.ingresos).toBe(350);
    expect(resumen.costoInsumos).toBe(120);
    expect(resumen.sueldos).toBe(120);
    expect(resumen.costoMejoras).toBe(0);

    // Ganancia = 350 - 120 - 120 = 110 Bs
    expect(resumen.ganancia).toBe(110);
    // Capital inicial 2000 - 120 (gastado en insumos) + 350 (ingreso) - 120 (sueldos) = 2110
    expect(resumen.capitalFinal).toBe(2110);
    expect(motor.capital).toBe(2110);
  });

  it('verifica la condición de victoria alcanzando nivel 5', () => {
    expect(motor.victoria).toBe(false);

    // Inyectamos estado de nivel 5 (Bs 25.000)
    const estado = motor.exportarEstado();
    estado.capital = 26000;
    estado.capitalMaxHistorico = 26000;
    estado.nivel = 5;
    motor.importarEstado(estado);

    expect(motor.nivel).toBe(5);
    expect(motor.victoria).toBe(true);
  });
});

