import Phaser from 'phaser';
import type { TipoEstacion } from '../ui/gestor-paneles';
import type { EventoCliente } from '../core/tipos';
import { ColaFIFO } from '../core/cola-fifo';
import { ControladorReproduccion } from '../core/controlador-reproduccion';
import {
  ANCHO_JUEGO,
  ALTO_JUEGO,
  PLANO_LOCAL,
  PUERTA_ENTRADA,
  ESTACIONES_CONFIG,
  ZONA_MESAS,
  POSICIONES_INTERIOR,
  COLORES_ESCENA,
  COLORES_PIZZA_CLIENTE,
  RUTAS_CLIENTES,
  type ConfigEstacion,
} from '../config/escena-config';

export interface DatosEscenaPrincipal {
  alSeleccionarEstacion: (estacion: TipoEstacion) => void;
}

interface ClienteVisual {
  contenedor: Phaser.GameObjects.Container;
  evento: EventoCliente;
  estado: 'entrando' | 'en_fila' | 'atendiendo' | 'saliendo';
  objetivoX: number;
  objetivoY: number;
  waypointIdx: number;
  waypoints: Array<{ x: number; y: number }>;
  puestoIdx: number;
  tiempoRestanteAtencion: number;
}

export class EscenaPrincipal extends Phaser.Scene {
  private alSeleccionarEstacion!: (estacion: TipoEstacion) => void;

  // Estado de reproducción del día (Fase 9)
  private controlador: ControladorReproduccion | null = null;
  private alTickReproduccion: (() => void) | null = null;
  private alTerminarReproduccion: (() => void) | null = null;
  private colaMostrador = new ColaFIFO<ClienteVisual>();
  private clientesActivos: ClienteVisual[] = [];
  private puestosOcupados: Array<ClienteVisual | null> = [];
  private capaClientes!: Phaser.GameObjects.Layer;

  constructor() {
    super({ key: 'EscenaPrincipal' });
  }

  init(datos: DatosEscenaPrincipal): void {
    this.alSeleccionarEstacion = datos.alSeleccionarEstacion;
  }

  create(): void {
    // 1. Fondo exterior y pisos de cada ambiente
    this.dibujarExteriorYPisos();

    // 2. Paredes perimetrales, tabiques interiores y puerta principal
    this.dibujarParedesYPuerta();

    // 3. Mobiliario cenital (estantes, cocina/horno, mostrador/caja, mesas, oficina)
    this.dibujarBodega();
    this.dibujarCocinaYHorno();
    this.dibujarMostrador();
    this.dibujarZonaMesas();
    this.dibujarOficina();

    // 4. Zonas clicables con resaltado hover para las 4 estaciones
    for (const cfg of Object.values(ESTACIONES_CONFIG)) {
      this.crearZonaInteractivaEstacion(cfg);
    }

    // 5. Capa para clientes animados durante la reproducción
    this.capaClientes = this.add.layer();
  }

  /** Inicia la reproducción visual de la jornada en la escena */
  iniciarReproduccion(
    controlador: ControladorReproduccion,
    numCajeros: number,
    alTick: () => void,
    alTerminar: () => void
  ): void {
    this.limpiarReproduccion();
    this.controlador = controlador;
    this.alTickReproduccion = alTick;
    this.alTerminarReproduccion = alTerminar;

    const totalPuestos = Math.min(
      RUTAS_CLIENTES.puestosMostrador.length,
      1 + Math.max(0, numCajeros)
    );
    this.puestosOcupados = new Array(totalPuestos).fill(null);
  }

  /** Detiene y limpia todos los clientes visuales (ej. al pulsar Saltar día) */
  limpiarReproduccion(): void {
    for (const cliente of this.clientesActivos) {
      cliente.contenedor.destroy();
    }
    this.clientesActivos = [];
    this.colaMostrador.limpiar();
    this.puestosOcupados = [];
    this.controlador = null;
    this.alTickReproduccion = null;
    this.alTerminarReproduccion = null;
  }

  override update(_time: number, delta: number): void {
    if (!this.controlador) return;

    const deltaSeg = delta / 1000;
    const nuevosEventos = this.controlador.avanzar(deltaSeg);

    for (const ev of nuevosEventos) {
      this.spawnearCliente(ev);
    }

    if (!this.controlador.pausado) {
      this.actualizarClientes(deltaSeg * this.controlador.velocidad);
    }

    this.alTickReproduccion?.();

    if (this.controlador.terminado) {
      const callbackFin = this.alTerminarReproduccion;
      this.limpiarReproduccion();
      callbackFin?.();
    }
  }

  private spawnearCliente(evento: EventoCliente): void {
    const colorPizza = COLORES_PIZZA_CLIENTE[evento.pizzaId] ?? 0xffffff;
    const contenedor = this.add.container(
      RUTAS_CLIENTES.entradaExterior.x,
      RUTAS_CLIENTES.entradaExterior.y
    );

    const cuerpo = this.add.circle(0, 0, 10, colorPizza, 1);
    cuerpo.setStrokeStyle(2, 0xffffff, 0.9);
    contenedor.add(cuerpo);
    this.capaClientes.add(contenedor);

    const cliente: ClienteVisual = {
      contenedor,
      evento,
      estado: 'entrando',
      objetivoX: RUTAS_CLIENTES.entradaInterior.x,
      objetivoY: RUTAS_CLIENTES.entradaInterior.y,
      waypointIdx: 0,
      waypoints: [
        RUTAS_CLIENTES.entradaInterior,
        RUTAS_CLIENTES.pasilloEspera,
      ],
      puestoIdx: -1,
      tiempoRestanteAtencion: 0,
    };

    this.clientesActivos.push(cliente);
  }

  private actualizarClientes(deltaEscalado: number): void {
    const velocidadPx = 150; // px/seg a x1
    const paso = velocidadPx * deltaEscalado;

    // 1. Mover clientes
    for (const cliente of this.clientesActivos) {
      if (cliente.estado === 'atendiendo') {
        cliente.tiempoRestanteAtencion -= deltaEscalado;
        if (cliente.tiempoRestanteAtencion <= 0) {
          this.finalizarAtencionCliente(cliente);
        }
        continue;
      }

      const dx = cliente.objetivoX - cliente.contenedor.x;
      const dy = cliente.objetivoY - cliente.contenedor.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= paso || dist < 1) {
        cliente.contenedor.setPosition(cliente.objetivoX, cliente.objetivoY);
        this.alLlegarADestino(cliente);
      } else {
        cliente.contenedor.x += (dx / dist) * paso;
        cliente.contenedor.y += (dy / dist) * paso;
      }
    }

    // 2. Asignar frente de la ColaFIFO a puestos libres del mostrador
    for (let i = 0; i < this.puestosOcupados.length; i++) {
      if (this.puestosOcupados[i] === null && !this.colaMostrador.estaVacia()) {
        const siguiente = this.colaMostrador.desencolar()!;
        this.puestosOcupados[i] = siguiente;
        siguiente.estado = 'atendiendo';
        siguiente.puestoIdx = i;
        const puesto = RUTAS_CLIENTES.puestosMostrador[i];
        siguiente.contenedor.setPosition(puesto.x, puesto.y);
        siguiente.tiempoRestanteAtencion = 0.45;
      }
    }

    // 3. Reacomodar posiciones visuales de quienes esperan en la ColaFIFO
    const enFila = this.colaMostrador.obtenerTodos();
    enFila.forEach((c, idx) => {
      const posVisible = Math.min(idx, RUTAS_CLIENTES.filaMaxVisible - 1);
      c.objetivoX = RUTAS_CLIENTES.filaInicio.x;
      c.objetivoY = RUTAS_CLIENTES.filaInicio.y + posVisible * RUTAS_CLIENTES.filaEspaciadoY;
    });

    // 4. Eliminar clientes que ya salieron del local
    this.clientesActivos = this.clientesActivos.filter((c) => {
      if (c.estado === 'saliendo' && c.waypointIdx >= c.waypoints.length) {
        c.contenedor.destroy();
        return false;
      }
      return true;
    });
  }

  private alLlegarADestino(cliente: ClienteVisual): void {
    if (cliente.estado === 'entrando') {
      cliente.waypointIdx++;
      if (cliente.waypointIdx < cliente.waypoints.length) {
        const sig = cliente.waypoints[cliente.waypointIdx];
        cliente.objetivoX = sig.x;
        cliente.objetivoY = sig.y;
      } else {
        // Llegó al mostrador: entra a la ColaFIFO real
        cliente.estado = 'en_fila';
        this.colaMostrador.encolar(cliente);
      }
    } else if (cliente.estado === 'saliendo') {
      cliente.waypointIdx++;
      if (cliente.waypointIdx < cliente.waypoints.length) {
        const sig = cliente.waypoints[cliente.waypointIdx];
        cliente.objetivoX = sig.x;
        cliente.objetivoY = sig.y;
      }
    }
  }

  private finalizarAtencionCliente(cliente: ClienteVisual): void {
    if (cliente.puestoIdx >= 0 && cliente.puestoIdx < this.puestosOcupados.length) {
      this.puestosOcupados[cliente.puestoIdx] = null;
    }

    // Indicador visual del resultado (atendido o causa de pérdida)
    let textoEtiqueta = '🍕';
    let colorTexto = '#2ecc71';
    if (cliente.evento.resultado === 'sin_stock') {
      textoEtiqueta = '❌ Sin stock';
      colorTexto = '#ff6b6b';
    } else if (cliente.evento.resultado === 'sin_cajeros') {
      textoEtiqueta = '⏳ Sin cajeros';
      colorTexto = '#feca57';
    }

    const aviso = this.add.text(0, -18, textoEtiqueta, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: colorTexto,
      backgroundColor: 'rgba(15,18,32,0.75)',
      padding: { x: 4, y: 1 },
    }).setOrigin(0.5);
    cliente.contenedor.add(aviso);

    cliente.estado = 'saliendo';
    cliente.waypointIdx = 0;
    cliente.waypoints = [
      RUTAS_CLIENTES.salidaInterior,
      RUTAS_CLIENTES.salidaExterior,
    ];
    cliente.objetivoX = cliente.waypoints[0].x;
    cliente.objetivoY = cliente.waypoints[0].y;
  }

  /** Dibuja el fondo exterior y los pisos diferenciados de cada zona */
  private dibujarExteriorYPisos(): void {
    const gfx = this.add.graphics();

    // Fondo exterior
    gfx.fillStyle(COLORES_ESCENA.exterior, 1);
    gfx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO);

    // Piso general del salón de comidas
    gfx.fillStyle(COLORES_ESCENA.pisoSalon, 1);
    gfx.fillRect(PLANO_LOCAL.x, PLANO_LOCAL.y, PLANO_LOCAL.ancho, PLANO_LOCAL.alto);

    // Patrón sutil de baldosas en el salón
    const tamBaldosa = 38;
    gfx.fillStyle(COLORES_ESCENA.pisoSalonBaldosa, 0.55);
    for (let x = PLANO_LOCAL.x; x < PLANO_LOCAL.x + PLANO_LOCAL.ancho; x += tamBaldosa) {
      for (let y = PLANO_LOCAL.y; y < PLANO_LOCAL.y + PLANO_LOCAL.alto; y += tamBaldosa) {
        const ix = Math.floor((x - PLANO_LOCAL.x) / tamBaldosa);
        const iy = Math.floor((y - PLANO_LOCAL.y) / tamBaldosa);
        if ((ix + iy) % 2 === 0) {
          const w = Math.min(tamBaldosa, PLANO_LOCAL.x + PLANO_LOCAL.ancho - x);
          const h = Math.min(tamBaldosa, PLANO_LOCAL.y + PLANO_LOCAL.alto - y);
          gfx.fillRect(x, y, w, h);
        }
      }
    }

    // Piso Bodega
    const bod = ESTACIONES_CONFIG.bodega;
    gfx.fillStyle(COLORES_ESCENA.pisoBodega, 1);
    gfx.fillRect(bod.x, bod.y, bod.ancho, bod.alto);

    // Piso Cocina & Horno
    const hor = ESTACIONES_CONFIG.horno;
    gfx.fillStyle(COLORES_ESCENA.pisoCocina, 1);
    gfx.fillRect(hor.x, hor.y, hor.ancho, hor.alto);

    // Piso Oficina
    const ofi = ESTACIONES_CONFIG.oficina;
    gfx.fillStyle(COLORES_ESCENA.pisoOficina, 1);
    gfx.fillRect(ofi.x, ofi.y, ofi.ancho, ofi.alto);
  }

  /** Dibuja las paredes exteriores, divisiones internas con pasos y puerta de entrada */
  private dibujarParedesYPuerta(): void {
    const gfx = this.add.graphics();
    const { x, y, ancho, alto, grosorPared } = PLANO_LOCAL;

    // Paredes exteriores (excepto abertura de la puerta abajo)
    gfx.lineStyle(grosorPared, COLORES_ESCENA.paredBorde, 1);

    // Pared superior
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + ancho, y);
    // Pared derecha
    gfx.lineTo(x + ancho, y + alto);
    // Pared inferior derecha hasta puerta
    gfx.lineTo(PUERTA_ENTRADA.x + PUERTA_ENTRADA.ancho / 2, y + alto);
    gfx.strokePath();

    // Pared izquierda y tramo inferior izquierdo hasta puerta
    gfx.beginPath();
    gfx.moveTo(PUERTA_ENTRADA.x - PUERTA_ENTRADA.ancho / 2, y + alto);
    gfx.lineTo(x, y + alto);
    gfx.lineTo(x, y);
    gfx.strokePath();

    // Tapete y marco de puerta principal
    gfx.fillStyle(COLORES_ESCENA.puerta, 0.25);
    gfx.fillRect(
      PUERTA_ENTRADA.x - PUERTA_ENTRADA.ancho / 2,
      PUERTA_ENTRADA.y - 12,
      PUERTA_ENTRADA.ancho,
      14
    );
    gfx.lineStyle(3, COLORES_ESCENA.puerta, 1);
    gfx.strokeRect(
      PUERTA_ENTRADA.x - PUERTA_ENTRADA.ancho / 2,
      PUERTA_ENTRADA.y - 4,
      PUERTA_ENTRADA.ancho,
      8
    );

    this.add.text(PUERTA_ENTRADA.x, PUERTA_ENTRADA.y - 18, '▲ ENTRADA', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f7b731',
    }).setOrigin(0.5);

    // Tabiques internos (con vanos/pasillos abiertos)
    const bod = ESTACIONES_CONFIG.bodega;
    const hor = ESTACIONES_CONFIG.horno;
    const ofi = ESTACIONES_CONFIG.oficina;

    gfx.lineStyle(5, COLORES_ESCENA.pared, 1);
    gfx.beginPath();
    // División vertical Bodega / Cocina (con paso abierto abajo)
    gfx.moveTo(bod.x + bod.ancho, bod.y);
    gfx.lineTo(bod.x + bod.ancho, bod.y + 150);

    // Pared inferior Bodega (con paso hacia salón)
    gfx.moveTo(bod.x, bod.y + bod.alto);
    gfx.lineTo(bod.x + 250, bod.y + bod.alto);

    // Pared inferior Cocina (con paso detrás del mostrador)
    gfx.moveTo(hor.x + 120, hor.y + hor.alto);
    gfx.lineTo(hor.x + hor.ancho, hor.y + hor.alto);

    // Paredes Oficina (arriba e izquierda con puerta)
    gfx.moveTo(ofi.x + 70, ofi.y);
    gfx.lineTo(ofi.x + ofi.ancho, ofi.y);
    gfx.moveTo(ofi.x, ofi.y + 70);
    gfx.lineTo(ofi.x, ofi.y + ofi.alto);
    gfx.strokePath();
  }

  /** Dibuja los estantes y cajas de insumos dentro de la Bodega */
  private dibujarBodega(): void {
    const gfx = this.add.graphics();
    const coloresCajas = [0xf5cd79, 0xe15f41, 0xf7d794, 0x786fa6, 0x63cdda, 0xf8a5c2];

    POSICIONES_INTERIOR.estantesBodega.forEach((est, idx) => {
      gfx.fillStyle(COLORES_ESCENA.estante, 1);
      gfx.fillRoundedRect(est.x, est.y, est.ancho, est.alto, 4);
      gfx.lineStyle(2, COLORES_ESCENA.estanteBorde, 1);
      gfx.strokeRoundedRect(est.x, est.y, est.ancho, est.alto, 4);

      // Cajas/insumos sobre cada estante
      for (let i = 0; i < 4; i++) {
        gfx.fillStyle(coloresCajas[(idx * 2 + i) % coloresCajas.length], 0.9);
        gfx.fillRect(est.x + 8 + i * 30, est.y + 6, 22, 18);
      }
    });

    // Etiqueta de zona
    const bod = ESTACIONES_CONFIG.bodega;
    this.crearEtiquetaZona(bod.x + 275, bod.y + 32, bod.titulo, bod.subtitulo, '#f39c12');
  }

  /** Dibuja el mesón de preparación y el horno de pizza visto desde arriba */
  private dibujarCocinaYHorno(): void {
    const gfx = this.add.graphics();
    const { mesonCocina, hornoBase } = POSICIONES_INTERIOR;

    // Mesón de preparación de acero inoxidable
    gfx.fillStyle(COLORES_ESCENA.meson, 1);
    gfx.fillRoundedRect(mesonCocina.x, mesonCocina.y, mesonCocina.ancho, mesonCocina.alto, 6);
    gfx.lineStyle(2, COLORES_ESCENA.mesonBorde, 1);
    gfx.strokeRoundedRect(mesonCocina.x, mesonCocina.y, mesonCocina.ancho, mesonCocina.alto, 6);

    // Pizzas en preparación / tablas sobre el mesón
    gfx.fillStyle(0xd4a373, 1);
    gfx.fillCircle(mesonCocina.x + 55, mesonCocina.y + 23, 14);
    gfx.fillCircle(mesonCocina.x + 125, mesonCocina.y + 23, 14);
    gfx.fillStyle(0xe74c3c, 0.85);
    gfx.fillCircle(mesonCocina.x + 125, mesonCocina.y + 23, 10);

    // Horno de ladrillo base (vista cenital circular)
    gfx.fillStyle(COLORES_ESCENA.hornoPiedra, 1);
    gfx.fillCircle(hornoBase.x, hornoBase.y, hornoBase.radio);
    gfx.lineStyle(4, 0x4a2318, 1);
    gfx.strokeCircle(hornoBase.x, hornoBase.y, hornoBase.radio);

    // Boca/fuego del horno
    gfx.fillStyle(COLORES_ESCENA.hornoFuego, 0.9);
    gfx.fillCircle(hornoBase.x - 16, hornoBase.y, 16);
    gfx.fillStyle(0xfeca57, 0.9);
    gfx.fillCircle(hornoBase.x - 18, hornoBase.y, 8);

    const hor = ESTACIONES_CONFIG.horno;
    this.crearEtiquetaZona(hor.x + 200, hor.y + 205, hor.titulo, hor.subtitulo, '#ff6b6b');
  }

  /** Dibuja el mostrador de atención, vitrina y caja registradora */
  private dibujarMostrador(): void {
    const gfx = this.add.graphics();
    const mos = ESTACIONES_CONFIG.mostrador;

    // Barra principal del mostrador
    gfx.fillStyle(COLORES_ESCENA.mostradorMadera, 1);
    gfx.fillRoundedRect(mos.x, mos.y, mos.ancho, 42, 6);
    gfx.fillStyle(COLORES_ESCENA.mostradorTope, 1);
    gfx.fillRoundedRect(mos.x + 4, mos.y + 4, mos.ancho - 8, 34, 4);

    // Caja registradora
    const caja = POSICIONES_INTERIOR.cajaRegistradora;
    gfx.fillStyle(COLORES_ESCENA.caja, 1);
    gfx.fillRoundedRect(caja.x, caja.y - 20, caja.ancho, caja.alto, 4);
    gfx.fillStyle(0x2ecc71, 0.9);
    gfx.fillRect(caja.x + 8, caja.y - 14, 28, 10);

    // Vitrina de pizzas en el mostrador
    gfx.fillStyle(0xdfe6e9, 0.3);
    gfx.fillRoundedRect(mos.x + 200, mos.y + 6, 110, 30, 4);
    gfx.fillStyle(0xf1c40f, 0.9);
    gfx.fillCircle(mos.x + 225, mos.y + 21, 9);
    gfx.fillStyle(0xe74c3c, 0.9);
    gfx.fillCircle(mos.x + 255, mos.y + 21, 9);
    gfx.fillStyle(0x2ecc71, 0.9);
    gfx.fillCircle(mos.x + 285, mos.y + 21, 9);

    this.crearEtiquetaZona(mos.x + mos.ancho / 2, mos.y + 66, mos.titulo, mos.subtitulo, '#2ecc71');
  }

  /** Dibuja las mesas y sillas del comedor */
  private dibujarZonaMesas(): void {
    const gfx = this.add.graphics();

    for (const m of ZONA_MESAS.mesas) {
      // 4 sillas alrededor
      const dist = m.radio + 9;
      const offsets = [
        [0, -dist],
        [0, dist],
        [-dist, 0],
        [dist, 0],
      ];
      gfx.fillStyle(COLORES_ESCENA.silla, 1);
      for (const [ox, oy] of offsets) {
        gfx.fillCircle(m.x + ox, m.y + oy, 7);
      }

      // Mesa redonda
      gfx.fillStyle(COLORES_ESCENA.mesa, 1);
      gfx.fillCircle(m.x, m.y, m.radio);
      gfx.lineStyle(2, 0x6f4e37, 1);
      gfx.strokeCircle(m.x, m.y, m.radio);
    }

    this.add.text(95, 448, '🍽️ COMEDOR', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#a4b0be',
    }).setOrigin(0.5);
  }

  /** Dibuja el mobiliario de la Oficina */
  private dibujarOficina(): void {
    const gfx = this.add.graphics();
    const esc = POSICIONES_INTERIOR.escritorioOficina;

    // Escritorio
    gfx.fillStyle(COLORES_ESCENA.escritorio, 1);
    gfx.fillRoundedRect(esc.x, esc.y, esc.ancho, esc.alto, 6);
    gfx.lineStyle(2, 0x4a3525, 1);
    gfx.strokeRoundedRect(esc.x, esc.y, esc.ancho, esc.alto, 6);

    // Monitor y papeles sobre escritorio
    gfx.fillStyle(0x1e272e, 1);
    gfx.fillRect(esc.x + 42, esc.y + 10, 46, 12);
    gfx.fillStyle(0x3498db, 0.8);
    gfx.fillRect(esc.x + 45, esc.y + 12, 40, 4);
    gfx.fillStyle(0xecf0f1, 0.9);
    gfx.fillRect(esc.x + 15, esc.y + 18, 18, 24);

    // Silla de oficina
    gfx.fillStyle(0x2c3e50, 1);
    gfx.fillCircle(esc.x + esc.ancho / 2, esc.y + esc.alto + 18, 14);

    // Archivador
    const ofi = ESTACIONES_CONFIG.oficina;
    gfx.fillStyle(0x576574, 1);
    gfx.fillRect(ofi.x + 225, ofi.y + 20, 44, 38);

    this.crearEtiquetaZona(ofi.x + ofi.ancho / 2, ofi.y + 210, ofi.titulo, ofi.subtitulo, '#54a0ff');
  }

  /** Helper para dibujar etiqueta legible en cada zona */
  private crearEtiquetaZona(
    cx: number,
    cy: number,
    titulo: string,
    subtitulo: string,
    colorTitulo: string
  ): void {
    this.add.text(cx, cy - 7, titulo, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: colorTitulo,
      backgroundColor: 'rgba(15, 18, 32, 0.78)',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5);

    this.add.text(cx, cy + 13, subtitulo, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#dfe4ea',
    }).setOrigin(0.5);
  }

  /** Crea la zona interactiva clicable y el borde hover de una estación */
  private crearZonaInteractivaEstacion(cfg: ConfigEstacion): void {
    const bordeHover = this.add.graphics();
    bordeHover.lineStyle(3, cfg.colorAcento, 0.95);
    bordeHover.strokeRoundedRect(cfg.x + 2, cfg.y + 2, cfg.ancho - 4, cfg.alto - 4, 8);
    bordeHover.fillStyle(cfg.colorAcento, 0.08);
    bordeHover.fillRoundedRect(cfg.x + 2, cfg.y + 2, cfg.ancho - 4, cfg.alto - 4, 8);
    bordeHover.setAlpha(0);

    const zona = this.add.zone(cfg.x + cfg.ancho / 2, cfg.y + cfg.alto / 2, cfg.ancho, cfg.alto);
    zona.setInteractive({ useHandCursor: true });

    zona.on('pointerover', () => {
      this.tweens.add({
        targets: bordeHover,
        alpha: 1,
        duration: 120,
      });
    });

    zona.on('pointerout', () => {
      this.tweens.add({
        targets: bordeHover,
        alpha: 0,
        duration: 120,
      });
    });

    zona.on('pointerdown', () => {
      this.alSeleccionarEstacion(cfg.id);
    });
  }
}
