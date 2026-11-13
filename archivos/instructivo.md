# Sistema de Control de Turnos y Horas Extras
## Manual de Usuario y Operación (Versión Profesional)

---

**Versión del sistema:** 5.0  
**Versión del manual:** 4.0  
**Fecha de actualización:** Noviembre 2026  
**Autor:** Alejostone

---

## 1. Propósito del Sistema

El sistema permite gestionar turnos de trabajo y calcular automáticamente horas y recargos para nómina, con enfoque en:

- Precisión de cálculo (incluye cruces de medianoche).
- Clasificación correcta y cronológica de horas por tipo.
- Consolidación semanal y por período.
- Exportación de resultados y liquidación.

Está diseñado para operación diaria de RR. HH. y nómina, con configuración administrativa centralizada.

---

## 2. Alcance Funcional

El sistema incluye:

1. Configuración inicial de período y salario.
2. Configuración dinámica de turnos (crear, editar, desactivar y eliminar).
3. Configuración de alimentación (sin, predefinida, personalizada).
4. Programación diaria por empleado con selector visual de tarjetas.
5. Gestión de empleados (agregar, editar, eliminar, pre-guardar).
6. Pre-guardado persistente: la programación se recupera al recargar la página.
7. Resultados individuales por empleado y resultados generales.
8. Cálculo de horas con motor minuto a minuto.
9. Liquidación monetaria de recargos y horas extra.
10. Exportación a Excel (general o individual).
11. Panel de configuración del sistema protegido con contraseña.

---

## 3. Flujo de Uso Recomendado

```text
Configuración Inicial
       ↓
Configurar Turnos + Alimentación
       ↓
Agregar Empleados
       ↓
Programar Turnos  →  💾 Pre-guardar
       ↓
📊 Ver resultados del empleado   (o "Ver Resultados" de todos)
  ├─ Resultados Semanales
  ├─ Resumen Total del Período
  └─ Liquidación de Pago
       ↓
Exportar Excel
```

---

## 4. Pantalla de Configuración Inicial

### 4.1 Datos principales

| Campo | Uso |
|---|---|
| Número de empleados | Cantidad inicial de empleados a registrar |
| Salario mensual base | Valor de referencia para liquidación |
| Fecha inicio / fecha fin | Rango del período a trabajar |

### 4.2 Comportamiento del período

El calendario se organiza por semanas completas **domingo a sábado**, incluso cuando el rango no inicia en domingo o termina en sábado.  
Esto es intencional y necesario para calcular correctamente extras semanales.

### 4.3 Programación guardada

Si en este navegador hay una programación guardada, aparece un aviso con el número de empleados, el período y la fecha de guardado:

- **Continuar programación:** recupera empleados, turnos y alimentación.
- **Descartar:** borra la programación guardada (pide confirmación).

### 4.4 Botones disponibles

| Botón | Función |
|---|---|
| Siguiente | Abre flujo de empleados y programación. Si ya hay empleados, pregunta si desea conservarlos |
| Limpiar Todo | Borra empleados y programación guardada (pide confirmación) |
| Configuración | Abre el panel administrativo (pide contraseña) |
| Manual de Usuario | Abre este documento |

---

## 5. Configuración de Turnos

### 5.1 Turnos base

El sistema crea y mantiene como base (marcados con 🔒):

- `D` (Día)
- `N` (Noche)
- `24T` (24 horas)

Se pueden **editar** (nombre, horario, color), pero no eliminar ni desactivar.

Colores por defecto: Día amarillo claro, Noche azul, 24 Horas violeta.

### 5.2 Turnos dinámicos

Pulse **+ Nuevo turno**: se abre una ventana para definir nombre, código, horario, color y si descuenta alimentación, con una vista previa de las horas efectivas. El turno **solo se crea al pulsar Guardar turno**; Cancelar no crea nada. Para cambiar un turno existente use **Editar**.

### 5.3 Eliminar un turno

1. Pulse 🗑️ en la tarjeta del turno.
2. Confirme. El sistema indica en cuántos días está asignado.
3. El turno desaparece de la configuración, del selector y de lo guardado. Los días que lo tenían quedan como **Libre**.

### 5.4 Reglas de código

- El código debe ser único.
- No se permiten colisiones con `C` (Libre) ni `M` (Manual).
- El sistema normaliza a mayúsculas. Si cambia un código, la programación se actualiza al nuevo código.

---

## 6. Configuración de Alimentación

| Modo | Descripción |
|---|---|
| Sin almuerzo | No hay descuento |
| Predefinido | 30 min o 1 hora |
| Personalizado | Rango horario definido por el usuario |

### 6.1 Regla aplicada en cálculo

```text
Inicio efectivo = inicio programado + tiempo de alimentación
```

La pausa se descuenta al inicio del turno laborado. Ejemplo: turno de 12 h con 1 h de alimentación = 11 h efectivas.

### 6.2 Turnos de 24 horas

En turnos 24H se aplica una segunda pausa (12 horas después del inicio). Con 30 min: 24 h − 2 × 0,5 h = 23 h.

---

## 7. Programación de Turnos

### 7.1 Selector visual

Al pulsar el día se abre un panel de tarjetas en dos grupos:

1. **Turnos:** turnos activos, `C` (Libre) y `M` (Manual), con su horario.
2. **Conceptos de nómina:** Incapacidad, Vacaciones, Permiso, Ausencia, Sin contrato, etc.

La tarjeta seleccionada aparece marcada con ✓. `Esc` o un clic fuera cierra el panel.

### 7.2 Colores fijos de los conceptos

| Concepto | Color |
|---|---|
| Incapacidad (I) | Azul |
| Sin contrato (SC) | Gris |
| Permiso remunerado (PR) | Verde claro |
| Ausencia (A) | Rojo |
| Vacaciones (V) | Verde |

Estos colores no se pueden cambiar y se usan en el selector, el calendario, los resultados y el Excel.

### 7.3 Turno Manual (M)

Permite ingresar inicio y fin solo para ese día. Se calcula con la misma lógica de clasificación y alimentación del resto de turnos.

---

## 8. Gestión de Empleados

### 8.1 Documento

El número de documento **solo admite números**: el campo bloquea letras, espacios y símbolos, y no deja guardar un documento vacío. Se conservan los ceros iniciales.

### 8.2 Acciones por empleado

| Acción | Resultado |
|---|---|
| Agregar | Crea empleado con su período propio |
| ✏️ Editar | Ajusta datos y regenera calendario sin perder turnos |
| 🗑️ Eliminar | Borra el empleado y su programación (pide confirmación) |
| 💾 Pre-guardar | Guarda la programación en el navegador |
| 📊 Ver resultados | Pre-guarda y muestra solo los resultados de ese empleado |

### 8.3 Estado de guardado

Debajo de cada empleado se indica **✔ Guardado (fecha)** o **● Cambios sin guardar**. Si intenta cerrar la página con cambios sin guardar, el navegador pide confirmación.

---

## 9. Motor de Cálculo de Horas

El motor clasifica:

- Ordinarias diurnas, nocturnas, festivas y nocturnas festivas.
- Extras diurnas, nocturnas, festivas y nocturnas festivas.

Cada minuto trabajado se clasifica **en orden cronológico**: el tiempo anterior al instante en que se alcanza el tope es ordinario y el posterior es extra, con la naturaleza (diurna/nocturna, hábil/festiva) del momento en que ocurre.

---

## 10. Tope Semanal de 42 horas

### 10.1 Regla

- Tope fijo de **42 horas** por semana (domingo a sábado). El acumulado se reinicia cada domingo.
- Suman al acumulado: horas realmente trabajadas, e incapacidad y vacaciones según 10.2.
- No reducen el tope: festivos no trabajados ni domingos.
- `SC` (Sin contrato) reduce el tope en sus horas por cada día de lunes a sábado.
- `A` (Ausencia) resta sus horas del acumulado.

### 10.2 Incapacidad y vacaciones

- Aportan sus horas configuradas (por defecto **7,33 h**) al acumulado semanal.
- **Domingo y festivo no aportan.**
- Solo aportan si en esa semana hay **al menos un turno realmente trabajado**. Una semana completa de incapacidad o vacaciones no genera horas para extras.
- No son horas trabajadas: nunca generan horas ordinarias ni extras por sí mismas.

Ejemplo: domingo y lunes de incapacidad, martes a jueves turnos de 11 h → 33 h + 7,33 h = 40,33 h → **0 extras**.

### 10.3 Permiso remunerado

`PR` no suma al acumulado de extras; solo cubre horas faltantes de la semana.

### 10.4 Horas faltantes (deuda)

```text
Deuda = máx(0, Tope − (Horas trabajadas + Horas I/PR/V − Horas A))
```

Las horas de I/PR/V cuentan para la deuda excepto en domingo y festivo.

### 10.5 Domingo sin descanso

Si se trabaja el domingo y no hay día libre en la semana, las horas del domingo se liquidan como extras festivas.

---

## 11. Festivos y Domingos

- El domingo siempre se considera festivo.
- El sistema incluye los festivos de Colombia 2025–2027.
- La celda del calendario se resalta cuando el día es festivo.

---

## 12. Conceptos de Nómina

| Código | Concepto | Horas por defecto | Efecto |
|---|---|---:|---|
| C | Libre | 0 | Ninguno |
| I | Incapacitado | 7,33 | Suma al tope (10.2) |
| V | Vacaciones | 7,33 | Suma al tope (10.2) |
| PR | Permiso remunerado | 7 | Solo cubre deuda |
| A | Ausencia | 7 | Resta del acumulado |
| SC | Sin contrato | 7 | Reduce el tope (lun–sáb) |

Los conceptos base no se pueden eliminar. Un concepto nuevo cuyo nombre contenga *incapacidad* o *vacaciones* se comporta como I/V; con *permiso remunerado*, como PR.

---

## 13. Panel de Configuración del Sistema

El acceso pide la contraseña del administrador. Una vez autorizada, no se vuelve a pedir mientras la pestaña del navegador siga abierta.

> La contraseña se valida en el navegador: protege contra cambios accidentales, pero no es seguridad real frente a usuarios con conocimientos técnicos.

Incluye recargos, horas extras, horario nocturno, conceptos de nómina y códigos de exportación.

| Concepto | % por defecto |
|---|---:|
| Recargo nocturno | 35 |
| Recargo festivo diurno | 90 |
| Recargo festivo nocturno | 125 |
| Extra diurna | 25 |
| Extra nocturna | 75 |
| Extra festiva diurna | 115 |
| Extra festiva nocturna | 165 |

La configuración se guarda en el navegador (`localStorage`).

---

## 14. Vista de Resultados

### 14.1 Modos

- **Resultado individual** (📊 en el empleado): muestra solo ese empleado. El botón **Ver resultados de todos** cambia al resultado general.
- **Resultado general** (botón **Ver Resultados**): todos los empleados.
- **← Atrás** vuelve a la programación sin perder datos.

### 14.2 Pestañas

1. **Resultados Semanales:** detalle por día, horas que I/V suman al tope y horas justificadas para la deuda.
2. **Resumen Total del Período:** incluye horas reconocidas por incapacidad y por vacaciones.
3. **Liquidación de Pago.**

---

## 15. Liquidación de Pago

```text
Valor hora ordinaria = salario mensual / 220
```

| Tipo | Cálculo |
|---|---|
| Recargo | valor hora × (porcentaje / 100) |
| Hora extra | valor hora × (1 + porcentaje / 100) |

---

## 16. Exportación a Excel

Exporta exactamente lo que se ve en resultados: todos los empleados o, en resultado individual, solo ese empleado.

| Hoja | Contenido |
|---|---|
| Informe Horas Extras | Una fila por día trabajado o con concepto, con códigos de exportación para nómina. En días de incapacidad o vacaciones, la columna Horas Trabajadas muestra las horas reconocidas (7,33) solo si ese día sumó al tope (semana con turnos, no domingo ni festivo); es informativo y no entra en los totales |
| Novedades de Nómina | Fechas de incapacidad, vacaciones, permisos y demás conceptos, con su efecto en el tope |
| Liquidación de Pago | Valores por concepto y total por empleado |
| Resumen Total Horas | Totales del período, incluidas horas reconocidas por I/V |
| Semana N | Detalle diario, tipo de día (hábil/domingo/festivo) y si el día está dentro del período |
| Resumen de Turnos | Conteo de turnos por tipo y semana |

Las horas se exportan como números con 2 decimales y los encabezados con formato.  
En web usa descarga del navegador; en Electron, el diálogo de guardado.

---

## 17. Buenas Prácticas Operativas

1. Configure turnos y alimentación antes de programar.
2. Pre-guarde cada empleado al terminar su programación.
3. Registre incapacidades, vacaciones y permisos con su concepto, no como turno trabajado.
4. Revise domingos y festivos antes de liquidar.
5. Exporte y archive el Excel al cerrar el cálculo.

---

## 18. Solución de Problemas

### No abre el manual
- Verifique `archivos/instructivo.js`.

### No exporta Excel
- Verifique la conexión a internet (la librería de Excel se carga desde CDN).
- En web: habilite descargas del navegador.

### No aparece un turno en el selector
- Verifique que esté activo y no haya sido eliminado.

### Los cambios no se reflejan
- Recargue con **Ctrl + F5**.

### Perdí la programación al recargar
- Si fue pre-guardada, use **Continuar programación** en la pantalla inicial.
- La programación se guarda por navegador y equipo: otro navegador no la ve.

---

## 19. Glosario Rápido

| Término | Definición |
|---|---|
| Acumulado semanal | Horas trabajadas + I/V reconocidas − ausencias, usado para extras |
| Horas reconocidas | Horas de I/V que suman al tope |
| Horas deuda | Horas faltantes para completar el tope semanal |
| Turno dinámico | Turno configurable por administrador |
| Turno manual | Turno definido por hora inicio/fin en un día específico |
| Extra | Hora trabajada después de alcanzar el tope semanal |

---

## 20. Control de Cambios del Manual

| Versión | Fecha | Cambio |
|---|---|---|
| 2.1 | Jul-2026 | Manual anterior |
| 3.0 | Jul-2026 | Revisión alineada a la lógica del sistema |
| 4.1 | Nov-2026 | Nuevo diseño de la pantalla inicial y de la programación, ventana para crear/editar turnos, colores base de turnos, horas reconocidas de I/V en el Informe |
| 4.0 | Nov-2026 | I/V suman al tope (7,33 h; no domingo/festivo; requiere turno real), clasificación cronológica, selector de tarjetas, colores fijos, contraseña, pre-guardado persistente, resultados individuales, eliminación de turnos y empleados, Excel auditado |

---

*Sistema de Control de Turnos v5.0 — © 2026 Alejostone — Todos los derechos reservados.*
