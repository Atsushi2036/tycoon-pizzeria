/**
 * index.ts
 * Barrel export de /core. Re-exporta todo lo necesario para consumidores.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

export { MotorJuego } from './motor-juego';
export { BufferCircular } from './buffer-circular';
export { ColaFIFO } from './cola-fifo';
export { ControladorReproduccion, type VelocidadReproduccion, type OpcionesReproduccion } from './controlador-reproduccion';
export { activarBit, desactivarBit, consultarBit } from './mascara-bits';
export { mulberry32, calcularSemillaDia, generarSemillaPartida } from './prng';
export { generarLineaTiempo } from './generador-linea-tiempo';
export type {
  Transaccion,
  TipoTransaccion,
  FaseJornada,
  ResultadoVentaPizza,
  ResumenJornada,
  ResultadoOperacion,
  EstadoJuego,
  TipoEventoCliente,
  EventoCliente,
} from './tipos';

