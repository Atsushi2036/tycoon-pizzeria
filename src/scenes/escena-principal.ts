import Phaser from 'phaser';
import type { TipoEstacion } from '../ui/gestor-paneles';

export interface DatosEscenaPrincipal {
  alSeleccionarEstacion: (estacion: TipoEstacion) => void;
}

export class EscenaPrincipal extends Phaser.Scene {
  private alSeleccionarEstacion!: (estacion: TipoEstacion) => void;

  constructor() {
    super({ key: 'EscenaPrincipal' });
  }

  init(datos: DatosEscenaPrincipal): void {
    this.alSeleccionarEstacion = datos.alSeleccionarEstacion;
  }

  create(): void {
    const ancho = this.cameras.main.width;
    const alto = this.cameras.main.height;

    // ─── Fondo de la Pizzería (Suelo con baldosas) ───
    this.dibujarSuelo(ancho, alto);

    // ─── Paredes perimetrales ───
    const paredes = this.add.graphics();
    paredes.lineStyle(6, 0x2c3e50);
    paredes.strokeRect(20, 70, ancho - 40, alto - 90);

    // ─── Título / Decoración interior ───
    this.add.text(ancho / 2, 85, '🍕 PIZZERÍA LA NONNA - PLANO DE OPERACIONES', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // ─── Las 4 Estaciones Principales (Rectángulos y Formas Simples) ───
    // 1. Bodega (Arriba Izquierda)
    this.crearEstacion(
      150, 180, 200, 140,
      0xe67e22, 0xd35400,
      '📦 BODEGA',
      'Comprar Insumos',
      'bodega'
    );

    // 2. Horno / Cocina (Arriba Derecha)
    this.crearEstacion(
      ancho - 150, 180, 200, 140,
      0xc0392b, 0x962d22,
      '🔥 HORNO & COCINA',
      'Producir Pizzas',
      'horno'
    );

    // 3. Mostrador / Ventas (Abajo Izquierda)
    this.crearEstacion(
      150, 420, 200, 140,
      0x27ae60, 0x219955,
      '🏪 MOSTRADOR',
      'Fijar Precios & Ventas',
      'mostrador'
    );

    // 4. Oficina / Gerencia (Abajo Derecha)
    this.crearEstacion(
      ancho - 150, 420, 200, 140,
      0x2980b9, 0x1f618d,
      '💼 OFICINA',
      'Personal & Mejoras',
      'oficina'
    );

    // ─── Decoraciones centrales (Mesas de trabajo / Formas simples) ───
    this.dibujarAreaCentral(ancho / 2, (alto + 60) / 2);
  }

  private dibujarSuelo(ancho: number, alto: number): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x1a252f, 1);
    gfx.fillRect(0, 0, ancho, alto);

    // Cuadrícula decorativa
    gfx.lineStyle(1, 0x22313f, 0.4);
    const tamano = 40;
    for (let x = 0; x < ancho; x += tamano) {
      gfx.moveTo(x, 60);
      gfx.lineTo(x, alto);
    }
    for (let y = 60; y < alto; y += tamano) {
      gfx.moveTo(0, y);
      gfx.lineTo(ancho, y);
    }
    gfx.strokePath();
  }

  private dibujarAreaCentral(cx: number, cy: number): void {
    const gfx = this.add.graphics();
    // Mesa de preparación central
    gfx.fillStyle(0x7f8c8d, 0.6);
    gfx.fillRoundedRect(cx - 70, cy - 40, 140, 80, 10);
    gfx.lineStyle(2, 0x95a5a6, 0.8);
    gfx.strokeRoundedRect(cx - 70, cy - 40, 140, 80, 10);

    this.add.text(cx, cy, 'Área de Ensamble', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#bdc3c7',
    }).setOrigin(0.5);
  }

  private crearEstacion(
    cx: number,
    cy: number,
    w: number,
    h: number,
    colorFondo: number,
    colorBorde: number,
    titulo: string,
    subtitulo: string,
    tipo: TipoEstacion
  ): void {
    const contenedor = this.add.container(cx, cy);

    // Forma del fondo (rectángulo redondeado)
    const fondo = this.add.graphics();
    fondo.fillStyle(colorFondo, 0.9);
    fondo.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    fondo.lineStyle(3, colorBorde, 1);
    fondo.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    // Círculo decorativo central
    fondo.fillStyle(0xffffff, 0.15);
    fondo.fillCircle(0, -15, 26);

    // Textos
    const txtTitulo = this.add.text(0, -10, titulo, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const txtSub = this.add.text(0, 20, subtitulo, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#f1f2f6',
    }).setOrigin(0.5);

    const txtClick = this.add.text(0, 42, '[ Click para Abrir ]', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#f7b731',
    }).setOrigin(0.5);

    contenedor.add([fondo, txtTitulo, txtSub, txtClick]);

    // Zona interactiva
    const zona = this.add.zone(0, 0, w, h);
    zona.setInteractive({ useHandCursor: true });
    contenedor.add(zona);

    // Efecto Hover
    zona.on('pointerover', () => {
      this.tweens.add({
        targets: contenedor,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Sine.easeInOut',
      });
    });

    zona.on('pointerout', () => {
      this.tweens.add({
        targets: contenedor,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: 'Sine.easeInOut',
      });
    });

    // Click para abrir panel HTML
    zona.on('pointerdown', () => {
      this.alSeleccionarEstacion(tipo);
    });
  }
}

