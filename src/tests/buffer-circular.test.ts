/**
 * buffer-circular.test.ts
 * Tests del buffer circular.
 */
import { describe, it, expect } from 'vitest';
import { BufferCircular } from '../core/buffer-circular';

describe('BufferCircular', () => {
  it('insertar y obtener elementos básicos', () => {
    const buffer = new BufferCircular<number>(5);
    buffer.insertar(1);
    buffer.insertar(2);
    buffer.insertar(3);

    expect(buffer.cantidad).toBe(3);
    expect(buffer.lleno).toBe(false);
    expect(buffer.obtenerTodos()).toEqual([1, 2, 3]);
    expect(buffer.obtenerUltimo()).toBe(3);
  });

  it('sobrescribe el más antiguo al superar su tamaño', () => {
    const buffer = new BufferCircular<number>(3);
    buffer.insertar(1);
    buffer.insertar(2);
    buffer.insertar(3);
    expect(buffer.lleno).toBe(true);

    // Insertar un 4° elemento sobrescribe el 1
    buffer.insertar(4);
    expect(buffer.cantidad).toBe(3);
    expect(buffer.obtenerTodos()).toEqual([2, 3, 4]);
    expect(buffer.obtenerUltimo()).toBe(4);
  });

  it('sobrescribe múltiples vueltas correctamente', () => {
    const buffer = new BufferCircular<number>(3);
    for (let i = 1; i <= 10; i++) {
      buffer.insertar(i);
    }
    // Solo quedan los últimos 3: 8, 9, 10
    expect(buffer.obtenerTodos()).toEqual([8, 9, 10]);
    expect(buffer.cantidad).toBe(3);
  });

  it('obtenerUltimo devuelve undefined si está vacío', () => {
    const buffer = new BufferCircular<string>(5);
    expect(buffer.obtenerUltimo()).toBeUndefined();
    expect(buffer.cantidad).toBe(0);
  });

  it('obtenerTodos devuelve array vacío si está vacío', () => {
    const buffer = new BufferCircular<string>(5);
    expect(buffer.obtenerTodos()).toEqual([]);
  });

  it('limpiar reinicia el buffer', () => {
    const buffer = new BufferCircular<number>(3);
    buffer.insertar(1);
    buffer.insertar(2);
    buffer.limpiar();
    expect(buffer.cantidad).toBe(0);
    expect(buffer.obtenerTodos()).toEqual([]);
  });

  it('lanza error si la capacidad es 0 o negativa', () => {
    expect(() => new BufferCircular(0)).toThrow();
    expect(() => new BufferCircular(-1)).toThrow();
  });
});

