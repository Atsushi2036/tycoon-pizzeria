# GAME_SPEC.md — Simulador Tycoon: Pizzería

## Resumen
Videojuego educativo de gestión empresarial para navegador. El jugador administra una pizzería: compra insumos, produce pizzas, fija precios, contrata empleados y compra mejoras. El objetivo es hacer crecer el capital y subir de nivel.

---

## Stack técnico
- **Vite + TypeScript + Phaser 3** para la escena visual.
- **Paneles HTML/CSS** superpuestos al canvas (gestión).
- **Vitest** para tests de lógica.
- Sin backend. `localStorage` para guardado.
- Gráficos: solo formas simples (rectángulos, círculos, texto). Sin imágenes externas.

---

## Arquitectura de carpetas
```
/src
  /core       → Lógica pura del negocio. PROHIBIDO importar Phaser o tocar el DOM.
  /config     → game-config.ts con TODOS los valores numéricos.
  /ui         → Paneles HTML/CSS.
  /scenes     → Escenas de Phaser.
  /tests      → Tests con Vitest.
```

---

## Moneda
Bolivianos (Bs).

---

## Capital inicial
Bs 2.000.

---

## Capacidad de bodega inicial
200 unidades de insumos en total.

---

## Insumos y costo de compra (por unidad)
| Insumo     | Costo (Bs) |
|------------|------------|
| masa       | 4          |
| salsa      | 2          |
| queso      | 6          |
| pepperoni  | 7          |
| jamón      | 6          |
| piña       | 3          |

---

## Recetas (insumos por pizza) y precio de venta de referencia
| Pizza      | Insumos                                    | Precio ref. (Bs) |
|------------|--------------------------------------------|-------------------|
| Margarita  | 1 masa, 1 salsa, 1 queso                  | 35                |
| Pepperoni  | 1 masa, 1 salsa, 1 queso, 1 pepperoni     | 45                |
| Hawaiana   | 1 masa, 1 salsa, 1 queso, 1 jamón, 1 piña | 42                |

El jugador fija el precio de venta de cada pizza (entre Bs 10 y Bs 100).

---

## Empleados
| Rol       | Sueldo diario (Bs) | Efecto                                      |
|-----------|---------------------|----------------------------------------------|
| Cocinero  | 120                 | +15 pizzas de capacidad de producción/jornada |
| Cajero    | 90                  | +25 clientes de capacidad de atención/jornada |

- Sin empleados, el dueño produce hasta 20 pizzas y atiende hasta 15 clientes por jornada.
- Se pagan al cerrar la jornada.
- Máximo de empleados por rol = nivel actual.

---

## Jornada (3 fases)
1. **PREPARAR**: comprar insumos, producir pizzas, contratar/despedir, comprar mejoras, fijar precios.
2. **ABRIR**: el sistema simula las ventas automáticamente.
3. **CERRAR**: se pagan sueldos, se muestra resumen del día.

---

## Cálculo de demanda
- **Clientes base por día**: 40.
- **Factor por día de la semana**:
  - Lunes: 0.8, Martes: 0.8, Miércoles: 0.9, Jueves: 1.0, Viernes: 1.2, Sábado: 1.5, Domingo: 1.4.
  - El juego empieza un lunes.
- **Reparto de preferencia**: Margarita 40%, Pepperoni 35%, Hawaiana 25%.
- **Factor de precio** de cada pizza:
  ```
  factorPrecio = clamp(1 - 1.5 * (precio / precioReferencia - 1), 0, 1.5)
  ```
- **Demanda de una pizza**:
  ```
  demanda = floor(clientesBase * factorDía * preferencia * factorPrecio)
  ```
- **Ventas reales** de una pizza:
  ```
  ventas = min(demanda, stock, capacidadAtenciónRestante)
  ```
  Los clientes totales atendidos no pueden superar la capacidad de los cajeros.
- **Ingreso** = ventas × precio.
- Registrar **demanda perdida** (por falta de stock y por falta de cajeros).

---

## Mejoras (compra única, desbloqueo por nivel)
| Mejora              | Tipo       | Efecto                                   | Costo (Bs) | Nivel |
|---------------------|------------|------------------------------------------|------------|-------|
| Horno mediano       | capacidad  | +15 producción                           | 800        | 1     |
| Bodega ampliada     | capacidad  | +200 de bodega                           | 600        | 1     |
| Batidora industrial | eficiencia | -10% costo de masa, salsa y queso        | 1.000      | 2     |
| Caja moderna        | eficiencia | +10 clientes de capacidad de atención    | 900        | 2     |
| Horno industrial    | capacidad  | +40 producción                           | 2.500      | 3     |

Usar máscara de bits para representar mejoras compradas.

Bits asignados:
- Bit 0 (1):  Horno mediano
- Bit 1 (2):  Bodega ampliada
- Bit 2 (4):  Batidora industrial
- Bit 3 (8):  Caja moderna
- Bit 4 (16): Horno industrial

---

## Niveles (por capital máximo histórico)
| Nivel | Capital requerido (Bs) |
|-------|------------------------|
| 1     | 0 (inicio)             |
| 2     | 3.000                  |
| 3     | 6.000                  |
| 4     | 12.000                 |
| 5     | 25.000                 |

Nivel 5 → pantalla de victoria de la demo.

---

## Derrota
Si al cerrar la jornada el capital es negativo → quiebra. Pantalla de fin con opción de reiniciar.

---

## Validaciones
Toda operación debe validar y, si falla, rechazarse con la causa:
- **Compra**: saldo suficiente y espacio en bodega.
- **Producción**: insumos suficientes y capacidad de producción disponible.
- **Contratación**: respetar máximo por nivel; saldo no se valida (se paga al cierre).
- **Mejora**: nivel requerido, saldo suficiente, no estar ya comprada.
- Cada operación válida actualiza saldo, inventario e historial como una sola operación lógica (atómica).

---

## Resumen de cierre (educativo)
Mostrar:
- Ingresos totales.
- Costo de insumos usados en el día.
- Sueldos pagados.
- Ganancia o pérdida del día.
- Capital final.
- Demanda perdida con causa.
- Mensaje educativo que explique la consecuencia de las decisiones.

---

## Estructuras de datos (con justificación)
- **Inventario** (insumos y pizzas terminadas): `Map<string, number>` → acceso O(1) por id.
- **Catálogos** (recetas, empleados, mejoras, niveles): arrays de solo lectura → colecciones pequeñas y fijas, iteración secuencial O(n) con n pequeño.
- **Mejoras compradas y elementos desbloqueados**: máscara de bits (`number` con operadores `| & ~`) → consulta y modificación O(1) sin overhead de objetos.
- **Historial de transacciones**: buffer circular de tamaño fijo (200 registros) → inserción O(1), sin reasignación de memoria.
- **NO usar**: listas enlazadas, colas ni montículos — no se justifican en este diseño.

---

## Interfaz
- Escena Phaser vista superior con estaciones clicables: Bodega, Horno, Mostrador, Oficina.
- Cada estación abre un panel HTML superpuesto.
- HUD siempre visible: capital, día (nombre), nivel, botón "Abrir pizzería".
- Mostrar cantidades de insumos y pizzas terminadas.

---

## Guardado
- Automático en `localStorage` al cerrar cada jornada.
- Exportar partida: descarga JSON con campo `version`.
- Importar partida: validar archivo antes de cargar.
- Nueva partida: reiniciar todo.

---

## Tests obligatorios (/core)
- Compra con saldo / sin saldo / sin espacio en bodega.
- Producción sin insumos / sobre la capacidad.
- Venta limitada por stock / por cajeros.
- Cálculo de demanda por día y precio.
- Subida de nivel.
- Quiebra.
- Máscara de bits: activar, consultar, desactivar sin afectar otros bits.
- Buffer circular al superar su tamaño.
- Exportar / importar guardado.

