/**
 * prng.ts
 * Generador pseudoaleatorio con semilla (mulberry32).
 * Permite reproducir la misma secuencia de números para una semilla dada.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

/**
 * Crea un generador pseudoaleatorio mulberry32.
 * Retorna una función que produce números en [0, 1) de forma determinista.
 *
 * @param semilla - Número entero que define la secuencia.
 * @returns Función que retorna el siguiente número pseudoaleatorio en [0, 1).
 */
export function mulberry32(semilla: number): () => number {
  let estado = semilla | 0;
  return () => {
    estado = (estado + 0x6D2B79F5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calcula la semilla del día a partir de la semilla de la partida y el número de día.
 * Garantiza que cada día tenga una secuencia distinta pero reproducible.
 *
 * @param semillaPartida - Semilla fija de la partida (guardada en el save).
 * @param dia - Número de día (empieza en 1).
 * @returns Semilla entera para el PRNG del día.
 */
export function calcularSemillaDia(semillaPartida: number, dia: number): number {
  return ((semillaPartida * 1664525 + dia * 1013904223 + 12345) >>> 0);
}

/**
 * Genera una semilla aleatoria para una partida nueva.
 * Usa Date.now() y Math.random() para máxima variabilidad.
 */
export function generarSemillaPartida(): number {
  return ((Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0);
}

