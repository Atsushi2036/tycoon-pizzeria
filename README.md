# 🍕 Simulador Tycoon: Pizzería La Nonna

Videojuego educativo de gestión empresarial en navegador web diseñado para estudiantes de 15 a 18 años. El jugador asume la dirección de una pizzería en vista cenital 2D, tomando decisiones de abastecimiento, producción, fijación de precios, contratación de personal e inversiones de capital (moneda en **Bolivianos - Bs**).

---

## 🎮 Conceptos Empresariales y Educativos

1. **Flujo de Caja y Capital de Trabajo**: Administrar el capital inicial (Bs 2.000) evitando caer en quiebra.
2. **Costo vs. Gasto**:
   - **Costo**: inversión en insumos para producir pizzas.
   - **Gasto**: salidas operativas fijas (como sueldos diarios del personal).
3. **Ingreso vs. Ganancia**: Diferencia entre ventas brutas y utilidad neta tras restar costos y sueldos.
4. **Capacidad y Cuellos de Botella**: Bodega (almacenamiento), Horno/Cocineros (producción) y Caja/Cajeros (atención en fila FIFO).
5. **Elasticidad Precio de la Demanda**: Precios altos reducen la demanda; precios bajos la aumentan pero reducen el margen unitario.

---

## 🛠️ Stack Tecnológico

- **Vite** + **TypeScript** (`strict: true`)
- **Phaser 3**: Plano cenital 2D con formas geométricas y texto (sin assets externos), escala responsiva (`Scale.FIT`), mejoras visibles y reproducción en tiempo real del día (08:00–20:00).
- **HTML5 & CSS3**: HUD superior, controles de reproducción, tutorial guiado, modo desarrollador (`F2`), gráficos SVG hechos a mano y paneles modales con tooltips educativos.
- **WebAudio API**: Efectos de sonido opcionales (compra, venta, subir de nivel) con botón de silencio (`🔊/🔇`).
- **Vitest**: Suite automatizada de pruebas unitarias para la lógica pura.

---

## 📁 Arquitectura del Proyecto

```
/
├── GAME_SPEC.md                     # Especificación funcional de reglas y fórmulas
├── index.html                       # Contenedor HTML del canvas y la UI
├── package.json
├── tsconfig.json
├── tsconfig.balance.json            # Configuración para compilar el script de balance
├── vite.config.ts                   # Configuración de compilación y Vitest
└── src/
    ├── config/
    │   ├── game-config.ts           # Todos los valores numéricos, pesos horarios y tutorial
    │   └── escena-config.ts         # Coordenadas, waypoints y colores del plano cenital
    ├── core/                        # Lógica PURA (sin Phaser ni DOM)
    │   ├── buffer-circular.ts       # Historial de transacciones O(1)
    │   ├── cola-fifo.ts             # Cola FIFO para la fila del mostrador
    │   ├── controlador-reproduccion.ts # Reloj, velocidad (×1/×2/×4), pausa y salto
    │   ├── generador-linea-tiempo.ts# Distribuye eventos del núcleo en el tiempo
    │   ├── mascara-bits.ts          # Mejoras y progreso de tutorial en O(1)
    │   ├── motor-juego.ts           # Motor maestro de economía, jornada y guardado v4
    │   ├── prng.ts                  # Generador determinista mulberry32 con semilla
    │   └── tipos.ts                 # Interfaces compartidas
    ├── scenes/
    │   └── escena-principal.ts      # Escena cenital 2D, mejoras, personal y clientes
    ├── scripts/
    │   └── balance.ts               # Simulador headless multi-estrategia
    ├── ui/
    │   ├── audio.ts                 # Síntesis simple WebAudio con silencio
    │   ├── gestor-dev.ts            # Panel de desarrollador (F2)
    │   ├── gestor-hud.ts            # HUD superior y barra de reproducción
    │   ├── gestor-paneles.ts        # Modales, tooltips, gráficos SVG y resumen
    │   ├── gestor-tutorial.ts       # Asistente guiado paso a paso
    │   └── toast.ts                 # Notificaciones efímeras
    ├── tests/                       # 87 pruebas unitarias automatizadas con Vitest
    └── main.ts                      # Punto de entrada y orquestación
```

---

## 🚀 Instrucciones de Ejecución, Pruebas y Balance

### Prerrequisitos
- **Node.js** (versión 20 o superior recomendada).
- **npm** instalado en el sistema.

### Comandos principales
1. **Instalar dependencias**:
   ```bash
   npm install
   ```
2. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre en tu navegador la URL mostrada por Vite (por defecto `http://localhost:5173/`).

3. **Ejecutar todas las pruebas unitarias**:
   ```bash
   npm test
   ```

4. **Ejecutar el simulador de balance económico (500 partidas headless)**:
   ```bash
   npm run balance
   ```

5. **Compilar para producción**:
   ```bash
   npm run build
   ```
   Los archivos estáticos optimizados se generan en `dist/`.

---

## 🌐 Despliegue (GitHub Pages o Netlify)

Este proyecto usa rutas relativas (`base: './'` en `vite.config.ts`).

### Opción A — GitHub Pages (GitHub Actions)
1. Crea `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ main ]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build-and-deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: 'npm'
         - run: npm ci
         - run: npm test
         - run: npm run build
         - uses: actions/configure-pages@v4
         - uses: actions/upload-pages-artifact@v3
           with:
             path: './dist'
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
2. En GitHub ve a **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Enlace esperado tras el despliegue: `https://atsushi2036.github.io/tycoon-pizzeria/`

### Opción B — Netlify
1. Conecta el repositorio en Netlify.
2. Configura **Build command**: `npm run build` y **Publish directory**: `dist`.
3. O despliega manualmente arrastrando la carpeta `dist/` en Netlify Drop (`https://app.netlify.com/drop`).
