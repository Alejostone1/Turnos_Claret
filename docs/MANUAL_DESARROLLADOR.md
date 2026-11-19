# Manual del desarrollador
## Control de Turnos y Horas Extras · Versión 10

Referencia técnica para mantener, probar y desplegar el sistema. Para el uso diario, ver el **Manual de usuario** (`archivos/instructivo.md`, visible dentro de la aplicación).

---

## 1. Arquitectura

Aplicación **100 % frontend**, sin servidor ni base de datos:

| Archivo | Rol |
|---|---|
| `INICIO_TURNOS.html` | Vista única con las secciones: configuración, programación, resultados, configuración del sistema y manual. Incluye los modales (empleado, turno, contraseña). |
| `index.html` | Redirige a `INICIO_TURNOS.html` (entrada de Vercel). |
| `archivos/TURNOS.js` | Clase `SistemaTurnosMejorado`: interfaz, motor de cálculo, persistencia y exportación. |
| `archivos/TURNOS.css` | Estilos. El bloque `v6 — Tema táctil` al final define el tema actual (tokens `--t-*`, superficies elevadas, controles hundidos, botones tipo tecla) y sobrescribe estilos anteriores. |
| `archivos/instructivo.md` | Manual de usuario (Markdown). |
| `archivos/instructivo.js` | El mismo manual en Base64 (`window.INSTRUCTIVO_B64`) para abrirlo desde `file://` sin bloqueos de CORS. |
| `archivos/manual/*.png` | Capturas usadas por el manual de usuario. |
| `archivos/main.js`, `preload.js`, `package.json` | Versión de escritorio con Electron (opcional). |
| `test/*.js` | Pruebas automáticas en Node.js. |

Librerías externas por CDN, con versión fija:

| Librería | Uso |
|---|---|
| `xlsx-js-style@1.2.0` | Generación del Excel con estilos (compatible con SheetJS 0.18.5; expone `XLSX`). |
| `marked@12.0.2` | Renderiza el manual en Markdown. |
| Google Fonts | Bricolage Grotesque (títulos), IBM Plex Sans (texto), IBM Plex Mono (horas, fechas y cifras). Sin internet se usan fuentes del sistema. |

La instancia queda disponible como `window.sistemaTurnos` para soporte y pruebas.

---

## 2. Modelo de datos

### 2.1 Configuración (`localStorage["configuracionTurnos"]`)

```js
{
  recargoNocturno: { porcentaje: 35, inicio: "19:00", fin: "06:00" },
  recargoFestivo: { porcentaje: 90 },
  recargoNocturnoFestivo: { porcentaje: 125 },
  extraDiurna: { porcentaje: 25 },
  extraNocturna: { porcentaje: 75 },
  extraDiurnaFestiva: { porcentaje: 115 },
  extraNocturnaFestiva: { porcentaje: 165 },
  tiposTurnoEspeciales: {            // conceptos de nómina
    I:  { nombre, horas: 7.33, descripcion, color },
    V:  { ... horas: 7.33 }, PR: { ... 7 }, A: { ... 7 }, SC: { ... 7 }
  },
  turnosDinamicos: {                 // turnos asignables
    D:   { id, nombre, codigo, inicio: "07:00", fin: "19:00", color, descontarAlimentacion, activo },
    N:   { ... }, "24T": { ... }, T1: { ... }
  },
  codigoExportacion: { horasExtrasDiurnas: "045", ... },
  versionConceptos: 3,               // migraciones de conceptos
  versionTurnos: 3                   // migraciones de turnos base
}
```

### 2.2 Programación guardada (`localStorage["programacionTurnos_v1"]`)

```js
{
  version: 1,
  guardadoEn: "ISO",
  periodo: { fechaInicio, fechaFin, numeroEmpleados, salario },
  almuerzo: { tipo: "predefinido" | "personalizado" | "sin-almuerzo", tiempoEnHoras, inicio?, fin? },
  empleados: [{
    documento: "0123",               // texto: conserva ceros iniciales
    nombre, salario, fechaInicio, fechaFin, preGuardado, guardadoEn,
    turnos: { "2026-11-02": { turno: "D" }, "2026-11-03": { turno: "M", inicioManual, finManual } }
  }]
}
```

Las fechas usan `_fechaKey(fecha)` en **hora local** (`YYYY-MM-DD`). No usar `toISOString()`: en otras zonas horarias corre un día.

### 2.3 Sesión

`sessionStorage["configAutorizada"] = "1"` tras ingresar la contraseña.

### 2.4 Empleado en memoria

```js
{
  documento, nombre, salario, fechaInicio, fechaFin,
  semanas: [{ numero, inicioSemana, finSemana, dias: [{ fecha, nombreDia, esFestivo, enRango }] }],
  turnosGuardados: Map<fechaKey, { turno, inicioManual?, finManual? }>,
  resultados: [...],                 // ver 3.4
  preGuardado, cambiosSinGuardar, guardadoEn
}
```

Al calcular, `_sincronizarTurnosDesdeDOM()` copia la pantalla a `turnosGuardados` (todos los días de cada semana, incluidos los fuera de rango). `_obtenerTurnoAsignadoParaDia()` prioriza el selector en pantalla y, si no existe, usa lo guardado.

---

## 3. Motor de cálculo

Punto de entrada: `calcularTurnos(documentos = null)` → por cada empleado `_calcularResultadosEmpleado(empleado)`.

### 3.1 Por semana (domingo a sábado)

1. Lee el turno de cada día.
2. `semanaConTurnoReal` = hay al menos un turno dinámico o manual (`M`).
3. **Tope:** `42 + Σ ajusteTope` (SC resta sus horas de lunes a sábado).
4. Recorre los días en orden con `horasAcumuladasParaExtras`:
   - **Turno trabajado:** `calcularHorasTurno()` o turno manual → `_procesarTurnoDetallado()`.
   - **Domingo trabajado sin ningún `C` en la semana:** se procesa con el acumulado = tope (todo extra).
   - **Concepto:** `_obtenerAjusteConceptoEspecial(codigo, esDomingo, { esFestivo, semanaConTurnoReal })`.
5. Deuda: `máx(0, tope − (trabajadas + horasCubreDeuda − ausencias))`.

### 3.2 Comportamiento de conceptos (`_obtenerComportamientoConceptoEspecial`)

| Comportamiento | Códigos (o nombre que contenga) | Efecto |
|---|---|---|
| `suma_tope` | `I`, `V` (*incapac*, *vacacion*) | Cuenta `horas` para la jornada (cubre deuda) si no es domingo/festivo y `semanaConTurnoReal`. Se registra en `horasIncapacidad` / `horasVacaciones`. **No** suma a `horasAcumuladasParaExtras` (desde v10). |
| `cubre_deuda` | `PR` (*permiso* + *remuner*) | Solo `horasCubreDeuda` (no domingo/festivo). |
| `resta` | `A` (*ausencia*) | Resta `horas` del acumulado. |
| `reduce_tope` | `SC` (*sincontrato*) | Resta `horas` al tope, lunes a sábado. |
| `ninguno` | resto | Sin efecto. |

### 3.3 Clasificación cronológica (`_procesarTurnoDetallado`)

1. `_obtenerContextoAlimentacionTurno()` calcula el inicio efectivo (inicio + alimentación) y las ventanas no laboradas (segunda pausa en 24 h).
2. Recorre minuto a minuto y agrupa **tramos consecutivos** con la misma naturaleza: `{ esNocturno, esDiaSiguiente }`.
3. Distribuye cada tramo **en orden** con `_distribuirHoras()`: lo que cabe bajo el tope es ordinario; el resto, extra. Diurno/nocturno y festivo (día de inicio o día siguiente) definen la categoría.

> Antes de v5.0 se agrupaba por bloques (diurno día 1 → nocturno día 1 → …), lo que podía clasificar mal la extra al cruzar el tope.

### 3.4 Resultado por semana

```js
{
  numero, inicioSemana, finSemana, horasMaximas, ajusteTope,
  semanaConTurnoReal, horasReconocidasTope, horasEquivalentesTope, horasEquivalentesNegativas,
  horasAcumuladasParaTope, detalleHorasEquivalentesTope,
  resumen: { totalHoras, horasOrdinarias, horasNocturnas, horasFestivas, horasNocturnasFestivas,
             extrasOrdinarias, extrasNocturnas, extrasFestivas, extrasNocturnasFestivas,
             horasIncapacidad, horasVacaciones, horasDeuda },
  turnos: [{ dia, fecha, turno, esFestivo, esDomingo, enRango, inicio, fin, ...mismos campos }]
}
```

Todos los valores pasan por `_redondearHoras()` (6 decimales). En pantalla y Excel se muestran con 2.

### 3.5 Totales y liquidación

- `calcularResumenPeriodo(empleado)`: suma de semanas.
- `calcularLiquidacionEmpleado(empleado)`: valor hora = salario / 220; recargo = valor × %; extra = valor × (1 + %).

Pantalla y Excel usan **estas mismas funciones**.

---

## 4. Exportación a Excel

- `construirLibroExcel()` devuelve `{ hojas: [{ nombre, filas, cols, encabezados, totales, formatos, rellenos, sinBordes, congelarFilas }] }`. **No depende del DOM ni de XLSX**, por eso se prueba en Node.
- `_crearHojaExcel(hoja)` convierte cada hoja con `XLSX.utils.aoa_to_sheet` y aplica formatos numéricos (`0.00`, `"$"#,##0`) y estilos.
- `exportarResultados()` escribe el archivo (web: `XLSX.writeFile`; Electron: `window.electronAPI.saveFile`).
- Respeta `filtroResultados` (resultado individual).

| Hoja | Generador |
|---|---|
| Informe Horas Extras | `_generarDatosInformeHorasExtras()` (formato de importación; no cambiar el orden de columnas) |
| Novedades de Nómina | `_generarHojaNovedades()` |
| Liquidación de Pago | `_generarHojaLiquidacion()` |
| Resumen Total Horas | `_generarHojaResumenTotal()` |
| Semana N | `_generarHojasSemanales()` |
| Resumen de Turnos | `_generarHojaResumenTurnos()` |

---

## 5. Interfaz

| Función | Descripción |
|---|---|
| `navegarA(seccionId)` | Muestra una sección y actualiza los pasos (`_actualizarPasos`). |
| `generarTarjetasTurnosDinamicos()` | Lista de turnos del Paso 1. |
| `abrirModalTurno(codigo)` / `guardarTurnoDinamico(datos, codigoOriginal)` | Crear/editar turno con validación. `guardarTurnoDinamico` no depende del DOM. |
| `eliminarTurnoDinamico(codigo)` | Elimina y limpia referencias (`_reemplazarReferenciasTurno`). |
| `mostrarFormularioTurnos()` | Dibuja empleados, semanas y selectores. |
| `inicializarCustomSelects()` | Selector de tarjetas sobre el `<select>` nativo (fuente de verdad). |
| `preGuardarTurnosEmpleado(doc)` / `guardarEstadoProgramacion()` | Persistencia. |
| `continuarProgramacionGuardada()` | Recupera desde `localStorage`. |
| `verResultadosEmpleado(doc)` | Resultado individual. |
| `solicitarContraseñaParaConfig()` | Modal de contraseña. |
| `inicializarSelectorPeriodo()` / `aplicarPeriodo(ini, fin)` | Calendario de rango propio. Escribe en `#fecha-inicio` y `#fecha-fin` (ocultos), que siguen siendo la fuente de verdad. |
| `resumirPeriodo(inicio, fin)` | Días, semanas de cálculo (domingo a sábado) y festivos entre semana. |
| `_htmlReglaTurno(turno, confAlm)` | Regla de 24 h: horario del turno, horario nocturno (`recargoNocturno`) y pausas de alimentación (las mismas ventanas que usa el motor). |
| `_actualizarEjemploAlimentacion()` | Ejemplo vivo de horas efectivas del turno Día con la alimentación elegida. |

Constantes estáticas (al final de `TURNOS.js`):

| Constante | Valor |
|---|---|
| `COLORES_CONCEPTOS_FIJOS` | I azul, SC gris, PR verde claro, A rojo, V verde (no editables) |
| `COLORES_TURNOS_BASE` | D `#FDE68A`, N `#3B82F6`, 24T `#8B5CF6` (por defecto, editables) |
| `TURNOS_PROTEGIDOS` | `D`, `N`, `24T` |
| `CLAVE_CONFIGURACION` | `"Alejostone"` |

---

## 6. Migraciones

En `cargarConfiguracion()`:

| Versión | Cambio |
|---|---|
| `versionConceptos` 2 | A y SC pasan de 0 a 7 h. |
| `versionConceptos` 3 | I y V pasan de 7 a 7,33 h. |
| `versionTurnos` 3 | D, N y 24T toman los colores base (una sola vez). |
| siempre | Colores fijos de conceptos; limpieza del concepto obsoleto "Día de la Familia". |

Para un cambio futuro, aumente la versión correspondiente y agregue el bloque de migración; nunca sobrescriba datos del usuario en cada carga.

---

## 7. Pruebas

```bash
node test/test_motor.js
node test/test_conceptos.js
```

- `test/entorno_prueba.js`: DOM y `localStorage` simulados, `crearApp()` con turnos de prueba y `agregarEmpleado()` por semanas.
- `test_motor.js`: tope, I/V, festivos, nocturnas, medianoche, 24 h, alimentación, cruce cronológico, turnos (crear/editar/eliminar), colores, pre-guardado, resultados individuales, Excel = pantalla, documento, contraseña.
- `test_conceptos.js`: reglas de conceptos e Informe.

Pruebas de extremo a extremo: se ejecutaron con Chrome sin interfaz (`--headless=new --dump-dom`) cargando una copia de `INICIO_TURNOS.html` con un guion que recorre el flujo y escribe el resultado en la página.

---

## 8. Despliegue

### Web (Vercel)
- Proyecto estático: Framework `Other`, sin comando de build. `vercel.json` define rutas y caché.
- Los `.js` y `.css` tienen caché larga: **cambie el parámetro `?v=AAAAMMDDhhmm`** en `INICIO_TURNOS.html` en cada publicación.

### Escritorio (Electron)
```bash
cd archivos
npm install
npm start
```

### Paquete ZIP para usuarios
Carpeta `Turnos V5/` con `ABRIR SISTEMA DE TURNOS.html` (redirige a `sistema/INICIO_TURNOS.html`) y la carpeta `sistema/` con el proyecto.

---

## 9. Tareas comunes

| Tarea | Dónde |
|---|---|
| Agregar festivos de un año nuevo | `this.festivosColombia` en el constructor (`"YYYY-MM-DD"`). Hoy cubre 2025–2027. |
| Cambiar la contraseña | `SistemaTurnosMejorado.CLAVE_CONFIGURACION`. |
| Cambiar horas por defecto de I/V | `_conceptosPorDefecto()` + migración si debe afectar configuraciones guardadas. |
| Cambiar colores base de turnos | `COLORES_TURNOS_BASE` + nueva `versionTurnos` si deben aplicarse a instalaciones existentes. |
| Actualizar el manual de usuario | Editar `archivos/instructivo.md` y regenerar `instructivo.js` (Base64 del Markdown). |
| Regenerar capturas del manual | Chrome sin interfaz con `--screenshot`, guardando en `archivos/manual/`. |

Regenerar `instructivo.js`:

```bash
node -e "const fs=require('fs');const md=fs.readFileSync('archivos/instructivo.md','utf8');fs.writeFileSync('archivos/instructivo.js','window.INSTRUCTIVO_B64 = \''+Buffer.from(md).toString('base64')+'\';\n')"
```

---

## 10. Limitaciones conocidas

1. **Días fuera del período:** cuentan para el tope y sus horas se suman en totales y liquidación. Si el período siguiente incluye esa semana, podrían liquidarse dos veces. Pendiente de decisión de negocio.
2. **Contraseña:** validación solo en el navegador; visible en el código. No es seguridad real.
3. **Persistencia por navegador:** `localStorage` no se sincroniza entre equipos.
4. **CDN:** sin internet no se genera el Excel ni se renderiza el manual.
5. **Festivos fijos** en el código.
6. La pantalla **Configuración del sistema** conserva el diseño anterior.
