/**
 * mascara-bits.ts
 * Utilidades para manejo de máscara de bits (mejoras compradas).
 *
 * Justificación: consulta y modificación O(1) sin overhead de objetos.
 * Cada mejora se representa como un bit individual en un entero.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

/**
 * Activa un bit en la máscara.
 * Complejidad: O(1).
 * @param mascara - Máscara actual.
 * @param bit - Posición del bit a activar (0, 1, 2, ...).
 * @returns Nueva máscara con el bit activado.
 */
export function activarBit(mascara: number, bit: number): number {
  return mascara | (1 << bit);
}

/**
 * Desactiva un bit en la máscara.
 * Complejidad: O(1).
 * @param mascara - Máscara actual.
 * @param bit - Posición del bit a desactivar.
 * @returns Nueva máscara con el bit desactivado.
 */
export function desactivarBit(mascara: number, bit: number): number {
  return mascara & ~(1 << bit);
}

/**
 * Consulta si un bit está activo en la máscara.
 * Complejidad: O(1).
 * @param mascara - Máscara actual.
 * @param bit - Posición del bit a consultar.
 * @returns true si el bit está activo.
 */
export function consultarBit(mascara: number, bit: number): boolean {
  return (mascara & (1 << bit)) !== 0;
}

