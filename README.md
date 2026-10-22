# Sistema de Control de Turnos y Horas Extras

Documentación oficial para operación funcional, mantenimiento técnico y despliegue web.

| Campo | Valor |
|---|---|
| **Versión del sistema** | 4.8 |
| **Versión del documento** | 2.1 |
| **Fecha** | Octubre 2026 |
| **Autor** | Alejostone |
| **Empresa / titular** | Alejostone |
| **Repositorio** | `Alejostone1/Turnos_Claret` |

---

## 1. Descripción General

El sistema permite programar turnos por empleado y calcular automáticamente recargos, horas extras y liquidación de adicionales para nómina.

### ¿Qué resuelve?

- Errores manuales en clasificación de horas.
- Dificultad para liquidar semanas con festivos, domingos y cruces de medianoche.
- Falta de trazabilidad en cálculo de recargos y exportables.

### Público objetivo

- RR. HH.
- Nómina.
- Coordinadores operativos.
- Soporte técnico.

---

## 2. Características Principales

- Programación de turnos por día y por empleado.
- Turnos dinámicos (código, nombre, color, horario, estado).
- Turno manual por día específico.
- Configuración de alimentación (sin, predefinida, personalizada).
- Motor de cálculo minuto a minuto.
- Clasificación automática de ordinarias/nocturnas/festivas/extras.
- Tope semanal de 42 h y distribución de extras.
- Conceptos especiales (incapacidad, permiso, vacaciones, ausencia, sin contrato) con reglas propias frente al tope y la deuda.
- Configuración de recargos y códigos de exportación.
- Liquidación por concepto.
- Exportación a Excel.

---

## 3. Módulos del Sistema

| Módulo | Función |
|---|---|
| **Configuración inicial** | Define período, empleados y salario base. |
| **Configuración de turnos** | Administra turnos base y dinámicos. |
| **Configuración de alimentación** | Define descuento no laborado. |
| **Programación** | Asignación diaria en calendario semanal. |
| **Empleados** | Alta/edición/eliminación y pre-guardado. |
| **Resultados semanales** | Detalle por día y tipo de hora. |
| **Resumen del período** | Consolidado por empleado. |
| **Liquidación** | Cálculo monetario de recargos/extras. |
| **Exportación** | Generación de archivo Excel multihoja. |
| **Configuración del sistema** | Recargos, horario nocturno y conceptos de nómina. |

---

## 4. Arquitectura y Compatibilidad

## 4.1 Componentes del proyecto

| Componente | Ruta | Web (Vercel) | Escritorio (Electron) |
|---|---|---|---|
| Entrada principal web | `index.html` | ✅ | ✅ |
| Vista principal | `INICIO_TURNOS.html` | ✅ | ✅ |
| Motor de UI y cálculo | `archivos/TURNOS.js` | ✅ | ✅ |
| Estilos | `archivos/TURNOS.css` | ✅ | ✅ |
| Manual embebido | `archivos/instructivo.js` | ✅ | ✅ |
| Manual fuente | `archivos/instructivo.md` | ✅ | ✅ |
| Proceso principal Electron | `archivos/main.js` | ❌ | ✅ |
| Preload Electron | `archivos/preload.js` | ❌ | ✅ |
| Config NPM Electron | `archivos/package.json` | ❌ | ✅ |
| Escenarios de prueba | `test/*` | ✅ (manual) | ✅ (manual) |

## 4.2 Funciones incompatibles con Vercel (y alternativa)

| Función | Motivo | Alternativa Web |
|---|---|---|
| `ipcMain`, `BrowserWindow`, `dialog`, `fs` | APIs nativas de Electron/Node en desktop | No se usan en web |
| `window.electronAPI.saveFile(...)` | Bridge preload exclusivo de Electron | `XLSX.writeFile(...)` en navegador |

El sistema ya tiene fallback: si `window.electronAPI` no existe, exporta el Excel directamente en navegador.

---

## 5. Requisitos

### Funcionales

- Datos mínimos del empleado (documento, nombre, salario).
- Turnos configurados.

### Técnicos

- Navegador moderno (Chrome, Edge, Firefox).
- Resolución sugerida: 1366×768 o superior.
- Para desktop: Node.js + Electron (dependencias en `archivos/package.json`).

---

## 6. Estructura del Proyecto

```text
.
├── index.html
├── INICIO_TURNOS.html
├── vercel.json
├── README.md
├── .gitignore
├── archivos/
│   ├── TURNOS.js
│   ├── TURNOS.css
│   ├── instructivo.js
│   ├── instructivo.md
│   ├── main.js
│   ├── preload.js
│   ├── package.json
│   └── ...
└── test/
    ├── test_conceptos.js
    ├── test_runner.html
    ├── turnos_scenarios.js
    └── turnos_scenarios.json
```

---

## 7. Instalación y Ejecución Local

## 7.1 Versión Web (sin Electron)

1. Clonar repositorio.
2. Abrir `INICIO_TURNOS.html` (o `index.html`) en navegador.
3. Usar la aplicación.

## 7.2 Versión Escritorio (Electron)

1. Ir a `archivos/`.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Ejecutar:
   ```bash
   npm start
   ```

---

## 8. Flujo de Uso

```mermaid
flowchart TD
  A[Configurar datos iniciales] --> B[Configurar turnos y alimentación]
  B --> C[Agregar empleados]
  C --> D[Programar turnos]
  D --> E[Calcular resultados]
  E --> F[Revisar resumen y liquidación]
  F --> G[Exportar Excel]
```

---

## 9. Configuración Funcional

### 9.1 Recargos y extras (por defecto)

| Concepto | Valor |
|---|---:|
| Recargo nocturno | 35% |
| Recargo festivo diurno | 90% |
| Recargo festivo nocturno | 125% |
| Hora extra diurna | 25% |
| Hora extra nocturna | 75% |
| Hora extra festiva diurna | 115% |
| Hora extra festiva nocturna | 165% |

### 9.2 Horario nocturno

- Inicio: `19:00`
- Fin: `06:00`

### 9.3 Alimentación

- Sin almuerzo.
- Predefinido (30 min / 1 hora).
- Personalizado.
- Regla especial 24H: segunda pausa (si aplica en operación).

---

## 10. Motor de Cálculo (Resumen)

- Cómputo por semana completa (domingo-sábado).
- Clasificación minuto a minuto para precisión real.
- Distribución ordinarias/extras según tope semanal.
- Conversión monetaria por tipo de hora.

Fórmula base:

```text
Valor hora ordinaria = salario mensual / 220
```

### 10.1 Tope semanal y horas extras

- El tope base es **42 horas por semana**.
- Los días se recorren en orden (domingo → sábado) llevando un **acumulado de horas trabajadas**.
- Cuando el acumulado supera el tope, las horas restantes se clasifican como **extras** (diurnas, nocturnas o festivas según el minuto en que ocurren).
- **Solo las horas realmente trabajadas** (turnos dinámicos y turno manual) suman al acumulado.
- Los festivos no trabajados **no reducen** el tope.
- Domingo trabajado sin ningún día libre (`C`) en la semana: sus horas se liquidan como extras.

### 10.2 Conceptos especiales

Los conceptos especiales **no son horas trabajadas**: nunca generan horas ordinarias, extras ni recargos. Cada uno tiene un efecto distinto sobre el cálculo semanal:

| Concepto | Código | ¿Suma para extras? | Efecto |
|---|---|---|---|
| Incapacidad | `I` | ❌ No | Solo **cubre la deuda** semanal con sus horas configuradas (7 h por defecto). |
| Permiso remunerado | `PR` | ❌ No | Solo **cubre la deuda** semanal. |
| Vacaciones | `V` | ❌ No | Solo **cubre la deuda** semanal. |
| Ausencia | `A` | ➖ Resta | Descuenta sus horas del acumulado semanal. |
| Sin contrato | `SC` | ❌ No | **Reduce el tope** semanal en sus horas, solo de lunes a sábado (el domingo no reduce). |
| Libre | `C` | ❌ No | Día de descanso, sin efecto en horas. |

> **Importante:** I, PR y V **no adelantan las extras**. Antes de octubre de 2026 (commit `38f3550`) estos conceptos sumaban al acumulado y hacían que horas trabajadas reales salieran como extras; esto quedó corregido.

**Deuda semanal:**

```text
Deuda = máx(0, Tope − (Horas trabajadas + Horas I/PR/V − Horas A))
```

**Ejemplo** (tope 42 h, turnos de 8 h):

| Semana | Trabajadas | I/PR/V | Extras | Deuda |
|---|---:|---:|---:|---:|
| Lun `I`, Mar–Sáb trabajados | 40 h | 7 h | 0 h | 0 h |
| Lun `V`, Mar `PR`, Mié–Sáb trabajados | 32 h | 14 h | 0 h | 0 h |
| Lun–Mar `I`, Mié–Vie trabajados | 24 h | 14 h | 0 h | 4 h |
| Lun–Sáb trabajados | 48 h | 0 h | 6 h | 0 h |

En la pantalla de resultados, la cabecera de cada semana muestra **"Horas justificadas (I/PR/V, solo deuda)"** para dejar claro que esas horas no cuentan para extras.

El tipo de comportamiento también se reconoce por el nombre del concepto: un concepto personalizado cuyo nombre contenga *incapacidad*, *vacaciones* o *permiso remunerado* se trata igual que `I`/`PR`/`V`.

### 10.3 Pruebas automáticas del motor

Las reglas de los conceptos especiales y los escenarios de semana completa están cubiertos en `test/test_conceptos.js` (no requiere navegador):

```bash
node test/test_conceptos.js
```

Ejecute esta prueba después de cualquier cambio en `archivos/TURNOS.js`.

---

## 11. Preparación para Vercel (ya implementada)

Este repositorio quedó listo para deploy estático en Vercel con:

- `index.html` como entrada del dominio.
- `INICIO_TURNOS.html` como vista principal.
- `vercel.json` con routing y headers.
- Rutas relativas compatibles web (`archivos/...`).
- SEO básico en `INICIO_TURNOS.html` (`title`, `description`, OG, favicon, viewport, charset).
- Separación clara entre capa web y capa Electron.

---

## 12. Despliegue en Vercel (CI/CD con GitHub)

1. Subir cambios a GitHub (`main` o rama de release).
2. Entrar a Vercel y conectar el repositorio.
3. En **Project Settings**:
   - Framework: `Other`
   - Build Command: *(vacío)*
   - Output Directory: *(vacío / raíz)*
4. Deploy.

La URL quedará disponible como:

`https://<nombre-proyecto>.vercel.app`

No requiere configuración adicional porque `vercel.json` ya está incluido.

---

## 13. Actualización del Proyecto

1. Realizar cambios en repo.
2. Push a GitHub.
3. Vercel ejecuta redeploy automático.
4. Validar URL publicada.

---

## 14. Solución de Problemas

### La app abre pero sin estilos

- Verifique que `archivos/TURNOS.css` exista y sea accesible.

### Cambié el código pero el navegador sigue calculando igual

- `INICIO_TURNOS.html` carga `TURNOS.js` y `TURNOS.css` con un parámetro de versión (`?v=AAAAMMDDhhmm`). Actualícelo en cada cambio para forzar la recarga.
- Como alternativa, recargue con **Ctrl + F5**.

### El manual no aparece

- Verifique `archivos/instructivo.js`.
- `archivos/instructivo.md` se usa como fallback.

### El Excel no descarga en web

- Permita descargas del navegador.
- Verifique bloqueo por extensiones o políticas corporativas.

### En desktop no abre Electron

- Ejecute `npm install` dentro de `archivos/`.
- Revise versión de Node y permisos.

---

## 15. Seguridad y Consideraciones

- No se publican secretos en esta estructura.
- Persistencia en navegador vía `localStorage`.
- Recursos externos CDN: `marked` y `xlsx` (dependen de disponibilidad del CDN).

> Recomendación técnica: para máxima resiliencia offline en web, migrar esas librerías a archivos locales versionados en `archivos/`.

---

## 16. Buenas Prácticas

1. Configurar turnos y alimentación antes de programar.
2. Pre-guardar turnos antes de editar períodos.
3. Validar festivos/domingos antes de liquidar.
4. Estandarizar códigos de turno/concepto.
5. Exportar y respaldar Excel al cerrar cálculo.
6. Registrar incapacidades, permisos y vacaciones con su concepto (`I`, `PR`, `V`) y no como turno trabajado, para que no generen extras.

---

## 17. Créditos

- **Autor:** Alejostone
- **Sistema:** Sistema de Control de Turnos y Horas Extras
- **Versión:** 4.8
- **Repositorio:** `Alejostone1/Turnos_Claret`

