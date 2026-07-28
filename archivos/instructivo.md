# Sistema de Control de Turnos y Horas Extras
## Manual de Usuario y Operación (Versión Profesional)

---

**Versión del sistema:** 4.8  
**Versión del manual:** 3.0  
**Fecha de actualización:** Julio 2026  
**Autor:** Alejostone

---

## 1. Propósito del Sistema

El sistema permite gestionar turnos de trabajo y calcular automáticamente horas y recargos para nómina, con enfoque en:

- Precisión de cálculo (incluye cruces de medianoche).
- Clasificación correcta de horas por tipo.
- Consolidación semanal y por período.
- Exportación de resultados y liquidación.

Está diseñado para operación diaria de RR. HH. y nómina, con configuración administrativa centralizada.

---

## 2. Alcance Funcional

El sistema incluye:

1. Configuración inicial de período y salario.
2. Configuración dinámica de turnos (código, horario, color, estado).
3. Configuración de alimentación (sin, predefinida, personalizada).
4. Programación diaria por empleado.
5. Gestión de empleados (agregar, editar, pre-guardar).
6. Cálculo de horas con motor minuto a minuto.
7. Visualización de resultados semanales y totales.
8. Liquidación monetaria de recargos y horas extra.
9. Exportación a Excel.
10. Panel de configuración del sistema (recargos, horario nocturno, conceptos, códigos de exportación).

---

## 3. Flujo de Uso Recomendado

```text
Configuración Inicial
       ↓
Configurar Turnos + Alimentación
       ↓
Agregar Empleados
       ↓
Programar Turnos
       ↓
Ver Resultados
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

### 4.3 Botones disponibles

| Botón | Función |
|---|---|
| Siguiente | Abre flujo de empleados y programación |
| Limpiar Todo | Reinicia la sesión de trabajo |
| Configuración | Abre panel administrativo |
| Manual de Usuario | Abre este documento |

---

## 5. Configuración de Turnos

## 5.1 Turnos base

El sistema crea y mantiene como base:

- `D` (Día)
- `N` (Noche)
- `24T` (24 horas)

Estos turnos se pueden **editar** (nombre, horario, color), pero el sistema protege su uso para mantener compatibilidad operativa.

## 5.2 Turnos dinámicos

Puede crear turnos adicionales (ej. `T1`, `T2`, etc.) con:

- Nombre.
- Código.
- Hora de inicio y fin.
- Color.
- Estado activo/inactivo.
- Opción de descontar alimentación.

## 5.3 Reglas de código

- El código debe ser único.
- No se permiten colisiones con `C` (Libre) ni `M` (Manual).
- El sistema normaliza a mayúsculas.

---

## 6. Configuración de Alimentación (Regla Vigente)

El sistema maneja tres modos:

| Modo | Descripción |
|---|---|
| Sin almuerzo | No hay descuento |
| Predefinido | 30 min o 1 hora |
| Personalizado | Rango horario definido por el usuario |

## 6.1 Regla principal aplicada en cálculo

Cuando hay alimentación, el cálculo inicia desde:

```text
Inicio efectivo = inicio programado + tiempo de alimentación
```

Es decir, la pausa de alimentación se descuenta al inicio del turno laborado.

## 6.2 Turnos de 24 horas

En turnos 24H se mantiene la lógica de segunda pausa para reflejar jornadas largas.  
Por eso, el descuento total puede contemplar dos pausas según configuración.

---

## 7. Programación de Turnos

## 7.1 Vista de calendario

Cada empleado se muestra por semanas (domingo-sábado), con selector diario de turno.

Opciones de selector:

1. Turnos activos.
2. `C` = Libre.
3. `M` = Turno manual.
4. Conceptos de nómina.

## 7.2 Turno Manual (M)

Permite ingresar inicio y fin solo para ese día.  
Se calcula con la misma lógica de clasificación y alimentación del resto de turnos.

---

## 8. Gestión de Empleados

## 8.1 Acciones por empleado

| Acción | Resultado |
|---|---|
| Agregar | Crea empleado con su período propio |
| Editar | Ajusta datos y regenera calendario |
| Pre-guardar turnos | Conserva turnos visibles para evitar pérdida al editar |
| Eliminar | Borra empleado de la sesión actual |

## 8.2 Recomendación clave

Antes de editar períodos, use **Pre-guardar turnos**.

---

## 9. Motor de Cálculo de Horas

El motor clasifica de forma detallada:

- Ordinarias diurnas.
- Ordinarias nocturnas.
- Ordinarias festivas.
- Ordinarias nocturnas festivas.
- Extras diurnas.
- Extras nocturnas.
- Extras festivas.
- Extras nocturnas festivas.

La clasificación se hace con recorrido minuto a minuto para evitar errores en cruces de día y nocturnidad.

---

## 10. Tope Semanal (Regla Real Vigente)

## 10.1 Regla actual del sistema

El tope semanal operativo es:

```text
42 horas fijas
```

No se aplica reducción automática del tope por:

- Festivos no trabajados.
- Domingos.
- Incapacidades.
- Vacaciones.
- Permisos remunerados.
- Otros conceptos especiales.

## 10.2 Distribución de extras

Toda hora que supere el tope semanal se clasifica como extra según el tipo de hora (diurna/nocturna/festiva).

## 10.3 Regla de domingo sin descanso

Si se trabaja domingo y no hay día libre en la semana, el sistema puede forzar el domingo como extras festivas (según la lógica implementada de descanso compensatorio).

---

## 11. Festivos y Domingos

- Domingo siempre se considera festivo.
- El sistema tiene base interna de festivos en el código (actualmente incluye años operativos definidos en el motor).
- La celda del calendario se resalta cuando aplica condición festiva.

---

## 12. Conceptos de Nómina (Estado Actual)

## 12.1 Conceptos base

| Código | Concepto | Horas equivalentes por defecto |
|---|---|---:|
| C | Libre | 0 |
| I | Incapacitado | 7 |
| SC | Sin contrato | 0 |
| PR | Permiso remunerado | 7 |
| A | Ausencia | 0 |
| V | Vacaciones | 7 |

## 12.2 Comportamiento general

- Los conceptos pueden reflejar horas equivalentes para consolidado.
- No reemplazan la lógica de tope fijo semanal de 42 horas.

## 12.3 Eliminación de Día de la Familia

`DF` (Día de la Familia) es un concepto obsoleto y no debe usarse.  
El sistema incluye limpieza para evitar su permanencia en configuraciones antiguas.

---

## 13. Panel de Configuración del Sistema

Incluye secciones para:

1. Recargos.
2. Horas extras.
3. Horario nocturno.
4. Conceptos de nómina.
5. Códigos de exportación.

### Valores por defecto de referencia

| Concepto | % |
|---|---:|
| Recargo nocturno | 35 |
| Recargo festivo diurno | 90 |
| Recargo festivo nocturno | 125 |
| Extra diurna | 25 |
| Extra nocturna | 75 |
| Extra festiva diurna | 115 |
| Extra festiva nocturna | 165 |

La configuración se guarda en `localStorage`.

---

## 14. Vista de Resultados

## 14.1 Pestañas

1. **Resultados Semanales**
2. **Resumen Total del Período**
3. **Liquidación de Pago**

## 14.2 Qué revisar antes de exportar

- Totales semanales.
- Horas faltantes (`horas deuda`).
- Distribución de extras.
- Coherencia de turnos asignados.

---

## 15. Liquidación de Pago

La liquidación se calcula por concepto con salario base del empleado.

```text
Valor hora ordinaria = salario mensual / 220
```

| Tipo | Cálculo |
|---|---|
| Recargo | valor hora × (porcentaje / 100) |
| Hora extra | valor hora × (1 + porcentaje / 100) |

---

## 16. Exportación a Excel

El sistema exporta un libro con hojas de operación y consolidado (incluye resultados, liquidación y resumen por turnos/semana).

En web usa descarga del navegador; en Electron usa diálogo de guardado nativo.

---

## 17. Buenas Prácticas Operativas

1. Configure turnos y alimentación antes de iniciar programación masiva.
2. Defina una convención de códigos de turno.
3. Pre-guarde antes de editar períodos.
4. Revise domingo/festivos antes de liquidar.
5. Exporte y archive evidencia al cerrar cálculo.

---

## 18. Solución de Problemas

### No abre el manual
- Verifique `archivos/instructivo.js`.
- Si falla, valide `archivos/instructivo.md` como respaldo.

### No exporta Excel
- En web: habilite descargas del navegador.
- En Electron: valide permisos de guardado.

### No aparece un turno en el selector
- Verifique que esté activo.
- Revise código duplicado o inválido.

### Cambios de configuración no se reflejan
- Guarde configuración.
- Recalcule resultados.

---

## 19. Glosario Rápido

| Término | Definición |
|---|---|
| Acumulado semanal | Suma de horas trabajadas usada para extras |
| Horas deuda | Horas faltantes para completar tope semanal |
| Turno dinámico | Turno configurable por administrador |
| Turno manual | Turno definido por hora inicio/fin en un día específico |
| Recargo | Valor adicional sobre hora base |
| Extra | Hora que supera el tope semanal |

---

## 20. Control de Cambios del Manual

| Versión | Fecha | Cambio |
|---|---|---|
| 2.1 | Jul-2026 | Manual anterior |
| 3.0 | Jul-2026 | Revisión completa alineada a lógica real del sistema (tope fijo 42h, eliminación DF, reglas actuales de cálculo) |

---

*Sistema de Control de Turnos v4.8 — © 2026 Alejostone — Todos los derechos reservados.*

