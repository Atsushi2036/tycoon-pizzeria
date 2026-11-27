/**
 * mascara-bits.test.ts
 * Tests de las operaciones con máscara de bits.
 */
import { describe, it, expect } from 'vitest';
import { activarBit, desactivarBit, consultarBit } from '../core/mascara-bits';

describe('Máscara de bits', () => {
  it('activar un bit desde 0', () => {
    const mascara = activarBit(0, 0);
    expect(mascara).toBe(1);
    expect(consultarBit(mascara, 0)).toBe(true);
  });

  it('activar múltiples bits sin afectar otros', () => {
    let mascara = 0;
    mascara = activarBit(mascara, 0); // bit 0 → 1
    mascara = activarBit(mascara, 2); // bit 2 → 5

    expect(consultarBit(mascara, 0)).toBe(true);
    expect(consultarBit(mascara, 1)).toBe(false);
    expect(consultarBit(mascara, 2)).toBe(true);
    expect(mascara).toBe(5); // 101 en binario
  });

  it('desactivar un bit sin afectar otros', () => {
    let mascara = 0;
    mascara = activarBit(mascara, 0);
    mascara = activarBit(mascara, 1);
    mascara = activarBit(mascara, 2);
    // mascara = 7 (111)

    mascara = desactivarBit(mascara, 1);
    expect(consultarBit(mascara, 0)).toBe(true);
    expect(consultarBit(mascara, 1)).toBe(false);
    expect(consultarBit(mascara, 2)).toBe(true);
    expect(mascara).toBe(5); // 101
  });

  it('desactivar un bit ya inactivo no cambia nada', () => {
    const mascara = activarBit(0, 2); // 4
    const resultado = desactivarBit(mascara, 0);
    expect(resultado).toBe(4); // sin cambio
  });

  it('activar un bit ya activo no cambia nada', () => {
    const mascara = activarBit(0, 3); // 8
    const resultado = activarBit(mascara, 3);
    expect(resultado).toBe(8); // sin cambio
  });

  it('consultar bit en máscara vacía devuelve false', () => {
    expect(consultarBit(0, 0)).toBe(false);
    expect(consultarBit(0, 4)).toBe(false);
  });

  it('funciona con todos los bits de mejoras del juego (0-4)', () => {
    let mascara = 0;
    // Activar todos los bits de mejoras
    for (let i = 0; i < 5; i++) {
      mascara = activarBit(mascara, i);
    }
    expect(mascara).toBe(31); // 11111

    // Verificar todos activos
    for (let i = 0; i < 5; i++) {
      expect(consultarBit(mascara, i)).toBe(true);
    }

    // Desactivar bit 2
    mascara = desactivarBit(mascara, 2);
    expect(mascara).toBe(27); // 11011
    expect(consultarBit(mascara, 2)).toBe(false);
    expect(consultarBit(mascara, 1)).toBe(true);
    expect(consultarBit(mascara, 3)).toBe(true);
  });
});

