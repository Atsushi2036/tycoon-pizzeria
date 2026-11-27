/**
 * buffer-circular.ts
 * Buffer circular de tamaño fijo para el historial de transacciones.
 *
 * Justificación: inserción O(1), sin reasignación de memoria.
 * Al superar el tamaño, sobrescribe el registro más antiguo.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

export class BufferCircular<T> {
  /** Array interno de tamaño fijo */
  private readonly _datos: (T | undefined)[];

  /** Índice donde se insertará el próximo elemento */
  private _cabeza: number = 0;

  /** Cantidad actual de elementos (nunca supera _capacidad) */
  private _cantidad: number = 0;

  /** Capacidad máxima del buffer */
  private readonly _capacidad: number;

  constructor(capacidad: number) {
    if (capacidad <= 0) {
      throw new Error('La capacidad del buffer debe ser mayor a 0');
    }
    this._capacidad = capacidad;
    this._datos = new Array<T | undefined>(capacidad).fill(undefined);
  }

  /** Capacidad máxima */
  get capacidad(): number {
    return this._capacidad;
  }

  /** Cantidad actual de elementos almacenados */
  get cantidad(): number {
    return this._cantidad;
  }

  /** Indica si el buffer está lleno */
  get lleno(): boolean {
    return this._cantidad === this._capacidad;
  }

  /**
   * Inserta un elemento al final del buffer.
   * Si está lleno, sobrescribe el más antiguo.
   * Complejidad: O(1).
   */
  insertar(elemento: T): void {
    this._datos[this._cabeza] = elemento;
    this._cabeza = (this._cabeza + 1) % this._capacidad;
    if (this._cantidad < this._capacidad) {
      this._cantidad++;
    }
  }

  /**
   * Devuelve todos los elementos en orden cronológico (del más antiguo al más reciente).
   * Complejidad: O(n) donde n = cantidad.
   */
  obtenerTodos(): T[] {
    if (this._cantidad === 0) return [];

    const resultado: T[] = [];
    // Si no está lleno, los datos empiezan en 0
    // Si está lleno, el más antiguo está en _cabeza (donde se va a sobrescribir el próximo)
    const inicio = this._cantidad < this._capacidad ? 0 : this._cabeza;

    for (let i = 0; i < this._cantidad; i++) {
      const idx = (inicio + i) % this._capacidad;
      resultado.push(this._datos[idx] as T);
    }

    return resultado;
  }

  /**
   * Devuelve el elemento más reciente, o undefined si está vacío.
   * Complejidad: O(1).
   */
  obtenerUltimo(): T | undefined {
    if (this._cantidad === 0) return undefined;
    const idx = (this._cabeza - 1 + this._capacidad) % this._capacidad;
    return this._datos[idx] as T;
  }

  /** Limpia todos los elementos del buffer */
  limpiar(): void {
    this._datos.fill(undefined);
    this._cabeza = 0;
    this._cantidad = 0;
  }
}

