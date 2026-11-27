import Phaser from 'phaser';
import type { TipoEstacion } from '../ui/gestor-paneles';
import type { EventoCliente } from '../core/tipos';
import { ColaFIFO } from '../core/cola-fifo';
import { ControladorReproduccion } from '../core/controlador-reproduccion';
import { consultarBit } from '../core/mascara-bits';
import { MEJORAS } from '../config/game-config';
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
  COLORES_PERSONAL,
  RUTAS_CLIENTES,
  type ConfigEstacion,
} from '../config/escena-config';

export interface DatosEscenaPrincipal {
  alSeleccionarEstacion: (estacion: TipoEstacion) => void;
}

export interface EstadoVisualNucleo {
  mejorasCompradas: number;
  cocineros: number;
  cajeros: number;
  nivel: number;
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

  // Capa dinámica de mejoras y personal (Fase 10)
  private capaMejoras!: Phaser.GameObjects.Container;
  private capaPersonal!: Phaser.GameObjects.Container;
  private ultimoEstadoVisual: EstadoVisualNucleo | null = null;

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

    // 3. Mobiliario cenital base (estantes, cocina, mostrador, mesas, oficina)
    this.dibujarBodega();
    this.dibujarCocinaYHorno();
    this.dibujarMostrador();
    this.dibujarZonaMesas();
    this.dibujarOficina();

    // 3b. Capas dinámicas leídas desde el núcleo (mejoras y personal)
    this.capaMejoras = this.add.container(0, 0);
    this.capaPersonal = this.add.container(0, 0);

    // 4. Zonas clicables con resaltado hover para las 4 estaciones
    for (const cfg of Object.values(ESTACIONES_CONFIG)) {
      this.crearZonaInteractivaEstacion(cfg);
    }

    // 5. Capa para clientes animados durante la reproducción
    this.capaClientes = this.add.layer();
  }

  /**
   * Sincroniza las mejoras y el personal visibles con el estado del núcleo.
   * Todo se dibuja a partir del estado del núcleo, nunca al revés.
   */
  sincronizarConNucleo(estado: EstadoVisualNucleo, animar = true): void {
    if (!this.capaMejoras || !this.capaPersonal) return;

    const previo = this.ultimoEstadoVisual;
    this.ultimoEstadoVisual = { ...estado };

    // Limpiar y redibujar mejoras según la máscara de bits
    this.capaMejoras.removeAll(true);
    this.dibujarMejorasDesdeMascara(estado.mejorasCompradas, previo, animar);

    // Limpiar y redibujar personal según cantidades en el núcleo
    this.capaPersonal.removeAll(true);
    this.dibujarPersonalDesdeNucleo(estado.cocineros, estado.cajeros, previo, animar);

    // Aviso de subida de nivel
    if (animar && previo && estado.nivel > previo.nivel) {
      this.mostrarAvisoNivel(estado.nivel);
    }
  }

  private dibujarMejorasDesdeMascara(
    mascara: number,
    previo: EstadoVisualNucleo | null,
    animar: boolean
  ): void {
    const recienComprada = (bit: number) =>
      animar && previo !== null && !consultarBit(previo.mejorasCompradas, bit) && consultarBit(mascara, bit);

    // 1. Horno (base vs mediano bit 0 vs industrial bit 4)
    const { hornoBase } = POSICIONES_INTERIOR;
    const tieneIndustrial = consultarBit(mascara, 4);
    const tieneMediano = consultarBit(mascara, 0);

    const contHorno = this.add.container(hornoBase.x, hornoBase.y);
    const gfxHorno = this.add.graphics();

    if (tieneIndustrial) {
      // Horno industrial: gran cámara metálica con doble boca de calor
      gfxHorno.fillStyle(0x4b5563, 1);
      gfxHorno.fillRoundedRect(-58, -48, 116, 96, 10);
      gfxHorno.lineStyle(4, 0x9ca3af, 1);
      gfxHorno.strokeRoundedRect(-58, -48, 116, 96, 10);
      // Doble fuego industrial
      gfxHorno.fillStyle(0xff4757, 0.95);
      gfxHorno.fillCircle(-24, -14, 15);
      gfxHorno.fillCircle(-24, 18, 15);
      gfxHorno.fillStyle(0xfeca57, 0.95);
      gfxHorno.fillCircle(-26, -14, 7);
      gfxHorno.fillCircle(-26, 18, 7);
      // Luz indicadora
      gfxHorno.fillStyle(0x2ed573, 1);
      gfxHorno.fillCircle(38, -30, 5);
    } else if (tieneMediano) {
      // Horno mediano: piedra reforzada más grande con borde dorado y fuego amplio
      gfxHorno.fillStyle(0x8e3b28, 1);
      gfxHorno.fillCircle(0, 0, 52);
      gfxHorno.lineStyle(4, 0xf39c12, 1);
      gfxHorno.strokeCircle(0, 0, 52);
      gfxHorno.fillStyle(0xff6b35, 0.95);
      gfxHorno.fillCircle(-18, 0, 20);
      gfxHorno.fillStyle(0xfeca57, 0.95);
      gfxHorno.fillCircle(-20, 0, 10);
    } else {
      // Horno inicial
      gfxHorno.fillStyle(COLORES_ESCENA.hornoPiedra, 1);
      gfxHorno.fillCircle(0, 0, hornoBase.radio);
      gfxHorno.lineStyle(4, 0x4a2318, 1);
      gfxHorno.strokeCircle(0, 0, hornoBase.radio);
      gfxHorno.fillStyle(COLORES_ESCENA.hornoFuego, 0.9);
      gfxHorno.fillCircle(-16, 0, 16);
      gfxHorno.fillStyle(0xfeca57, 0.9);
      gfxHorno.fillCircle(-18, 0, 8);
    }
    contHorno.add(gfxHorno);
    this.capaMejoras.add(contHorno);

    if (recienComprada(4)) {
      this.animarAparicion(contHorno);
      const m = MEJORAS.find((x) => x.bit === 4);
      if (m) this.mostrarTextoFlotante(hornoBase.x, hornoBase.y - 55, `−Bs ${m.costo}`, '#ff6b6b');
    } else if (recienComprada(0)) {
      this.animarAparicion(contHorno);
      const m = MEJORAS.find((x) => x.bit === 0);
      if (m) this.mostrarTextoFlotante(hornoBase.x, hornoBase.y - 55, `−Bs ${m.costo}`, '#ff6b6b');
    }

    // 2. Bodega ampliada (bit 1): estantes extra
    if (consultarBit(mascara, 1)) {
      const contBodegaExtra = this.add.container(0, 0);
      const gfxBod = this.add.graphics();
      const colores = [0x63cdda, 0xf8a5c2, 0xf5cd79, 0x786fa6];

      POSICIONES_INTERIOR.estantesBodegaExtra.forEach((est, idx) => {
        gfxBod.fillStyle(COLORES_ESCENA.estante, 1);
        gfxBod.fillRoundedRect(est.x, est.y, est.ancho, est.alto, 4);
        gfxBod.lineStyle(2, 0xf39c12, 0.9);
        gfxBod.strokeRoundedRect(est.x, est.y, est.ancho, est.alto, 4);
        for (let i = 0; i < 4; i++) {
          gfxBod.fillStyle(colores[(idx + i) % colores.length], 0.95);
          gfxBod.fillRect(est.x + 8 + i * 30, est.y + 6, 22, 18);
        }
      });
      contBodegaExtra.add(gfxBod);
      this.capaMejoras.add(contBodegaExtra);

      if (recienComprada(1)) {
        this.animarAparicion(contBodegaExtra);
        const m = MEJORAS.find((x) => x.bit === 1);
        if (m) this.mostrarTextoFlotante(280, 150, `−Bs ${m.costo}`, '#f39c12');
      }
    }

    // 3. Batidora industrial (bit 2)
    if (consultarBit(mascara, 2)) {
      const bat = POSICIONES_INTERIOR.batidoraIndustrial;
      const contBat = this.add.container(bat.x, bat.y);
      const gfxBat = this.add.graphics();
      gfxBat.fillStyle(0xbdc3c7, 1);
      gfxBat.fillCircle(0, 0, 18);
      gfxBat.lineStyle(3, 0x7f8c8d, 1);
      gfxBat.strokeCircle(0, 0, 18);
      gfxBat.fillStyle(0x2c3e50, 1);
      gfxBat.fillCircle(0, 0, 8);
      gfxBat.fillStyle(0x3498db, 1);
      gfxBat.fillRect(-4, -18, 8, 8);
      contBat.add(gfxBat);
      this.capaMejoras.add(contBat);

      if (recienComprada(2)) {
        this.animarAparicion(contBat);
        const m = MEJORAS.find((x) => x.bit === 2);
        if (m) this.mostrarTextoFlotante(bat.x, bat.y - 28, `−Bs ${m.costo}`, '#54a0ff');
      }
    }

    // 4. Caja registradora (base vs caja moderna bit 3)
    const caja = POSICIONES_INTERIOR.cajaRegistradora;
    const contCaja = this.add.container(caja.x + caja.ancho / 2, caja.y - 4);
    const gfxCaja = this.add.graphics();
    if (consultarBit(mascara, 3)) {
      // Caja moderna: pantalla táctil azul brillante + impresora
      gfxCaja.fillStyle(0x1e272e, 1);
      gfxCaja.fillRoundedRect(-26, -18, 52, 36, 5);
      gfxCaja.lineStyle(2, 0x00d2d3, 1);
      gfxCaja.strokeRoundedRect(-26, -18, 52, 36, 5);
      gfxCaja.fillStyle(0x0abde3, 0.95);
      gfxCaja.fillRect(-18, -12, 36, 16);
      gfxCaja.fillStyle(0xecf0f1, 1);
      gfxCaja.fillRect(-10, 8, 20, 6);
    } else {
      gfxCaja.fillStyle(COLORES_ESCENA.caja, 1);
      gfxCaja.fillRoundedRect(-22, -16, 44, 32, 4);
      gfxCaja.fillStyle(0x2ecc71, 0.9);
      gfxCaja.fillRect(-14, -10, 28, 10);
    }
    contCaja.add(gfxCaja);
    this.capaMejoras.add(contCaja);

    if (recienComprada(3)) {
      this.animarAparicion(contCaja);
      const m = MEJORAS.find((x) => x.bit === 3);
      if (m) this.mostrarTextoFlotante(caja.x + 22, caja.y - 32, `−Bs ${m.costo}`, '#2ecc71');
    }
  }

  private dibujarPersonalDesdeNucleo(
    cocineros: number,
    cajeros: number,
    previo: EstadoVisualNucleo | null,
    animar: boolean
  ): void {
    // Cocineros
    for (let i = 0; i < Math.min(cocineros, POSICIONES_INTERIOR.puestosCocineros.length); i++) {
      const pos = POSICIONES_INTERIOR.puestosCocineros[i];
      const esNuevo = animar && previo !== null && i >= previo.cocineros;
      this.crearEmpleadoVisual(pos.x, pos.y, COLORES_PERSONAL.cocinero, '👨‍🍳', esNuevo);
    }

    // Cajeros
    for (let i = 0; i < Math.min(cajeros, POSICIONES_INTERIOR.puestosCajeros.length); i++) {
      const pos = POSICIONES_INTERIOR.puestosCajeros[i];
      const esNuevo = animar && previo !== null && i >= previo.cajeros;
      this.crearEmpleadoVisual(pos.x, pos.y, COLORES_PERSONAL.cajero, '💳', esNuevo);
    }
  }

  private crearEmpleadoVisual(
    x: number,
    y: number,
    color: number,
    icono: string,
    esNuevo: boolean
  ): void {
    const cont = this.add.container(x, y);
    const circulo = this.add.circle(0, 0, 12, color, 1);
    circulo.setStrokeStyle(2, 0xffffff, 0.95);
    const txt = this.add.text(0, 0, icono, { fontSize: '12px' }).setOrigin(0.5);
    cont.add([circulo, txt]);
    this.capaPersonal.add(cont);

    if (esNuevo) {
      this.animarAparicion(cont);
    }

    // Animación suave de "trabajo"
    this.tweens.add({
      targets: cont,
      y: y - 3,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private animarAparicion(target: Phaser.GameObjects.Container): void {
    target.setScale(0.2);
    this.tweens.add({
      targets: target,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: 'Back.easeOut',
    });
  }

  private mostrarTextoFlotante(x: number, y: number, texto: string, color: string): void {
    const txt = this.add.text(x, y, texto, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color,
      stroke: '#121420',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - 36,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private mostrarAvisoNivel(nuevoNivel: number): void {
    const banner = this.add.text(
      ANCHO_JUEGO / 2,
      140,
      `⭐ ¡SUBISTE A NIVEL ${nuevoNivel}! ⭐`,
      {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#f7b731',
        backgroundColor: 'rgba(15, 18, 32, 0.9)',
        padding: { x: 16, y: 8 },
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5);

    banner.setScale(0.5);
    this.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          y: 110,
          alpha: 0,
          delay: 1400,
          duration: 600,
          onComplete: () => banner.destroy(),
        });
      },
    });
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

  /** Dibuja el mesón de preparación (el horno se dibuja dinámicamente según mejoras) */
  private dibujarCocinaYHorno(): void {
    const gfx = this.add.graphics();
    const { mesonCocina } = POSICIONES_INTERIOR;

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

    const hor = ESTACIONES_CONFIG.horno;
    this.crearEtiquetaZona(hor.x + 200, hor.y + 205, hor.titulo, hor.subtitulo, '#ff6b6b');
  }

  /** Dibuja el mostrador de atención y vitrina (la caja se dibuja dinámicamente) */
  private dibujarMostrador(): void {
    const gfx = this.add.graphics();
    const mos = ESTACIONES_CONFIG.mostrador;

    // Barra principal del mostrador
    gfx.fillStyle(COLORES_ESCENA.mostradorMadera, 1);
    gfx.fillRoundedRect(mos.x, mos.y, mos.ancho, 42, 6);
    gfx.fillStyle(COLORES_ESCENA.mostradorTope, 1);
    gfx.fillRoundedRect(mos.x + 4, mos.y + 4, mos.ancho - 8, 34, 4);

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
