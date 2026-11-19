# Informe de Auditoría y Cambios — Versión 5.0

**Sistema:** Control de Turnos y Horas Extras  
**Fecha:** 13 de noviembre de 2026  
**Base auditada:** commit `fff8d74` (rama `main`, versión 4.8)

---

## 1. Errores encontrados

### Motor de cálculo

| # | Error | Efecto | Corrección |
|---|---|---|---|
| 1 | Las horas de cada turno se agrupaban como "diurnas del día → nocturnas del día → diurnas del día siguiente → nocturnas del día siguiente" antes de compararlas con el tope | Al cruzar las 42 h, la extra quedaba en la categoría equivocada. Ej.: turno 04:00–12:00 con 35 h acumuladas daba 1 h **extra nocturna**; lo correcto es 1 h **extra diurna** (11:00–12:00) | Los minutos se agrupan en tramos en orden real del reloj y se distribuyen en ese orden |
| 2 | La configuración de alimentación quedaba fija tras generar el primer período | Cambiar 30 min ↔ 1 h no tenía efecto hasta recargar la página | Se lee de nuevo del formulario en cada "Siguiente" |
| 3 | Lo pre-guardado tenía prioridad sobre lo que estaba en pantalla | Si se cambiaba un turno después de pre-guardar, el cálculo usaba el valor viejo | Manda lo que está en pantalla; al calcular se sincroniza y se guarda |
| 4 | Fechas internas con `toISOString()` (UTC) | En equipos con otra zona horaria las fechas podían correrse un día | Clave de fecha en hora local |
| 5 | Incapacidad y vacaciones no sumaban al tope (regla anterior) | No cumplía la regla solicitada | Nueva regla (sección 5) |

### Programación y datos

| # | Error | Corrección |
|---|---|---|
| 6 | El pre-guardado solo vivía en memoria: al recargar se perdía todo, y no guardaba los días fuera del período (que sí cuentan para el tope) | Persistencia en `localStorage` de período, alimentación, empleados y todos los días de cada semana; aviso para recuperar al abrir |
| 7 | Volver a "Siguiente" borraba todos los empleados sin avisar | Pregunta si conservar o descartar |
| 8 | Eliminar un turno dinámico dejaba sus referencias en los días programados y el selector no se actualizaba | Elimina referencias (el día queda Libre), redibuja selectores y persiste |
| 9 | Cambiar el código de un turno dejaba los días asignados con el código viejo | Las asignaciones se migran al código nuevo |
| 10 | "Restaurar valores" borraba los turnos dinámicos de la configuración (luego fallaba "Añadir turno") y no refrescaba la pantalla | Conserva los turnos y redibuja tarjetas |
| 11 | Agregar o eliminar un concepto no se guardaba | Se guarda al momento |
| 12 | El manual describía "Eliminar empleado", pero el botón no existía | Implementado con confirmación |
| 13 | El documento aceptaba letras, espacios y símbolos | Solo números (ver 3) |

### Exportación a Excel

| # | Error | Corrección |
|---|---|---|
| 14 | En las hojas "Semana N", la fila TOTAL estaba **corrida una columna a la izquierda** (los totales quedaban bajo el encabezado equivocado) | Columnas alineadas |
| 15 | En "Semana N", el total "Horas x Turno" sumaba `totalHoras` **más** todas las categorías: el doble de las horas reales | Suma solo las categorías |
| 16 | Las horas se exportaban como texto ("7,5"): Excel no podía sumarlas | Números reales con formato `0.00` |
| 17 | La liquidación se exportaba como texto con "$" | Números con formato moneda |
| 18 | "Resumen de Turnos" usaba solo las semanas del primer empleado | Usa todas las semanas presentes |
| 19 | No existía forma de exportar un solo empleado | En resultado individual se exporta solo ese empleado |

### Interfaz y otros

| # | Error | Corrección |
|---|---|---|
| 20 | El color de los conceptos no era consistente (p. ej. Incapacidad azul en configuración y rosado en algunos badges) | Colores fijos centralizados |
| 21 | El cuadro de color del selector tenía el mismo color que su fondo y se veía como una casilla vacía; además las opciones mostraban "◼" | Selector rediseñado |
| 22 | Contraseña por `prompt` y se pedía en cada ingreso | Modal con mensajes claros y memoria por sesión |
| 23 | Código muerto (`obtenerHorasTrabajadasSemanaCompleta`) y librería `marked` sin versión fija | Eliminado / versión fijada |

---

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `archivos/TURNOS.js` | Motor, persistencia, resultados individuales, selector, exportación, validaciones |
| `archivos/TURNOS.css` | Estilos del selector de tarjetas, modal, aviso, acciones por empleado, móvil |
| `INICIO_TURNOS.html` | Modal de contraseña, aviso de programación guardada, campo de documento numérico, librerías con versión fija, versión de caché `202611131200` |
| `archivos/instructivo.md` y `archivos/instructivo.js` | Manual 4.0 |
| `README.md` | Reglas, pruebas, seguridad |
| `test/test_motor.js` (nuevo), `test/entorno_prueba.js` (nuevo), `test/test_conceptos.js` | Pruebas automáticas |
| `INFORME_AUDITORIA.md` (nuevo) | Este informe |

---

## 3. Funcionalidades implementadas

1. **Contraseña de configuración** `Alejostone`: modal, mensaje de error, cancelar, y no se vuelve a pedir en la misma pestaña.
2. **Documento solo numérico:** `inputmode="numeric"`, bloqueo de teclas, limpieza en tiempo real, validación al guardar, conserva ceros iniciales.
3. **Colores fijos:** Incapacidad azul `#1E88E5`, Sin contrato gris `#9E9E9E`, Permiso verde claro `#9CCC65`, Ausencia rojo `#E53935`, Vacaciones verde `#2E7D32`. No se pueden cambiar; se aplican en selector, calendario, tarjetas, resultados y Excel.
4. **Selector de turnos con tarjetas:** grupos "Turnos" y "Conceptos de nómina", nombre, horario, color, marca de seleccionado, cierre con `Esc`, adaptable a móvil.
5. **Eliminación real de turnos dinámicos** (los turnos base D, N y 24T quedan protegidos).
6. **Pre-guardado persistente** con indicador "Guardado / Cambios sin guardar", aviso al cerrar con cambios pendientes y recuperación al abrir.
7. **Resultados individuales:** botón "Ver resultados de …" en cada empleado (y 📊 en la lista); "Ver resultados de todos" y "← Atrás" sin perder datos.
8. **Eliminar empleado** con confirmación.
9. **Hoja "Novedades de Nómina"** en el Excel con las fechas de cada concepto y su efecto.

---

## 4. Lógica de las 42 horas

- Semana de domingo a sábado; el acumulado se reinicia cada domingo y nunca mezcla semanas.
- Acumulado = horas trabajadas + horas reconocidas de I/V − horas de ausencia (A). SC reduce el tope de lunes a sábado.
- Cada minuto trabajado se compara con el acumulado **en orden cronológico**: solo el tiempo posterior al instante en que se alcanzan las 42 h es extra, y se clasifica según la hora y el día (diurna, nocturna, festiva, nocturna festiva).
- Un turno de sábado que cruza a domingo: la parte del domingo es festiva.
- Domingo trabajado sin ningún día libre en la semana: sus horas son extras (regla existente, sin cambios).
- Valores redondeados a 6 decimales internamente y mostrados con 2 decimales, iguales en pantalla y Excel.

---

## 5. Incapacidades y vacaciones

- Aportan sus horas configuradas al acumulado (por defecto **7,33 h**; las configuraciones guardadas con 7 h se migran a 7,33 h).
- **Domingo y festivo:** aportan 0 h.
- **Semana sin ningún turno trabajado:** aportan 0 h para extras (el registro se conserva para nómina).
- No son horas trabajadas: no generan ordinarias ni extras por sí mismas; empujan el momento en que empieza la extra.
- Se reportan por separado: "Horas reconocidas por incapacidad" y "por vacaciones".
- **Permiso remunerado** no está en la regla solicitada: no suma al tope, solo cubre horas faltantes.

Ejemplo obligatorio 2.3: Dom I (0) + Lun I (7,33) + 3 turnos de 11 h (33) = 40,33 h → **0 extras**. ✔  
Ejemplo 2.4 (vacaciones lun–mié y trabajo después): las extras empiezan exactamente cuando el acumulado pasa de 42 h. ✔

---

## 6. Cambios en la exportación

Ver tabla de errores 14–19. Además:

- Todas las hojas se construyen desde las mismas funciones que la pantalla (`calcularResumenPeriodo`, `calcularLiquidacionEmpleado`).
- Encabezados con formato (fondo azul oscuro, texto blanco, negrita), filas de total resaltadas, bordes y celda del turno con el color del turno o concepto. Requiere la librería `xlsx-js-style@1.2.0` (compatible con la anterior).
- La hoja "Informe Horas Extras" conserva su orden de columnas y códigos de exportación para no romper la importación a nómina.
- Columnas nuevas en "Semana N": Documento, Tipo de día (Hábil/Domingo/Festivo), En período (Sí/No), Inc./Vac. al tope.

---

## 7. Pruebas ejecutadas y resultados

### Pruebas automáticas en Node.js

```bash
node test/test_motor.js      # 78 OK, 0 FAIL
node test/test_conceptos.js  # 22 OK, 0 FAIL
```

| Prueba solicitada | Resultado |
|---|---|
| Semana con 42 h exactas → 0 extras | ✔ |
| Semana con 45 h reales → 3 extras | ✔ |
| Incapacidad lunes a sábado sin trabajo → 0 h computables | ✔ |
| Incapacidad de domingo → 0 h | ✔ |
| Incapacidad de lunes y un turno → 7,33 h | ✔ |
| Vacaciones lun–mié y trabajo posterior → suman | ✔ (21,99 h + 33 h → 12,99 extras) |
| Vacaciones en domingo → 0 h | ✔ |
| Vacaciones en festivo → 0 h | ✔ (lunes 16-nov-2026) |
| Turnos nocturnos | ✔ |
| Turno que cruza medianoche | ✔ (sábado → domingo festivo) |
| Turno de 24 h | ✔ (23 h; 12,5 diurnas, 10,5 nocturnas) |
| Alimentación 30 min / 1 h / personalizada | ✔ |
| Eliminación de turno | ✔ |
| Pre-guardado | ✔ |
| Resultados individuales | ✔ |
| Exportación Excel = resultados | ✔ |
| Extras al cruzar el tope el sábado (sección 4) | ✔ |

### Pruebas de extremo a extremo en navegador real (Chrome)

Se ejecutó la aplicación completa en Chrome con un guion automatizado: **46 de 46 verificaciones correctas, sin errores de JavaScript**. Incluye contraseña, documento, selector de tarjetas, eliminación de turno con días asignados, pre-guardado, recarga y recuperación, resultados individuales y generales, y generación y relectura del Excel con estilos. También se revisó visualmente en escritorio (1366 px) y en móvil (390 px).

---

## 8. Limitaciones y decisiones pendientes

1. **Días fuera del período:** los días de la semana que quedan fuera del rango (antes del inicio o después del fin) cuentan para el tope, como antes, y **sus horas también se suman** en totales, liquidación y Excel. Si el período siguiente vuelve a incluir esa semana, esas horas podrían liquidarse dos veces. No se cambió porque es una regla de negocio; el Excel ahora los marca con "En período: No". **Requiere su decisión.**
2. **Contraseña:** se valida en el navegador y puede verse en el código fuente. Evita cambios accidentales, pero no es seguridad real. Para eso se necesita un servidor con autenticación.
3. **Pre-guardado:** se guarda por navegador y equipo; no se sincroniza entre equipos ni usuarios.
4. **Librerías por CDN:** sin internet no carga la librería de Excel ni el renderizado del manual.
5. **Festivos:** lista fija 2025–2027 en el código; hay que ampliarla para 2028.
6. **Renovación visual:** se rediseñaron el selector de turnos, los modales, las acciones por empleado, el aviso de recuperación y la cabecera de resultados, sobre el diseño existente. No se rehizo cada pantalla desde cero.
7. **Archivos antiguos no incluidos en el ZIP:** `archivos/tmp_test_runner.js` (temporal; además espera 23,5 h para el turno de 24 h, cuando la regla vigente da 23 h), `archivos/VALIDACION_CAMBIOS.js`, `archivos/ANALISIS_TOPE_SEMANAL.md`, `archivos/IMPLEMENTACION_CAMBIOS.md` (describen reglas anteriores y contradicen las actuales) y `archivos/desktop.ini`. Siguen en la carpeta del proyecto; no se borraron.

---

## 9. Cambio de regla en la versión 10 (19 nov 2026)

- **Antes (v5–v9):** incapacidad y vacaciones sumaban 7,33 h al acumulado y adelantaban las extras de los turnos.
- **Ahora (v10):** cuentan 7,33 h para la **jornada de 42 h** (cubren horas faltantes y se informan en el Excel), pero **no suman para extras**. Las extras salen solo de los turnos trabajados.
- Las condiciones para mostrar las 7,33 h no cambian: no en domingo ni festivo, y solo si la semana tiene turnos.
- Ejemplo: dom–mar incapacitado y mié–sáb turnos de 11 h (44 h) → antes 16,66 h extras; ahora **2 h** extras (44 − 42), el sábado.
