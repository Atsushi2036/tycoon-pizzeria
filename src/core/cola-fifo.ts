/**
 * cola-fifo.ts
 * Cola FIFO (First-In, First-Out) para gestionar la fila de clientes en el mostrador.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

export class ColaFIFO<T> {
  private _elementos: T[];

  constructor() {
    this._elementos = [];
  }

  /** Agrega un elemento al final de la cola (O(1)) */
  encolar(elemento: T): void {
    this._elementos.push(elemento);
  }

  /** Retira y retorna el primer elemento de la cola, o undefined si está vacía */
  desencolar(): T | undefined {
    return this._elementos.shift();
  }

  /** Retorna el primer elemento sin retirarlo */
  frente(): T | undefined {
    return this._elementos[0];
  }

  /** Cantidad de elementos en la cola */
  tamano(): number {
    return this._elementos.length;
  }

  /** Indica si la cola está vacía */
  estaVacia(): boolean {
    return this._elementos.length === 0;
  }

  /** Vacía la cola por completo */
  limpiar(): void {
    this._elementos = [];
  }

  /** Retorna una copia del arreglo actual en orden FIFO */
  obtenerTodos(): T[] {
    return [...this._elementos];
  }
}
