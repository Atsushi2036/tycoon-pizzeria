/**
 * generador-linea-tiempo.ts
 * Genera una lista ordenada de eventos a partir del resultado de la jornada.
 *
 * PRINCIPIO RECTOR: la jornada se REPRODUCE, no se recalcula.
 * Este generador solo DISTRIBUYE EN EL TIEMPO lo que el núcleo ya decidió.
 * Los totales de la línea de tiempo coinciden EXACTAMENTE con el ResumenJornada.
 *
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

import {
  PESOS_HORA,
  DURACION_DIA_HORAS,
} from '../config/game-config';

import type { ResumenJornada, EventoCliente, TipoEventoCliente } from './tipos';
import { mulberry32, calcularSemillaDia } from './prng';

/**
 * Genera una hora de llegada en minutos desde las 08:00 (rango 0–720),
 * usando la distribución por pesos horarios.
 *
 * @param rng - Función PRNG que retorna [0, 1).
 * @returns Minuto de llegada (0 = 08:00, 720 = 20:00).
 */
function generarHoraLlegada(rng: () => number): number {
  let totalPeso = 0;
  for (let i = 0; i < DURACION_DIA_HORAS; i++) {
    totalPeso += PESOS_HORA[i];
  }

  let r = rng() * totalPeso;
  let horaIdx = 0;
  for (let i = 0; i < DURACION_DIA_HORAS; i++) {
    r -= PESOS_HORA[i];
    if (r <= 0) {
      horaIdx = i;
      break;
    }
    if (i === DURACION_DIA_HORAS - 1) {
      horaIdx = i;
    }
  }

  const minutos = rng() * 60;
  return horaIdx * 60 + minutos;
}

/**
 * Genera la línea de tiempo del día.
 *
 * Para cada tipo de pizza, crea `demanda` clientes con hora de llegada
 * distribuida según los pesos horarios. Asigna resultados exactamente
 * como el núcleo los decidió:
 *   - Primeros `vendidas` → 'atendido'
 *   - Siguientes `perdidaPorCajeros` → 'sin_cajeros'
 *   - Últimos `perdidaPorStock` → 'sin_stock'
 *
 * Los clientes que llegan primero son atendidos primero (FIFO por pizza).
 * Esto reproduce el reparto secuencial del núcleo sin reinterpretarlo.
 */
export function generarLineaTiempo(
  resumen: ResumenJornada,
  semillaPartida: number,
  dia: number,
): EventoCliente[] {
  const semillaDia = calcularSemillaDia(semillaPartida, dia);
  const rng = mulberry32(semillaDia);

  const eventos: EventoCliente[] = [];

  for (const venta of resumen.ventas) {
    const { pizzaId, demanda, vendidas, perdidaPorCajeros } = venta;

    if (demanda === 0) continue;

    const llegadas: number[] = [];
    for (let i = 0; i < demanda; i++) {
      llegadas.push(generarHoraLlegada(rng));
    }
    llegadas.sort((a, b) => a - b);

    for (let i = 0; i < demanda; i++) {
      let resultado: TipoEventoCliente;
      if (i < vendidas) {
        resultado = 'atendido';
      } else if (i < vendidas + perdidaPorCajeros) {
        resultado = 'sin_cajeros';
      } else {
        resultado = 'sin_stock';
      }

      eventos.push({
        horaLlegada: llegadas[i],
        pizzaId,
        resultado,
      });
    }
  }

  eventos.sort((a, b) => a.horaLlegada - b.horaLlegada);

  return eventos;
}
