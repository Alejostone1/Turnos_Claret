# Análisis Exhaustivo: Lógica de Reducción del Tope Semanal de 42 Horas

## Resumen Ejecutivo

Se encontraron **2 puntos críticos** en el código donde se reduce el tope semanal de 42 horas:

1. **Líneas 2585-2586**: Reducción por festivos no trabajados
2. **Líneas 2552-2594**: Reducción por conceptos especiales

Ambos deben eliminarse para que el tope **siempre sea 42 horas**.

---

## Estructura General del Sistema

### Archivo Principal
- **TURNOS.js**: Clase `SistemaTurnosMejorado` (línea 1 en adelante)

### Configuración Inicial
- **Línea 26**: `this.horasMaximasSemanalesNormal = 42` ← **Constante correcta, no modificar**

---

## PUNTO CRÍTICO 1: Reducción por Festivos No Trabajados

### Ubicación
📍 **Líneas 2540-2590 en TURNOS.js**

### Código Actual (PROBLEMÁTICO)

```javascript
// LÍNEA 2540-2559: Calcula festivos NO TRABAJADOS en la semana
const festivosNoTrabajadosEnSemana = semana.dias.filter((dia, index) => {
  if (dia.fecha.getDay() !== 0 && dia.esFestivo) {
    const turnoAsignado = turnosDeLaSemanaCompleta[index];
    // Es festivo no trabajado si no hay turno o si el turno no es de trabajo
    if (!turnoAsignado || !turnosConsideradosTrabajados.includes(turnoAsignado)) {
      return true;
    }
  }
  return false;
}).length;

// LÍNEA 2584-2590: ⚠️ REDUCCIÓN DEL TOPE ⚠️
let horasMaximasSemanales = this.horasMaximasSemanalesNormal;
if (festivosNoTrabajadosEnSemana > 0) {
  horasMaximasSemanales -= (festivosNoTrabajadosEnSemana * 7);  // ← AQUÍ ESTÁ EL PROBLEMA
}

// Garantizar que el tope no baje de 0
horasMaximasSemanales = Math.max(0, horasMaximasSemanales);
```

### Efecto Actual

- Si hay 1 festivo no trabajado: `42 - (1 × 7) = 35 horas`
- Si hay 2 festivos no trabajados: `42 - (2 × 7) = 28 horas`
- Si hay 3 festivos no trabajados: `42 - (3 × 7) = 21 horas`

**Esto causa que las horas extras comiencen antes de lo debido.**

### Ejemplo del Problema

Semana con 1 festivo (lunes) no trabajado:
- Martes a Sábado: 8h × 5 = 40 horas trabajadas
- **Resultado actual incorrecto**: 
  - Tope semanal: 35 horas (reducido)
  - Horas extras: 5 horas (40 - 35)
- **Resultado esperado**:
  - Tope semanal: 42 horas (sin reducción)
  - Horas extras: 0 horas (40 < 42)

---

## PUNTO CRÍTICO 2: Reducción por Conceptos Especiales

### Ubicación
📍 **Líneas 2552-2594 en TURNOS.js**

### Conceptos Especiales Definidos

Los siguientes códigos de turnos son conceptos especiales (no trabajados):

| Código | Nombre | Horas | Descripción |
|--------|--------|-------|------------|
| I | Incapacitado | 7 | Incapacidad |
| SC | Sin contrato | 0 | Sin contrato |
| PR | Permiso remunerado | 7 | Permiso remunerado |
| A | Ausencia | 0 | Ausencia |
| V | Vacaciones | 7 | Vacaciones |

### Código Actual (PROBLEMÁTICO)

```javascript
// LÍNEA 2552-2578: Calcula reducción por conceptos especiales
let horasReduccionPorConceptos = 0;
semana.dias.forEach((dia, index) => {
  const fechaKey = dia.fecha.toISOString().split('T')[0];
  const turnoGuardado = empleado.turnosGuardados.get(fechaKey);
  let turno = turnoGuardado ? turnoGuardado.turno : null;

  // ...búsqueda en DOM...

  const tipoConfig = this.configuracion.tiposTurnoEspeciales[turno];

  if (tipoConfig && dia.fecha.getDay() !== 0) {  // No es domingo
    const esFestivoMarcado = dia.esFestivo;

    if (!esFestivoMarcado) {  // No es festivo
      if (turno === 'SC') {
        horasReduccionPorConceptos += 7;  // ← AQUÍ TAMBIÉN REDUCE
      } else if (tipoConfig && tipoConfig.horas > 0) {
        horasReduccionPorConceptos += tipoConfig.horas;  // ← Y AQUÍ
      }
    }
  }
});

// LÍNEA 2592-2594: ⚠️ SEGUNDA REDUCCIÓN ⚠️
const horasMaximasAjustadas = Math.max(
  0,
  horasMaximasSemanales - horasReduccionPorConceptos  // ← RESTA CONCEPTOS
);
```

### Efecto Actual

- Semana con vacaciones (V): `-7 horas` del tope
- Semana con incapacidad (I): `-7 horas` del tope
- Semana con permiso remunerado (PR): `-7 horas` del tope
- Semana con ausencia (A): `-0 horas` (pero sigue en la lógica)
- Semana con SC: `-7 horas` del tope

**Resultado**: El tope se reduce múltiples veces por conceptos especiales

---

## Flujo Completo del Cálculo

### 1️⃣ Cálculo del Tope (DONDE OCURRE EL PROBLEMA)

```
horasMaximasSemanales = 42
  ├─ Si festivosNoTrabajados > 0:
  │  └─ horasMaximasSemanales -= (festivosNoTrabajados * 7)  ← PROBLEMA #1
  └─ Math.max(0, horasMaximasSemanales)

horasReduccionPorConceptos = suma de horas de conceptos especiales
  ├─ SC → +7
  ├─ I → +7
  ├─ PR → +7
  ├─ V → +7
  └─ A → +0

horasMaximasAjustadas = Math.max(0, 
  horasMaximasSemanales - horasReduccionPorConceptos)  ← PROBLEMA #2
```

### 2️⃣ Almacenamiento del Tope

```javascript
// Línea 2782
resultadosSemanas.push({
  ...
  horasMaximas: horasMaximasAjustadas,  // ← TOPE REDUCIDO SE ALMACENA
});
```

### 3️⃣ Distribución de Horas

```javascript
// Línea 2592-2594: horasMaximasAjustadas se pasa a funciones de cálculo
const acumuladorDelDia = forzarExtrasDomingo
  ? horasMaximasAjustadas
  : horasAcumuladasPorDia[index];

// Línea 2714, 2724: Se pasa a estas funciones
calcularHorasTurno(..., acumuladorDelDia, horasMaximasAjustadas)
_procesarTurnoDetallado(..., horasMaximasAjustadas)
```

### 4️⃣ Clasificación de Horas

```javascript
// Línea 2296-2311: _distribuirHoras
_distribuirHoras(
  horas,
  esNocturno,
  esFestivo,
  resultado,
  horasAcumuladas,
  horasMaximas  // ← TOPE REDUCIDO AQUÍ
)

// Dentro de _distribuirHoras:
const horasDisponibles = Math.max(0, horasMaximas - horasAcumuladas);
const horasOrdinarias = Math.min(horas, horasDisponibles);
const horasExtras = horas - horasOrdinarias;  // ← EXTRAS SE CALCULAN ANTES
```

---

## Impacto en la Interfaz

### Línea 2774-2782 (Pantalla de Resultados)

```javascript
const resumenSemana = this.calcularResumenSemana(turnosSemana);
resumenSemana.horasDeuda = Math.max(
  0,
  horasMaximasAjustadas - horasAcumuladasSemana  // ← USA TOPE REDUCIDO
);
resultadosSemanas.push({
  ...
  horasMaximas: horasMaximasAjustadas,  // ← MUESTRA TOPE REDUCIDO EN PANTALLA
});
```

**Efecto en pantalla**: El usuario ve "Tope: 35 horas" en lugar de "Tope: 42 horas"

---

## Funciones que Utilizan el Tope Reducido

| Línea | Función | Parámetro | Efecto |
|-------|---------|-----------|--------|
| 2676-2677 | Cálculo de `acumuladorDelDia` | `horasMaximasAjustadas` | Determina si las horas son ordinarias o extras |
| 2714 | `_procesarTurnoDetallado` | `horasMaximasAjustadas` | Distribuye horas minuto a minuto |
| 2724 | `calcularHorasTurno` | `horasMaximasAjustadas` | Distribuye horas por tipo de turno |
| 2774 | Cálculo de deuda | `horasMaximasAjustadas` | Calcula horas faltantes |
| 2782 | Almacenamiento de resultados | `horasMaximasAjustadas` | Se guarda en objeto de resultados |

---

## LO QUE NO DEBE CAMBIAR

Las siguientes funcionalidades deben mantener su comportamiento actual:

✅ **Clasificación de horas:**
- Horas diurnas vs nocturnas (configuración de horario nocturno)
- Horas ordinarias vs festivas
- Horas nocturnas festivas

✅ **Cálculo de recargos:**
- Recargo nocturno (35%)
- Recargo festivo (90%)
- Recargo nocturno festivo (125%)
- Horas extras (25%)
- Horas extras nocturnas (75%)
- Horas extras festivas (115%)
- Horas extras nocturnas festivas (165%)

✅ **Conceptos especiales:**
- Incapacidades, vacaciones, permisos deben seguir siendo marcables
- Las horas deben clasificarse correctamente
- Solo cambia: no reducen el tope de 42 horas

✅ **Otros:**
- Turnos dinámicos
- Turnos manuales
- Exportación a Excel
- Cálculo de liquidación
- Reportes

---

## Solución Propuesta

### Cambio 1: Eliminar reducción por festivos

**Líneas 2584-2590**

```javascript
// ANTES (ACTUAL):
let horasMaximasSemanales = this.horasMaximasSemanalesNormal;
if (festivosNoTrabajadosEnSemana > 0) {
  horasMaximasSemanales -= (festivosNoTrabajadosEnSemana * 7);  // ← ELIMINAR
}
horasMaximasSemanales = Math.max(0, horasMaximasSemanales);

// DESPUÉS (CORRECTO):
let horasMaximasSemanales = this.horasMaximasSemanalesNormal;  // Siempre 42
```

### Cambio 2: Eliminar reducción por conceptos especiales

**Líneas 2592-2594**

```javascript
// ANTES (ACTUAL):
const horasMaximasAjustadas = Math.max(
  0,
  horasMaximasSemanales - horasReduccionPorConceptos  // ← ELIMINAR RESTA
);

// DESPUÉS (CORRECTO):
const horasMaximasAjustadas = horasMaximasSemanales;  // Siempre 42
```

Opcionalmente, si se desea limpiar el código:

```javascript
// ELIMINAR LÍNEAS 2552-2578 (cálculo de horasReduccionPorConceptos)
// Ya no es necesario si no se va a usar

// RESULTADO:
const horasMaximasAjustadas = this.horasMaximasSemanalesNormal;  // Siempre 42
```

---

## Escenarios de Prueba

Después de la implementación, se deben validar estos casos:

### 1. Semana sin festivos
- Lunes-Viernes: 8h cada uno
- Total: 40 horas
- ✅ Tope esperado: 42
- ✅ Horas extras: 0

### 2. Semana con festivo trabajado
- Lunes (festivo): 8h trabajadas
- Martes-Viernes: 8h cada uno
- Sábado: 8h
- Total: 48 horas
- ✅ Tope esperado: 42
- ✅ Horas extras: 6
- ✅ Las 8h del lunes deben mostrar recargo festivo

### 3. Semana con festivo NO trabajado
- Lunes (festivo): Libre
- Martes-Sábado: 8h cada uno
- Total: 40 horas
- ✅ Tope esperado: 42
- ✅ Horas extras: 0

### 4. Semana con dos festivos no trabajados
- Lunes (festivo): Libre
- Martes (festivo): Libre
- Miércoles-Sábado: 8h cada uno
- Total: 40 horas
- ✅ Tope esperado: 42 (NO 28)
- ✅ Horas extras: 0

### 5. Semana con incapacidad (I)
- Lunes: Incapacidad
- Martes-Viernes: 8h cada uno
- Sábado: 8h
- Total: 40 horas
- ✅ Tope esperado: 42 (NO 35)
- ✅ Horas extras: 0

### 6. Semana con vacaciones (V)
- Lunes-Martes: Vacaciones
- Miércoles-Viernes: 8h cada uno
- Sábado: 8h
- Total: 32 horas
- ✅ Tope esperado: 42
- ✅ Horas extras: 0

### 7. Semana con domingo trabajado
- Domingo: 8h
- Lunes-Viernes: 8h cada uno
- Total: 48 horas
- ✅ Tope esperado: 42
- ✅ Horas extras: 6
- ✅ Las 8h del domingo deben mostrar recargo festivo (domingo trabajado)

### 8. Semana con turnos nocturnos
- Lunes-Viernes: Turno noche (19:00-07:00) ≈ 10h cada uno
- Total: 50 horas
- ✅ Tope esperado: 42
- ✅ Horas extras: 8
- ✅ Las horas deben separarse en diurnas/nocturnas correctamente
- ✅ Se debe aplicar recargo nocturno donde corresponda

---

## Impacto Esperado

### En Pantalla de Resultados
- **Antes**: "Tope semanal: 35" (cuando hay festivos)
- **Después**: "Tope semanal: 42" (siempre)

### En Cálculo de Horas
- **Antes**: Horas extras desde 35h con festivos
- **Después**: Horas extras desde 42h siempre

### En Liquidación
- **Antes**: Menos horas ordinarias, más horas extras (incorrecto)
- **Después**: Cantidad correcta de horas ordinarias y extras

---

## Conclusión

La solución requiere **eliminar dos reducciones** (festivos y conceptos especiales) del cálculo del tope semanal. El cambio es localizado, no afecta otras funcionalidades, y mantiene la integridad de la clasificación de horas.

**Archivos a modificar**: Solo `TURNOS.js`
**Líneas críticas**: 2585-2586 y 2592-2594
**Riesgo**: Bajo (cambio localizado y bien delimitado)
**Beneficio**: Cumple exactamente con el requisito de tope fijo de 42 horas
