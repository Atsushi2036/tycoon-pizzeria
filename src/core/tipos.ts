/**
 * tipos.ts
 * Tipos e interfaces compartidos por toda la lógica del negocio.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

/** Tipo de transacción registrada en el historial */
export type TipoTransaccion =
  | 'compra_insumo'
  | 'produccion'
  | 'venta'
  | 'sueldo'
  | 'compra_mejora'
  | 'inicio_jornada';

/** Registro individual del historial */
export interface Transaccion {
  readonly tipo: TipoTransaccion;
  readonly descripcion: string;
  readonly monto: number;       // positivo = ingreso, negativo = gasto
  readonly dia: number;
  readonly timestamp: number;   // Date.now() al momento del registro
}

/** Fase de la jornada */
export type FaseJornada = 'preparar' | 'abrir' | 'cerrar';

/** Resultado de la simulación de ventas de un tipo de pizza */
export interface ResultadoVentaPizza {
  readonly pizzaId: string;
  readonly demanda: number;
  readonly vendidas: number;
  readonly ingreso: number;
  readonly perdidaPorStock: number;
  readonly perdidaPorCajeros: number;
}

/** Resumen completo del cierre de jornada */
export interface ResumenJornada {
  readonly dia: number;
  readonly nombreDia: string;
  readonly ingresos: number;
  readonly costoInsumos: number;      // lo que se gastó en insumos durante PREPARAR
  readonly sueldos: number;
  readonly costoMejoras: number;      // mejoras compradas durante PREPARAR
  readonly ganancia: number;          // ingresos - costoInsumos - sueldos - costoMejoras
  readonly capitalFinal: number;
  readonly ventas: readonly ResultadoVentaPizza[];
  readonly mensajesEducativos: readonly string[];
  readonly quiebra: boolean;
}

/** Resultado de una operación validada */
export interface ResultadoOperacion {
  readonly exito: boolean;
  readonly mensaje: string;
}

// ─── LÍNEA DE TIEMPO ───

/** Tipo de resultado para un cliente en la línea de tiempo */
export type TipoEventoCliente = 'atendido' | 'sin_stock' | 'sin_cajeros';

/** Evento individual de un cliente durante el día */
export interface EventoCliente {
  /** Minuto de llegada desde las 08:00 (0 = 08:00, 720 = 20:00) */
  readonly horaLlegada: number;
  /** Id de la pizza que pide el cliente */
  readonly pizzaId: string;
  /** Resultado: atendido, se fue por falta de stock, o se fue por falta de cajeros */
  readonly resultado: TipoEventoCliente;
}

/** Registro resumido por día (arreglo acotado para gráficos e historial) */
export interface RegistroDiario {
  readonly dia: number;
  readonly capitalFinal: number;
  readonly ingresos: number;
  readonly costos: number;   // costoInsumos + costoMejoras
  readonly sueldos: number;
}

/** Estado completo del juego (serializable para guardado) */
export interface EstadoJuego {
  capital: number;
  capitalMaxHistorico: number;
  dia: number;                        // empieza en 1
  fase: FaseJornada;
  nivel: number;
  inventarioInsumos: Record<string, number>;   // se serializa desde Map
  inventarioPizzas: Record<string, number>;    // se serializa desde Map
  empleados: Record<string, number>;           // rolId → cantidad
  mejorasCompradas: number;                    // máscara de bits
  preciosVenta: Record<string, number>;        // pizzaId → precio fijado
  costoInsumosHoy: number;                     // acumulado durante PREPARAR
  costoMejorasHoy: number;                     // acumulado durante PREPARAR
  produccionUsadaHoy: number;                  // pizzas producidas hoy
  semillaPartida: number;                      // semilla PRNG para línea de tiempo
  historialDiario: RegistroDiario[];           // registro acotado por día
  tutorialProgreso: number;                    // máscara de bits del tutorial
  version: number;                             // para validar al importar
}

