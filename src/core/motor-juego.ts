/**
 * motor-juego.ts
 * Motor principal del juego: gestiona el estado y orquesta las operaciones del negocio.
 * PROHIBIDO importar Phaser o tocar el DOM aquí.
 */

import {
  CAPITAL_INICIAL,
  BODEGA_CAPACIDAD_INICIAL,
  INSUMOS,
  INSUMO_IDS,
  RECETAS,
  PIZZA_IDS,
  PRECIO_VENTA_MIN,
  PRECIO_VENTA_MAX,
  TIPOS_EMPLEADO,
  PRODUCCION_BASE_DUENO,
  ATENCION_BASE_DUENO,
  PRODUCCION_POR_COCINERO,
  ATENCION_POR_CAJERO,
  CLIENTES_BASE_DIA,
  FACTOR_DIA,
  NOMBRES_DIAS,
  PREFERENCIA_PIZZA,
  PRECIO_FACTOR_COEF,
  PRECIO_FACTOR_MIN,
  PRECIO_FACTOR_MAX,
  MEJORAS,
  MEJORA_EFECTOS,
  NIVELES,
  NIVEL_VICTORIA,
  HISTORIAL_TAMANO,
  HISTORIAL_DIARIO_MAX,
  SAVE_VERSION,
  type InsumoId,
} from '../config/game-config';

import type {
  EstadoJuego,
  FaseJornada,
  RegistroDiario,
  ResultadoOperacion,
  ResultadoVentaPizza,
  ResumenJornada,
  Transaccion,
} from './tipos';

import { BufferCircular } from './buffer-circular';
import { activarBit, consultarBit } from './mascara-bits';
import { generarSemillaPartida } from './prng';

/**
 * Clase principal del motor de juego.
 * Encapsula todo el estado y las operaciones del negocio.
 */
export class MotorJuego {
  // ─── Estado del juego ───

  /** Capital actual en Bs */
  private _capital: number;

  /** Capital máximo histórico (define el nivel) */
  private _capitalMaxHistorico: number;

  /** Día actual (empieza en 1) */
  private _dia: number;

  /** Fase actual de la jornada */
  private _fase: FaseJornada;

  /** Nivel actual del jugador */
  private _nivel: number;

  /**
   * Inventario de insumos: Map<InsumoId, cantidad>.
   * Justificación: acceso O(1) por id.
   */
  private _inventarioInsumos: Map<string, number>;

  /**
   * Inventario de pizzas terminadas: Map<pizzaId, cantidad>.
   * Justificación: acceso O(1) por id.
   */
  private _inventarioPizzas: Map<string, number>;

  /** Empleados contratados: rolId → cantidad */
  private _empleados: Map<string, number>;

  /** Máscara de bits de mejoras compradas. Consulta/modificación O(1). */
  private _mejorasCompradas: number;

  /** Precios de venta fijados por el jugador: pizzaId → precio */
  private _preciosVenta: Map<string, number>;

  /** Costo acumulado de insumos en la jornada actual (para el resumen) */
  private _costoInsumosHoy: number;

  /** Costo acumulado de mejoras en la jornada actual (para el resumen) */
  private _costoMejorasHoy: number;

  /** Pizzas producidas hoy (para controlar capacidad) */
  private _produccionUsadaHoy: number;

  /** Semilla fija de la partida para el PRNG de la línea de tiempo */
  private _semillaPartida: number;

  /**
   * Historial de transacciones: buffer circular de tamaño fijo.
   * Justificación: inserción O(1), sin reasignación de memoria.
   */
  private _historial: BufferCircular<Transaccion>;

  /** Registro acotado por día para gráficos e historial de capital */
  private _historialDiario: RegistroDiario[];

  constructor() {
    this._capital = CAPITAL_INICIAL;
    this._capitalMaxHistorico = CAPITAL_INICIAL;
    this._dia = 1;
    this._fase = 'preparar';
    this._nivel = 1;
    this._inventarioInsumos = new Map<string, number>();
    this._inventarioPizzas = new Map<string, number>();
    this._empleados = new Map<string, number>();
    this._mejorasCompradas = 0;
    this._preciosVenta = new Map<string, number>();
    this._costoInsumosHoy = 0;
    this._costoMejorasHoy = 0;
    this._produccionUsadaHoy = 0;
    this._semillaPartida = generarSemillaPartida();
    this._historial = new BufferCircular<Transaccion>(HISTORIAL_TAMANO);
    this._historialDiario = [];

    // Inicializar inventarios a 0
    for (const id of INSUMO_IDS) {
      this._inventarioInsumos.set(id, 0);
    }
    for (const id of PIZZA_IDS) {
      this._inventarioPizzas.set(id, 0);
    }

    // Inicializar empleados a 0
    for (const tipo of TIPOS_EMPLEADO) {
      this._empleados.set(tipo.id, 0);
    }

    // Inicializar precios de venta a los de referencia
    for (const receta of RECETAS) {
      this._preciosVenta.set(receta.id, receta.precioReferencia);
    }
  }

  // ─── Getters públicos ───

  get capital(): number { return this._capital; }
  get capitalMaxHistorico(): number { return this._capitalMaxHistorico; }
  get dia(): number { return this._dia; }
  get fase(): FaseJornada { return this._fase; }
  get nivel(): number { return this._nivel; }
  get mejorasCompradas(): number { return this._mejorasCompradas; }
  get costoInsumosHoy(): number { return this._costoInsumosHoy; }
  get costoMejorasHoy(): number { return this._costoMejorasHoy; }
  get produccionUsadaHoy(): number { return this._produccionUsadaHoy; }
  get semillaPartida(): number { return this._semillaPartida; }

  /** Nombre del día de la semana actual */
  get nombreDia(): string {
    return NOMBRES_DIAS[(this._dia - 1) % 7];
  }

  /** Factor del día de la semana actual */
  get factorDia(): number {
    return FACTOR_DIA[(this._dia - 1) % 7];
  }

  /** Obtiene la cantidad de un insumo */
  obtenerInsumo(id: string): number {
    return this._inventarioInsumos.get(id) ?? 0;
  }

  /** Obtiene la cantidad de pizzas de un tipo */
  obtenerPizzas(id: string): number {
    return this._inventarioPizzas.get(id) ?? 0;
  }

  /** Obtiene la cantidad de empleados de un rol */
  obtenerEmpleados(rolId: string): number {
    return this._empleados.get(rolId) ?? 0;
  }

  /** Obtiene el precio de venta de una pizza */
  obtenerPrecioVenta(pizzaId: string): number {
    return this._preciosVenta.get(pizzaId) ?? 0;
  }

  /** Obtiene el total de unidades de insumos en bodega */
  obtenerTotalBodega(): number {
    let total = 0;
    for (const cant of this._inventarioInsumos.values()) {
      total += cant;
    }
    return total;
  }

  /** Obtiene la capacidad máxima de la bodega (incluye mejoras) */
  obtenerCapacidadBodega(): number {
    let cap = BODEGA_CAPACIDAD_INICIAL;
    if (consultarBit(this._mejorasCompradas, 1)) { // bodega_ampliada
      cap += MEJORA_EFECTOS.bodega_ampliada.bodegaExtra;
    }
    return cap;
  }

  /** Obtiene la capacidad de producción total (dueño + cocineros + mejoras) */
  obtenerCapacidadProduccion(): number {
    let cap = PRODUCCION_BASE_DUENO;
    cap += this.obtenerEmpleados('cocinero') * PRODUCCION_POR_COCINERO;
    if (consultarBit(this._mejorasCompradas, 0)) { // horno_mediano
      cap += MEJORA_EFECTOS.horno_mediano.produccionExtra;
    }
    if (consultarBit(this._mejorasCompradas, 4)) { // horno_industrial
      cap += MEJORA_EFECTOS.horno_industrial.produccionExtra;
    }
    return cap;
  }

  /** Obtiene la capacidad de atención total (dueño + cajeros + mejoras) */
  obtenerCapacidadAtencion(): number {
    let cap = ATENCION_BASE_DUENO;
    cap += this.obtenerEmpleados('cajero') * ATENCION_POR_CAJERO;
    if (consultarBit(this._mejorasCompradas, 3)) { // caja_moderna
      cap += MEJORA_EFECTOS.caja_moderna.atencionExtra;
    }
    return cap;
  }

  /** Obtiene el costo efectivo de un insumo (aplica descuentos de mejoras) */
  obtenerCostoInsumo(insumoId: string): number {
    const base = INSUMOS[insumoId as InsumoId]?.costo ?? 0;
    // Batidora industrial: -10% para masa, salsa y queso
    if (consultarBit(this._mejorasCompradas, 2)) { // batidora_industrial
      const afectados = MEJORA_EFECTOS.batidora_industrial.insumosAfectados as readonly string[];
      if (afectados.includes(insumoId)) {
        return Math.round(base * (1 - MEJORA_EFECTOS.batidora_industrial.descuentoInsumos) * 100) / 100;
      }
    }
    return base;
  }

  /** Consulta si una mejora está comprada */
  tieneMejora(bit: number): boolean {
    return consultarBit(this._mejorasCompradas, bit);
  }

  /** Obtiene el historial de transacciones */
  obtenerHistorial(): Transaccion[] {
    return this._historial.obtenerTodos();
  }

  /** Obtiene el registro acotado por día */
  obtenerHistorialDiario(): readonly RegistroDiario[] {
    return [...this._historialDiario];
  }

  /** Obtiene copia de inventarios (para lectura) */
  obtenerInventarioInsumos(): Map<string, number> {
    return new Map(this._inventarioInsumos);
  }

  obtenerInventarioPizzas(): Map<string, number> {
    return new Map(this._inventarioPizzas);
  }

  obtenerEmpleadosTodos(): Map<string, number> {
    return new Map(this._empleados);
  }

  obtenerPreciosVenta(): Map<string, number> {
    return new Map(this._preciosVenta);
  }

  // ─── Operaciones del negocio ───

  /**
   * Compra insumos.
   * Valida: saldo suficiente y espacio en bodega.
   * Operación atómica: descuenta dinero y agrega insumos en un solo paso.
   */
  comprarInsumo(insumoId: string, cantidad: number): ResultadoOperacion {
    if (this._fase !== 'preparar') {
      return { exito: false, mensaje: 'Solo puedes comprar insumos en la fase de preparación.' };
    }
    if (cantidad <= 0) {
      return { exito: false, mensaje: 'La cantidad debe ser mayor a 0.' };
    }
    if (!(insumoId in INSUMOS)) {
      return { exito: false, mensaje: `Insumo "${insumoId}" no existe.` };
    }

    const costoUnitario = this.obtenerCostoInsumo(insumoId);
    const costoTotal = costoUnitario * cantidad;

    if (costoTotal > this._capital) {
      return { exito: false, mensaje: `Saldo insuficiente. Necesitas Bs ${costoTotal} y tienes Bs ${this._capital}.` };
    }

    const espacioDisponible = this.obtenerCapacidadBodega() - this.obtenerTotalBodega();
    if (cantidad > espacioDisponible) {
      return { exito: false, mensaje: `Sin espacio en bodega. Espacio disponible: ${espacioDisponible} unidades.` };
    }

    // Operación atómica: descontar dinero y agregar insumos
    this._capital -= costoTotal;
    this._inventarioInsumos.set(insumoId, this.obtenerInsumo(insumoId) + cantidad);
    this._costoInsumosHoy += costoTotal;

    // Registrar en historial
    this._registrarTransaccion({
      tipo: 'compra_insumo',
      descripcion: `Compra: ${cantidad}× ${INSUMOS[insumoId as InsumoId].nombre} a Bs ${costoUnitario} c/u`,
      monto: -costoTotal,
      dia: this._dia,
      timestamp: Date.now(),
    });

    return { exito: true, mensaje: `Compraste ${cantidad}× ${INSUMOS[insumoId as InsumoId].nombre} por Bs ${costoTotal}.` };
  }

  /**
   * Produce pizzas.
   * Valida: insumos suficientes y capacidad de producción disponible.
   * Operación atómica: consume insumos y agrega pizzas en un solo paso.
   */
  producirPizza(pizzaId: string, cantidad: number): ResultadoOperacion {
    if (this._fase !== 'preparar') {
      return { exito: false, mensaje: 'Solo puedes producir pizzas en la fase de preparación.' };
    }
    if (cantidad <= 0) {
      return { exito: false, mensaje: 'La cantidad debe ser mayor a 0.' };
    }

    const receta = RECETAS.find(r => r.id === pizzaId);
    if (!receta) {
      return { exito: false, mensaje: `Pizza "${pizzaId}" no existe.` };
    }

    // Verificar capacidad de producción
    const capacidadRestante = this.obtenerCapacidadProduccion() - this._produccionUsadaHoy;
    if (cantidad > capacidadRestante) {
      return { exito: false, mensaje: `Capacidad de producción insuficiente. Puedes producir ${capacidadRestante} pizzas más hoy.` };
    }

    // Verificar insumos suficientes
    for (const [insumoId, cantidadNecesaria] of Object.entries(receta.insumos)) {
      const necesario = cantidadNecesaria * cantidad;
      const disponible = this.obtenerInsumo(insumoId);
      if (disponible < necesario) {
        return { exito: false, mensaje: `Insumos insuficientes: necesitas ${necesario}× ${INSUMOS[insumoId as InsumoId].nombre} y tienes ${disponible}.` };
      }
    }

    // Operación atómica: consumir insumos y agregar pizzas
    for (const [insumoId, cantidadNecesaria] of Object.entries(receta.insumos)) {
      const actual = this.obtenerInsumo(insumoId);
      this._inventarioInsumos.set(insumoId, actual - cantidadNecesaria * cantidad);
    }
    this._inventarioPizzas.set(pizzaId, this.obtenerPizzas(pizzaId) + cantidad);
    this._produccionUsadaHoy += cantidad;

    this._registrarTransaccion({
      tipo: 'produccion',
      descripcion: `Producción: ${cantidad}× ${receta.nombre}`,
      monto: 0,
      dia: this._dia,
      timestamp: Date.now(),
    });

    return { exito: true, mensaje: `Produjiste ${cantidad}× ${receta.nombre}.` };
  }

  /**
   * Fija el precio de venta de una pizza.
   * Valida: rango permitido.
   */
  fijarPrecio(pizzaId: string, precio: number): ResultadoOperacion {
    if (this._fase !== 'preparar') {
      return { exito: false, mensaje: 'Solo puedes fijar precios en la fase de preparación.' };
    }

    const receta = RECETAS.find(r => r.id === pizzaId);
    if (!receta) {
      return { exito: false, mensaje: `Pizza "${pizzaId}" no existe.` };
    }

    if (precio < PRECIO_VENTA_MIN || precio > PRECIO_VENTA_MAX) {
      return { exito: false, mensaje: `El precio debe estar entre Bs ${PRECIO_VENTA_MIN} y Bs ${PRECIO_VENTA_MAX}.` };
    }

    this._preciosVenta.set(pizzaId, precio);
    return { exito: true, mensaje: `Precio de ${receta.nombre} fijado a Bs ${precio}.` };
  }

  /**
   * Contrata un empleado.
   * Valida: máximo por nivel. Sueldo se paga al cierre.
   */
  contratarEmpleado(rolId: string): ResultadoOperacion {
    if (this._fase !== 'preparar') {
      return { exito: false, mensaje: 'Solo puedes contratar en la fase de preparación.' };
    }

    const tipo = TIPOS_EMPLEADO.find(t => t.id === rolId);
    if (!tipo) {
      return { exito: false, mensaje: `Rol "${rolId}" no existe.` };
    }

    const actual = this.obtenerEmpleados(rolId);
    if (actual >= this._nivel) {
      return { exito: false, mensaje: `Máximo de ${tipo.nombre}s alcanzado para nivel ${this._nivel} (máx: ${this._nivel}).` };
    }

    this._empleados.set(rolId, actual + 1);
    return { exito: true, mensaje: `Contrataste un ${tipo.nombre}. Total: ${actual + 1}.` };
  }

  /**
   * Despide un empleado.
   * Valida: que haya al menos uno contratado.
   */
  despedirEmpleado(rolId: string): ResultadoOperacion {
    if (this._fase !== 'preparar') {
      return { exito: false, mensaje: 'Solo puedes despedir en la fase de preparación.' };
    }

    const tipo = TIPOS_EMPLEADO.find(t => t.id === rolId);
    if (!tipo) {
      return { exito: false, mensaje: `Rol "${rolId}" no existe.` };
    }

    const actual = this.obtenerEmpleados(rolId);
    if (actual <= 0) {
      return { exito: false, mensaje: `No tienes ${tipo.nombre}s contratados.` };
    }

    this._empleados.set(rolId, actual - 1);
    return { exito: true, mensaje: `Despediste un ${tipo.nombre}. Total: ${actual - 1}.` };
  }

  /**
   * Compra una mejora.
   * Valida: nivel requerido, saldo suficiente, no estar ya comprada.
   * Operación atómica.
   */
  comprarMejora(mejoraId: string): ResultadoOperacion {
    if (this._fase !== 'preparar') {
      return { exito: false, mensaje: 'Solo puedes comprar mejoras en la fase de preparación.' };
    }

    const mejora = MEJORAS.find(m => m.id === mejoraId);
    if (!mejora) {
      return { exito: false, mensaje: `Mejora "${mejoraId}" no existe.` };
    }

    if (consultarBit(this._mejorasCompradas, mejora.bit)) {
      return { exito: false, mensaje: `Ya compraste "${mejora.nombre}".` };
    }

    if (this._nivel < mejora.nivelRequerido) {
      return { exito: false, mensaje: `Necesitas nivel ${mejora.nivelRequerido} para "${mejora.nombre}". Tu nivel: ${this._nivel}.` };
    }

    if (this._capital < mejora.costo) {
      return { exito: false, mensaje: `Saldo insuficiente. "${mejora.nombre}" cuesta Bs ${mejora.costo} y tienes Bs ${this._capital}.` };
    }

    // Operación atómica
    this._capital -= mejora.costo;
    this._mejorasCompradas = activarBit(this._mejorasCompradas, mejora.bit);
    this._costoMejorasHoy += mejora.costo;

    this._registrarTransaccion({
      tipo: 'compra_mejora',
      descripcion: `Mejora: ${mejora.nombre} (${mejora.descripcion})`,
      monto: -mejora.costo,
      dia: this._dia,
      timestamp: Date.now(),
    });

    return { exito: true, mensaje: `Compraste "${mejora.nombre}" por Bs ${mejora.costo}. ${mejora.descripcion}.` };
  }

  // ─── Simulación de jornada ───

  /**
   * Calcula el factor de precio para una pizza.
   * factorPrecio = clamp(1 - 1.5 * (precio / precioReferencia - 1), 0, 1.5)
   */
  calcularFactorPrecio(precio: number, precioReferencia: number): number {
    const factor = 1 - PRECIO_FACTOR_COEF * (precio / precioReferencia - 1);
    return Math.max(PRECIO_FACTOR_MIN, Math.min(PRECIO_FACTOR_MAX, factor));
  }

  /**
   * Calcula la demanda de una pizza para el día actual.
   * demanda = floor(clientesBase * factorDía * preferencia * factorPrecio)
   */
  calcularDemanda(pizzaId: string): number {
    const receta = RECETAS.find(r => r.id === pizzaId);
    if (!receta) return 0;

    const precio = this.obtenerPrecioVenta(pizzaId);
    const factorPrecio = this.calcularFactorPrecio(precio, receta.precioReferencia);
    const preferencia = PREFERENCIA_PIZZA[pizzaId] ?? 0;

    return Math.floor(CLIENTES_BASE_DIA * this.factorDia * preferencia * factorPrecio);
  }

  /**
   * Abre la pizzería: simula las ventas del día.
   * Cambia la fase a 'abrir' y luego a 'cerrar'.
   * Retorna el resumen de la jornada.
   */
  abrirPizzeria(): ResumenJornada | null {
    if (this._fase !== 'preparar') {
      return null;
    }

    this._fase = 'abrir';

    // ─── Simulación de ventas ───
    const capacidadAtencion = this.obtenerCapacidadAtencion();
    let clientesAtendidos = 0;
    const resultadosVentas: ResultadoVentaPizza[] = [];
    let ingresosTotal = 0;

    for (const receta of RECETAS) {
      const demanda = this.calcularDemanda(receta.id);
      const stock = this.obtenerPizzas(receta.id);
      const atencionRestante = Math.max(0, capacidadAtencion - clientesAtendidos);

      const vendidas = Math.min(demanda, stock, atencionRestante);
      const precio = this.obtenerPrecioVenta(receta.id);
      const ingreso = vendidas * precio;

      // Cálculo de pérdidas según REGLAS DEL NEGOCIO:
      // Si la demanda no se cubrió por stock o por falta de cajeros.
      // - Si hay clientes que querían comprar pero no había stock:
      let perdidaPorStock = 0;
      if (demanda > stock) {
        perdidaPorStock = demanda - stock;
      }

      // - Si había stock para atender pero no cupo en la capacidad de cajeros restante:
      let perdidaPorCajeros = 0;
      const clientesConStock = Math.min(demanda, stock);
      if (clientesConStock > atencionRestante) {
        perdidaPorCajeros = clientesConStock - atencionRestante;
      }

      resultadosVentas.push({
        pizzaId: receta.id,
        demanda,
        vendidas,
        ingreso,
        perdidaPorStock,
        perdidaPorCajeros,
      });

      // Actualizar inventario de pizzas
      this._inventarioPizzas.set(receta.id, stock - vendidas);
      clientesAtendidos += vendidas;
      ingresosTotal += ingreso;

      if (vendidas > 0) {
        this._registrarTransaccion({
          tipo: 'venta',
          descripcion: `Venta: ${vendidas}× ${receta.nombre} a Bs ${precio}`,
          monto: ingreso,
          dia: this._dia,
          timestamp: Date.now(),
        });
      }
    }

    // Registrar ingresos
    this._capital += ingresosTotal;

    // ─── Fase CERRAR: pagar sueldos ───
    this._fase = 'cerrar';

    let sueldosTotal = 0;
    for (const tipo of TIPOS_EMPLEADO) {
      const cantidad = this.obtenerEmpleados(tipo.id);
      const sueldo = cantidad * tipo.sueldoDiario;
      sueldosTotal += sueldo;

      if (sueldo > 0) {
        this._registrarTransaccion({
          tipo: 'sueldo',
          descripcion: `Sueldo: ${cantidad}× ${tipo.nombre} a Bs ${tipo.sueldoDiario}`,
          monto: -sueldo,
          dia: this._dia,
          timestamp: Date.now(),
        });
      }
    }

    this._capital -= sueldosTotal;

    // ─── Actualizar nivel ───
    if (this._capital > this._capitalMaxHistorico) {
      this._capitalMaxHistorico = this._capital;
    }
    this._actualizarNivel();

    // ─── Generar mensajes educativos ───
    const mensajes = this._generarMensajesEducativos(resultadosVentas);

    // ─── Calcular ganancia del día y guardar registro diario acotado ───
    const ganancia = ingresosTotal - this._costoInsumosHoy - sueldosTotal - this._costoMejorasHoy;

    this._historialDiario.push({
      dia: this._dia,
      capitalFinal: this._capital,
      ingresos: ingresosTotal,
      costos: this._costoInsumosHoy + this._costoMejorasHoy,
      sueldos: sueldosTotal,
    });
    if (this._historialDiario.length > HISTORIAL_DIARIO_MAX) {
      this._historialDiario.shift();
    }

    const resumen: ResumenJornada = {
      dia: this._dia,
      nombreDia: this.nombreDia,
      ingresos: ingresosTotal,
      costoInsumos: this._costoInsumosHoy,
      sueldos: sueldosTotal,
      costoMejoras: this._costoMejorasHoy,
      ganancia,
      capitalFinal: this._capital,
      ventas: resultadosVentas,
      mensajesEducativos: mensajes,
      quiebra: this._capital < 0,
    };

    return resumen;
  }

  /**
   * Avanza al siguiente día (desde fase 'cerrar' a 'preparar' del día siguiente).
   */
  avanzarDia(): void {
    if (this._fase !== 'cerrar') return;

    this._dia++;
    this._fase = 'preparar';
    this._costoInsumosHoy = 0;
    this._costoMejorasHoy = 0;
    this._produccionUsadaHoy = 0;
    this._semillaPartida = generarSemillaPartida();
  }

  /**
   * Verifica si el jugador ha ganado (nivel 5).
   */
  get victoria(): boolean {
    return this._nivel >= NIVEL_VICTORIA;
  }

  /**
   * Verifica si el jugador ha quebrado.
   */
  get quiebra(): boolean {
    return this._capital < 0 && this._fase === 'cerrar';
  }

  // ─── Serialización (guardado/carga) ───

  /**
   * Exporta el estado completo del juego como objeto serializable.
   */
  exportarEstado(): EstadoJuego {
    return {
      capital: this._capital,
      capitalMaxHistorico: this._capitalMaxHistorico,
      dia: this._dia,
      fase: this._fase,
      nivel: this._nivel,
      inventarioInsumos: Object.fromEntries(this._inventarioInsumos),
      inventarioPizzas: Object.fromEntries(this._inventarioPizzas),
      empleados: Object.fromEntries(this._empleados),
      mejorasCompradas: this._mejorasCompradas,
      preciosVenta: Object.fromEntries(this._preciosVenta),
      costoInsumosHoy: this._costoInsumosHoy,
      costoMejorasHoy: this._costoMejorasHoy,
      produccionUsadaHoy: this._produccionUsadaHoy,
      semillaPartida: this._semillaPartida,
      historialDiario: [...this._historialDiario],
      version: SAVE_VERSION,
    };
  }

  /**
   * Importa un estado previamente exportado.
   * Valida la versión (migrando desde v1/v2 si aplica) y la estructura antes de cargar.
   */
  importarEstado(estado: EstadoJuego): ResultadoOperacion {
    // Validar objeto
    if (!estado || typeof estado !== 'object') {
      return { exito: false, mensaje: 'El archivo de guardado está vacío o corrupto.' };
    }

    // Validar versión y migrar partidas v1/v2 → v3
    if (estado.version !== SAVE_VERSION && estado.version !== 1 && estado.version !== 2) {
      return { exito: false, mensaje: `Versión incompatible. Esperada: ${SAVE_VERSION}, recibida: ${estado.version}.` };
    }

    // Validar campos requeridos y tipos
    if (typeof estado.capital !== 'number' || isNaN(estado.capital) ||
        typeof estado.dia !== 'number' || isNaN(estado.dia) || estado.dia < 1 ||
        typeof estado.nivel !== 'number' || isNaN(estado.nivel) || estado.nivel < 1 ||
        typeof estado.mejorasCompradas !== 'number' || isNaN(estado.mejorasCompradas) ||
        !estado.inventarioInsumos || typeof estado.inventarioInsumos !== 'object' ||
        !estado.inventarioPizzas || typeof estado.inventarioPizzas !== 'object' ||
        !estado.empleados || typeof estado.empleados !== 'object' ||
        !estado.preciosVenta || typeof estado.preciosVenta !== 'object') {
      return { exito: false, mensaje: 'El archivo de guardado tiene una estructura o campos inválidos.' };
    }

    // Migración v1 → v2: asignar semilla si no existía
    const semilla = (typeof estado.semillaPartida === 'number' && !isNaN(estado.semillaPartida))
      ? estado.semillaPartida
      : generarSemillaPartida();

    // Cargar estado
    this._capital = estado.capital;
    this._capitalMaxHistorico = estado.capitalMaxHistorico;
    this._dia = estado.dia;
    this._fase = estado.fase;
    this._nivel = estado.nivel;
    this._mejorasCompradas = estado.mejorasCompradas;
    this._costoInsumosHoy = estado.costoInsumosHoy ?? 0;
    this._costoMejorasHoy = estado.costoMejorasHoy ?? 0;
    this._produccionUsadaHoy = estado.produccionUsadaHoy ?? 0;
    this._semillaPartida = semilla;
    this._historialDiario = Array.isArray(estado.historialDiario)
      ? estado.historialDiario.slice(-HISTORIAL_DIARIO_MAX)
      : [];

    // Restaurar Maps desde objetos planos
    this._inventarioInsumos = new Map(Object.entries(estado.inventarioInsumos));
    this._inventarioPizzas = new Map(Object.entries(estado.inventarioPizzas));
    this._empleados = new Map(Object.entries(estado.empleados));
    this._preciosVenta = new Map(Object.entries(estado.preciosVenta));

    // Limpiar historial (no se guarda)
    this._historial.limpiar();

    return { exito: true, mensaje: 'Partida importada correctamente.' };
  }

  /**
   * Reinicia el juego a su estado inicial.
   */
  reiniciar(): void {
    this._capital = CAPITAL_INICIAL;
    this._capitalMaxHistorico = CAPITAL_INICIAL;
    this._dia = 1;
    this._fase = 'preparar';
    this._nivel = 1;
    this._mejorasCompradas = 0;
    this._costoInsumosHoy = 0;
    this._costoMejorasHoy = 0;
    this._produccionUsadaHoy = 0;
    this._semillaPartida = generarSemillaPartida();

    this._inventarioInsumos.clear();
    this._inventarioPizzas.clear();
    this._empleados.clear();
    this._preciosVenta.clear();
    this._historial.limpiar();
    this._historialDiario = [];

    for (const id of INSUMO_IDS) {
      this._inventarioInsumos.set(id, 0);
    }
    for (const id of PIZZA_IDS) {
      this._inventarioPizzas.set(id, 0);
    }
    for (const tipo of TIPOS_EMPLEADO) {
      this._empleados.set(tipo.id, 0);
    }
    for (const receta of RECETAS) {
      this._preciosVenta.set(receta.id, receta.precioReferencia);
    }
  }

  // ─── Métodos privados ───

  /** Registra una transacción en el historial (buffer circular, O(1)) */
  private _registrarTransaccion(transaccion: Transaccion): void {
    this._historial.insertar(transaccion);
  }

  /** Actualiza el nivel basado en el capital máximo histórico */
  private _actualizarNivel(): void {
    for (let i = NIVELES.length - 1; i >= 0; i--) {
      if (this._capitalMaxHistorico >= NIVELES[i].capitalRequerido) {
        this._nivel = NIVELES[i].nivel;
        return;
      }
    }
  }

  /**
   * Genera máximo 3 mensajes causales concretos ordenados por mayor impacto en Bs.
   */
  private _generarMensajesEducativos(ventas: ResultadoVentaPizza[]): string[] {
    interface CandidatoMensaje {
      texto: string;
      impactoBs: number;
    }

    const candidatos: CandidatoMensaje[] = [];

    for (const venta of ventas) {
      const receta = RECETAS.find(r => r.id === venta.pizzaId);
      if (!receta) continue;

      const precio = this.obtenerPrecioVenta(venta.pizzaId);
      const factorPrecio = this.calcularFactorPrecio(precio, receta.precioReferencia);

      // Pérdida por falta de stock (impacto = clientes perdidos * precio)
      if (venta.perdidaPorStock > 0) {
        const impactoBs = venta.perdidaPorStock * precio;
        candidatos.push({
          texto: `Perdiste ${venta.perdidaPorStock} cliente(s) de ${receta.nombre} por falta de stock (−Bs ${impactoBs} potenciales).`,
          impactoBs,
        });
      }

      // Pérdida por falta de cajeros (impacto = clientes perdidos * precio)
      if (venta.perdidaPorCajeros > 0) {
        const impactoBs = venta.perdidaPorCajeros * precio;
        candidatos.push({
          texto: `Perdiste ${venta.perdidaPorCajeros} cliente(s) de ${receta.nombre} por falta de cajeros (−Bs ${impactoBs} potenciales).`,
          impactoBs,
        });
      }

      // Precio alto reduciendo la demanda
      if (factorPrecio < 0.8) {
        const reduccion = Math.round((1 - factorPrecio) * 100);
        const preferencia = PREFERENCIA_PIZZA[venta.pizzaId] ?? 0;
        const demandaBase = Math.floor(CLIENTES_BASE_DIA * this.factorDia * preferencia);
        const perdidosPrecio = Math.max(0, demandaBase - venta.demanda);
        const impactoBs = perdidosPrecio * receta.precioReferencia;
        candidatos.push({
          texto: `Tu precio de ${receta.nombre} (Bs ${precio}) redujo la demanda un ${reduccion}% (−Bs ${impactoBs} potenciales).`,
          impactoBs,
        });
      }

      // Precio bajo atrayendo demanda
      if (factorPrecio > 1.2 && venta.vendidas > 0) {
        const impactoBs = Math.round(venta.vendidas * Math.max(0, receta.precioReferencia - precio));
        candidatos.push({
          texto: `El precio bajo de ${receta.nombre} (Bs ${precio}) atrae muchos clientes. ¿Podrías ganar más subiendo el precio?`,
          impactoBs,
        });
      }
    }

    // Alertas críticas con máxima prioridad
    if (this._capital < 0) {
      candidatos.push({
        texto: '⚠️ ¡Tu capital es negativo! No pudiste cubrir los costos y la pizzería quebró.',
        impactoBs: 1_000_000,
      });
    } else if (this._capital < 300) {
      candidatos.push({
        texto: '⚠️ Alerta de liquidez: Tu capital es bajo. Evita contratar personal adicional hasta consolidar ventas.',
        impactoBs: 500_000,
      });
    }

    if (this.victoria) {
      candidatos.push({
        texto: '🏆 ¡FELICITACIONES! Has alcanzado el Nivel 5 (Bs 25.000) y completado exitosamente la simulación.',
        impactoBs: 1_000_000,
      });
    }

    const ventasTotales = ventas.reduce((sum, v) => sum + v.vendidas, 0);
    if (ventasTotales === 0) {
      candidatos.push({
        texto: 'No vendiste ninguna pizza hoy. Asegúrate de adquirir insumos en la Bodega y producirlas en el Horno antes de abrir.',
        impactoBs: 400_000,
      });
    }

    candidatos.sort((a, b) => b.impactoBs - a.impactoBs);
    return candidatos.slice(0, 3).map(c => c.texto);
  }
}

