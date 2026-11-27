/**
 * balance.ts
 * Script de balance headless (`npm run balance`) — Fase 13.
 * Simula cientos de partidas SIN interfaz usando MotorJuego con 5 estrategias
 * distintas y reporta quiebra, días promedio a niveles 2/3/5 y capital final.
 */

import { MotorJuego } from '../core/motor-juego';
import { mulberry32 } from '../core/prng';
import { RECETAS, MEJORAS, INSUMO_IDS, PRECIO_VENTA_MIN, PRECIO_VENTA_MAX } from '../config/game-config';

type EstrategiaId =
  | 'precios_bajos'
  | 'precios_altos'
  | 'sin_contratar'
  | 'todo_en_mejoras'
  | 'equilibrada';

interface ResultadoPartida {
  quebro: boolean;
  diaNivel2: number | null;
  diaNivel3: number | null;
  diaNivel5: number | null;
  capitalFinal: number;
}

const PARTIDAS_POR_ESTRATEGIA = 100;
const MAX_DIAS_SIMULACION = 60;

function clampPrecio(p: number): number {
  return Math.max(PRECIO_VENTA_MIN, Math.min(PRECIO_VENTA_MAX, Math.round(p)));
}

function simularPartida(estrategia: EstrategiaId, semilla: number): ResultadoPartida {
  const motor = new MotorJuego();
  const rng = mulberry32(semilla);

  let diaNivel2: number | null = null;
  let diaNivel3: number | null = null;
  let diaNivel5: number | null = null;

  for (let d = 1; d <= MAX_DIAS_SIMULACION; d++) {
    // 1. Fijar precios según estrategia
    for (const r of RECETAS) {
      let mult = 1.0;
      if (estrategia === 'precios_bajos') mult = 0.75;
      else if (estrategia === 'precios_altos') mult = 1.35;
      else if (estrategia === 'equilibrada') mult = 0.95 + rng() * 0.1;
      motor.fijarPrecio(r.id, clampPrecio(r.precioReferencia * mult));
    }

    // 2. Comprar mejoras según estrategia
    if (estrategia === 'todo_en_mejoras') {
      for (const m of MEJORAS) {
        if (!motor.tieneMejora(m.bit) && motor.nivel >= m.nivelRequerido && motor.capital >= m.costo) {
          motor.comprarMejora(m.id);
        }
      }
    } else if (estrategia === 'equilibrada') {
      for (const m of MEJORAS) {
        // Mantiene al menos Bs 450 de colchón operativo antes de mejorar
        if (!motor.tieneMejora(m.bit) && motor.nivel >= m.nivelRequerido && motor.capital >= m.costo + 450) {
          motor.comprarMejora(m.id);
        }
      }
    } else if (estrategia === 'sin_contratar') {
      for (const m of MEJORAS) {
        if (!motor.tieneMejora(m.bit) && motor.nivel >= m.nivelRequerido && motor.capital >= m.costo + 350) {
          motor.comprarMejora(m.id);
        }
      }
    }

    // 3. Contratar personal según estrategia
    if (estrategia !== 'sin_contratar') {
      const demandaTotal = RECETAS.reduce((s, r) => s + motor.calcularDemanda(r.id), 0);
      const colchon = estrategia === 'todo_en_mejoras' ? 600 : 350;

      if (demandaTotal > motor.obtenerCapacidadProduccion() && motor.capital > colchon) {
        motor.contratarEmpleado('cocinero');
      }
      if (demandaTotal > motor.obtenerCapacidadAtencion() && motor.capital > colchon) {
        motor.contratarEmpleado('cajero');
      }
    }

    // 4. Planificar producción con ligera variabilidad humana (±12%)
    let capProdRestante = motor.obtenerCapacidadProduccion();
    const factorRuido = 0.88 + rng() * 0.24;

    for (const r of RECETAS) {
      if (capProdRestante <= 0) break;
      const demanda = motor.calcularDemanda(r.id);
      const stockActual = motor.obtenerPizzas(r.id);
      const objetivo = Math.max(0, Math.round(demanda * factorRuido) - stockActual);
      const aProducir = Math.min(objetivo, capProdRestante);
      if (aProducir <= 0) continue;

      // Comprar los insumos faltantes para estas pizzas
      let puedeComprarTodos = true;
      for (const [insId, cantPorPizza] of Object.entries(r.insumos)) {
        const req = cantPorPizza * aProducir;
        const disp = motor.obtenerInsumo(insId);
        if (disp < req) {
          const resCompra = motor.comprarInsumo(insId as (typeof INSUMO_IDS)[number], req - disp);
          if (!resCompra.exito) {
            puedeComprarTodos = false;
            break;
          }
        }
      }

      if (puedeComprarTodos) {
        const resProd = motor.producirPizza(r.id, aProducir);
        if (resProd.exito) {
          capProdRestante -= aProducir;
        }
      }
    }

    // 5. Abrir pizzería y evaluar resultados
    const resumen = motor.abrirPizzeria()!;
    if (motor.nivel >= 2 && diaNivel2 === null) diaNivel2 = d;
    if (motor.nivel >= 3 && diaNivel3 === null) diaNivel3 = d;
    if (motor.nivel >= 5 && diaNivel5 === null) diaNivel5 = d;

    if (resumen.quiebra) {
      return {
        quebro: true,
        diaNivel2,
        diaNivel3,
        diaNivel5,
        capitalFinal: resumen.capitalFinal,
      };
    }

    if (motor.victoria) {
      return {
        quebro: false,
        diaNivel2,
        diaNivel3,
        diaNivel5,
        capitalFinal: resumen.capitalFinal,
      };
    }

    motor.avanzarDia();
  }

  return {
    quebro: false,
    diaNivel2,
    diaNivel3,
    diaNivel5,
    capitalFinal: motor.capital,
  };
}

function promedio(vals: number[]): string {
  if (vals.length === 0) return 'N/A';
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg.toFixed(1);
}

function ejecutarBalance(): void {
  const estrategias: EstrategiaId[] = [
    'precios_bajos',
    'precios_altos',
    'sin_contratar',
    'todo_en_mejoras',
    'equilibrada',
  ];

  console.log(`\n=== SIMULACIÓN DE BALANCE (${PARTIDAS_POR_ESTRATEGIA} partidas × ${estrategias.length} estrategias, máx ${MAX_DIAS_SIMULACION} días) ===\n`);

  const alertas: string[] = [];

  for (const est of estrategias) {
    const resultados: ResultadoPartida[] = [];
    for (let i = 0; i < PARTIDAS_POR_ESTRATEGIA; i++) {
      resultados.push(simularPartida(est, 1000 + i * 7919 + est.length * 131));
    }

    const quiebras = resultados.filter((r) => r.quebro).length;
    const pctQuiebra = ((quiebras / PARTIDAS_POR_ESTRATEGIA) * 100).toFixed(1);
    const d2 = resultados.map((r) => r.diaNivel2).filter((x): x is number => x !== null);
    const d3 = resultados.map((r) => r.diaNivel3).filter((x): x is number => x !== null);
    const d5 = resultados.map((r) => r.diaNivel5).filter((x): x is number => x !== null);
    const capProm = (resultados.reduce((s, r) => s + r.capitalFinal, 0) / PARTIDAS_POR_ESTRATEGIA).toFixed(0);

    console.log(
      `Estrategia: ${est.padEnd(16)} | Quiebra: ${pctQuiebra.padStart(5)}% | ` +
      `Días N2: ${promedio(d2).padStart(4)} | Días N3: ${promedio(d3).padStart(4)} | ` +
      `Días N5: ${promedio(d5).padStart(4)} (${d5.length}%) | Cap.Final: Bs ${capProm}`
    );

    if (d5.length === 0 && est === 'equilibrada') {
      alertas.push(`- "${est}" nunca alcanzó Nivel 5 en ${MAX_DIAS_SIMULACION} días.`);
    }
    if (quiebras === 0 && est === 'precios_altos') {
      alertas.push(`- "${est}" no tuvo ninguna quiebra; quizá el castigo de precio (PRECIO_FACTOR_COEF=1.5) es suave.`);
    }
    if (d5.length === PARTIDAS_POR_ESTRATEGIA && d5.reduce((a, b) => a + b, 0) / d5.length < 10) {
      alertas.push(`- "${est}" gana demasiado rápido (< 10 días promedio a Nivel 5).`);
    }
  }

  console.log('\n=== DIAGNÓSTICO ===');
  if (alertas.length === 0) {
    console.log('Ninguna estrategia extrema es trivial ni imposible para el perfil equilibrado.');
  } else {
    alertas.forEach((a) => console.log(a));
  }
  console.log('');
}

ejecutarBalance();
