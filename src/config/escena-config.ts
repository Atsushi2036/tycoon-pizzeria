/**
 * escena-config.ts
 * Constantes de posición, dimensiones y colores del plano cenital de la pizzería.
 * Diseñado para que las Fases 8, 9 y 10 lean las coordenadas desde aquí.
 */

export const ANCHO_JUEGO = 960;
export const ALTO_JUEGO = 640;

/** Altura reservada para el HUD superior HTML */
export const ALTO_HUD = 60;

/** Rectángulo general del edificio de la pizzería */
export const PLANO_LOCAL = {
  x: 24,
  y: ALTO_HUD + 14, // 74
  ancho: 912,
  alto: 544,
  grosorPared: 8,
} as const;

/** Puerta principal de entrada/salida (abajo al centro-izquierda) */
export const PUERTA_ENTRADA = {
  x: 260,
  y: PLANO_LOCAL.y + PLANO_LOCAL.alto, // 618
  ancho: 90,
} as const;

/** Definición geométrica de una estación clicable */
export interface ConfigEstacion {
  readonly id: 'bodega' | 'horno' | 'mostrador' | 'oficina';
  readonly titulo: string;
  readonly subtitulo: string;
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly alto: number;
  readonly colorAcento: number;
}

/**
 * Las 4 estaciones principales del plano cenital.
 * Arriba izquierda: Bodega | Arriba derecha: Horno & Cocina
 * Centro-izquierda: Mostrador | Abajo derecha: Oficina
 */
export const ESTACIONES_CONFIG: Record<ConfigEstacion['id'], ConfigEstacion> = {
  bodega: {
    id: 'bodega',
    titulo: '📦 BODEGA',
    subtitulo: 'Insumos',
    x: 24,
    y: 74,
    ancho: 380,
    alto: 220,
    colorAcento: 0xe67e22,
  },
  horno: {
    id: 'horno',
    titulo: '🔥 HORNO & COCINA',
    subtitulo: 'Producción',
    x: 404,
    y: 74,
    ancho: 532,
    alto: 240,
    colorAcento: 0xe74c3c,
  },
  mostrador: {
    id: 'mostrador',
    titulo: '🏪 MOSTRADOR',
    subtitulo: 'Precios & Caja',
    x: 110,
    y: 340,
    ancho: 330,
    alto: 90,
    colorAcento: 0x2ecc71,
  },
  oficina: {
    id: 'oficina',
    titulo: '💼 OFICINA',
    subtitulo: 'Personal & Mejoras',
    x: 646,
    y: 368,
    ancho: 290,
    alto: 250,
    colorAcento: 0x3498db,
  },
};

/** Zona de comedor (mesas para clientes, parte inferior izquierda) */
export const ZONA_MESAS = {
  x: 44,
  y: 455,
  mesas: [
    { x: 95, y: 495, radio: 22 },
    { x: 95, y: 570, radio: 22 },
    { x: 420, y: 495, radio: 22 },
    { x: 420, y: 570, radio: 22 },
  ],
} as const;

/** Posiciones clave para elementos internos y futuras fases (9 y 10) */
export const POSICIONES_INTERIOR = {
  // Estantes de bodega (los 3 primeros iniciales; el 4º y 5º para mejora bodega_ampliada)
  estantesBodega: [
    { x: 52, y: 105, ancho: 130, alto: 30 },
    { x: 52, y: 155, ancho: 130, alto: 30 },
    { x: 52, y: 205, ancho: 130, alto: 30 },
  ],
  estantesBodegaExtra: [
    { x: 215, y: 155, ancho: 130, alto: 30 },
    { x: 215, y: 205, ancho: 130, alto: 30 },
  ],
  // Horno base
  hornoBase: { x: 830, y: 165, radio: 44 },
  // Batidora industrial (cocina)
  batidoraIndustrial: { x: 438, y: 195 },
  // Mesón de cocina
  mesonCocina: { x: 470, y: 110, ancho: 260, alto: 46 },
  // Caja registradora en el mostrador
  cajaRegistradora: { x: 240, y: 366, ancho: 44, alto: 32 },
  // Escritorio de oficina
  escritorioOficina: { x: 740, y: 465, ancho: 130, alto: 56 },
  // Puestos de cocineros (en la cocina, frente al mesón/horno)
  puestosCocineros: [
    { x: 510, y: 190 },
    { x: 565, y: 190 },
    { x: 620, y: 190 },
    { x: 675, y: 190 },
    { x: 730, y: 190 },
  ],
  // Puestos de cajeros (detrás del mostrador)
  puestosCajeros: [
    { x: 145, y: 320 },
    { x: 195, y: 320 },
    { x: 295, y: 320 },
    { x: 345, y: 320 },
    { x: 395, y: 320 },
  ],
} as const;

/** Colores del personal por rol */
export const COLORES_PERSONAL = {
  cocinero: 0xff9f43,
  cajero: 0x00d2d3,
} as const;

/** Paleta de colores del plano cenital */
export const COLORES_ESCENA = {
  exterior: 0x121420,
  pisoSalon: 0x2a2623,
  pisoSalonBaldosa: 0x322d29,
  pisoBodega: 0x252a34,
  pisoCocina: 0x2b303a,
  pisoOficina: 0x242836,
  pared: 0x576574,
  paredBorde: 0x8395a7,
  puerta: 0xf7b731,
  estante: 0x8e6b4f,
  estanteBorde: 0x5d432c,
  meson: 0x95a5a6,
  mesonBorde: 0x7f8c8d,
  hornoPiedra: 0x7f3b2d,
  hornoFuego: 0xff6b35,
  mostradorMadera: 0x8b5a2b,
  mostradorTope: 0xa06b3b,
  caja: 0x2c3e50,
  mesa: 0x9c6b43,
  silla: 0x57606f,
  escritorio: 0x6c4f3d,
} as const;

/** Colores de los clientes según la pizza que piden */
export const COLORES_PIZZA_CLIENTE: Readonly<Record<string, number>> = {
  margarita: 0xf1c40f, // amarillo queso
  pepperoni: 0xe74c3c, // rojo pepperoni
  hawaiana: 0x2ecc71,  // verde piña/jamón
};

/** Puntos de paso fijos para la reproducción de clientes (SIN pathfinding) */
export const RUTAS_CLIENTES = {
  entradaExterior: { x: 260, y: 634 },
  entradaInterior: { x: 260, y: 582 },
  pasilloEspera: { x: 260, y: 515 },
  /** Puestos de atención frente al mostrador (dueño + hasta 5 cajeros) */
  puestosMostrador: [
    { x: 145, y: 400 },
    { x: 195, y: 400 },
    { x: 245, y: 400 },
    { x: 295, y: 400 },
    { x: 345, y: 400 },
    { x: 395, y: 400 },
  ],
  /** Inicio y espaciado vertical de la fila FIFO frente al mostrador */
  filaInicio: { x: 260, y: 448 },
  filaEspaciadoY: 22,
  filaMaxVisible: 6,
  salidaInterior: { x: 225, y: 582 },
  salidaExterior: { x: 225, y: 642 },
} as const;
