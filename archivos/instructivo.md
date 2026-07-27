# Sistema de Control de Turnos
## Manual de Usuario — Versión Oficial

---

**Versión del sistema:** 4.8  
**Versión del documento:** 2.1  
**Fecha de actualización:** Julio 2026  
**Autor:** Alejostone  

---

## Control de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2025 | Documento inicial — turnos estáticos (D, N, 24T) |
| 2.0 | Julio 2026 | Reescritura completa: turnos dinámicos, tope 42 h, festivos, multi-empleado |
| 2.1 | Julio 2026 | Corrección e hipervinculación directa (anclas id) en la Tabla de Contenidos |

---

## Tabla de Contenidos

1. [1. Introducción y Objetivo del Sistema](#sec-1)
2. [2. Arquitectura y Tecnología](#sec-2)
3. [3. Requisitos de Uso](#sec-3)
4. [4. Flujo General de la Aplicación](#sec-4)
5. [5. Pantalla de Configuración Inicial](#sec-5)
6. [6. Configuración de Turnos Dinámicos](#sec-6)
7. [7. Configuración de Almuerzo](#sec-7)
8. [8. Programación de Turnos](#sec-8)
9. [9. Gestión de Empleados](#sec-9)
10. [10. Cálculo de Horas — Motor de Liquidación](#sec-10)
11. [11. Tope Semanal de 42 Horas](#sec-11)
12. [12. Tratamiento de Días Festivos](#sec-12)
13. [13. Domingos y Días de Descanso](#sec-13)
14. [14. Conceptos de Nómina (Ausencias y Licencias)](#sec-14)
15. [15. Turno Manual](#sec-15)
16. [16. Vista de Resultados](#sec-16)
17. [17. Liquidación de Pago](#sec-17)
18. [18. Exportación a Excel](#sec-18)
19. [19. Panel de Configuración del Sistema](#sec-19)
20. [20. Preguntas Frecuentes](#sec-20)
21. [21. Buenas Prácticas](#sec-21)
22. [22. Glosario](#sec-22)

---

<a id="sec-1"></a>
## 1. Introducción y Objetivo del Sistema

El **Sistema de Control de Turnos** es una aplicación de escritorio (empaquetada con Electron) diseñada específicamente para empresas colombianas que necesitan:

- Programar turnos de trabajo para múltiples empleados.
- Calcular automáticamente las horas ordinarias, nocturnas, festivas y extras.
- Generar la liquidación de pago de recargos y horas extras.
- Exportar informes en formato Excel.

El sistema aplica la legislación laboral colombiana: jornada de 42 horas semanales, recargo nocturno (19:00–06:00), recargos festivos, y el régimen de horas extras diurnas y nocturnas.

### Versión 4.8 — Novedades principales

- **Turnos 100% dinámicos:** Los turnos ya no son fijos. El administrador puede crear, editar, eliminar y personalizar cualquier turno.
- **Multi-empleado:** Se pueden programar y calcular varios empleados en un mismo período.
- **Preservación de turnos al editar:** Al cambiar el período de un empleado, los turnos ya guardados se conservan.
- **Tope de 42 horas con reducción por festivos:** Cuando hay festivos no trabajados en la semana, el tope semanal se reduce en 7 horas por festivo.
- **Cálculo minuto a minuto:** El motor calcula las horas nocturnas y diurnas con precisión de minuto para turnos que cruzan la medianoche o que abarcan 24 horas.

---

<a id="sec-2"></a>
## 2. Arquitectura y Tecnología

| Componente | Tecnología |
|-----------|------------|
| Interfaz | HTML5 + CSS3 (Vanilla) |
| Lógica de negocio | JavaScript (clase `SistemaTurnosMejorado`) |
| Empaquetado | Electron (ejecutable de escritorio) |
| Persistencia | `localStorage` del navegador/Electron |
| Exportación | Librería SheetJS (XLSX) |
| Manual | Markdown (cargado vía Base64 embebido en `instructivo.js`) |

**Archivos principales:**

| Archivo | Propósito |
|---------|-----------|
| `INICIO_TURNOS.html` | Estructura HTML de la aplicación |
| `TURNOS.js` | Toda la lógica de negocio (~3.200 líneas) |
| `TURNOS.css` | Estilos visuales |
| `instructivo.js` | Manual codificado en Base64 (evita CORS en file://) |
| `instructivo.md` | Fuente Markdown del manual |
| `main.js` | Proceso principal de Electron |

---

<a id="sec-3"></a>
## 3. Requisitos de Uso

- Computador con Windows (la app se ejecuta como aplicativo de escritorio).
- No requiere conexión a Internet para las funciones principales.
- **Sí requiere conexión** únicamente para cargar las librerías CDN si se abre el HTML directamente en navegador (no aplica al ejecutable Electron).
- Los datos se guardan automáticamente en `localStorage` — si se limpia el caché del navegador, la configuración de turnos y porcentajes se perderá. Los turnos programados en cada sesión no se persisten al cerrar la aplicación.

---

<a id="sec-4"></a>
## 4. Flujo General de la Aplicación

La aplicación tiene **5 secciones** que se navegan en secuencia:

```
Configuración Inicial
        ↓
Programación de Turnos
        ↓
Ver Resultados
   ├── Resultados Semanales
   ├── Resumen Total del Período
   └── Liquidación de Pago
```

Adicionalmente, desde la pantalla inicial se puede acceder a:
- **Manual de Usuario** (botón ❔)
- **Configuración del Sistema** (botón ⚙️ — requiere contraseña)
- **Limpiar Todo** (botón 🗑️)

---

<a id="sec-5"></a>
## 5. Pantalla de Configuración Inicial

Al abrir la aplicación se muestra la pantalla **Configuración Inicial** con los siguientes campos:

### 5.1 Datos Iniciales

| Campo | Descripción |
|-------|-------------|
| **Número de Empleados** | Cuántos empleados se van a programar en este período. El sistema abrirá el formulario de empleado automáticamente para cada uno. |
| **Salario Mensual (Base)** | Salario base del empleado en pesos colombianos. Se usa como valor por defecto para el modal de empleados. El sistema formatea automáticamente con separadores de miles. |

### 5.2 Período de Trabajo

| Campo | Descripción |
|-------|-------------|
| **Fecha de Inicio** | Primer día del período a programar. El sistema muestra automáticamente el día de la semana. |
| **Fecha de Fin** | Último día del período. |

> **Nota importante:** El sistema extiende internamente el período para que siempre inicie en **domingo** y termine en **sábado**. Esto garantiza que el cálculo de la semana completa (dom–sáb) sea siempre correcto, aunque los días fuera del rango seleccionado aparezcan en modo atenuado en el calendario.

### 5.3 Botones de Acción

| Botón | Función |
|-------|---------|
| **➡️ Siguiente** | Valida los datos, calcula las horas de cada turno dinámico y avanza a la pantalla de programación. |
| **🗑️ Limpiar Todo** | Borra todos los empleados y regresa a la pantalla inicial. |
| **⚙️ Configuración** | Solicita contraseña para acceder al panel de configuración del sistema. |
| **❔ Manual de Usuario** | Abre este manual. |

---

<a id="sec-6"></a>
## 6. Configuración de Turnos Dinámicos

Esta es una de las funcionalidades más importantes de la versión 4.8.

### 6.1 ¿Qué son los turnos dinámicos?

Los turnos dinámicos son horarios completamente configurables por el administrador. Ya no existe una lista fija de "Día", "Noche" y "24 Horas". En cambio, el sistema parte de esos tres turnos como base y permite crear cualquier cantidad de turnos adicionales con cualquier horario.

### 6.2 Turnos base del sistema

Al instalar o usar la aplicación por primera vez (o cuando no existe configuración guardada), el sistema crea automáticamente estos tres turnos:

| Código | Nombre | Inicio | Fin | Color |
|--------|--------|--------|-----|-------|
| `D` | Día | 07:00 | 19:00 | Azul claro |
| `N` | Noche | 19:00 | 07:00 | Azul índigo |
| `24T` | 24 Horas | 07:00 | 07:00 | Naranja claro |

> **Restricción:** Los turnos `D`, `N` y `24T` **no pueden ser eliminados ni desactivados**, ya que son parte del núcleo del sistema para mantener compatibilidad con registros históricos. Sin embargo, sí se pueden modificar su nombre, horario y color.

### 6.3 Interfaz de configuración de turnos

En la pantalla inicial, la sección **"⏰ Configuración de Turnos"** muestra una tarjeta por cada turno activo. Cada tarjeta contiene:

- **Selector de color** (cuadro de color a la izquierda): Cambia el color visual del turno en el calendario.
- **Campo de nombre** (texto editable): Nombre del turno que aparecerá en los selectores del calendario.
- **Campo de código** (campo pequeño): Código corto de 1–3 letras que identifica el turno. Es el valor guardado en la programación (ej: `D`, `N`, `T1`). Solo editable en turnos creados por el usuario.
- **Botón ✅/❌**: Activa o desactiva el turno. Un turno desactivado no aparece en el selector del calendario.
- **Botón 🗑️**: Elimina el turno. Solo disponible para turnos creados por el usuario.
- **Campos Inicio/Fin**: Horas de inicio y fin del turno en formato 24 horas.

### 6.4 Crear un nuevo turno

1. Haga clic en el botón **"➕ Añadir Nuevo Turno"** (azul, al final de la lista de turnos).
2. Se crea automáticamente un nuevo turno con código `T1` (o `T2`, `T3`... si ya existen), horario 08:00–16:00 y color gris.
3. Edite los campos según necesidad. Todos los cambios se guardan automáticamente al salir del campo.

### 6.5 Editar un turno existente

- Haga clic directamente en cualquier campo de la tarjeta (nombre, código, hora inicio, hora fin o color) y modifíquelo.
- Al salir del campo, el cambio se guarda automáticamente y se recalcula en tiempo real.

### 6.6 Reglas de validación de código

- El código debe ser único. Si escribe un código que ya existe (incluyendo `C` para libre o `M` para turno manual), el sistema rechazará el cambio y restaurará el código anterior.
- Los códigos de los turnos base (`D`, `N`, `24T`) no se pueden cambiar.
- Los códigos se convierten automáticamente a mayúsculas.

### 6.7 Cómo se aplican los horarios al cálculo

Cuando el usuario hace clic en **"Siguiente"**, el sistema:
1. Lee la hora de inicio y fin de cada turno dinámico.
2. Calcula la duración neta de cada turno descontando el tiempo de almuerzo configurado.
3. Determina si el turno es de 24 horas (cuando inicio == fin) para aplicar el doble descuento de almuerzo.
4. Actualiza el objeto interno `tiposTurno` con las horas calculadas para ser usado por el motor de cálculo.

---

<a id="sec-7"></a>
## 7. Configuración de Almuerzo

En la pantalla inicial, la sección **"🍽️ Configuración de Almuerzo"** permite definir cómo se descuenta el tiempo de comida de las horas laboradas.

### 7.1 Tipos de configuración

| Opción | Comportamiento |
|--------|----------------|
| **🚫 Sin Almuerzo** | No se descuenta tiempo. Las horas del turno se toman íntegras. |
| **⏱️ Tiempo Predefinido** | Se elige entre 30 minutos o 1 hora de descuento fijo. |
| **🕐 Horario Personalizado** | Se define una hora de inicio y hora de fin del almuerzo. El sistema calcula la duración exacta. |

### 7.2 Turnos de 24 horas y almuerzo

Para los turnos que cubren un ciclo de 24 horas (inicio == fin), el sistema aplica **doble descuento de almuerzo**, reconociendo que en una jornada de 24 horas hay dos tiempos de comida.

**Ejemplo:** Turno 24H (07:00–07:00) con almuerzo de 30 minutos:
- Sin doble descuento: 24 - 0.5 = 23.5 horas
- Con doble descuento (correcto): 24 - 1.0 = 23.0 horas

---

<a id="sec-8"></a>
## 8. Programación de Turnos

### 8.1 Acceso a la pantalla

Después de completar la configuración inicial y hacer clic en **"Siguiente"**, el sistema:
1. Abre automáticamente el modal de agregar empleado.
2. Muestra la pantalla de **"Programación de Turnos"** con el calendario organizado por semanas.

### 8.2 Vista del calendario

El calendario se organiza en bloques por empleado, y dentro de cada bloque, por semanas (domingo–sábado). Cada día de la semana muestra:
- Nombre del día y fecha.
- **Selector desplegable** con todos los turnos activos + opciones fijas (Libre, Manual, Conceptos especiales).
- Si el día está fuera del rango seleccionado, aparece **atenuado** pero sigue siendo parte del cálculo semanal.
- Si el día es **festivo o domingo**, aparece con fondo resaltado en dorado.

### 8.3 Opciones del selector de turno

El selector de turno de cada día muestra, en este orden:
1. Todos los **turnos dinámicos activos** (ej: D, N, 24T, T1, T2...).
2. **C – Libre:** Día de descanso. No suma horas.
3. **M – Turno Manual:** Permite ingresar horas de inicio y fin personalizadas para ese día específico.
4. **Conceptos de nómina** (ej: I – Incapacitado, V – Vacaciones, etc.).

### 8.4 Turno Libre (C)

Al seleccionar "C – Libre", el día no suma ninguna hora al total de la semana. Los días libres también se contabilizan para determinar si el domingo trabajado genera horas extras adicionales (ver sección 13).

### 8.5 Estilo visual de los selectores

El selector cambia de color automáticamente según el turno seleccionado para facilitar la revisión visual del calendario:
- Turnos de trabajo: color del turno configurado.
- Libre: gris claro.
- Festivo: fondo dorado en la celda.

---

<a id="sec-9"></a>
## 9. Gestión de Empleados

### 9.1 Agregar un empleado

Al hacer clic en **"Siguiente"** desde la configuración inicial, el sistema abre automáticamente el modal **"Agregar Empleado"**. Si configuró 3 empleados, el modal se abrirá secuencialmente 3 veces mostrando el progreso (ej: "Agregar Empleado 1 de 3").

**Campos del modal:**

| Campo | Descripción |
|-------|-------------|
| **Número de Documento** | Identificación única del empleado. No se puede repetir. |
| **Nombre Completo** | Nombre que aparece en todos los reportes. |
| **Salario Mensual** | Salario base individual. Por defecto toma el valor del campo general. |
| **Fecha de Inicio** | Inicio del período para este empleado específico. |
| **Fecha de Fin** | Fin del período para este empleado específico. |

> **Nota:** Cada empleado puede tener un período diferente al general. Esto permite liquidar períodos distintos dentro de la misma sesión.

### 9.2 Agregar empleados adicionales

Después de agregar los empleados definidos inicialmente, el botón **"➕ Agregar Empleado"** (en la barra azul sobre el calendario) permite agregar más empleados en cualquier momento.

### 9.3 Lista de empleados

La sección **"Empleados Agregados"** muestra una lista de todos los empleados ingresados con sus botones de acción:

| Botón | Función |
|-------|---------|
| **Pre-guardar turnos** | Guarda en memoria los turnos actualmente visibles en el calendario para este empleado. Útil antes de editar el período. |
| **Editar** | Permite modificar nombre, salario y período del empleado sin perder los turnos ya guardados. |
| **Eliminar** | Elimina el empleado y todos sus datos. |

### 9.4 Editar un empleado (sin perder turnos)

Al hacer clic en **"Editar"**, el sistema:
1. Carga los datos actuales del empleado en el modal.
2. Guarda automáticamente todos los turnos visibles en el DOM antes de regenerar el calendario.
3. Regenera las semanas según el nuevo período.
4. **Restaura todos los turnos guardados** en las fechas correspondientes.

> ⚠️ **Importante:** Los turnos que aún no han sido pre-guardados ni estaban en el DOM al momento de editar podrían perderse. Se recomienda usar el botón "Pre-guardar" antes de editar el período.

### 9.5 Pre-guardar turnos

La función **"Pre-guardar turnos"** captura todos los turnos actualmente visibles en el selector de cada día del empleado y los guarda en memoria persistente (durante la sesión). Una vez pre-guardados, los turnos sobreviven a:
- Edición del período del empleado.
- Cambio de vista.
- Navegación entre secciones.

---

<a id="sec-10"></a>
## 10. Cálculo de Horas — Motor de Liquidación

### 10.1 Motor central: `_procesarTurnoDetallado`

El motor de cálculo opera **minuto a minuto** para clasificar cada hora del turno correctamente. Esto garantiza precisión exacta en turnos que:
- Cruzan la medianoche.
- Abarcan el cambio de día festivo a ordinario o viceversa.
- Tienen fracciones de hora nocturna.

**Proceso para cada turno:**
1. Se calcula el tiempo total del turno (inicio → fin).
2. Se descuenta el tiempo de almuerzo configurado.
3. Se itera minuto a minuto desde el inicio efectivo hasta el fin.
4. Cada minuto se clasifica como: **diurno día 1**, **nocturno día 1**, **diurno día 2**, **nocturno día 2**.
5. Las horas diurnas y nocturnas se acumulan por separado para el día de inicio y el día siguiente.
6. Las festivas se determinan según si el día de inicio o el día siguiente es festivo.
7. Finalmente se llama a `_distribuirHoras` para asignar la porción ordinaria vs extra.

### 10.2 Clasificación de horas

| Tipo | Descripción | Recargo |
|------|-------------|---------|
| **Ordinaria Diurna** | Horas diurnas dentro del tope semanal | 0% (base) |
| **Ordinaria Nocturna** | Horas nocturnas dentro del tope semanal | 35% (configurable) |
| **Ordinaria Festiva** | Horas diurnas en día festivo/domingo dentro del tope | 90% (configurable) |
| **Ordinaria Noc. Festiva** | Horas nocturnas en festivo/domingo dentro del tope | 125% (configurable) |
| **Extra Ordinaria** | Horas diurnas que superan el tope semanal | 125% (base + 25%) |
| **Extra Nocturna** | Horas nocturnas que superan el tope semanal | 175% (base + 75%) |
| **Extra Festiva** | Horas diurnas festivas que superan el tope | 215% (base + 115%) |
| **Extra Noc. Festiva** | Horas nocturnas festivas que superan el tope | 265% (base + 165%) |

> Los porcentajes son los **valores por defecto**. Todos se pueden modificar desde el Panel de Configuración del Sistema.

### 10.3 Horario nocturno

Por defecto, se considera horario nocturno desde las **19:00 hasta las 06:00**. Este rango es configurable desde el Panel de Configuración (inicio y fin del recargo nocturno).

### 10.4 Valor hora ordinaria

Para la liquidación se usa la fórmula estándar colombiana:

```
Valor hora ordinaria = Salario mensual / 220
```

---

<a id="sec-11"></a>
## 11. Tope Semanal de 42 Horas

### 11.1 Regla general

El sistema usa un **límite de 42 horas semanales** de jornada ordinaria. Toda hora que supere este tope en la semana se clasifica automáticamente como **hora extra**.

La semana se calcula siempre de **domingo a sábado** (7 días completos).

### 11.2 Ejemplo básico

Suponga una semana donde el empleado trabaja 6 turnos de 8 horas cada uno (Lunes a Sábado):
- Total horas semana: 6 × 8 = 48 horas
- Horas ordinarias: 42
- Horas extras: 48 − 42 = 6 horas extras ordinarias

### 11.3 Reducción del tope por festivos no trabajados

Esta es la regla de negocio más importante de la versión actual.

**Regla:** Cuando en una semana existe un **festivo que no fue trabajado** (el empleado descansó ese día), el tope semanal se **reduce en 7 horas por cada festivo no trabajado**.

> Esto equivale a decir: el festivo "aporta" 7 horas al conteo de la semana sin que el empleado haya trabajado, facilitando que alcance el tope.

**Fórmula:**
```
Tope efectivo = 42 − (número de festivos no trabajados × 7)
```

**Ejemplo:**
- Semana con 1 festivo no trabajado (lunes festivo, empleado descansa):
  - Tope efectivo = 42 − 7 = **35 horas**
  - Si el empleado trabajó Martes–Sábado (5 días × 8 h = 40 h), las primeras 35 h son ordinarias y las 5 restantes son **extras**.

**Ejemplo con festivo trabajado:**
- Si el empleado SÍ trabajó el lunes festivo:
  - El festivo no reduce el tope (cuenta normalmente como horas trabajadas).
  - Tope efectivo = 42 horas.
  - Las horas del festivo reciben recargo festivo (o nocturno festivo si aplica).

### 11.4 Reducción por conceptos especiales

Adicionalmente, si en la semana hay días con conceptos como **Incapacidad, Vacaciones o Permiso Remunerado**, el sistema reduce el tope en las horas equivalentes de ese concepto (valor configurado en "Horas Equivalentes").

```
Tope final = 42 − (festivos no trabajados × 7) − horas de conceptos especiales
```

El tope nunca puede ser negativo (mínimo = 0).

---

<a id="sec-12"></a>
## 12. Tratamiento de Días Festivos

### 12.1 Base de festivos Colombia

El sistema incluye la base de datos completa de festivos colombianos para los años **2025 y 2026**. Los domingos también son tratados como festivos automáticamente.

**Festivos 2025 incluidos:**
Año Nuevo, Reyes Magos, San José, Jueves Santo, Viernes Santo, Día del Trabajo, Ascensión, Corpus Christi, Sagrado Corazón, Independencia (Jul), Boyacá, Asunción, Día de la Raza, Todos los Santos, Independencia Cartagena, Inmaculada Concepción, Navidad.

**Festivos 2026 incluidos:** Los equivalentes al año 2026 según el calendario oficial colombiano.

### 12.2 Identificación visual de festivos

En el calendario de programación, los días festivos (incluidos domingos) se muestran con un fondo dorado/amarillo para facilitar su identificación visual.

### 12.3 Festivo no trabajado

El empleado tiene asignado **"C – Libre"** o ningún turno de trabajo en un festivo.

**Efecto en el cálculo:**
- El festivo no suma horas trabajadas.
- El festivo **reduce el tope semanal en 7 horas**.
- No se genera ningún pago adicional por ese día.

### 12.4 Festivo trabajado

El empleado tiene asignado un turno de trabajo en el día festivo.

**Efecto en el cálculo:**
- Las horas del turno suman normalmente al total de horas trabajadas de la semana.
- Las horas se clasifican como **festivas** (u ordinarias si quedan dentro del tope de una semana donde no hay reducción).
- Las horas festivas generan recargo festivo (90% por defecto).
- Las horas nocturnas de ese día generan recargo nocturno festivo (125% por defecto).
- El festivo trabajado **no reduce el tope semanal**.

---

<a id="sec-13"></a>
## 13. Domingos y Días de Descanso

### 13.1 Domingos

Los domingos son siempre considerados festivos. Si el empleado trabaja el domingo:
- Las horas se clasifican como **festivas** o **nocturnas festivas**.
- Si es la única semana sin días libres, todo el domingo se procesa como horas extras festivas (ver regla del domingo).

### 13.2 Regla del domingo sin descanso semanal

Si el empleado trabajó el domingo Y **no tiene ningún día libre** en esa semana:
- El sistema fuerza que las horas del domingo se calculen como si el acumulador ya hubiera alcanzado el tope.
- Resultado: todas las horas del domingo se clasifican como **extras festivas** (o extras nocturnas festivas si aplica).

### 13.3 Domingo trabajado con día libre compensatorio

Si el empleado trabajó el domingo pero tiene al menos un día "C – Libre" en la misma semana:
- El domingo se procesa normalmente (las horas suman al acumulado semanal).
- Solo se generan extras si el total de la semana supera las 42 horas.

---

<a id="sec-14"></a>
## 14. Conceptos de Nómina (Ausencias y Licencias)

### 14.1 Conceptos predefinidos

| Código | Nombre | Horas equivalentes | Descripción |
|--------|--------|-------------------|-------------|
| `C` | Libre | 0 | Descanso sin pago adicional |
| `I` | Incapacitado | 7 | Día de incapacidad médica |
| `SC` | Sin contrato | 0 | Día fuera de contrato |
| `PR` | Permiso remunerado | 7 | Permiso pagado |
| `A` | Ausencia | 0 | Ausencia sin justificación |
| `V` | Vacaciones | 7 | Día de vacaciones |

### 14.2 Comportamiento en el cálculo

- Los conceptos con **horas > 0** (I, PR, V) se contabilizan como horas ordinarias para efectos de no generar deuda de horas, pero **no suman** al acumulado para horas extras.
- Adicionalmente, sus horas equivalentes **reducen el tope semanal** (ver sección 11.4).
- Los conceptos con **horas = 0** (SC, A) no suman ni reducen el tope. Solo indican que el empleado no trabajó.

### 14.3 Agregar conceptos personalizados

Desde el **Panel de Configuración del Sistema** (sección "Conceptos de Nómina"), el administrador puede:
- **Agregar** un nuevo concepto con código, nombre y horas equivalentes.
- **Editar** el nombre y horas de cualquier concepto existente.
- **Eliminar** conceptos que ya no se usen.

**Cómo agregar:**
1. Haga clic en **"➕ Agregar Nuevo Concepto"**.
2. Se abre un prompt para ingresar el código (ej: `LUTO`).
3. Luego el nombre completo (ej: "Licencia de Luto").
4. Finalmente las horas equivalentes (ej: `7`).

---

<a id="sec-15"></a>
## 15. Turno Manual

El **Turno Manual (M)** permite ingresar un horario personalizado para un día específico, diferente a los turnos configurados.

### 15.1 Cómo usar el turno manual

1. En el selector del día, elija **"M – Turno Manual"**.
2. Aparecerán dos campos de hora: **Inicio** y **Fin**.
3. Ingrese la hora de inicio y fin del turno para ese día.
4. El sistema calculará automáticamente las horas netas descontando el almuerzo configurado.

### 15.2 Comportamiento del cálculo

El turno manual sigue exactamente la misma lógica que los turnos dinámicos:
- Si cruza la medianoche, se calculan las horas de ambos días.
- Se aplican recargos nocturnos y festivos según corresponda.
- Las horas del turno manual cuentan para el tope semanal.

---

<a id="sec-16"></a>
## 16. Vista de Resultados

### 16.1 Acceso

Haga clic en el botón **"Ver Resultados →"** desde la pantalla de programación.

> El sistema calcula simultáneamente todos los empleados registrados.

### 16.2 Pestañas de resultados

La pantalla de resultados tiene tres pestañas:

#### Pestaña 1: Resultados Semanales

Muestra una tabla detallada por empleado y por semana con las siguientes columnas:

| Columna | Descripción |
|---------|-------------|
| Día | Nombre del día y fecha |
| Turno | Código y nombre del turno asignado |
| Horas Ordinarias | Horas diurnas dentro del tope |
| Horas Nocturnas | Horas nocturnas dentro del tope (+ recargo) |
| Horas Festivas | Horas diurnas en festivo (+ recargo) |
| Horas Noc. Festivas | Horas nocturnas en festivo (+ recargo mayor) |
| Extras Ordinarias | Horas extras diurnas |
| Extras Nocturnas | Horas extras nocturnas |
| Extras Festivas | Horas extras en festivo |
| Extras Noc. Festivas | Horas extras nocturnas en festivo |
| Horas x Turno | Total de horas para ese día |

Al final de cada semana aparece la fila **"TOTAL SEMANA"** con la sumatoria, y si aplicó, **"Horas Faltantes en la Semana"** (horas que no se completaron dentro del tope).

También se muestra el **"Tope de horas para esta semana"** indicando el valor ajustado según festivos y conceptos.

#### Pestaña 2: Resumen Total del Período

Muestra los totales acumulados de todo el período para cada empleado:
- Total horas trabajadas
- Desglose por tipo (ordinarias, nocturnas, festivas, nocturnas festivas, y todas las extras)
- Horas faltantes totales

#### Pestaña 3: Liquidación de Pago

Ver sección 17.

### 16.3 Colapsar/Expandir empleados

Los resultados de cada empleado se pueden colapsar haciendo clic en el encabezado con el nombre del empleado. El ícono ▼/▲ indica el estado.

---

<a id="sec-17"></a>
## 17. Liquidación de Pago

### 17.1 Descripción

La pestaña **"Liquidación de Pago"** genera automáticamente el valor monetario de los recargos y horas extras para cada empleado.

**Solo se muestran** los conceptos que tienen horas > 0 (no aparecen filas vacías).

### 17.2 Columnas de la tabla

| Columna | Descripción |
|---------|-------------|
| Concepto | Tipo de hora (ej: "Recargo Nocturno") |
| Cantidad Horas | Total de horas de ese tipo en el período |
| Valor Unitario | Valor por hora de ese concepto en COP |
| Subtotal | Horas × Valor Unitario |

### 17.3 Cálculo del valor unitario

| Tipo | Fórmula |
|------|---------|
| **Recargo** | Valor hora ordinaria × (porcentaje% / 100) |
| **Hora Extra** | Valor hora ordinaria × (1 + porcentaje% / 100) |

**Ejemplo con salario de $1.750.905:**
- Valor hora ordinaria = $1.750.905 / 220 = **$7.959**
- Recargo nocturno (35%): $7.959 × 0.35 = **$2.786** adicionales por hora
- Hora extra ordinaria (25%): $7.959 × 1.25 = **$9.949** por hora

### 17.4 Total adicionales a pagar

El pie de la tabla muestra el **"TOTAL ADICIONALES A PAGAR"**: la suma de todos los subtotales. Este valor representa únicamente los recargos y extras, no incluye el salario base.

---

<a id="sec-18"></a>
## 18. Exportación a Excel

### 18.1 Cómo exportar

Desde la pantalla de resultados, haga clic en el botón **"Exportar Resultados"**. El sistema genera un archivo Excel con nombre automático que incluye la fecha.

### 18.2 Hojas del archivo Excel

El archivo generado contiene **4 hojas**:

| Hoja | Contenido |
|------|-----------|
| **Informe Horas Extras** | Resumen consolidado de todos los tipos de horas extras por empleado |
| **Liquidación de Pago** | La misma liquidación que aparece en pantalla, con todos los empleados |
| **Resumen Total Horas** | Totales por empleado: ordinarias, nocturnas, festivas y extras |
| **Semana N** | Una hoja por semana con el detalle de turnos de todos los empleados |

### 18.3 Formato numérico en Excel

Los números en Excel se exportan como valores decimales (ej: `8.5` para 8 horas y media), compatibles con fórmulas de suma en Excel.

---

<a id="sec-19"></a>
## 19. Panel de Configuración del Sistema

### 19.1 Acceso

Desde la pantalla inicial, haga clic en **"⚙️ Configuración"**.

El sistema solicitará una contraseña de administrador. Contacte al administrador del sistema para obtenerla.

Una vez autenticado, podrá acceder al Panel de Configuración.

### 19.2 Sección: Recargos

Permite ajustar los porcentajes de recargo:

| Concepto | Valor por defecto |
|----------|-------------------|
| Recargo Festivo | 90% |
| Recargo Nocturno Festivo | 125% |

### 19.3 Sección: Horario Nocturno

Configura el rango de horas que el sistema considera nocturnas:

| Campo | Valor por defecto |
|-------|-------------------|
| Inicio del período nocturno | 19:00 |
| Fin del período nocturno | 06:00 |
| Porcentaje de recargo nocturno | 35% |

### 19.4 Sección: Horas Extras

Permite ajustar los porcentajes de cada tipo de hora extra:

| Tipo | Valor por defecto |
|------|-------------------|
| Hora Extra Diurna | 25% |
| Hora Extra Nocturna | 75% |
| Hora Extra Diurna Festiva | 115% |
| Hora Extra Nocturna Festiva | 165% |

### 19.5 Sección: Conceptos de Nómina

Gestión de ausencias, licencias y otros conceptos. Ver sección 14.

### 19.6 Botones del panel

| Botón | Función |
|-------|---------|
| **💾 Guardar Configuración** | Guarda todos los cambios y regresa a la pantalla inicial. Los cambios se aplican inmediatamente en los cálculos. |
| **🔄 Restaurar Valores** | Regresa todos los porcentajes a sus valores originales. Pide confirmación. |
| **↩️ Volver** | Regresa sin guardar cambios. |

### 19.7 Persistencia de la configuración

La configuración se guarda en `localStorage`. Permanece activa en futuras sesiones hasta que:
- Se use el botón "Restaurar Valores".
- Se limpie el localStorage del navegador/Electron.

---

<a id="sec-20"></a>
## 20. Preguntas Frecuentes

### ¿Por qué el calendario muestra días fuera del período seleccionado?

El sistema extiende el calendario para incluir la semana completa (domingo–sábado) que contiene la fecha de inicio y fin. Esto es necesario para calcular correctamente el tope semanal de 42 horas. Los días fuera del período aparecen atenuados y no se incluyen en los reportes, pero sí se consideran en el cálculo.

### ¿Qué pasa si no ingreso salario para un empleado?

El sistema igual calcula las horas. Simplemente no mostrará la pestaña de Liquidación de Pago para ese empleado (solo se muestra si el salario es mayor a 0).

### ¿Puedo tener empleados con diferentes horarios de turno en el mismo período?

Sí. El sistema de turnos dinámicos es compartido para todos los empleados (misma configuración de turnos). Sin embargo, el turno asignado a cada día es individual por empleado.

### ¿Por qué el tope de horas cambia de una semana a otra?

El tope puede variar según:
1. Festivos no trabajados en esa semana (cada uno resta 7 h).
2. Conceptos especiales (incapacidades, vacaciones) que reducen el tope.

### ¿El sistema guarda los turnos programados si cierro la aplicación?

No. Los turnos programados en el calendario no persisten entre sesiones. Solo la **configuración del sistema** (porcentajes, turnos dinámicos) se guarda en localStorage.

### ¿Por qué las horas extras del domingo aparecen aunque no haya superado 42 horas?

Si el empleado trabajó el domingo y no tiene ningún día libre en esa semana, el sistema aplica automáticamente la regla de extras para el domingo sin descanso compensatorio.

### ¿El turno de 24T siempre son 24 horas brutas?

No exactamente. El sistema detecta que inicio == fin y aplica el cálculo de 24 horas. Se descuenta el tiempo de almuerzo (doble para turnos de 24h). Si el almuerzo es 30 min, el turno neto será de 23 horas efectivas.

### ¿Por qué el manual no carga si abro el HTML directamente en el navegador?

Los navegadores modernos bloquean la carga de archivos locales mediante `fetch()` cuando se abre un archivo directamente (protocolo `file://`). El sistema resuelve esto embebiendo el manual en Base64 dentro de `instructivo.js`. Si el botón "Manual de Usuario" no funciona, verifique que `instructivo.js` esté en la misma carpeta que `INICIO_TURNOS.html`.

---

<a id="sec-21"></a>
## 21. Buenas Prácticas

### Para la configuración de turnos

- **Configure todos los turnos antes de hacer clic en "Siguiente".** Los horarios se calculan una sola vez al avanzar. Si necesita cambiar un horario, regrese a la pantalla inicial.
- Use colores contrastantes para los diferentes turnos para facilitar la revisión visual del calendario.
- Mantenga los códigos de turno cortos (1–3 caracteres) para que se vean bien en el selector del calendario.

### Para la programación de empleados

- Use el botón **"Pre-guardar turnos"** antes de editar el período de un empleado.
- Para períodos largos (más de un mes), programe semana a semana y vaya pre-guardando para evitar pérdidas de información.
- Revise visualmente que los días festivos (fondo dorado) tienen el turno correcto asignado.

### Para el cálculo

- Verifique que la configuración de almuerzo sea la correcta antes de calcular.
- Si cambia los horarios de un turno después de haberlo calculatedo, regrese a la pantalla inicial y vuelva a hacer clic en "Siguiente" para que el sistema recalcule las horas netas de cada turno.

### Para la exportación

- Exporte inmediatamente después de calcular para asegurar que los datos son los correctos.
- El archivo Excel se puede usar como soporte para nómina.

---

<a id="sec-22"></a>
## 22. Glosario

| Término | Definición |
|---------|------------|
| **Acumulado semanal** | Suma de horas efectivamente trabajadas en la semana (dom–sáb), usada para determinar cuándo comienzan las horas extras. |
| **Concepto especial** | Tipos de ausencia o licencia (incapacidad, vacaciones, permiso) que se registran en el calendario pero no generan horas extras. |
| **Día atenuado** | Día fuera del período seleccionado por el usuario, pero visible en el calendario por pertenecer a la semana completa. Se considera en el cálculo pero no en el reporte final. |
| **Extra diurna** | Hora extra laborada en horario diurno (fuera del período nocturno configurado). |
| **Extra festiva** | Hora extra laborada en día festivo o domingo, en horario diurno. |
| **Extra nocturna** | Hora extra laborada en horario nocturno (período configurado). |
| **Extra nocturna festiva** | Hora extra laborada en horario nocturno de un día festivo o domingo. |
| **Festivo no trabajado** | Día festivo en que el empleado descansó. Reduce el tope semanal en 7 horas. |
| **Festivo trabajado** | Día festivo en que el empleado laboró. Las horas reciben recargo festivo y no reducen el tope. |
| **Horas deuda** | Horas que faltaron para completar el tope de la semana. Solo informativo; no genera ningún descuento. |
| **Horas ordinarias** | Horas trabajadas dentro del tope semanal en horario diurno, sin recargo de festivo. |
| **Pre-guardar** | Función que salva en memoria los turnos visibles en el calendario para que persistan al editar el período del empleado. |
| **Recargo** | Porcentaje adicional que se paga sobre el valor de la hora ordinaria por trabajar en condiciones especiales (noche, festivo). |
| **Tope semanal** | Máximo de horas ordinarias que se pagan sin recargo de extra en una semana. Base: 42 horas, ajustable por festivos y conceptos. |
| **Turno dinámico** | Turno configurable por el administrador con nombre, código, horario y color personalizados. |
| **Turno manual (M)** | Tipo especial de turno donde el usuario ingresa manualmente la hora de inicio y fin para un día específico. |
| **Valor hora ordinaria** | Salario mensual / 220. Es la unidad base para calcular todos los recargos y extras. |

---

*Sistema de Control de Turnos v4.8 — © 2026 Alejostone — Todos los derechos reservados*
