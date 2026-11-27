/**
 * game-config.ts
 * Archivo centralizado con TODOS los valores numéricos del juego.
 * Para balancear el juego, solo hay que modificar este archivo.
 */

// ─── CAPITAL INICIAL ───
export const CAPITAL_INICIAL = 2000;

// ─── BODEGA ───
export const BODEGA_CAPACIDAD_INICIAL = 200;

// ─── INSUMOS: id → costo de compra por unidad (Bs) ───
export const INSUMOS = {
  masa: { nombre: 'Masa', costo: 4 },
  salsa: { nombre: 'Salsa', costo: 2 },
  queso: { nombre: 'Queso', costo: 6 },
  pepperoni: { nombre: 'Pepperoni', costo: 7 },
  jamon: { nombre: 'Jamón', costo: 6 },
  pina: { nombre: 'Piña', costo: 3 },
} as const;

/** Ids válidos de insumos */
export type InsumoId = keyof typeof INSUMOS;

/** Lista ordenada de ids de insumos (para iteración) */
export const INSUMO_IDS: readonly InsumoId[] = Object.keys(INSUMOS) as InsumoId[];

// ─── RECETAS ───
export interface Receta {
  readonly id: string;
  readonly nombre: string;
  readonly insumos: Readonly<Record<string, number>>; // insumoId → cantidad
  readonly precioReferencia: number; // Bs
}

export const RECETAS: readonly Receta[] = [
  {
    id: 'margarita',
    nombre: 'Margarita',
    insumos: { masa: 1, salsa: 1, queso: 1 },
    precioReferencia: 35,
  },
  {
    id: 'pepperoni',
    nombre: 'Pepperoni',
    insumos: { masa: 1, salsa: 1, queso: 1, pepperoni: 1 },
    precioReferencia: 45,
  },
  {
    id: 'hawaiana',
    nombre: 'Hawaiana',
    insumos: { masa: 1, salsa: 1, queso: 1, jamon: 1, pina: 1 },
    precioReferencia: 42,
  },
] as const;

/** Ids válidos de pizzas */
export const PIZZA_IDS: readonly string[] = RECETAS.map(r => r.id);

// ─── PRECIOS DE VENTA ───
export const PRECIO_VENTA_MIN = 10;
export const PRECIO_VENTA_MAX = 100;

// ─── EMPLEADOS ───
export interface TipoEmpleado {
  readonly id: string;
  readonly nombre: string;
  readonly sueldoDiario: number;
  readonly efecto: string; // descripción legible
}

export const TIPOS_EMPLEADO: readonly TipoEmpleado[] = [
  {
    id: 'cocinero',
    nombre: 'Cocinero',
    sueldoDiario: 120,
    efecto: '+15 pizzas de capacidad de producción por jornada',
  },
  {
    id: 'cajero',
    nombre: 'Cajero',
    sueldoDiario: 90,
    efecto: '+25 clientes de capacidad de atención por jornada',
  },
] as const;

/** Capacidad base del dueño (sin empleados) */
export const PRODUCCION_BASE_DUENO = 20; // pizzas por jornada
export const ATENCION_BASE_DUENO = 15;   // clientes por jornada

/** Capacidad que aporta cada empleado */
export const PRODUCCION_POR_COCINERO = 15;
export const ATENCION_POR_CAJERO = 25;

// ─── DEMANDA ───
export const CLIENTES_BASE_DIA = 40;

/** Factores por día de la semana (0=lunes … 6=domingo) */
export const FACTOR_DIA: readonly number[] = [0.8, 0.8, 0.9, 1.0, 1.2, 1.5, 1.4];

/** Nombres de los días (para la interfaz) */
export const NOMBRES_DIAS: readonly string[] = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
];

/** Reparto de preferencia entre pizzas */
export const PREFERENCIA_PIZZA: Readonly<Record<string, number>> = {
  margarita: 0.40,
  pepperoni: 0.35,
  hawaiana: 0.25,
};

/**
 * Factor de precio: clamp(1 - 1.5 * (precio / precioRef - 1), 0, 1.5)
 * Estos son los coeficientes de la fórmula.
 */
export const PRECIO_FACTOR_COEF = 1.5;
export const PRECIO_FACTOR_MIN = 0;
export const PRECIO_FACTOR_MAX = 1.5;

// ─── MEJORAS ───
export interface Mejora {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly costo: number;
  readonly nivelRequerido: number;
  readonly bit: number; // posición del bit en la máscara
}

export const MEJORAS: readonly Mejora[] = [
  {
    id: 'horno_mediano',
    nombre: 'Horno mediano',
    descripcion: '+15 producción',
    costo: 800,
    nivelRequerido: 1,
    bit: 0,
  },
  {
    id: 'bodega_ampliada',
    nombre: 'Bodega ampliada',
    descripcion: '+200 de bodega',
    costo: 600,
    nivelRequerido: 1,
    bit: 1,
  },
  {
    id: 'batidora_industrial',
    nombre: 'Batidora industrial',
    descripcion: '-10% costo de masa, salsa y queso',
    costo: 1000,
    nivelRequerido: 2,
    bit: 2,
  },
  {
    id: 'caja_moderna',
    nombre: 'Caja moderna',
    descripcion: '+10 clientes de capacidad de atención',
    costo: 900,
    nivelRequerido: 2,
    bit: 3,
  },
  {
    id: 'horno_industrial',
    nombre: 'Horno industrial',
    descripcion: '+40 producción',
    costo: 2500,
    nivelRequerido: 3,
    bit: 4,
  },
] as const;

/** Efecto numérico de cada mejora (para cálculos en /core) */
export const MEJORA_EFECTOS = {
  horno_mediano: { produccionExtra: 15 },
  bodega_ampliada: { bodegaExtra: 200 },
  batidora_industrial: { descuentoInsumos: 0.10, insumosAfectados: ['masa', 'salsa', 'queso'] },
  caja_moderna: { atencionExtra: 10 },
  horno_industrial: { produccionExtra: 40 },
} as const;

// ─── NIVELES ───
export interface NivelConfig {
  readonly nivel: number;
  readonly capitalRequerido: number;
}

export const NIVELES: readonly NivelConfig[] = [
  { nivel: 1, capitalRequerido: 0 },
  { nivel: 2, capitalRequerido: 3000 },
  { nivel: 3, capitalRequerido: 6000 },
  { nivel: 4, capitalRequerido: 12000 },
  { nivel: 5, capitalRequerido: 25000 },
] as const;

export const NIVEL_VICTORIA = 5;

// ─── HISTORIAL ───
/** Tamaño del buffer circular de transacciones */
export const HISTORIAL_TAMANO = 200;

/** Máximo de días conservados en el registro diario acotado */
export const HISTORIAL_DIARIO_MAX = 60;

// ─── LÍNEA DE TIEMPO DEL DÍA ───

/** Hora de inicio del día simulado (08:00) */
export const HORA_INICIO_DIA = 8;

/** Hora de fin del día simulado (20:00) */
export const HORA_FIN_DIA = 20;

/** Duración del día en horas */
export const DURACION_DIA_HORAS = HORA_FIN_DIA - HORA_INICIO_DIA; // 12

/** Duración en segundos reales de la reproducción del día a velocidad ×1 */
export const DURACION_REPRODUCCION_SEGUNDOS = 60;

/** Velocidades permitidas de reproducción */
export const VELOCIDADES_REPRODUCCION = [1, 2, 4] as const;

/**
 * Pesos por hora para la distribución de llegada de clientes.
 * Índice 0 = 08:00–09:00, índice 11 = 19:00–20:00.
 * Picos suaves al mediodía (12–14) y por la tarde-noche (18–20).
 */
export const PESOS_HORA: readonly number[] = [
  0.5,  // 08:00–09:00 — apertura, poca gente
  0.6,  // 09:00–10:00
  0.8,  // 10:00–11:00
  1.0,  // 11:00–12:00
  1.5,  // 12:00–13:00 — pico almuerzo
  1.5,  // 13:00–14:00 — pico almuerzo
  1.0,  // 14:00–15:00
  0.7,  // 15:00–16:00
  0.6,  // 16:00–17:00
  0.8,  // 17:00–18:00
  1.3,  // 18:00–19:00 — pico cena
  1.2,  // 19:00–20:00 — pico cena
];

// ─── GUARDADO ───
export const SAVE_KEY = 'pizzeria_tycoon_save';
export const SAVE_VERSION = 3;

