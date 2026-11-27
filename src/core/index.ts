/**
 * index.ts
 * Barrel export de /core. Re-exporta todo lo necesario para consumidores.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

export { MotorJuego } from './motor-juego';
export { BufferCircular } from './buffer-circular';
export { activarBit, desactivarBit, consultarBit } from './mascara-bits';
export type {
  Transaccion,
  TipoTransaccion,
  FaseJornada,
  ResultadoVentaPizza,
  ResumenJornada,
  ResultadoOperacion,
  EstadoJuego,
} from './tipos';

