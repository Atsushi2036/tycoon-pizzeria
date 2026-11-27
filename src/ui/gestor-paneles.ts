import type { MotorJuego } from '../core/motor-juego';
import type { RegistroDiario, ResumenJornada } from '../core/tipos';
import {
  CAPITAL_INICIAL,
  INSUMOS,
  INSUMO_IDS,
  RECETAS,
  MEJORAS,
  TIPOS_EMPLEADO,
  type InsumoId,
} from '../config/game-config';
import { Toast } from './toast';

export type TipoEstacion = 'bodega' | 'horno' | 'mostrador' | 'oficina' | 'resumen' | 'partida';

export class GestorPaneles {
  private motor: MotorJuego;
  private overlay: HTMLElement;
  private alActualizar: () => void;
  private alAvanzarDia: () => void;
  private alReiniciarPartida: () => void;
  private alExportarPartida: () => void;
  private alImportarPartida: (archivo: File) => void;
  private alRepetirTutorial?: () => void;

  constructor(
    motor: MotorJuego,
    alActualizar: () => void,
    alAvanzarDia: () => void,
    alReiniciarPartida: () => void,
    alExportarPartida: () => void,
    alImportarPartida: (archivo: File) => void,
    alRepetirTutorial?: () => void
  ) {
    this.motor = motor;
    this.alActualizar = alActualizar;
    this.alAvanzarDia = alAvanzarDia;
    this.alReiniciarPartida = alReiniciarPartida;
    this.alExportarPartida = alExportarPartida;
    this.alImportarPartida = alImportarPartida;
    this.alRepetirTutorial = alRepetirTutorial;

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    document.getElementById('app')?.appendChild(this.overlay);

    // Evitar que cualquier clic dentro del overlay se propague hacia Phaser
    this.overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    this.overlay.addEventListener('mouseup', (e) => e.stopPropagation());
    this.overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === this.overlay) {
        // En pantalla de resumen o game over no se cierra haciendo click afuera
        if (this.motor.fase !== 'cerrar') {
          this.cerrar();
        }
      }
    });
  }

  cerrar(): void {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
  }

  abrir(tipo: TipoEstacion, datosExtra?: ResumenJornada): void {
    this.overlay.innerHTML = '';
    this.overlay.classList.remove('hidden');

    const card = document.createElement('div');
    card.className = 'panel-card';

    switch (tipo) {
      case 'bodega':
        this.renderBodega(card);
        break;
      case 'horno':
        this.renderHorno(card);
        break;
      case 'mostrador':
        this.renderMostrador(card);
        break;
      case 'oficina':
        this.renderOficina(card);
        break;
      case 'resumen':
        this.renderResumen(card, datosExtra);
        break;
      case 'partida':
        this.renderPartida(card);
        break;
    }

    this.overlay.appendChild(card);
  }

  // ─── PANEL 1: BODEGA (Compra de Insumos) ───
  private renderBodega(card: HTMLElement): void {
    const totalBodega = this.motor.obtenerTotalBodega();
    const capBodega = this.motor.obtenerCapacidadBodega();

    card.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">📦 Bodega de Insumos</div>
        <button class="btn-close" id="btn-cerrar-modal">&times;</button>
      </div>
      <div class="panel-body">
        <div class="panel-info-row">
          <span>Capacidad ocupada: <strong>${totalBodega} / ${capBodega}</strong> unidades</span>
          <span>Espacio libre: <strong>${capBodega - totalBodega}</strong></span>
        </div>
        <div class="item-list" id="lista-insumos"></div>
      </div>
    `;

    card.querySelector('#btn-cerrar-modal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cerrar();
    });

    const contenedor = card.querySelector('#lista-insumos')!;
    for (const id of INSUMO_IDS) {
      const info = INSUMOS[id];
      const stock = this.motor.obtenerInsumo(id);
      const costo = this.motor.obtenerCostoInsumo(id);

      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-details">
          <div class="item-name">${info.nombre}</div>
          <div class="item-sub">En stock: ${stock} un. | Costo: Bs ${costo} c/u</div>
        </div>
        <div class="item-controls">
          <button class="btn-mini btn-comprar" data-id="${id}" data-cant="1">+1 (Bs ${costo})</button>
          <button class="btn-mini btn-comprar" data-id="${id}" data-cant="5">+5 (Bs ${costo * 5})</button>
          <button class="btn-mini btn-comprar" data-id="${id}" data-cant="10">+10 (Bs ${costo * 10})</button>
        </div>
      `;
      contenedor.appendChild(row);
    }

    card.querySelectorAll('.btn-comprar').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id')!;
        const cant = parseInt(target.getAttribute('data-cant')!, 10);
        const res = this.motor.comprarInsumo(id, cant);
        Toast.mostrar(res.mensaje);
        this.alActualizar();
        this.renderBodega(card);
      });
    });
  }

  // ─── PANEL 2: HORNO (Producción de Pizzas) ───
  private renderHorno(card: HTMLElement): void {
    const produccionUsada = this.motor.produccionUsadaHoy;
    const capacidadProduccion = this.motor.obtenerCapacidadProduccion();
    const restante = capacidadProduccion - produccionUsada;

    card.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">🔥 Horno y Cocina (Producción)</div>
        <button class="btn-close" id="btn-cerrar-modal">&times;</button>
      </div>
      <div class="panel-body">
        <div class="panel-info-row">
          <span>Capacidad diaria: <strong>${produccionUsada} / ${capacidadProduccion}</strong> pizzas</span>
          <span>Disponible hoy: <strong>${restante}</strong></span>
        </div>
        <div class="item-list" id="lista-recetas"></div>
      </div>
    `;

    card.querySelector('#btn-cerrar-modal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cerrar();
    });

    const contenedor = card.querySelector('#lista-recetas')!;
    for (const receta of RECETAS) {
      const stock = this.motor.obtenerPizzas(receta.id);
      const reqTxt = Object.entries(receta.insumos)
        .map(([insumo, cant]) => `${cant} ${INSUMOS[insumo as InsumoId]?.nombre ?? insumo}`)
        .join(', ');

      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-details">
          <div class="item-name">${receta.nombre}</div>
          <div class="item-sub">Pizzas listas: ${stock} | Receta: ${reqTxt}</div>
        </div>
        <div class="item-controls">
          <button class="btn-mini btn-producir" data-id="${receta.id}" data-cant="1">+1</button>
          <button class="btn-mini btn-producir" data-id="${receta.id}" data-cant="5">+5</button>
        </div>
      `;
      contenedor.appendChild(row);
    }

    card.querySelectorAll('.btn-producir').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id')!;
        const cant = parseInt(target.getAttribute('data-cant')!, 10);
        const res = this.motor.producirPizza(id, cant);
        Toast.mostrar(res.mensaje);
        this.alActualizar();
        this.renderHorno(card);
      });
    });
  }

  // ─── PANEL 3: MOSTRADOR (Precios y Ventas) ───
  private renderMostrador(card: HTMLElement): void {
    const atencion = this.motor.obtenerCapacidadAtencion();

    card.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">🏪 Mostrador y Fijación de Precios</div>
        <button class="btn-close" id="btn-cerrar-modal">&times;</button>
      </div>
      <div class="panel-body">
        <div class="panel-info-row">
          <span>Capacidad de atención: <strong>${atencion}</strong> clientes/jornada</span>
          <span>Día: <strong>${this.motor.nombreDia}</strong> (Factor: ${this.motor.factorDia})</span>
        </div>
        <div class="item-list" id="lista-precios"></div>
      </div>
    `;

    card.querySelector('#btn-cerrar-modal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cerrar();
    });

    const contenedor = card.querySelector('#lista-precios')!;
    for (const receta of RECETAS) {
      const precioActual = this.motor.obtenerPrecioVenta(receta.id);
      const demandaEstimada = this.motor.calcularDemanda(receta.id);
      const stock = this.motor.obtenerPizzas(receta.id);

      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-details">
          <div class="item-name">${receta.nombre}</div>
          <div class="item-sub">Ref: Bs ${receta.precioReferencia} | Stock listo: ${stock} un. | Demanda estimada: ~${demandaEstimada}</div>
        </div>
        <div class="item-controls">
          <span>Bs</span>
          <input type="number" class="price-input" data-id="${receta.id}" value="${precioActual}" min="10" max="100" />
          <button class="btn-mini btn-guardar-precio" data-id="${receta.id}">Fijar</button>
        </div>
      `;
      contenedor.appendChild(row);
    }

    card.querySelectorAll('.btn-guardar-precio').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id')!;
        const input = card.querySelector(`input[data-id="${id}"]`) as HTMLInputElement;
        const nuevoPrecio = parseInt(input.value, 10);
        const res = this.motor.fijarPrecio(id, nuevoPrecio);
        Toast.mostrar(res.mensaje);
        this.alActualizar();
        this.renderMostrador(card);
      });
    });
  }

  // ─── PANEL 4: OFICINA (Empleados y Mejoras) ───
  private renderOficina(card: HTMLElement): void {
    card.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">💼 Oficina de Personal y Mejoras</div>
        <button class="btn-close" id="btn-cerrar-modal">&times;</button>
      </div>
      <div class="panel-body">
        <div class="panel-info-row">
          <span>Nivel de la pizzería: <strong>Nivel ${this.motor.nivel}</strong></span>
          <span>Máximo empleados por rol: <strong>${this.motor.nivel}</strong></span>
        </div>
        
        <h4 style="margin-top: 6px;">Personal</h4>
        <div class="item-list" id="lista-empleados"></div>

        <h4 style="margin-top: 10px;">Mejoras de Infraestructura</h4>
        <div class="item-list" id="lista-mejoras"></div>
      </div>
    `;

    card.querySelector('#btn-cerrar-modal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cerrar();
    });

    // Empleados
    const contenedorEmp = card.querySelector('#lista-empleados')!;
    for (const tipo of TIPOS_EMPLEADO) {
      const contratados = this.motor.obtenerEmpleados(tipo.id);
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-details">
          <div class="item-name">${tipo.nombre} (${contratados}/${this.motor.nivel})</div>
          <div class="item-sub">${tipo.efecto} | Sueldo: Bs ${tipo.sueldoDiario}/día</div>
        </div>
        <div class="item-controls">
          <button class="btn-mini btn-contratar" data-id="${tipo.id}">Contratar</button>
          <button class="btn-mini btn-despedir" data-id="${tipo.id}" ${contratados <= 0 ? 'disabled' : ''}>Despedir</button>
        </div>
      `;
      contenedorEmp.appendChild(row);
    }

    // Mejoras
    const contenedorMej = card.querySelector('#lista-mejoras')!;
    for (const mej of MEJORAS) {
      const comprada = this.motor.tieneMejora(mej.bit);
      const nivelReq = mej.nivelRequerido;
      const puedeComprar = !comprada && this.motor.nivel >= nivelReq && this.motor.capital >= mej.costo;

      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-details">
          <div class="item-name">${mej.nombre} ${comprada ? '✅' : ''}</div>
          <div class="item-sub">${mej.descripcion} | Requiere Nivel ${nivelReq} | Costo: Bs ${mej.costo}</div>
        </div>
        <div class="item-controls">
          <button class="btn-mini btn-comprar-mejora" data-id="${mej.id}" ${!puedeComprar ? 'disabled' : ''}>
            ${comprada ? 'Adquirida' : 'Comprar'}
          </button>
        </div>
      `;
      contenedorMej.appendChild(row);
    }

    // Event listeners
    card.querySelectorAll('.btn-contratar').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        const res = this.motor.contratarEmpleado(id);
        Toast.mostrar(res.mensaje);
        this.alActualizar();
        this.renderOficina(card);
      });
    });

    card.querySelectorAll('.btn-despedir').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        const res = this.motor.despedirEmpleado(id);
        Toast.mostrar(res.mensaje);
        this.alActualizar();
        this.renderOficina(card);
      });
    });

    card.querySelectorAll('.btn-comprar-mejora').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        const res = this.motor.comprarMejora(id);
        Toast.mostrar(res.mensaje);
        this.alActualizar();
        this.renderOficina(card);
      });
    });
  }

  // ─── PANEL 5: RESUMEN DE CIERRE DE JORNADA ───
  private renderResumen(card: HTMLElement, resumen?: ResumenJornada): void {
    if (!resumen) return;

    const gananciaClass = resumen.ganancia >= 0 ? 'ganancia-pos' : 'ganancia-neg';
    const gananciaSigno = resumen.ganancia >= 0 ? '+' : '';

    let filasVentasHtml = '';
    for (const v of resumen.ventas) {
      const receta = RECETAS.find((r) => r.id === v.pizzaId);
      filasVentasHtml += `
        <div class="item-row" style="padding: 6px 12px;">
          <div>
            <strong>${receta?.nombre ?? v.pizzaId}:</strong> ${v.vendidas} vendidas (Demanda: ${v.demanda})
            <div class="item-sub">Ingreso: Bs ${v.ingreso} | Perdidas por stock: ${v.perdidaPorStock} | Perdidas por cajeros: ${v.perdidaPorCajeros}</div>
          </div>
        </div>
      `;
    }

    let mensajesEduHtml = '';
    if (resumen.mensajesEducativos.length > 0) {
      mensajesEduHtml = `
        <div class="mensajes-educativos">
          <strong>💡 Análisis y Consecuencias de tus Decisiones:</strong>
          ${resumen.mensajesEducativos.map((m) => `<div class="mensaje-edu">• ${m}</div>`).join('')}
        </div>
      `;
    }

    let bannerVictoria = '';
    if (this.motor.victoria) {
      bannerVictoria = `
        <div style="background: linear-gradient(90deg, #f7b731, #fa8231); color: #000; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 8px;">
          🎉 ¡VICTORIA EMPRESARIAL! Has alcanzado el Nivel 5 con más de Bs 25.000 de capital histórico.
        </div>
      `;
    }

    card.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">📊 Resumen del Día ${resumen.dia} (${resumen.nombreDia})</div>
      </div>
      <div class="panel-body">
        ${bannerVictoria}
        <div class="resumen-finanzas">
          <div class="finanza-box">
            <div class="item-sub">Ingresos por Ventas</div>
            <strong style="color: var(--accent-green);">+ Bs ${resumen.ingresos}</strong>
          </div>
          <div class="finanza-box">
            <div class="item-sub">Costo de Insumos Usados</div>
            <strong style="color: var(--accent-red);">- Bs ${resumen.costoInsumos}</strong>
          </div>
          <div class="finanza-box">
            <div class="item-sub">Sueldos Pagados</div>
            <strong style="color: var(--accent-red);">- Bs ${resumen.sueldos}</strong>
          </div>
          <div class="finanza-box ${gananciaClass}">
            <div class="item-sub">Ganancia Neta del Día</div>
            <strong>${gananciaSigno} Bs ${resumen.ganancia}</strong>
          </div>
        </div>

        <div class="panel-info-row">
          <span>Capital final: <strong>Bs ${resumen.capitalFinal}</strong></span>
          <span>Nivel actual: <strong>Nivel ${this.motor.nivel}</strong></span>
        </div>

        ${this.generarDesgloseVisualHTML(resumen)}

        ${this.generarGraficoCapitalSVG(this.motor.obtenerHistorialDiario())}

        <h4 style="margin-top: 4px;">Detalle de Ventas</h4>
        <div class="item-list">${filasVentasHtml}</div>

        ${mensajesEduHtml}

        ${this.generarHistorialMovimientosHTML()}

        <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
          ${
            resumen.quiebra
              ? `<button id="btn-reintentar" class="btn-action" style="background: var(--accent-red);">💥 En Quiebra: Reiniciar</button>`
              : `<button id="btn-siguiente-dia" class="btn-action">➡️ Iniciar Día Siguiente</button>`
          }
        </div>
      </div>
    `;

    card.querySelector('#btn-siguiente-dia')?.addEventListener('click', () => {
      this.alAvanzarDia();
      this.cerrar();
    });

    card.querySelector('#btn-reintentar')?.addEventListener('click', () => {
      this.alReiniciarPartida();
      this.cerrar();
    });
  }

  /** Desglose visual horizontal: Ingresos vs Costos vs Sueldos */
  private generarDesgloseVisualHTML(resumen: ResumenJornada): string {
    const costos = resumen.costoInsumos + resumen.costoMejoras;
    const maxVal = Math.max(1, resumen.ingresos, costos, resumen.sueldos);
    const pctIng = Math.round((resumen.ingresos / maxVal) * 100);
    const pctCos = Math.round((costos / maxVal) * 100);
    const pctSue = Math.round((resumen.sueldos / maxVal) * 100);

    return `
      <div class="chart-box">
        <div class="chart-title">📊 Ingresos vs Costos vs Sueldos</div>
        <div class="bar-row">
          <span class="bar-label">Ingresos</span>
          <div class="bar-track"><div class="bar-fill bar-ingresos" style="width:${pctIng}%"></div></div>
          <span class="bar-val">Bs ${resumen.ingresos}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Costos</span>
          <div class="bar-track"><div class="bar-fill bar-costos" style="width:${pctCos}%"></div></div>
          <span class="bar-val">Bs ${costos}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Sueldos</span>
          <div class="bar-track"><div class="bar-fill bar-sueldos" style="width:${pctSue}%"></div></div>
          <span class="bar-val">Bs ${resumen.sueldos}</span>
        </div>
      </div>
    `;
  }

  /** Gráfico de línea del capital por día dibujado a mano con SVG (sin librerías) */
  private generarGraficoCapitalSVG(registros: readonly RegistroDiario[]): string {
    const puntosDatos = [
      { dia: 0, capital: CAPITAL_INICIAL },
      ...registros.map((r) => ({ dia: r.dia, capital: r.capitalFinal })),
    ];

    const w = 480;
    const h = 110;
    const padX = 42;
    const padY = 16;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    const valores = puntosDatos.map((p) => p.capital);
    const minCap = Math.min(...valores, 0);
    const maxCap = Math.max(...valores, CAPITAL_INICIAL + 500);
    const rango = Math.max(1, maxCap - minCap);

    const coords = puntosDatos.map((p, idx) => {
      const x = padX + (puntosDatos.length === 1 ? innerW / 2 : (idx / (puntosDatos.length - 1)) * innerW);
      const y = padY + innerH - ((p.capital - minCap) / rango) * innerH;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...p };
    });

    const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const circulos = coords
      .map(
        (c) =>
          `<circle cx="${c.x}" cy="${c.y}" r="3.5" fill="#f7b731" stroke="#121420" stroke-width="1.5"><title>Día ${c.dia}: Bs ${c.capital}</title></circle>`
      )
      .join('');

    return `
      <div class="chart-box">
        <div class="chart-title">📈 Evolución del Capital (Bs)</div>
        <svg viewBox="0 0 ${w} ${h}" class="capital-svg" aria-label="Gráfico de capital por día">
          <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${h - padY}" stroke="#4b6584" stroke-width="1" />
          <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="#4b6584" stroke-width="1" />
          <text x="${padX - 4}" y="${padY + 6}" text-anchor="end" fill="#a4b0be" font-size="9">${maxCap}</text>
          <text x="${padX - 4}" y="${h - padY}" text-anchor="end" fill="#a4b0be" font-size="9">${minCap}</text>
          <polyline fill="none" stroke="#f7b731" stroke-width="2.5" stroke-linejoin="round" points="${polyline}" />
          ${circulos}
        </svg>
      </div>
    `;
  }

  /** Historial de movimientos leyendo el buffer circular (más recientes primero) */
  private generarHistorialMovimientosHTML(): string {
    const movimientos = this.motor.obtenerHistorial().slice(-15).reverse();
    if (movimientos.length === 0) return '';

    const filas = movimientos
      .map((m) => {
        const signo = m.monto > 0 ? '+' : '';
        const color = m.monto > 0 ? 'var(--accent-green)' : m.monto < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
        const montoStr = m.monto === 0 ? '—' : `${signo}Bs ${m.monto}`;
        return `
          <div class="hist-row">
            <span class="hist-desc">Día ${m.dia} · ${m.descripcion}</span>
            <span class="hist-monto" style="color:${color};">${montoStr}</span>
          </div>
        `;
      })
      .join('');

    return `
      <details class="hist-details">
        <summary>📜 Historial de Movimientos (${this.motor.obtenerHistorial().length} en buffer)</summary>
        <div class="hist-list">${filas}</div>
      </details>
    `;
  }

  // ─── PANEL 6: GESTIÓN DE PARTIDA ───
  private renderPartida(card: HTMLElement): void {
    card.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">💾 Gestión de Partida</div>
        <button class="btn-close" id="btn-cerrar-modal">&times;</button>
      </div>
      <div class="panel-body">
        <p class="item-sub">El progreso se guarda automáticamente en tu navegador al cerrar cada jornada.</p>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          <button id="btn-exportar" class="btn-secondary" style="padding: 10px;">📥 Exportar Partida (.json)</button>
          
          <label class="btn-secondary" style="padding: 10px; text-align: center; cursor: pointer;">
            📤 Importar Partida (.json)
            <input type="file" id="input-importar" accept=".json" style="display: none;" />
          </label>

          <button id="btn-repetir-tutorial" class="btn-secondary" style="padding: 10px;">🎓 Repetir Tutorial</button>

          <button id="btn-nueva-partida" class="btn-mini" style="background: var(--accent-red); padding: 10px; margin-top: 10px;">
            ⚠️ Iniciar Nueva Partida (Borrar progreso)
          </button>
        </div>
      </div>
    `;

    card.querySelector('#btn-cerrar-modal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cerrar();
    });

    card.querySelector('#btn-exportar')?.addEventListener('click', () => {
      this.alExportarPartida();
    });

    const fileInput = card.querySelector('#input-importar') as HTMLInputElement;
    fileInput?.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        this.alImportarPartida(fileInput.files[0]);
        this.cerrar();
      }
    });

    card.querySelector('#btn-repetir-tutorial')?.addEventListener('click', () => {
      this.alRepetirTutorial?.();
      this.cerrar();
    });

    card.querySelector('#btn-nueva-partida')?.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas reiniciar la partida desde cero?')) {
        this.alReiniciarPartida();
        this.cerrar();
      }
    });
  }
}

