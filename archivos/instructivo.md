# Manual de usuario
## Control de Turnos y Horas Extras · Versión 10

Este manual explica, paso a paso y sin términos técnicos, cómo programar los turnos de los empleados, revisar sus horas extras y recargos, y descargar el informe para nómina.

---

## 1. ¿Qué hace el sistema?

1. Usted indica el **período** (por ejemplo, del 1 al 30 de noviembre).
2. Agrega a los **empleados**.
3. Asigna a cada día un **turno** (Día, Noche, 24 horas…) o una **novedad** (incapacidad, vacaciones, permiso…).
4. El sistema calcula solo las **horas ordinarias, nocturnas, festivas y extras** de cada semana.
5. Usted descarga un **Excel** listo para nómina.

El trabajo se hace en tres pasos, que siempre verá en la parte superior de la pantalla:

**1 Configuración → 2 Programación → 3 Resultados**

---

## 2. Antes de empezar

- Abra el sistema con doble clic en **ABRIR SISTEMA DE TURNOS** (o en la dirección web que le hayan dado).
- Use **Chrome** o **Edge**.
- Para descargar el Excel necesita **internet**.
- Lo que guarda queda en **este navegador y este computador**. Si cambia de computador, no verá la programación.

---

## 3. Paso 1 · Configuración

![Pantalla de configuración inicial](archivos/manual/01-configuracion.png)

### 3.1 Datos del período

| Campo | Qué hacer |
|---|---|
| Fechas a liquidar | Pulse el recuadro **Desde – Hasta** para abrir el calendario. |
| Empleados | Use **−** y **+** (o escriba el número). Después puede agregar más. |
| Salario mensual base | El salario que aparecerá por defecto al agregar cada empleado. |

Debajo del título verá un resumen del período: cuántos días tiene, cuántas semanas se calculan y cuántos festivos caen entre semana.

#### Elegir las fechas en el calendario

![Calendario para elegir el período](archivos/manual/10-calendario.png)

1. Pulse el **primer día** del período y luego el **último**.
2. O use un atajo: **Mes completo**, **1 al 15** o **16 a fin de mes** (del mes que está viendo).
3. Las flechas cambian de mes. Los domingos están en rojo y los festivos tienen un punto rojo.
4. Abajo verá el resumen de lo elegido. Pulse **Aplicar**.

> El sistema siempre trabaja con **semanas de domingo a sábado**. Si el período empieza un miércoles, igual verá esa semana completa, porque los días anteriores cuentan para saber cuándo empiezan las extras.

### 3.2 Turnos

Aquí están los turnos que podrá asignar. Vienen tres turnos base:

| Turno | Color |
|---|---|
| **D** · Día | Amarillo claro |
| **N** · Noche | Azul |
| **24T** · 24 Horas | Violeta |

Cada turno muestra su horario, cuántas **horas efectivas** tiene (ya descontada la alimentación) y una **regla de 24 horas**:

- La barra de color es el horario del turno.
- La franja gris azulada es el horario nocturno (por defecto de 7:00 p. m. a 6:00 a. m.).
- La marca oscura es la pausa de alimentación.

Así puede ver de un vistazo cuántas horas de cada turno son nocturnas.

#### Crear un turno nuevo

1. Pulse **+ Nuevo turno**.
2. Escriba el **nombre** (por ejemplo, "Tarde") y un **código** corto (por ejemplo, "TR").
3. Elija la **hora de inicio** y la **hora de fin**.
4. Elija un **color**.
5. Marque si se **descuenta alimentación** en ese turno.
6. Revise la vista previa de arriba (muestra las horas efectivas) y pulse **Guardar turno**.

![Ventana para crear un turno](archivos/manual/02-nuevo-turno.png)

> Si pulsa **Cancelar**, no se crea nada.

**Consejos:**
- Si el turno termina al día siguiente (por ejemplo, de 10:00 p. m. a 6:00 a. m.), escríbalo tal cual: el sistema entiende que pasa la medianoche.
- Si la hora de inicio y la de fin son iguales (por ejemplo, 7:00 a 7:00), es un turno de **24 horas**.

#### Cambiar, desactivar o eliminar un turno

- **Editar:** abre la misma ventana para cambiar nombre, horario, color o alimentación.
- **Desactivar:** el turno deja de aparecer para asignar, pero no se borra.
- **Eliminar:** lo borra definitivamente. Si estaba asignado a algún día, el sistema le avisa cuántos días son; esos días quedan como **Libre**.
- Los turnos base (Día, Noche y 24 Horas) se pueden editar, pero no eliminar.

### 3.3 Alimentación

Elija cómo se descuenta el tiempo de comida:

| Opción | Significa |
|---|---|
| Sin descuento | No se descuenta nada. |
| Tiempo fijo | Se descuentan **30 minutos** o **1 hora**. |
| Horario | Usted indica el rango (por ejemplo, de 12:00 a 1:00). |

La alimentación se descuenta **al inicio del turno**. Debajo de las opciones verá **cómo queda el turno Día** con la alimentación elegida, por ejemplo **11,5 h de 12 h**, y la lista de turnos se actualiza al momento.

En turnos de **24 horas** se descuentan **dos** pausas.

### 3.4 Continuar

Pulse **Continuar a programación**. Se abrirá la ventana para agregar al primer empleado.

---

## 4. Paso 2 · Agregar empleados

![Ventana para agregar un empleado](archivos/manual/03-agregar-empleado.png)

1. **Documento:** solo números, sin puntos ni espacios. Si escribe una letra, el sistema la quita.
2. **Salario mensual:** viene del dato general; puede cambiarlo.
3. **Nombre completo.**
4. **Inicio y fin del período** de este empleado (vienen del período general).
5. Pulse **Agregar empleado**.

Si indicó varios empleados, la ventana se abre de nuevo para el siguiente. Puede agregar más cuando quiera con **+ Agregar empleado**.

### Lista de empleados

![Lista de empleados](archivos/manual/05-lista-empleados.png)

Cada empleado muestra su período, su **estado** y tres botones:

| Estado | Significa |
|---|---|
| Sin turnos | Aún no tiene turnos asignados. |
| Turnos asignados | Tiene turnos, pero no se han guardado. |
| Cambios sin guardar | Cambió algo después de guardar. |
| Guardado | Todo está guardado. |

- **Resultados:** muestra solo los resultados de ese empleado.
- **Editar:** cambia nombre, salario o fechas **sin perder** los turnos ya puestos.
- **Eliminar:** borra al empleado y su programación (pide confirmación).

---

## 5. Programar los turnos

![Selector de turnos](archivos/manual/04-selector-turnos.png)

1. Pulse sobre cualquier día.
2. Se abre un panel con dos grupos:
   - **Turnos:** Día, Noche, 24 Horas, los que usted creó, **Libre** (C) y **Turno Manual** (M).
   - **Conceptos de nómina:** Incapacitado, Vacaciones, Permiso remunerado, Ausencia y Sin contrato.
3. Pulse la tarjeta que corresponde. El día toma el color del turno.

Los días **festivos** muestran la etiqueta **Festivo**.

### Colores de las novedades (siempre iguales)

| Novedad | Color |
|---|---|
| Incapacidad | Azul |
| Vacaciones | Verde |
| Permiso remunerado | Verde claro |
| Ausencia | Rojo |
| Sin contrato | Gris |

### Turno Manual

Úselo cuando un día el empleado trabaja un horario especial. Al elegir **M** aparecen dos campos de hora para ese día.

---

## 6. Guardar y recuperar

Al terminar la programación de un empleado, pulse **Pre-guardar** (debajo de sus semanas). Verá **✔ Guardado** con la fecha y hora.

- Si cambia algo después, verá **● Cambios sin guardar**.
- Si intenta cerrar la página con cambios sin guardar, el navegador le pregunta antes de salir.
- Al calcular resultados, el sistema también guarda automáticamente.

### Recuperar una programación

La próxima vez que abra el sistema verá este aviso:

![Aviso de programación guardada](archivos/manual/07-recuperar.png)

- **Continuar programación:** recupera empleados, turnos y alimentación.
- **Descartar:** borra lo guardado (pide confirmación).

---

## 7. Paso 3 · Resultados

Hay dos formas de verlos:

- **Ver resultados de [nombre]** (o el botón **Resultados** en la lista): solo ese empleado.
- **Ver Resultados** (abajo de la programación): todos los empleados.

![Resultados de un empleado](archivos/manual/06-resultados.png)

Tiene tres pestañas:

1. **Resultados Semanales:** el detalle de cada día. Arriba de cada semana verá el tope de 42 horas y, si hubo incapacidad o vacaciones, cuántas horas sumaron.
2. **Resumen Total del Período:** totales del período, incluidas las horas reconocidas por incapacidad y por vacaciones.
3. **Liquidación de Pago:** el valor en pesos de recargos y extras.

**← Atrás** lo devuelve a la programación sin perder nada.

---

## 8. Descargar el Excel

Pulse **Exportar Resultados** (o **Exportar resultados de [nombre]** si está viendo un solo empleado). El archivo trae estas hojas:

| Hoja | Para qué sirve |
|---|---|
| Informe Horas Extras | El formato para cargar a nómina, con los códigos de cada concepto. Incluye los días de incapacidad, vacaciones y permisos. |
| Novedades de Nómina | Todas las fechas de incapacidad, vacaciones, permisos, ausencias y sin contrato, y si contaron para la jornada. |
| Liquidación de Pago | Valores en pesos por concepto. |
| Resumen Total Horas | Totales del período por empleado. |
| Semana 1, Semana 2… | El detalle de cada día. |
| Resumen de Turnos | Cuántos turnos de cada tipo hubo por semana. |

En **Informe Horas Extras** y **Novedades de Nómina**, una línea oscura separa cada semana (de domingo a sábado) y una línea más gruesa separa a cada empleado.

> En el Informe, los días de **incapacidad o vacaciones** muestran **7,33** en "Horas Trabajadas" solo cuando esas horas contaron para la jornada de la semana. Es informativo: no se suma a extras ni recargos.

---

## 9. Cómo se cuentan las horas (en palabras simples)

- Cada semana (domingo a sábado) tiene un tope de **42 horas ordinarias**.
- El sistema va sumando las horas **en el orden en que ocurren**. Lo que pase de 42 horas es **extra**.
- **Horario nocturno:** de **7:00 p. m. a 6:00 a. m.** (se puede cambiar en Configuración del sistema).
- **Domingos y festivos** generan recargo festivo.
- Un turno que empieza el sábado y termina el domingo: la parte del domingo cuenta como festiva.

Ejemplo: si el viernes, a las 3:00 p. m., el empleado completa 42 horas en la semana, todo lo que trabaje después de esa hora es extra, y será diurna o nocturna según la hora.

---

## 10. Casos especiales

### Incapacidad o vacaciones con turnos en la semana
Cada día de incapacidad o vacaciones cuenta **7,33 horas** para la **jornada de 42 horas** (así la semana no queda con horas faltantes), y esas horas se ven en el Excel.

Pero **no cuentan para las extras**: las horas extras salen **solo de los turnos trabajados**. Si los turnos de la semana no pasan de 42 horas, no hay extras, aunque haya incapacidad o vacaciones.

*Ejemplo:* domingo y lunes incapacitado, martes a jueves turnos de 11 horas.  
Horas trabajadas: 33. Incapacidad: 7,33 (solo el lunes; el domingo no cuenta).  
Extras: **0**, porque los turnos (33 h) no pasan de 42.

*Otro ejemplo:* domingo a martes incapacitado y miércoles a sábado turnos de 11 horas (44 h).  
Incapacidad: 7,33 el lunes y 7,33 el martes.  
Extras: **2 horas** (44 − 42), el sábado. La incapacidad no aumenta las extras.

### Incapacidad o vacaciones en domingo o festivo
Ese día **no cuenta** horas para la jornada.

### Toda la semana incapacitado o de vacaciones
Si en la semana **no trabajó ningún turno**, las incapacidades o vacaciones no muestran horas. Las fechas sí aparecen en el Excel.

### Permiso remunerado
No suma para extras. Solo evita que la semana aparezca con "horas faltantes".

### Ausencia
Resta sus horas del conteo de la semana.

### Sin contrato (ingresó o se retiró a mitad de semana)
Marque con **SC** los días en que no tenía contrato. Cada día de lunes a sábado con SC **baja el tope** de la semana en 7 horas. El domingo con SC no lo baja.

### Trabajó el domingo y no tuvo ningún día libre en la semana
Las horas de ese domingo se pagan como **extras festivas**.

### El empleado empieza o termina a mitad de semana
Los días de esa semana que están fuera de su período se ven más claros. Si el empleado trabajó esos días (por ejemplo, en el período anterior), asígnelos igual para que el tope de la semana se calcule bien. En el Excel aparecen como "En período: No".

### Cambié la alimentación después de programar
Vuelva al Paso 1, cambie la alimentación y pulse **Continuar a programación**. Cuando le pregunte, elija **Cancelar** para **conservar** la programación actual. Luego vuelva a calcular resultados.

### Me equivoqué en el nombre, salario o fechas de un empleado
Use **Editar** en la lista de empleados. Los turnos ya puestos se conservan.

### Eliminé un turno que estaba asignado
Los días que lo tenían quedan como **Libre**. Revíselos y asígneles otro turno.

---

## 11. Configuración del sistema (administrador)

El botón **Configuración del sistema** pide una contraseña.

![Contraseña de configuración](archivos/manual/08-clave.png)

Una vez dentro puede cambiar:
- Los **porcentajes** de recargos y extras.
- El **horario nocturno**.
- Las **horas** de cada concepto de nómina.
- Los **códigos de exportación** del Excel.

![Configuración del sistema](archivos/manual/09-configuracion-sistema.png)

> Mientras la pestaña siga abierta, no vuelve a pedir la contraseña.

---

## 12. Problemas frecuentes

| Problema | Solución |
|---|---|
| No descarga el Excel | Verifique que tiene internet y que el navegador permite descargas. |
| No veo un cambio que hice | Recargue con **Ctrl + F5**. |
| No aparece un turno al asignar | Revise en el Paso 1 que esté activo (no "Inactivo"). |
| Perdí la programación | Si la había guardado, use **Continuar programación** al abrir. Debe ser el mismo navegador y computador. |
| El documento no acepta letras | Es correcto: solo se permiten números. |

---

## 13. Palabras clave

| Palabra | Significado |
|---|---|
| Tope semanal | 42 horas ordinarias por semana. |
| Hora extra | Hora trabajada después de completar el tope. |
| Recargo nocturno | Pago adicional por trabajar entre 7:00 p. m. y 6:00 a. m. |
| Recargo festivo | Pago adicional por trabajar en domingo o festivo. |
| Horas faltantes | Horas que le faltaron a la semana para llegar al tope. |
| Novedad | Incapacidad, vacaciones, permiso, ausencia o sin contrato. |

---

*Control de Turnos v5.0 · © 2026 Alejostone · Para detalles técnicos consulte el Manual del desarrollador.*
