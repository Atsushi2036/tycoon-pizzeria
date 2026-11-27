# 🍕 Simulador Tycoon: Pizzería

Videojuego educativo de gestión empresarial en navegador web diseñado para estudiantes de 15 a 18 años. El jugador asume la dirección de una pizzería, tomando decisiones de abastecimiento, manufactura, fijación de precios, contratación de personal e inversiones de capital en Bolivia (moneda en **Bolivianos - Bs**).

---

## 🎮 Conceptos Empresariales y Educativos

El simulador ayuda a comprender de manera práctica:
1. **Flujo de Caja y Capital de Trabajo**: Administrar la liquidez inicial (Bs 2.000) evitando el sobreendeudamiento o la quiebra.
2. **Costos Directos e Indirectos**: Costos variables de insumos por pizza vs. costos fijos de salarios diarios de empleados.
3. **Elasticidad Precio de la Demanda**: Fijar precios más altos reduce la cantidad de clientes interesados, mientras que precios excesivamente bajos generan demanda pero erosionan el margen unitario.
4. **Cuellos de Botella Operativos**:
   - Falta de stock de pizzas listas (demanda perdida por producto no horneado).
   - Falta de personal de atención / cajeros (demanda perdida por saturación en mostrador).
5. **Inversiones de Capital (CAPEX)**: Adquisición de mejoras de infraestructura (hornos más grandes, ampliación de bodega, batidoras industriales) que desbloquean economías de escala.

---

## 🛠️ Stack Tecnológico

- **Vite** como empaquetador y entorno de desarrollo.
- **TypeScript** con tipado estricto (`strict: true`) en todo el proyecto.
- **Phaser 3**: Escena visual 2D construida exclusivamente con primitivas geométricas y paletas de color (sin texturas ni dependencias gráficas externas).
- **HTML5 & CSS3**: Paneles de gestión modal superpuestos y HUD superior de alto rendimiento.
- **Vitest**: Suite de pruebas unitarias automatizadas para la lógica pura de negocio.
- **Persistencia**: `localStorage` nativo con exportación/importación en formato JSON versionado.

---

## 📁 Arquitectura del Proyecto

```
/
├── GAME_SPEC.md              # Especificación funcional de reglas y fórmulas
├── index.html                # Contenedor HTML del canvas y la UI
├── package.json
├── tsconfig.json
├── vite.config.ts            # Configuración de compilación y Vitest
└── src/
    ├── config/
    │   └── game-config.ts    # Centralización de TODAS las variables numéricas
    ├── core/                 # Lógica de negocio PURA (sin Phaser ni DOM)
    │   ├── buffer-circular.ts# Historial de transacciones O(1)
    │   ├── mascara-bits.ts   # Mejoras compradas en O(1) con operadores binarios
    │   ├── motor-juego.ts    # Motor maestro de la economía y jornada
    │   └── tipos.ts          # Interfaces de datos
    ├── scenes/
    │   └── escena-principal.ts # Escena Phaser interactiva con 4 estaciones
    ├── ui/
    │   ├── gestor-hud.ts     # Barra superior reactiva (capital, día, nivel)
    │   ├── gestor-paneles.ts # Modales para Bodega, Horno, Mostrador, Oficina y Resumen
    │   └── toast.ts          # Notificaciones efímeras
    ├── tests/                # 65 pruebas unitarias automatizadas con Vitest
    └── main.ts               # Punto de entrada de la aplicación
```

---

## 🚀 Instrucciones de Ejecución Local

### Prerrequisitos
- **Node.js** (versión 18 o superior recomendada).
- **npm** instalado en el sistema.

### Pasos
1. **Instalar dependencias**:
   ```bash
   npm install
   ```
2. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre en tu navegador la dirección indicada (por defecto `http://127.0.0.1:5173/`).

3. **Ejecutar las pruebas unitarias**:
   ```bash
   npm run test
   ```

4. **Compilar para producción**:
   ```bash
   npm run build
   ```
   Los archivos estáticos optimizados se generarán en la carpeta `dist/`.

---

## 🌐 Despliegue en GitHub Pages

Este proyecto ya cuenta con rutas relativas configuradas (`base: './'` en `vite.config.ts`), lo que permite alojarlo directamente en cualquier servidor de archivos estáticos o GitHub Pages.

### Despliegue Automatizado con GitHub Actions
Crea el archivo `.github/workflows/deploy.yml` con el siguiente contenido:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build project
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Una vez subido a GitHub:
1. Dirígete a **Settings** > **Pages** en tu repositorio.
2. En **Build and deployment** > **Source**, selecciona **GitHub Actions**.
3. Al hacer push a la rama `main`, la web se desplegará automáticamente.

