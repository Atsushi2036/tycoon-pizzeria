/**
 * controlador-reproduccion.ts
 * Controla el tiempo simulado (08:00 a 20:00), velocidad (×1, ×2, ×4),
 * pausa y salto de la reproducción de la jornada.
 *
 * PRINCIPIO RECTOR: El núcleo ya calculó el ResumenJornada.
 * Al terminar o al saltar, los totales se confirman directamente con el resumen.
 *
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

import {
  HORA_INICIO_DIA,
  DURACION_DIA_HORAS,
  DURACION_REPRODUCCION_SEGUNDOS,
} from '../config/game-config';

import type { EventoCliente, ResumenJornada } from './tipos';

export type VelocidadReproduccion = 1 | 2 | 4;

export interface OpcionesReproduccion {
  eventos: readonly EventoCliente[];
  resumen: ResumenJornada;
  preciosVenta: ReadonlyMap<string, number>;
}

export class ControladorReproduccion {
  private readonly _eventos: readonly EventoCliente[];
  private readonly _resumen: ResumenJornada;
  private readonly _preciosVenta: ReadonlyMap<string, number>;
  private readonly _duracionTotalMinutos: number;

  private _minutoActual: number;
  private _velocidad: VelocidadReproduccion;
  private _pausado: boolean;
  private _terminado: boolean;
  private _indiceEvento: number;

  private _ventasEnVivo: number;
  private _ingresosEnVivo: number;
  private _perdidosStockEnVivo: number;
  private _perdidosCajerosEnVivo: number;

  constructor(opciones: OpcionesReproduccion) {
    this._eventos = opciones.eventos;
    this._resumen = opciones.resumen;
    this._preciosVenta = opciones.preciosVenta;
    this._duracionTotalMinutos = DURACION_DIA_HORAS * 60; // 720 min (08:00–20:00)

    this._minutoActual = 0;
    this._velocidad = 1;
    this._pausado = false;
    this._terminado = false;
    this._indiceEvento = 0;

    this._ventasEnVivo = 0;
    this._ingresosEnVivo = 0;
    this._perdidosStockEnVivo = 0;
    this._perdidosCajerosEnVivo = 0;
  }

  // ─── Getters ───

  get minutoActual(): number { return this._minutoActual; }
  get velocidad(): VelocidadReproduccion { return this._velocidad; }
  get pausado(): boolean { return this._pausado; }
  get terminado(): boolean { return this._terminado; }
  get resumen(): ResumenJornada { return this._resumen; }

  get ventasEnVivo(): number { return this._ventasEnVivo; }
  get ingresosEnVivo(): number { return this._ingresosEnVivo; }
  get perdidosStockEnVivo(): number { return this._perdidosStockEnVivo; }
  get perdidosCajerosEnVivo(): number { return this._perdidosCajerosEnVivo; }
  get perdidosEnVivo(): number {
    return this._perdidosStockEnVivo + this._perdidosCajerosEnVivo;
  }

  /** Progreso normalizado [0, 1] */
  obtenerProgreso(): number {
    return Math.min(1, Math.max(0, this._minutoActual / this._duracionTotalMinutos));
  }

  /** Hora simulada formateada (ej. "08:00", "13:45", "20:00") */
  obtenerHoraFormateada(): string {
    const minutosTotales = Math.floor(this._minutoActual);
    const horas = HORA_INICIO_DIA + Math.floor(minutosTotales / 60);
    const mins = minutosTotales % 60;
    const hh = String(horas).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // ─── Controles ───

  pausar(): void {
    if (!this._terminado) {
      this._pausado = true;
    }
  }

  reanudar(): void {
    if (!this._terminado) {
      this._pausado = false;
    }
  }

  alternarPausa(): void {
    if (this._pausado) {
      this.reanudar();
    } else {
      this.pausar();
    }
  }

  fijarVelocidad(velocidad: VelocidadReproduccion): void {
    this._velocidad = velocidad;
  }

  /**
   * Avanza la reproducción según el tiempo real transcurrido (en segundos).
   * Retorna los eventos cuya horaLlegada se alcanzó en este paso.
   */
  avanzar(deltaSegundosReales: number): EventoCliente[] {
    if (this._pausado || this._terminado || deltaSegundosReales <= 0) {
      return [];
    }

    const minutosPorSegundo = this._duracionTotalMinutos / DURACION_REPRODUCCION_SEGUNDOS;
    this._minutoActual = Math.min(
      this._duracionTotalMinutos,
      this._minutoActual + deltaSegundosReales * this._velocidad * minutosPorSegundo
    );

    const despachados: EventoCliente[] = [];

    while (
      this._indiceEvento < this._eventos.length &&
      this._eventos[this._indiceEvento].horaLlegada <= this._minutoActual
    ) {
      const ev = this._eventos[this._indiceEvento];
      this._indiceEvento++;
      despachados.push(ev);

      if (ev.resultado === 'atendido') {
        this._ventasEnVivo++;
        this._ingresosEnVivo += this._preciosVenta.get(ev.pizzaId) ?? 0;
      } else if (ev.resultado === 'sin_stock') {
        this._perdidosStockEnVivo++;
      } else {
        this._perdidosCajerosEnVivo++;
      }
    }

    if (this._minutoActual >= this._duracionTotalMinutos) {
      this._finalizarConfirmandoNucleo();
    }

    return despachados;
  }

  /**
   * Salta inmediatamente al final del día sin dibujar eventos pendientes.
   * Confirma los totales directamente desde el ResumenJornada del núcleo.
   */
  saltar(): void {
    this._minutoActual = this._duracionTotalMinutos;
    this._indiceEvento = this._eventos.length;
    this._pausado = false;
    this._finalizarConfirmandoNucleo();
  }

  /** Confirma los totales en vivo con los valores autoritativos del núcleo */
  private _finalizarConfirmandoNucleo(): void {
    this._terminado = true;
    this._ventasEnVivo = this._resumen.ventas.reduce((s, v) => s + v.vendidas, 0);
    this._ingresosEnVivo = this._resumen.ingresos;
    this._perdidosStockEnVivo = this._resumen.ventas.reduce((s, v) => s + v.perdidaPorStock, 0);
    this._perdidosCajerosEnVivo = this._resumen.ventas.reduce((s, v) => s + v.perdidaPorCajeros, 0);
  }
}
