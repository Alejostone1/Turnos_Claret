/**
 * Sistema de Control de Turnos y Cálculo de Horas Extras - Versión Mejorada
 * Maneja períodos completos con cálculo semanal y acumulado correcto
 * Versión: 4.8
 *
 * CAMBIOS v4.8:
 * - Salario mínimo actualizado a $1.750.905
 * - Corrección crítica: El cálculo de horas ahora considera la semana COMPLETA (dom-sáb)
 *   para determinar correctamente cuándo inician las horas extras
 * - Corrección: La función Editar ya NO borra los turnos preguardados
 * - Los turnos se preservan al ampliar/reducir el período
 */

class SistemaTurnosMejorado {
  constructor(options = {}) {
    // Propiedades de configuración inicial de la clase.
    this.diasSemana = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ]; // Nombres de los días para visualización.
    this.horasMaximasSemanalesNormal = 42; // Tope de horas ordinarias por semana según la ley.
    this.empleados = new Map(); // Estructura para múltiples empleados
    this.numeroEmpleadosDefinido = 1; // Número de empleados a programar
    this.empleadosAgregados = 0; // Contador de empleados agregados

    this.configuracion = this.cargarConfiguracion();
    this.actualizarTiposTurno(); // Carga los tipos de turno desde la configuración

    // Opciones de inicialización (por ejemplo, tests pueden pasar { skipUI: true })
    this._options = options || {};
    if (!this._options.skipUI) {
      // Llama a los métodos iniciales para configurar la aplicación.
      this.inicializarEventos();
      this.configurarFechasActuales();
      this.popularFormularioDeConfiguracion();
    }

    // Base de datos de festivos en Colombia (formato YYYY-MM-DD)
    this.festivosColombia = new Set([
      // 2025
      "2025-01-01", // Año Nuevo
      "2025-01-06", // Día de los Reyes Magos
      "2025-03-24", // Día de San José
      "2025-04-17", // Jueves Santo
      "2025-04-18", // Viernes Santo
      "2025-05-01", // Día del Trabajo
      "2025-06-02", // Día de la Ascensión
      "2025-06-23", // Corpus Christi
      "2025-06-30", // Sagrado Corazón / San Pedro y San Pablo
      "2025-07-20", // Día de la Independencia
      "2025-08-07", // Batalla de Boyacá
      "2025-08-18", // La Asunción de la Virgen
      "2025-10-13", // Día de la Raza
      "2025-11-03", // Día de Todos los Santos
      "2025-11-17", // Independencia de Cartagena
      "2025-12-08", // Día de la Inmaculada Concepción
      "2025-12-25", // Navidad

      // 2026
      "2026-01-01", // Año Nuevo
      "2026-01-12", // Día de los Reyes Magos
      "2026-03-23", // Día de San José
      "2026-04-02", // Jueves Santo
      "2026-04-03", // Viernes Santo
      "2026-05-01", // Día del Trabajo
      "2026-05-18", // Día de la Ascensión del Señor
      "2026-06-08", // Corpus Christi
      "2026-06-15", // Sagrado Corazón de Jesús
      "2026-06-29", // San Pedro y San Pablo
      "2026-07-13", // Virgen de chinquinquira
      "2026-07-20", // Día de la Independencia
      "2026-08-07", // Batalla de Boyacá
      "2026-08-17", // La Asunción de la Virgen
      "2026-10-12", // Día de la Raza
      "2026-11-02", // Día de Todos los Santos
      "2026-11-16", // Independencia de Cartagena
      "2026-12-08", // Día de la Inmaculada Concepción
      "2026-12-25", // Navidad

            // 2027
      "2027-01-01", // Año Nuevo
      "2027-01-11", // Día de los Reyes Magos
      "2027-03-22", // Día de San José
      "2027-03-25", // Jueves Santo
      "2027-03-26", // Viernes Santo
      "2027-05-01", // Día del Trabajo
      "2027-05-10", // Día de la Ascensión del Señor
      "2027-05-31", // Corpus Christi
      "2027-06-07", // Sagrado Corazón de Jesús
      "2027-07-05", // San Pedro y San Pablo
      "2027-07-12", // Virgen del Rosario de Chiquinquirá
      "2027-07-20", // Día de la Independencia
      "2027-08-07", // Batalla de Boyacá
      "2027-08-16", // La Asunción de la Virgen
      "2027-10-18", // Día de la Raza
      "2027-11-01", // Día de Todos los Santos
      "2027-11-15", // Independencia de Cartagena
      "2027-12-08", // Día de la Inmaculada Concepción
      "2027-12-25", // Navidad
    ]);
  }

  /**
   * Reemplaza selects nativos por un componente visual consistente (custom select)
   * que renderiza las opciones con indicadores de color y fondo personalizado.
   * Mantiene sincronizado el <select> nativo (lo oculta visualmente).
   */
  inicializarCustomSelects() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.selector-wrapper').forEach(wrapper => {
      const select = wrapper.querySelector('.selector-turno');
      if (!select || select.dataset.customInit === '1') return;

      // Crear estructura
      const custom = document.createElement('div');
      custom.className = 'custom-select';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'custom-select-toggle';
      toggle.setAttribute('aria-haspopup', 'listbox');

      const valueSpan = document.createElement('div');
      valueSpan.className = 'custom-select-value';

      const caret = document.createElement('span');
      caret.className = 'select-caret';
      caret.innerHTML = '▾';

      toggle.appendChild(valueSpan);
      toggle.appendChild(caret);

      const list = document.createElement('div');
      list.className = 'custom-select-list';
      list.style.display = 'none';
      // We'll attach the list to body when opened to avoid clipping by overflow:hidden parents
      list.dataset.attached = '0';

      // Construir items desde options
      Array.from(select.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-select-item';
        item.dataset.value = opt.value;

        const ind = document.createElement('span');
        ind.className = 'item-indicator';
        const color = opt.dataset.color || (this.tiposTurno[opt.value] && this.tiposTurno[opt.value].color) || '#9e9e9e';
        ind.style.background = color;
        ind.style.border = '1px solid rgba(0,0,0,0.08)';

        const estilosItem = this.calcularEstilosDeColor(color);
        // aplicar background ligero al item y contraste de texto
        item.style.background = estilosItem.bg;
        item.style.color = estilosItem.text;
        item.style.borderBottom = `1px solid ${estilosItem.border}22`;

        const txt = document.createElement('span');
        txt.className = 'item-text';
        txt.innerHTML = opt.textContent;

        item.appendChild(ind);
        item.appendChild(txt);
        list.appendChild(item);

        item.addEventListener('click', () => {
          select.value = opt.value;
          select.dispatchEvent(new Event('change'));
          // Close
          if (list.dataset.attached === '1') {
            list.style.display = 'none';
            list.dataset.attached = '0';
            if (list.parentNode === document.body) document.body.removeChild(list);
          }
          toggle.setAttribute('aria-expanded', 'false');
          this._updateCustomValue(select, valueSpan);
        });
      });

      custom.appendChild(toggle);
      custom.appendChild(list);

      // Insert custom before select and hide select visually
      wrapper.insertBefore(custom, select);
      select.setAttribute('aria-hidden', 'true');
      select.dataset.customInit = '1';

      // Mantener sincronizado el valor mostrado cuando el <select> cambie (programáticamente o por código)
      select.addEventListener('change', () => this._updateCustomValue(select, valueSpan));

      // Open/close: attach list to body and position to avoid clipping
      const openList = () => {
        // close other lists
        document.querySelectorAll('.custom-select-list[data-attached="1"]').forEach(l => {
          l.style.display = 'none';
          l.dataset.attached = '0';
          if (l.parentNode === document.body) document.body.removeChild(l);
        });

        // attach to body
        document.body.appendChild(list);
        list.style.position = 'absolute';
        list.style.zIndex = '9999';
        list.style.display = '';
        list.dataset.attached = '1';

        const rect = toggle.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const estimatedHeight = Math.min(list.scrollHeight || 280, viewportHeight - 96);
        const width = Math.min(Math.max(rect.width, 280), Math.min(viewportWidth - 24, 420));
        let top = rect.bottom + window.scrollY + 8;
        if (rect.bottom + estimatedHeight + 16 > viewportHeight && rect.top > estimatedHeight + 16) {
          top = rect.top + window.scrollY - estimatedHeight - 8;
        }
        let left = rect.left + window.scrollX;
        if (left + width + 16 > viewportWidth + window.scrollX) {
          left = Math.max(12 + window.scrollX, viewportWidth + window.scrollX - width - 16);
        }
        list.style.left = `${left}px`;
        list.style.top = `${top}px`;
        list.style.width = `${width}px`;
        list.style.maxHeight = `${Math.min(estimatedHeight, viewportHeight - 96)}px`;
      };

      const closeList = () => {
        list.style.display = 'none';
        list.dataset.attached = '0';
        if (list.parentNode === document.body) document.body.removeChild(list);
      };

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (list.dataset.attached === '1') closeList(); else openList();
      });

      // Close on outside click
      document.addEventListener('click', () => { closeList(); });

      // Initialize displayed value
      this._updateCustomValue(select, valueSpan);
    });
  }

  _updateCustomValue(select, valueSpan) {
    const opt = select.options[select.selectedIndex];
    const color = opt && opt.dataset && opt.dataset.color ? opt.dataset.color : (this.tiposTurno[opt.value] && this.tiposTurno[opt.value].color) || '#9e9e9e';
    const texto = opt ? opt.textContent : '';
    const estilos = this.calcularEstilosDeColor(color);
    valueSpan.innerHTML = '';
    const ind = document.createElement('span');
    ind.className = 'item-indicator';
    ind.style.background = color;
    ind.style.border = '1px solid rgba(0,0,0,0.08)';
    const txt = document.createElement('span'); txt.textContent = texto;
    valueSpan.appendChild(ind);
    valueSpan.appendChild(txt);

    const toggle = valueSpan.closest('.custom-select-toggle');
    if (toggle) {
      toggle.style.background = estilos.bg;
      toggle.style.color = estilos.text;
      toggle.style.borderColor = estilos.border;
    }

    const wrapper = select.closest('.dia-turno');
    if (wrapper) {
      wrapper.style.background = estilos.bg;
      wrapper.style.color = estilos.text;
      wrapper.style.border = wrapper.classList.contains('festivo')
        ? '2px dashed #b91c1c'
        : `1px solid ${estilos.border}`;
      wrapper.style.boxShadow = wrapper.classList.contains('festivo')
        ? '0 0 0 3px rgba(220, 38, 38, 0.16)'
        : '0 4px 12px rgba(2,6,23,0.08)';
    }
  }

  formatearHoraAMPM(timeStr) {
    if (!timeStr) return "";
    const [hourStr, minStr] = timeStr.split(":");
    let h = parseInt(hourStr, 10);
    const m = parseInt(minStr, 10);
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12;
    if (h === 0) h = 12;
    const mFormatted = m === 0 ? "00" : m.toString().padStart(2, "0");
    return `${h}:${mFormatted} ${ampm}`;
  }

  formatearRangoHorario(inicio, fin) {
    if (!inicio || !fin) return "";
    return `(${this.formatearHoraAMPM(inicio)} - ${this.formatearHoraAMPM(fin)})`;
  }

  formatearNombreYHorarioTurno(codigo) {
    const turno = this.tiposTurno ? this.tiposTurno[codigo] : null;
    if (!turno) return codigo;
    if (turno.inicio && turno.fin) {
      return `${turno.nombre} <small>${this.formatearRangoHorario(turno.inicio, turno.fin)}</small>`;
    }
    if (turno.descripcion && turno.descripcion !== turno.nombre) {
      return `${turno.nombre} <small>(${turno.descripcion})</small>`;
    }
    return turno.nombre;
  }

  formatearNombreYHorarioTexto(codigo) {
    const turno = this.tiposTurno ? this.tiposTurno[codigo] : null;
    if (!turno) return codigo;
    if (turno.inicio && turno.fin) {
      return `${turno.nombre} ${this.formatearRangoHorario(turno.inicio, turno.fin)}`;
    }
    if (turno.descripcion && turno.descripcion !== turno.nombre) {
      return `${turno.nombre} (${turno.descripcion})`;
    }
    return turno.nombre;
  }

  obtenerColorTurno(codigo) {
    const coloresEspeciales = {
      C: { bg: "#bbf7d0", text: "#064e3b", border: "#86efac" },
      M: { bg: "#fef9c3", text: "#713f12", border: "#fde047" },
      I: { bg: "#ffe4e6", text: "#991b1b", border: "#fecdd3" },
      SC: { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" },
      PR: { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" },
      A: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
      V: { bg: "#e0f2fe", text: "#0c4a6e", border: "#bae6fd" }
    };

    // Allow admin-configured special types to override built-in palette
    if (this.configuracion && this.configuracion.tiposTurnoEspeciales && this.configuracion.tiposTurnoEspeciales[codigo] && this.configuracion.tiposTurnoEspeciales[codigo].color) {
      return this.calcularEstilosDeColor(this.configuracion.tiposTurnoEspeciales[codigo].color);
    }

    if (coloresEspeciales[codigo]) {
      return coloresEspeciales[codigo];
    }

    const turno = (this.tiposTurno && this.tiposTurno[codigo]) || 
                  (this.configuracion && this.configuracion.turnosDinamicos && this.configuracion.turnosDinamicos[codigo]);

    const bgHex = (turno && turno.color) ? turno.color : "#9e9e9e";
    return this.calcularEstilosDeColor(bgHex);
  }

  calcularEstilosDeColor(hex) {
    if (!hex) hex = "#9e9e9e";
    let colorHex = hex.replace("#", "");
    if (colorHex.length === 3) {
      colorHex = colorHex.split("").map(c => c + c).join("");
    }
    const r = parseInt(colorHex.substring(0, 2), 16) || 0;
    const g = parseInt(colorHex.substring(2, 4), 16) || 0;
    const b = parseInt(colorHex.substring(4, 6), 16) || 0;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const isLight = luminance > 150;

    const textColor = isLight ? "#1e293b" : "#ffffff";

    const borderR = Math.max(0, Math.min(255, isLight ? r - 45 : r + 45));
    const borderG = Math.max(0, Math.min(255, isLight ? g - 45 : g + 45));
    const borderB = Math.max(0, Math.min(255, isLight ? b - 45 : b + 45));
    const borderColor = `#${borderR.toString(16).padStart(2, "0")}${borderG.toString(16).padStart(2, "0")}${borderB.toString(16).padStart(2, "0")}`;

    return {
      bg: hex.startsWith("#") ? hex : `#${hex}`,
      text: textColor,
      border: borderColor
    };
  }

  /**
   * Crea el HTML de un badge/chip de turno de forma consistente.
   * Solo maneja presentación: background, text y border se calculan desde el color.
   */
  crearBadgeTurnoHTML(codigo, texto) {
    const estilo = this.obtenerColorTurno(codigo) || { bg: '#9e9e9e', text: '#ffffff', border: '#7a7a7a' };
    const inline = `background:${estilo.bg}; color:${estilo.text}; border:1px solid ${estilo.border};`;
    // Indicador pequeño + texto
    return `<span class="turno-badge" style="${inline}"><span class="turno-indicator" style="background:${estilo.bg}; border:1px solid ${estilo.border}"></span><span class="turno-text">${texto}</span></span>`;
  }

  _toMinutes(time) {
    const [h, m] = String(time || "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  _duracionRangoMinutos(inicioStr, finStr) {
    const inicio = this._toMinutes(inicioStr);
    let fin = this._toMinutes(finStr);
    if (fin <= inicio) fin += 24 * 60;
    return Math.max(0, fin - inicio);
  }

  _obtenerMinutosAlimentacion(confAlm) {
    if (!confAlm || confAlm.tipo === "sin-almuerzo") return 0;
    if (confAlm.tipo === "predefinido") {
      return Math.max(0, Math.round((confAlm.tiempoEnHoras || 0) * 60));
    }
    if (confAlm.tipo === "personalizado") {
      if (!confAlm.inicio || !confAlm.fin) return 0;
      return this._duracionRangoMinutos(confAlm.inicio, confAlm.fin);
    }
    return 0;
  }

  _normalizarVentanas(ventanas, min, max) {
    const clipped = (ventanas || [])
      .map((w) => ({
        start: Math.max(min, Number(w.start)),
        end: Math.min(max, Number(w.end)),
      }))
      .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start)
      .sort((a, b) => a.start - b.start);

    if (clipped.length <= 1) return clipped;

    const merged = [clipped[0]];
    for (let i = 1; i < clipped.length; i++) {
      const last = merged[merged.length - 1];
      const current = clipped[i];
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  _obtenerContextoAlimentacionTurno(inicioTurnoStr, finTurnoStr, confAlm, es24h = false) {
    const inicioProgramado = this._toMinutes(inicioTurnoStr);
    let finProgramado = this._toMinutes(finTurnoStr);
    if (finProgramado <= inicioProgramado) finProgramado += 24 * 60;

    const duracionTurno = Math.max(0, finProgramado - inicioProgramado);
    const minutosAlimentacion = Math.min(
      this._obtenerMinutosAlimentacion(confAlm),
      duracionTurno
    );

    const inicioEfectivo = inicioProgramado + minutosAlimentacion;
    const ventanasNoLaboradas = [];

    // Mantiene la regla especial histórica para 24H:
    // una segunda pausa con la misma duración, 12 horas después del inicio programado.
    if (es24h && minutosAlimentacion > 0) {
      const segundaInicio = inicioProgramado + 12 * 60;
      ventanasNoLaboradas.push({
        start: segundaInicio,
        end: segundaInicio + minutosAlimentacion,
      });
    }

    const ventanas = this._normalizarVentanas(
      ventanasNoLaboradas,
      inicioEfectivo,
      finProgramado
    );

    return {
      inicioProgramado,
      finProgramado,
      inicioEfectivo,
      ventanasNoLaboradas: ventanas,
    };
  }

  /**
   * Cuenta minutos efectivos dentro del turno excluyendo alimentación.
   */
  contarMinutosEfectivos(inicioTurnoStr, finTurnoStr, confAlm, es24h) {
    const ctx = this._obtenerContextoAlimentacionTurno(
      inicioTurnoStr,
      finTurnoStr,
      confAlm,
      es24h
    );
    if (ctx.inicioEfectivo >= ctx.finProgramado) return 0;

    let minutosLaborados = ctx.finProgramado - ctx.inicioEfectivo;
    for (const w of ctx.ventanasNoLaboradas) {
      minutosLaborados -= w.end - w.start;
    }
    return Math.max(0, minutosLaborados);
  }

  actualizarTiposTurno() {
    this.tiposTurno = {
      C: { nombre: "Libre", horas: 0, descripcion: "Descanso", color: "#bbf7d0" },
      M: { nombre: "Turno Manual", horas: 0, descripcion: "Manual", color: "#fef9c3" },
      ...this.configuracion.tiposTurnoEspeciales,
    };

    const configuracionAlmuerzo = typeof this.obtenerConfiguracionAlmuerzo === 'function'
      ? this.obtenerConfiguracionAlmuerzo()
      : { tipo: "predefinido", tiempoEnHoras: 0.5 };

    // Fusión de turnos dinámicos
    if (this.configuracion.turnosDinamicos) {
      Object.keys(this.configuracion.turnosDinamicos).forEach(codigo => {
        const t = this.configuracion.turnosDinamicos[codigo];
        if (t.activo) {
          const es24h = (t.inicio === t.fin);
          let horas = 0;
          if (t.descontarAlimentacion !== false) {
            horas = this.calcularHorasTurnoConAlmuerzo(t.inicio, t.fin, configuracionAlmuerzo, es24h);
          } else {
            horas = this.calcularHorasDesdeTiempos(t.inicio, t.fin, false, 0);
          }
          const descHorario = `${this.formatearHoraAMPM(t.inicio)} - ${this.formatearHoraAMPM(t.fin)}`;

          this.tiposTurno[codigo] = {
            id: t.id,
            nombre: t.nombre,
            codigo: t.codigo,
            inicio: t.inicio,
            fin: t.fin,
            color: t.color || "#9e9e9e",
            horas: horas,
            descontarAlimentacion: t.descontarAlimentacion !== false,
            descripcion: descHorario
          };
        }
      });
    }
  }

  cargarConfiguracion() {
    const configGuardada = localStorage.getItem("configuracionTurnos");
    let config;
    if (configGuardada) {
      config = JSON.parse(configGuardada);
    } else {
      config = {
        recargoNocturno: { porcentaje: 35, inicio: "19:00", fin: "06:00" },
        recargoFestivo: { porcentaje: 90 },
        recargoNocturnoFestivo: { porcentaje: 125 },
        extraDiurna: { porcentaje: 25 },
        extraNocturna: { porcentaje: 75 },
        extraDiurnaFestiva: { porcentaje: 115 },
        extraNocturnaFestiva: { porcentaje: 165 },
        tiposTurnoEspeciales: {
          I: { nombre: "Incapacitado", horas: 7, descripcion: "Incapacidad", color: "#42A5F5" },
          SC: { nombre: "Sin contrato", horas: 7, descripcion: "Sin contrato", color: "#90A4AE" },
          PR: {
            nombre: "Permiso remunerado",
            horas: 7,
            descripcion: "Permiso remunerado",
            color: "#66BB6A"
          },
          A: { nombre: "Ausencia", horas: 7, descripcion: "Ausencia", color: "#EF5350" },
          V: { nombre: "Vacaciones", horas: 7, descripcion: "Vacaciones", color: "#2E7D32" },
        },
        versionConceptos: 2,
      };
    }
    const huboLimpiezaInicial = this._eliminarConceptosObsoletos(config);

    // Asegurarse de que la configuración vieja tenga los nuevos tipos
    if (!config.tiposTurnoEspeciales) {
      config.tiposTurnoEspeciales = {
        I: { nombre: "Incapacitado", horas: 7, descripcion: "Incapacidad", color: "#42A5F5" },
        SC: { nombre: "Sin contrato", horas: 7, descripcion: "Sin contrato", color: "#90A4AE" },
        PR: {
          nombre: "Permiso remunerado",
          horas: 7,
          descripcion: "Permiso remunerado",
          color: "#66BB6A"
        },
        A: { nombre: "Ausencia", horas: 7, descripcion: "Ausencia", color: "#EF5350" },
        V: { nombre: "Vacaciones", horas: 7, descripcion: "Vacaciones", color: "#2E7D32" },
      };
    }

    // Migración v2: A y SC pasan a tener horas equivalentes funcionales (7h)
    if (!config.versionConceptos || config.versionConceptos < 2) {
      const esp = config.tiposTurnoEspeciales;
      if (esp?.A && esp.A.horas === 0) esp.A.horas = 7;
      if (esp?.SC && esp.SC.horas === 0) esp.SC.horas = 7;
      config.versionConceptos = 2;
    }

    // FASE 1: Migración a Turnos Dinámicos
    if (!config.turnosDinamicos) {
      // Auto-inyección de los turnos base para mantener retrocompatibilidad
      config.turnosDinamicos = {
        D: { id: 't_dia', nombre: "Día", codigo: "D", inicio: "07:00", fin: "19:00", color: "#fef3c7", descontarAlimentacion: true, activo: true, descripcion: "" },
        N: { id: 't_noche', nombre: "Noche", codigo: "N", inicio: "19:00", fin: "07:00", color: "#dbeafe", descontarAlimentacion: true, activo: true, descripcion: "" },
        "24T": { id: 't_24', nombre: "24 Horas", codigo: "24T", inicio: "07:00", fin: "07:00", color: "#e9d5ff", descontarAlimentacion: true, activo: true, descripcion: "" }
      };
    } else {
      // Garantizar propiedad descontarAlimentacion en configuraciones guardadas
      Object.values(config.turnosDinamicos).forEach(t => {
        if (t.descontarAlimentacion === undefined) {
          t.descontarAlimentacion = true;
        }
      });
    }

    // Añadir códigos de exportación por defecto si faltan
    if (!config.codigoExportacion) {
      config.codigoExportacion = {
        horasExtrasDiurnas: "045",
        horasExtrasNocturnas: "046",
        recargoFestivoDiurno: "011",
        recargoFestivoNocturno: "012",
        horasExtrasFestivasDiurnas: "047",
        horasExtrasFestivasNocturnas: "048",
        recargoNocturno: "010",
      };
    } else {
      const defaults = {
        horasExtrasDiurnas: "045",
        horasExtrasNocturnas: "046",
        recargoFestivoDiurno: "011",
        recargoFestivoNocturno: "012",
        horasExtrasFestivasDiurnas: "047",
        horasExtrasFestivasNocturnas: "048",
        recargoNocturno: "010",
      };
      Object.keys(defaults).forEach((key) => {
        if (!config.codigoExportacion[key]) {
          config.codigoExportacion[key] = defaults[key];
        }
      });
    }

    if (huboLimpiezaInicial) {
      localStorage.setItem("configuracionTurnos", JSON.stringify(config));
    }

    return config;
  }

  _eliminarConceptosObsoletos(config) {
    if (!config || typeof config !== "object") return;
    let huboCambios = false;

    const limpiarColeccion = (coleccion) => {
      if (!coleccion || typeof coleccion !== "object") return;

      Object.keys(coleccion).forEach((codigo) => {
        const item = coleccion[codigo];
        if (this._esConceptoObsoleto(codigo, item?.nombre)) {
          delete coleccion[codigo];
          huboCambios = true;
        }
      });
    };

    limpiarColeccion(config.tiposTurnoEspeciales);
    limpiarColeccion(config.turnosDinamicos);
    return huboCambios;
  }

  _esConceptoObsoleto(codigo, nombre) {
    const normalizar = (valor) =>
      String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");

    const codigoNormalizado = normalizar(codigo);
    const nombreNormalizado = normalizar(nombre);

    return (
      codigoNormalizado === "df" ||
      codigoNormalizado.includes("familyday") ||
      nombreNormalizado.includes("diafamilia") ||
      nombreNormalizado.includes("familyday")
    );
  }

  _normalizarTexto(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
  }

  _esConceptoConHorasEquivalentesParaTope(codigo, tipoConfig) {
    const codigoNormalizado = this._normalizarTexto(codigo);
    const nombreNormalizado = this._normalizarTexto(tipoConfig?.nombre);
    const descripcionNormalizada = this._normalizarTexto(tipoConfig?.descripcion);

    if (["i", "pr", "v"].includes(codigoNormalizado)) return true;

    const texto = `${nombreNormalizado} ${descripcionNormalizada}`;
    return (
      texto.includes("incapac") ||
      texto.includes("vacacion") ||
      (texto.includes("permiso") && texto.includes("remuner"))
    );
  }

  _obtenerHorasEquivalentesParaTope(codigoTurno) {
    const tipoConfig = this.configuracion?.tiposTurnoEspeciales?.[codigoTurno];
    if (!tipoConfig) return 0;
    if (!this._esConceptoConHorasEquivalentesParaTope(codigoTurno, tipoConfig)) {
      return 0;
    }
    const horas = parseFloat(tipoConfig.horas);
    return Number.isFinite(horas) && horas > 0 ? horas : 0;
  }

  /**
   * Determina el comportamiento de un concepto especial respecto al tope semanal:
   * 'suma'        → I, PR, V: suma horas equivalentes al acumulador (ayuda a alcanzar el tope)
   * 'resta'       → A: resta horas equivalentes del acumulador (dificulta alcanzar el tope)
   * 'reduce_tope' → SC: reduce el tope semanal (solo lunes–sábado, nunca domingo)
   * 'ninguno'     → sin efecto sobre el tope
   */
  _obtenerComportamientoConceptoEspecial(codigo) {
    const tipoConfig = this.configuracion?.tiposTurnoEspeciales?.[codigo];
    const codigoNorm = this._normalizarTexto(codigo);
    const texto = tipoConfig
      ? `${this._normalizarTexto(tipoConfig.nombre)} ${this._normalizarTexto(tipoConfig.descripcion)}`
      : "";

    if (codigoNorm === "sc" || texto.includes("sincontrato")) return "reduce_tope";
    if (codigoNorm === "a" || texto.includes("ausencia")) return "resta";
    if (
      ["i", "pr", "v"].includes(codigoNorm) ||
      texto.includes("incapac") ||
      texto.includes("vacacion") ||
      (texto.includes("permiso") && texto.includes("remuner"))
    ) return "suma";

    return "ninguno";
  }

  /**
   * Retorna { ajusteAcumulador, ajusteTope } para un código de concepto.
   * - ajusteAcumulador: variación al acumulador de horas para extras (>0 suma, <0 resta)
   * - ajusteTope:       variación al tope semanal (<0 para SC, 0 para el resto)
   * @param {string}  codigo     Código del concepto
   * @param {boolean} esDomingo  true si el día es domingo (SC no reduce tope en domingo)
   */
  _obtenerAjusteConceptoEspecial(codigo, esDomingo = false) {
    const comportamiento = this._obtenerComportamientoConceptoEspecial(codigo);
    const tipoConfig = this.configuracion?.tiposTurnoEspeciales?.[codigo];
    const horas = tipoConfig ? (parseFloat(tipoConfig.horas) || 0) : 0;

    switch (comportamiento) {
      case "suma":        return { ajusteAcumulador: horas,   ajusteTope: 0 };
      case "resta":       return { ajusteAcumulador: -horas,  ajusteTope: 0 };
      case "reduce_tope": return { ajusteAcumulador: 0, ajusteTope: esDomingo ? 0 : -horas };
      default:            return { ajusteAcumulador: 0,       ajusteTope: 0 };
    }
  }

  _obtenerTurnoAsignadoParaDia(empleado, semanaNumero, indexDia, fechaDia) {
    const fechaKey = fechaDia.toISOString().split("T")[0];
    const turnoGuardado = empleado.turnosGuardados.get(fechaKey);
    if (turnoGuardado && turnoGuardado.turno) {
      return { turno: turnoGuardado.turno, turnoGuardado };
    }

    const selector = document.querySelector(
      `[data-empleado="${empleado.documento}"][data-semana="${semanaNumero}"][data-dia="${indexDia}"]`
    );
    const turno = selector ? selector.value : null;
    return { turno, turnoGuardado: null };
  }

  guardarConfiguracion() {
    localStorage.setItem(
      "configuracionTurnos",
      JSON.stringify(this.configuracion)
    );
  }

  popularFormularioDeConfiguracion() {
    const huboLimpieza = this._eliminarConceptosObsoletos(this.configuracion);
    if (huboLimpieza) {
      this.guardarConfiguracion();
      this.actualizarTiposTurno();
    }

    this.generarTarjetasRecargos();
    this.generarTarjetasExtras();
    this.generarTarjetasTiposTurnoEspeciales();
    this.generarTarjetasTurnosDinamicos();
    this.configurarEventosConfiguracion();
  }

  generarTarjetasTurnosDinamicos() {
    const container = document.getElementById("dynamic-shifts-list");
    if (!container) return;
    container.innerHTML = "";

    if (!this.configuracion.turnosDinamicos) return;

    Object.values(this.configuracion.turnosDinamicos).forEach(turno => {
      const tarjeta = document.createElement("div");
      tarjeta.className = `shift-card ${turno.activo ? "" : "inactive-shift"}`;
      tarjeta.style.borderTop = `4px solid ${turno.color}`;
      tarjeta.innerHTML = `
        <div class="shift-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="color" class="shift-color-picker" data-codigo="${turno.codigo}" value="${turno.color}" title="Cambiar color" style="width: 25px; height: 25px; padding: 0; border: none; border-radius: 4px; cursor: pointer;">
                <input type="text" class="shift-title-input" data-codigo="${turno.codigo}" value="${turno.nombre}" style="font-weight: 600; font-size: 1.1rem; border: none; border-bottom: 1px solid #ccc; background: transparent; padding: 2px 5px; width: 100px;" placeholder="Nombre">
                <input type="text" class="shift-code-input" data-codigo="${turno.codigo}" value="${turno.codigo}" style="font-size: 0.9rem; border: 1px solid #ccc; background: white; padding: 2px 5px; width: 45px; border-radius: 4px; text-align: center;" placeholder="Cód" title="Código UI (1-3 letras)" ${['D','N','24T'].includes(turno.codigo) ? 'readonly' : ''}>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="action-btn-small toggle-shift-btn" data-codigo="${turno.codigo}" title="${turno.activo ? 'Desactivar' : 'Activar'}" style="background:transparent; border:none; cursor:pointer; font-size: 1.2rem; opacity: ${turno.activo ? '1' : '0.5'};">
                    ${turno.activo ? '✅' : '❌'}
                </button>
                <button class="action-btn-small delete-shift-btn" data-codigo="${turno.codigo}" title="Eliminar Turno" style="background:transparent; border:none; cursor:pointer; font-size: 1.2rem;">
                    🗑️
                </button>
            </div>
        </div>
        <div class="shift-times">
            <div class="time-input-group">
                <label class="time-label">Inicio</label>
                <input type="time" class="time-input shift-start-input" data-codigo="${turno.codigo}" value="${turno.inicio}">
            </div>
            <div class="time-separator">-</div>
            <div class="time-input-group">
                <label class="time-label">Fin</label>
                <input type="time" class="time-input shift-end-input" data-codigo="${turno.codigo}" value="${turno.fin}">
            </div>
        </div>
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer; color: #475569; font-weight: 500;">
                <input type="checkbox" class="shift-meal-input" data-codigo="${turno.codigo}" ${turno.descontarAlimentacion !== false ? 'checked' : ''}>
                ✔ Descontar alimentación
            </label>
        </div>
      `;
      container.appendChild(tarjeta);
    });

    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => this.actualizarTurnoDinamico(e.target));
    });
    container.querySelectorAll('.toggle-shift-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.toggleTurnoDinamico(e.currentTarget.dataset.codigo));
    });
    container.querySelectorAll('.delete-shift-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.eliminarTurnoDinamico(e.currentTarget.dataset.codigo));
    });
  }

  agregarNuevoTurnoDinamico() {
    const id = 't_' + Date.now();
    let codigoPropuesto = "T1";
    let contador = 1;
    while(this.configuracion.turnosDinamicos[codigoPropuesto] || this.configuracion.tiposTurnoEspeciales[codigoPropuesto] || ['C', 'M'].includes(codigoPropuesto)) {
        contador++;
        codigoPropuesto = "T" + contador;
    }

    this.configuracion.turnosDinamicos[codigoPropuesto] = {
        id: id,
        nombre: "Nuevo Turno",
        codigo: codigoPropuesto,
        inicio: "08:00",
        fin: "16:00",
        color: "#9e9e9e",
        descontarAlimentacion: true,
        activo: true,
        descripcion: ""
    };
    
    this.guardarConfiguracion();
    this.actualizarTiposTurno();
    this.generarTarjetasTurnosDinamicos();
  }

  actualizarTurnoDinamico(element) {
    const oldCodigo = element.dataset.codigo;
    const turno = this.configuracion.turnosDinamicos[oldCodigo];
    if (!turno) return;

    if (element.classList.contains('shift-title-input')) turno.nombre = element.value;
    if (element.classList.contains('shift-color-picker')) turno.color = element.value;
    if (element.classList.contains('shift-start-input')) turno.inicio = element.value;
    if (element.classList.contains('shift-end-input')) turno.fin = element.value;
    if (element.classList.contains('shift-meal-input')) turno.descontarAlimentacion = element.checked;
    
    if (element.classList.contains('shift-code-input')) {
        let newCodigo = element.value.trim().toUpperCase();
        if (newCodigo === "") newCodigo = oldCodigo;
        if (newCodigo !== oldCodigo) {
            if (this.configuracion.turnosDinamicos[newCodigo] || this.configuracion.tiposTurnoEspeciales[newCodigo] || ['C', 'M'].includes(newCodigo)) {
                alert("El código de turno '" + newCodigo + "' ya está en uso. Por favor usa uno diferente.");
                element.value = oldCodigo;
                return;
            }
            turno.codigo = newCodigo;
            this.configuracion.turnosDinamicos[newCodigo] = turno;
            delete this.configuracion.turnosDinamicos[oldCodigo];
        }
    }

    this.guardarConfiguracion();
    this.actualizarTiposTurno();
    if (element.classList.contains('shift-code-input')) {
        this.generarTarjetasTurnosDinamicos();
    }
  }

  toggleTurnoDinamico(codigo) {
    if (['D', 'N', '24T'].includes(codigo)) {
        alert("Los turnos base de sistema no pueden ser desactivados, solo modificados. (Si no los usas, puedes cambiar su color o nombre)");
        return;
    }
    const turno = this.configuracion.turnosDinamicos[codigo];
    if (turno) {
        turno.activo = !turno.activo;
        this.guardarConfiguracion();
        this.actualizarTiposTurno();
        this.generarTarjetasTurnosDinamicos();
    }
  }

  eliminarTurnoDinamico(codigo) {
    if (['D', 'N', '24T'].includes(codigo)) {
        alert("Los turnos base de sistema no pueden ser eliminados para preservar compatibilidad con registros antiguos. Puedes modificar su inicio/fin.");
        return;
    }
    if (confirm(`¿Estás seguro de eliminar el turno '${this.configuracion.turnosDinamicos[codigo].nombre}'? Los días ya guardados con este turno lo perderán.`)) {
        delete this.configuracion.turnosDinamicos[codigo];
        this.guardarConfiguracion();
        this.actualizarTiposTurno();
        this.generarTarjetasTurnosDinamicos();
    }
  }

  generarTarjetasTiposTurnoEspeciales() {
    const container = document.getElementById(
      "config-tipos-turno-especiales-container"
    );
    if (!container) return;
    container.innerHTML = "";

    let huboEliminaciones = false;
    for (const [codigo, tipo] of Object.entries(this.configuracion.tiposTurnoEspeciales)) {
      if (this._esConceptoObsoleto(codigo, tipo?.nombre)) {
        delete this.configuracion.tiposTurnoEspeciales[codigo];
        huboEliminaciones = true;
        continue;
      }

      const tarjeta = document.createElement("div");
      tarjeta.className = "config-card config-payroll-card";
      tarjeta.style.setProperty("--concept-color", tipo.color || "#9e9e9e");
      tarjeta.innerHTML = `
        <div class="config-card-header">
          <div class="config-card-color-badge" style="background: ${tipo.color || '#9e9e9e'}" title="Color del concepto"></div>
          <h3 class="config-card-title">${tipo.nombre} (${codigo})</h3>
          <button class="btn-delete-tipo-turno" data-codigo="${codigo}" title="Eliminar">&times;</button>
        </div>
        <div class="config-card-body">
          <div class="config-input-group">
            <label for="config-nombre-${codigo}" class="config-label">Nombre</label>
            <p class="config-input-help">Nombre visible del concepto en la operación diaria.</p>
            <input type="text" id="config-nombre-${codigo}" class="config-input-especial" value="${tipo.nombre}" data-codigo="${codigo}" data-prop="nombre">
          </div>
          <div class="config-input-group">
            <label for="config-horas-${codigo}" class="config-label">Horas Equivalentes</label>
            <p class="config-input-help">Cantidad de horas que sumará este concepto.</p>
            <input type="number" id="config-horas-${codigo}" class="config-input-especial" value="${tipo.horas}" data-codigo="${codigo}" data-prop="horas" step="0.5">
          </div>
          <div class="config-input-group">
            <label for="config-color-${codigo}" class="config-label">Color</label>
            <p class="config-input-help">Color usado para identificarlo visualmente.</p>
            <div class="config-color-preview-row">
              <span class="config-color-swatch" style="background: ${tipo.color || '#9e9e9e'}" aria-hidden="true"></span>
              <span class="config-color-value">${tipo.color || '#9e9e9e'}</span>
            </div>
            <input type="color" id="config-color-${codigo}" class="config-input-especial config-input-color" value="${tipo.color || '#9e9e9e'}" data-codigo="${codigo}" data-prop="color">
          </div>
        </div>
      `;
      container.appendChild(tarjeta);
    }

    if (huboEliminaciones) {
      this.guardarConfiguracion();
      this.actualizarTiposTurno();
    }
  }

  /**
   * Genera las tarjetas de recargos
   */
  generarTarjetasRecargos() {
    const grid = document.getElementById("config-recargos-group");
    if (!grid) return;
    grid.innerHTML = "";

    const recargos = ["recargoNocturno", "recargoFestivo", "recargoNocturnoFestivo"];

    recargos.forEach((key) => {
      const config = this.configuracion[key];
      const tarjeta = this.crearTarjetaConcepto(key, config);
      grid.appendChild(tarjeta);
    });
  }

  /**
   * Genera las tarjetas de horas extras
   */
  generarTarjetasExtras() {
    const grid = document.getElementById("config-extras-group");
    if (!grid) return;
    grid.innerHTML = "";

    const extras = [
      "extraDiurna",
      "extraNocturna",
      "extraDiurnaFestiva",
      "extraNocturnaFestiva",
    ];

    extras.forEach((key) => {
      const config = this.configuracion[key];
      const tarjeta = this.crearTarjetaConcepto(key, config);
      grid.appendChild(tarjeta);
    });
  }

  _obtenerMetaConcepto(key) {
    const conceptos = {
      recargoNocturno: {
        icono: "🌙",
        titulo: "Recargo Nocturno",
        descripcion: "Aplica el recargo de trabajo nocturno y define el horario de inicio y fin.",
        codigoExportacion: "recargoNocturno",
        color: "#4338ca",
        estado: "Activo",
        mostrarHorario: true,
      },
      recargoFestivo: {
        icono: "🎊",
        titulo: "Recargo Festivo Diurno",
        descripcion: "Recargo aplicado durante días festivos en horario diurno.",
        codigoExportacion: "recargoFestivoDiurno",
        color: "#0ea5e9",
        estado: "Activo",
      },
      recargoNocturnoFestivo: {
        icono: "🌌",
        titulo: "Recargo Festivo Nocturno",
        descripcion: "Recargo aplicado durante días festivos en horario nocturno.",
        codigoExportacion: "recargoFestivoNocturno",
        color: "#7c3aed",
        estado: "Activo",
      },
      extraDiurna: {
        icono: "☀",
        titulo: "Hora Extra Diurna",
        descripcion: "Horas extras trabajadas en horario diurno.",
        codigoExportacion: "horasExtrasDiurnas",
        color: "#ea580c",
        estado: "Activo",
      },
      extraNocturna: {
        icono: "🌙",
        titulo: "Hora Extra Nocturna",
        descripcion: "Horas extras trabajadas en horario nocturno.",
        codigoExportacion: "horasExtrasNocturnas",
        color: "#9333ea",
        estado: "Activo",
      },
      extraDiurnaFestiva: {
        icono: "🌤",
        titulo: "Hora Extra Festiva Diurna",
        descripcion: "Horas extras diurnas en día festivo.",
        codigoExportacion: "horasExtrasFestivasDiurnas",
        color: "#dc2626",
        estado: "Activo",
      },
      extraNocturnaFestiva: {
        icono: "🌃",
        titulo: "Hora Extra Festiva Nocturna",
        descripcion: "Horas extras nocturnas en día festivo.",
        codigoExportacion: "horasExtrasFestivasNocturnas",
        color: "#be185d",
        estado: "Activo",
      },
    };

    return conceptos[key] || {
      icono: "⚙️",
      titulo: this._formatarNombreConfig(key),
      descripcion: "Ajusta este concepto en la configuración del sistema.",
      codigoExportacion: key,
      color: "#334155",
      estado: "Activo",
      mostrarHorario: false,
    };
  }

  crearTarjetaConcepto(key, config) {
    const metadata = this._obtenerMetaConcepto(key);
    const valorPorcentaje =
      Number.isFinite(config?.porcentaje) ? Number(config.porcentaje) : 0;
    const codigoExportacion =
      this.configuracion.codigoExportacion?.[metadata.codigoExportacion] || "";
    const tarjeta = document.createElement("div");
    tarjeta.className = "config-card config-concept-card";
    tarjeta.style.setProperty("--concept-color", metadata.color);

    tarjeta.innerHTML = `
      <div class="config-card-header">
        <div class="config-card-icon" aria-hidden="true">${metadata.icono}</div>
        <div class="config-card-heading">
          <h3 class="config-card-title">${metadata.titulo}</h3>
          <p class="config-card-description">${metadata.descripcion}</p>
          <div class="config-card-meta-row">
            <span class="config-meta-item">
              <span class="config-meta-label">Color</span>
              <span class="config-meta-value">
                <span class="config-color-dot" aria-hidden="true"></span>
                ${metadata.color}
              </span>
            </span>
            <span class="config-meta-item">
              <span class="config-meta-label">Código interno</span>
              <span class="config-meta-value">${metadata.codigoExportacion}</span>
            </span>
          </div>
        </div>
        <span class="status-pill" aria-label="Estado del concepto">${metadata.estado}</span>
      </div>
      <div class="config-card-body">
        <div class="config-input-row">
          <div class="config-input-group">
            <label for="config-porcentaje-${key}" class="config-label">Porcentaje</label>
            <p class="config-input-help">Define el porcentaje aplicado al concepto.</p>
            <div class="config-input-with-suffix">
              <input type="number" id="config-porcentaje-${key}" class="config-input" value="${valorPorcentaje}" step="1" min="0" max="500" placeholder="Ej. 35" required>
              <span class="input-suffix">%</span>
            </div>
          </div>
          <div class="config-input-group">
            <label for="config-codigo-${key}" class="config-label">Código de exportación</label>
            <p class="config-input-help">Usa el código oficial para el archivo de nómina.</p>
            <input type="text" id="config-codigo-${key}" class="config-input config-input-codigo-export" value="${codigoExportacion}" data-codigo-key="${metadata.codigoExportacion}" maxlength="5" pattern="\\d{2,5}" inputmode="numeric" placeholder="Ej. 045" required>
          </div>
        </div>
        ${metadata.mostrarHorario ? `
          <div class="config-input-row config-time-row">
            <div class="config-input-group">
              <label for="config-inicio-recargoNocturno" class="config-label">Inicio nocturno</label>
              <p class="config-input-help">Hora inicial para aplicar recargo nocturno.</p>
              <input type="time" id="config-inicio-recargoNocturno" class="config-input" value="${config.inicio || "19:00"}">
            </div>
            <div class="config-input-group">
              <label for="config-fin-recargoNocturno" class="config-label">Fin nocturno</label>
              <p class="config-input-help">Hora final del rango nocturno.</p>
              <input type="time" id="config-fin-recargoNocturno" class="config-input" value="${config.fin || "06:00"}">
            </div>
          </div>
        ` : ""}
      </div>
    `;

    return tarjeta;
  }


  /**
   * Configura los eventos para el panel de configuración
   */
  configurarEventosConfiguracion() {
    const btnAddShift = document.getElementById("btn-add-shift");
    if (btnAddShift) {
        btnAddShift.addEventListener("click", () => this.agregarNuevoTurnoDinamico());
    }
    // Evento para restaurar valores por defecto
    const btnResetConfig = document.getElementById("btn-reset-config");
    if (btnResetConfig) {
      btnResetConfig.addEventListener("click", () => {
        this.restaurarConfiguracionPorDefecto();
      });
    }

    // Eventos para inputs de configuración
    document.querySelectorAll(".config-input").forEach((input) => {
      input.addEventListener("input", () => {
        this.actualizarConfiguracionEnTiempoReal();
      });
    });

    // Eventos para inputs de horario nocturno
    const inicioNocturno = document.getElementById("config-inicio-recargoNocturno");
    const finNocturno = document.getElementById("config-fin-recargoNocturno");
    const porcentajeNocturno = document.getElementById("config-porcentaje-recargoNocturno");

    if (inicioNocturno) {
      inicioNocturno.addEventListener("change", () => {
        this.actualizarConfiguracionEnTiempoReal();
      });
    }
    if (finNocturno) {
      finNocturno.addEventListener("change", () => {
        this.actualizarConfiguracionEnTiempoReal();
      });
    }
    if (porcentajeNocturno) {
      porcentajeNocturno.addEventListener("input", () => {
        this.actualizarConfiguracionEnTiempoReal();
      });
    }

    // Eventos para la sección de tipos de turno especiales
    const container = document.getElementById(
      "config-tipos-turno-especiales-container"
    );
    if (container) {
      container.addEventListener("input", (e) => {
        if (e.target.classList.contains("config-input-especial")) {
          this.actualizarConfiguracionEnTiempoReal();
        }
      });

      container.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-delete-tipo-turno")) {
          const codigo = e.target.dataset.codigo;
          if (
            confirm(
              `¿Estás seguro de que quieres eliminar el concepto "${codigo}"?`
            )
          ) {
            delete this.configuracion.tiposTurnoEspeciales[codigo];
            this.generarTarjetasTiposTurnoEspeciales();
          }
        }
      });
    }

    const btnAgregar = document.getElementById("btn-agregar-tipo-turno");
    if (btnAgregar) {
      btnAgregar.addEventListener("click", () =>
        this.agregarNuevoTipoTurnoEspecial()
      );
    }
  }

  agregarNuevoTipoTurnoEspecial() {
    const codigo = prompt(
      "Ingrese un código corto para el nuevo concepto (ej. LUTO, PNR para permiso no remunerado). Debe ser único y sin espacios."
    );
    if (!codigo || codigo.trim() === "") return;

    const codigoNormalizado = codigo.trim().toUpperCase();
    if (this.tiposTurno[codigoNormalizado]) {
      alert("El código ya existe. Por favor, ingrese un código único.");
      return;
    }

    const nombre = prompt(
      `Ingrese el nombre completo para el concepto "${codigoNormalizado}" (ej. Permiso No Remunerado):`
    );
    if (!nombre || nombre.trim() === "") return;

    const horas = prompt(
      `Ingrese las horas equivalentes para "${nombre}". Use 0 si no suma horas.`
    );
    const horasFloat = parseFloat(horas);
    if (isNaN(horasFloat)) {
      alert("Por favor, ingrese un número válido para las horas.");
      return;
    }

    this.configuracion.tiposTurnoEspeciales[codigoNormalizado] = {
      nombre: nombre.trim(),
      horas: horasFloat,
      descripcion: nombre.trim(),
    };

    this.generarTarjetasTiposTurnoEspeciales();
  }

  /**
   * Restaura la configuración por defecto
   */
  restaurarConfiguracionPorDefecto() {
    if (
      confirm(
        "¿Estás seguro de que quieres restaurar todos los valores por defecto?"
      )
    ) {
      this.configuracion = {
        recargoNocturno: { porcentaje: 35, inicio: "19:00", fin: "06:00" },
        recargoFestivo: { porcentaje: 90 },
        recargoNocturnoFestivo: { porcentaje: 125 },
        extraDiurna: { porcentaje: 25 },
        extraNocturna: { porcentaje: 75 },
        extraDiurnaFestiva: { porcentaje: 115 },
        extraNocturnaFestiva: { porcentaje: 165 },
        tiposTurnoEspeciales: {
          I: { nombre: "Incapacitado", horas: 7, descripcion: "Incapacidad", color: "#42A5F5" },
          SC: { nombre: "Sin contrato", horas: 7, descripcion: "Sin contrato", color: "#90A4AE" },
          PR: {
            nombre: "Permiso remunerado",
            horas: 7,
            descripcion: "Permiso remunerado",
            color: "#66BB6A"
          },
          A: { nombre: "Ausencia", horas: 7, descripcion: "Ausencia", color: "#EF5350" },
          V: { nombre: "Vacaciones", horas: 7, descripcion: "Vacaciones", color: "#2E7D32" },
        },
        versionConceptos: 2,
        codigoExportacion: {
          horasExtrasDiurnas: "045",
          horasExtrasNocturnas: "046",
          recargoFestivoDiurno: "011",
          recargoFestivoNocturno: "012",
          horasExtrasFestivasDiurnas: "047",
          horasExtrasFestivasNocturnas: "048",
          recargoNocturno: "010",
        },
      };
      this.guardarConfiguracion();

      // Mostrar notificación de éxito
      this.mostrarNotificacion(
        "Configuración restaurada exitosamente",
        "success"
      );
    }
  }

  /**
   * Actualiza la configuración en tiempo real
   */
  actualizarConfiguracionEnTiempoReal() {
    const huboLimpieza = this._eliminarConceptosObsoletos(this.configuracion);
    if (huboLimpieza) {
      this.guardarConfiguracion();
      this.actualizarTiposTurno();
      this.generarTarjetasTiposTurnoEspeciales();
    }

    // Actualizar recargos
    const recargos = ["recargoFestivo", "recargoNocturnoFestivo"];
    recargos.forEach((key) => {
      const input = document.getElementById(`config-porcentaje-${key}`);
      if (input) {
        this.configuracion[key].porcentaje = parseFloat(input.value) || 0;
      }
    });

    // Actualizar extras
    const extras = [
      "extraDiurna",
      "extraNocturna",
      "extraDiurnaFestiva",
      "extraNocturnaFestiva",
    ];
    extras.forEach((key) => {
      const input = document.getElementById(`config-porcentaje-${key}`);
      if (input) {
        this.configuracion[key].porcentaje = parseFloat(input.value) || 0;
      }
    });

    // Actualizar horario nocturno
    const inicioInput = document.getElementById(
      "config-inicio-recargoNocturno"
    );
    const finInput = document.getElementById("config-fin-recargoNocturno");
    const porcentajeInput = document.getElementById(
      "config-porcentaje-recargoNocturno"
    );

    if (inicioInput)
      this.configuracion.recargoNocturno.inicio = inicioInput.value;
    if (finInput) this.configuracion.recargoNocturno.fin = finInput.value;
    if (porcentajeInput)
      this.configuracion.recargoNocturno.porcentaje =
        parseFloat(porcentajeInput.value) || 0;

    // Actualizar tipos de turno especiales
    document.querySelectorAll(".config-input-especial").forEach((input) => {
      const codigo = input.dataset.codigo;
      const prop = input.dataset.prop;
      if (this.configuracion.tiposTurnoEspeciales[codigo]) {
        if (prop === "horas") {
          this.configuracion.tiposTurnoEspeciales[codigo][prop] =
            parseFloat(input.value) || 0;
        } else {
          this.configuracion.tiposTurnoEspeciales[codigo][prop] = input.value;
        }
      }
    });

    // Actualizar códigos de exportación
    document.querySelectorAll('.config-input-codigo-export').forEach((input) => {
      const key = input.dataset.codigoKey;
      if (key) {
        this.configuracion.codigoExportacion[key] = input.value.replace(/\D/g, "").trim();
      }
    });

    // Recalcular tipos de turno y actualizar estilos visibles (por ejemplo al cambiar color)
    this.actualizarTiposTurno();

    // Actualizar selectores y badges visibles
    document.querySelectorAll('.selector-turno').forEach(s => {
      try {
        this.actualizarEstiloSelector(s);
        const wrapper = s.closest('.selector-wrapper');
        if (wrapper) {
          const vs = wrapper.querySelector('.custom-select-value');
          if (vs) this._updateCustomValue(s, vs);
        }
      } catch (e) {}
    });

    // Actualizar previews de color en los tipos de turno especiales
    document.querySelectorAll('.config-card').forEach((card) => {
      const colorInput = card.querySelector('.config-input-color');
      const swatch = card.querySelector('.config-color-swatch');
      const valueLabel = card.querySelector('.config-color-value');
      const headerBadge = card.querySelector('.config-card-color-badge');
      if (colorInput && swatch) {
        const color = colorInput.value || '#9e9e9e';
        swatch.style.background = color;
        if (valueLabel) valueLabel.textContent = color;
        if (headerBadge) headerBadge.style.background = color;
        card.style.setProperty("--concept-color", color);
      }
    });
  }

  /**
   * Muestra una notificación
   */
  mostrarNotificacion(mensaje, tipo = "info") {
    // Crear elemento de notificación
    const notificacion = document.createElement("div");
    notificacion.className = `config-notification config-notification-${tipo}`;
    notificacion.innerHTML = `
      <span class="notification-icon">${tipo === "success" ? "✅" : "ℹ️"}</span>
      <span class="notification-text">${mensaje}</span>
    `;

    // Agregar estilos si no existen
    if (!document.getElementById("config-notification-styles")) {
      const styles = document.createElement("style");
      styles.id = "config-notification-styles";
      styles.textContent = `
        .config-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 10000;
          animation: slideIn 0.3s ease;
        }
        .config-notification-success {
          border-left: 4px solid #22c55e;
        }
        .config-notification-info {
          border-left: 4px solid #3b82f6;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notificacion);

    // Remover después de 3 segundos
    setTimeout(() => {
      notificacion.style.animation = "slideIn 0.3s ease reverse";
      setTimeout(() => {
        if (notificacion.parentNode) {
          notificacion.parentNode.removeChild(notificacion);
        }
      }, 300);
    }, 3000);
  }

obtenerHorasTrabajadasSemanaCompleta(semana, empleado) {
  let horas = 0;

  semana.dias.forEach(dia => {
    const fechaKey = dia.fecha.toISOString().split('T')[0];

    // 1️⃣ Turno guardado (persistente)
    if (empleado.turnosGuardados.has(fechaKey)) {
      const turnoData = empleado.turnosGuardados.get(fechaKey);
      const tipo = turnoData.turno;

      if (this.tiposTurno[tipo]) {
        horas += this.tiposTurno[tipo].horas;
      }
    }

    // 2️⃣ Turno visible en pantalla (aunque esté fuera del rango)
    else {
      const selector = document.querySelector(
        `[data-empleado="${empleado.documento}"][data-fecha="${fechaKey}"]`
      );

      if (selector && selector.value && selector.value !== "C") {
        const tipo = selector.value;
        if (this.tiposTurno[tipo]) {
          horas += this.tiposTurno[tipo].horas;
        }
      }
    }
  });

  return horas;
}



  _formatarNombreConfig(key) {
    const nombres = {
      recargoNocturno: "Recargo Nocturno",
      recargoFestivo: "Recargo Festivo",
      recargoNocturnoFestivo: "Recargo Nocturno Festivo",
      extraDiurna: "Hora Extra Diurna",
      extraNocturna: "Hora Extra Nocturna",
      extraDiurnaFestiva: "Hora Extra Diurna Festiva",
      extraNocturnaFestiva: "Hora Extra Nocturna Festiva",
    };
    return nombres[key] || key;
  }

  actualizarConfiguracionDesdeFormulario() {
    // Actualizar la configuración en tiempo real (ya se hace automáticamente)
    this.actualizarConfiguracionEnTiempoReal();
    this.actualizarTiposTurno();

    // Guardar la configuración
    this.guardarConfiguracion();

    // Mostrar notificación de éxito
    this.mostrarNotificacion("Configuración guardada exitosamente", "success");

    // Navegar de vuelta
    this.navegarA("seccion-configuracion");
  }

  /**
   * Inicializa los eventos del DOM
   */
  inicializarEventos() {
    const btnGenerar = document.getElementById("btn-generar-periodo");
    if (btnGenerar) btnGenerar.addEventListener("click", () => this.generarPeriodo());
    const btnCalcular = document.getElementById("btn-calcular");
    if (btnCalcular) btnCalcular.addEventListener("click", () => this.calcularTurnos());
    const btnLimpiar = document.getElementById("btn-limpiar-todo");
    if (btnLimpiar) btnLimpiar.addEventListener("click", () => this.limpiarTodo());
    const btnExport = document.getElementById("btn-exportar");
    if (btnExport) btnExport.addEventListener("click", () => this.exportarResultados());
    const btnManual = document.getElementById("btn-manual-usuario");
    if (btnManual) btnManual.addEventListener("click", () => this.mostrarInstructivo());

    // Asigna eventos a los botones de navegación entre secciones.
    document.querySelectorAll(".btn-atras-a-config").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.navegarA("seccion-configuracion")
      );
    });

    document.querySelectorAll(".btn-atras-a-turnos").forEach((btn) => {
      btn.addEventListener("click", () => this.navegarA("seccion-turnos"));
    });

    // Asigna evento para cambiar entre las pestañas de resultados.
    document.querySelectorAll(".pestana").forEach((pestana) => {
      pestana.addEventListener("click", (e) =>
        this.cambiarPestana(e.target.dataset.pestana)
      );
    });

    // Asigna eventos a los campos de fecha para mostrar el día de la semana dinámicamente.
    document
      .getElementById("fecha-inicio")
      .addEventListener("change", (e) =>
        this.mostrarDiaSemana(e.target.value, "dia-semana-inicio")
      );
    document
      .getElementById("fecha-fin")
      .addEventListener("change", (e) =>
        this.mostrarDiaSemana(e.target.value, "dia-semana-fin")
      );

    document
      .getElementById("btn-sistema-config")
      .addEventListener("click", () =>
        this.solicitarContraseñaParaConfig()
      );
    document
      .getElementById("btn-guardar-sistema-config")
      .addEventListener("click", () =>
        this.actualizarConfiguracionDesdeFormulario()
      );
    document
      .getElementById("btn-cancelar-sistema-config")
      .addEventListener("click", () => this.navegarA("seccion-configuracion"));

    // Eventos para manejar el tipo de almuerzo
    document
      .querySelectorAll('input[name="tipo-almuerzo"]')
      .forEach((radio) => {
        radio.addEventListener("change", (e) =>
          this.manejarTipoAlmuerzo(e.target.value)
        );
      });

    // Formatear salario mientras se escribe
    document.getElementById('salario-mensual').addEventListener('input', (e) => {
        const value = e.target.value.replace(/\D/g, '');
        e.target.value = new Intl.NumberFormat('es-CO').format(value);
    });

    // Eventos para el modal de agregar empleado
    document.getElementById('btn-abrir-modal-empleado').addEventListener('click', () => {
        this.abrirModalEmpleado();
    });
    document.getElementById('btn-cerrar-modal').addEventListener('click', () => {
        document.getElementById('modal-agregar-empleado').style.display = 'none';
    });
    document.getElementById('btn-confirmar-agregar-empleado').addEventListener('click', () => {
        this.agregarEmpleadoDesdeModal();
    });

    // Formatear salario del modal
    document.getElementById('modal-salario').addEventListener('input', (e) => {
        const value = e.target.value.replace(/\D/g, '');
        e.target.value = new Intl.NumberFormat('es-CO').format(value);
    });

    // Cerrar modal al hacer clic fuera - DESACTIVADO
    /*
    document.getElementById('modal-agregar-empleado').addEventListener('click', (e) => {
        if (e.target.id === 'modal-agregar-empleado') {
            e.target.style.display = 'none';
        }
    });
    */
  }

  // Controla la visibilidad de las secciones principales de la aplicación.
  navegarA(seccionId) {
    document.getElementById("seccion-configuracion").style.display = "none";
    document.getElementById("seccion-turnos").style.display = "none";
    document.getElementById("seccion-resultados").style.display = "none";
    document.getElementById("seccion-sistema-configuracion").style.display =
      "none";
    document.getElementById("seccion-instructivo").style.display = "none";

    document.getElementById(seccionId).style.display = "block";
    window.scrollTo(0, 0);
  }

  solicitarContraseñaParaConfig() {
    const password = prompt("Por favor, ingrese la contraseña para acceder a la configuración:");
    if (password === "Alejostone13") {
      this.navegarA("seccion-sistema-configuracion");
    } else if (password !== null) {
      alert("Contraseña incorrecta.");
    }
  }

  /**
   * Carga y muestra el manual de usuario con estilos.
   */
  mostrarInstructivo() {
    const contenedor = document.getElementById("contenido-instructivo");

    // Si el contenido ya está embebido como Base64 en instructivo.js, usarlo directamente
    // Esto evita el bloqueo de CORS al abrir el HTML directamente desde file://
    if (typeof window.INSTRUCTIVO_B64 !== "undefined") {
      try {
        // Decodificar Base64 → bytes UTF-8 → string
        const bytes = Uint8Array.from(atob(window.INSTRUCTIVO_B64), c => c.charCodeAt(0));
        const markdown = new TextDecoder("utf-8").decode(bytes);
        contenedor.innerHTML = typeof marked !== "undefined"
          ? marked.parse(markdown)
          : `<pre style="white-space:pre-wrap;">${markdown}</pre>`;
        this.navegarA("seccion-instructivo");
      } catch (e) {
        contenedor.innerHTML = `<p style="color:red;">Error al decodificar el manual: ${e.message}</p>`;
        this.navegarA("seccion-instructivo");
      }
      return;
    }

    // Fallback: intentar cargar usando fetch (funciona con servidor local)
    contenedor.innerHTML = "<p>Cargando manual...</p>";
    fetch('./archivos/instructivo.md')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(markdown => {
        contenedor.innerHTML = typeof marked !== "undefined"
          ? marked.parse(markdown)
          : `<pre style="white-space:pre-wrap;">${markdown}</pre>`;
        this.navegarA("seccion-instructivo");
      })
      .catch(error => {
        contenedor.innerHTML = `
          <div style="color: #721c24; padding: 20px; border: 1px solid #f5c6cb; border-radius: 8px; background: #f8d7da;">
            <h3>❌ Error al cargar el manual</h3>
            <p><strong>Archivo buscado:</strong> <code>archivos/instructivo.md</code></p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Para resolver este problema, ejecute la aplicación desde un servidor local.</p>
          </div>
        `;
        this.navegarA("seccion-instructivo");
      });
  }

  /**
   * Maneja el cambio entre tipo de almuerzo predefinido, personalizado y sin almuerzo
   */
  manejarTipoAlmuerzo(tipo) {
    const opcionesPredefinidas = document.getElementById(
      "opciones-predefinidas"
    );
    const horarioPersonalizado = document.getElementById(
      "horario-personalizado"
    );

    if (tipo === "predefinido") {
      opcionesPredefinidas.style.display = "block";
      horarioPersonalizado.style.display = "none";
    } else if (tipo === "personalizado") {
      opcionesPredefinidas.style.display = "none";
      horarioPersonalizado.style.display = "block";
    } else if (tipo === "sin-almuerzo") {
      opcionesPredefinidas.style.display = "none";
      horarioPersonalizado.style.display = "none";
    }
  }

  /**
   * Obtiene la configuración de almuerzo según el tipo seleccionado
   */
  obtenerConfiguracionAlmuerzo() {
    // Si se inyectó una configuración (útil para tests), úsala
    if (this.configuracionAlmuerzo && typeof this.configuracionAlmuerzo === 'object') {
      return this.configuracionAlmuerzo;
    }

    // Intentar leer desde el DOM; si no existen los elementos, devolver valor por defecto
    const tipoEl = document.querySelector('input[name="tipo-almuerzo"]:checked');
    const tipoAlmuerzo = tipoEl ? tipoEl.value : 'sin-almuerzo';

    if (tipoAlmuerzo === 'sin-almuerzo') {
      return { tipo: 'sin-almuerzo', tiempoEnHoras: 0 };
    }

    if (tipoAlmuerzo === 'predefinido') {
      const tiempoEl = document.querySelector('input[name="tiempo-almuerzo"]:checked');
      const tiempoEnHoras = tiempoEl ? parseFloat(tiempoEl.value) : 0;
      return { tipo: 'predefinido', tiempoEnHoras: isNaN(tiempoEnHoras) ? 0 : tiempoEnHoras };
    }

    if (tipoAlmuerzo === 'personalizado') {
      const inicioAlmEl = document.getElementById('inicio-almuerzo');
      const finAlmEl = document.getElementById('fin-almuerzo');
      const inicioAlmuerzo = inicioAlmEl ? inicioAlmEl.value : null;
      const finAlmuerzo = finAlmEl ? finAlmEl.value : null;
      const tiempoEnHoras = (inicioAlmuerzo && finAlmuerzo) ? this.calcularHorasDesdeTiempos(inicioAlmuerzo, finAlmuerzo, false, 0) : 0;
      return { tipo: 'personalizado', tiempoEnHoras: tiempoEnHoras, inicio: inicioAlmuerzo, fin: finAlmuerzo };
    }

    return { tipo: 'sin-almuerzo', tiempoEnHoras: 0 };
  }

  /**
   * Configura las fechas actuales por defecto
   */
  configurarFechasActuales() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1); // Primer día del mes actual.
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); // Último día del mes actual.

    document.getElementById("fecha-inicio").value = inicioMes
      .toISOString()
      .split("T")[0];
    document.getElementById("fecha-fin").value = finMes
      .toISOString()
      .split("T")[0];

    // Mostrar día de la semana para fechas iniciales
    this.mostrarDiaSemana(
      document.getElementById("fecha-inicio").value,
      "dia-semana-inicio"
    );
    this.mostrarDiaSemana(
      document.getElementById("fecha-fin").value,
      "dia-semana-fin"
    );
  }

  /**
   * Muestra el día de la semana junto al campo de fecha.
   */
  mostrarDiaSemana(fechaStr, elementId) {
    const elemento = document.getElementById(elementId); // Elemento span donde se mostrará el día.
    if (!fechaStr) {
      elemento.textContent = "";
      return;
    }
    // Se ajusta la zona horaria a T00:00:00 para evitar errores de cálculo por la diferencia horaria del navegador.
    const fecha = new Date(fechaStr + "T00:00:00");
    const opciones = {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }; // Formato de fecha deseado.
    elemento.textContent = fecha.toLocaleDateString("es-CO", opciones);
  }

  /**
   * Calcula las horas entre dos tiempos
   */
  calcularHorasDesdeTiempos(
    inicioStr,
    finStr,
    deductAlmuerzo = false,
    tiempoAlmuerzo = 0
  ) {
    const inicio = new Date(`1970-01-01T${inicioStr}:00`);
    let fin = new Date(`1970-01-01T${finStr}:00`);

    // Si la hora de fin es menor o igual a la de inicio, se asume que el turno cruza la medianoche.
    if (fin <= inicio) {
      fin.setDate(fin.getDate() + 1); // Se añade un día a la fecha de fin.
    }
    const horasTotales = (fin - inicio) / (1000 * 60 * 60); // Diferencia en milisegundos convertida a horas.
    return deductAlmuerzo
      ? Math.max(0, horasTotales - tiempoAlmuerzo)
      : horasTotales;
  }

  /**
   * Calcula las horas de un turno considerando la configuración de almuerzo.
   * Para turnos de 24 horas, se aplica un doble descuento de alimentación.
   */
  calcularHorasTurnoConAlmuerzo(
    inicioTurnoStr,
    finTurnoStr,
    configuracionAlmuerzo,
    esTurno24T = false
  ) {
    const minutos = this.contarMinutosEfectivos(inicioTurnoStr, finTurnoStr, configuracionAlmuerzo, esTurno24T);
    return minutos / 60;
  }
  /**
   * Genera el período de trabajo dividido en semanas
   */
  generarPeriodo() {
    // Recoge los valores de configuración inicial.
    const fechaInicio = document.getElementById("fecha-inicio").value;
    const fechaFin = document.getElementById("fecha-fin").value;
    // Validación de campos obligatorios.
    if (!fechaInicio || !fechaFin) {
      alert("Por favor, complete las fechas de inicio y fin");
      return;
    }

    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);

    if (inicio >= fin) {
      alert("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }

    // Obtener el número de empleados definido
    const numeroEmpleadosDefinido = parseInt(document.getElementById("numero-empleados").value) || 1;
    this.numeroEmpleadosDefinido = numeroEmpleadosDefinido;
    this.empleadosAgregados = 0;

    // Obtiene la configuración de almuerzo
    const configuracionAlmuerzo = this.obtenerConfiguracionAlmuerzo();
    this.configuracionAlmuerzo = configuracionAlmuerzo;

    // Función auxiliar para formatear la hora en formato am/pm.
    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [hour, minute] = timeStr.split(":");
      const h = parseInt(hour, 10); // Hora en formato 24h.
      const m = parseInt(minute, 10);
      const ampm = h >= 12 ? "pm" : "am";
      const formattedHour = h % 12 === 0 ? 12 : h % 12;
      const formattedMinute =
        m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
      return `${formattedHour}${formattedMinute}${ampm}`;
    };

    // Actualiza los turnos dinámicos en tiposTurno con horas y descripciones
    if (this.configuracion.turnosDinamicos) {
        Object.keys(this.configuracion.turnosDinamicos).forEach(codigo => {
            const t = this.configuracion.turnosDinamicos[codigo];
            if (t.activo && this.tiposTurno[codigo]) {
                const es24h = (t.inicio === t.fin);
                const horas = this.calcularHorasTurnoConAlmuerzo(t.inicio, t.fin, configuracionAlmuerzo, es24h);
                this.tiposTurno[codigo].horas = horas;
                this.tiposTurno[codigo].descripcion = `${formatTime(t.inicio)}-${formatTime(t.fin)}`;
                this.tiposTurno[codigo].inicio = t.inicio;
                this.tiposTurno[codigo].fin = t.fin;
            }
        });
    }

    // Limpiar empleados anteriores
    this.empleados.clear();

    // Siempre abrir el modal para ingresar empleados
    this.abrirModalEmpleado();

    this.mostrarFormularioTurnos();
    this.navegarA("seccion-turnos");

    // Ajusta la fecha de fin para que siempre termine en sábado, completando la última semana.
    const finAjustado = new Date(fin);
    while (finAjustado.getDay() !== 6) {
      finAjustado.setDate(finAjustado.getDate() + 1);
    }

    // Genera la estructura de semanas y días.
  }
  /**
   * Genera las semanas del período empezando desde la fecha de inicio seleccionada
   */
  generarSemanas(fechaInicio, fechaFin) {
    const semanas = [];
    // Ajusta la fecha de inicio para que siempre comience en domingo.
    const fechaInicioAjustada = new Date(fechaInicio);
    while (fechaInicioAjustada.getDay() !== 0) {
      fechaInicioAjustada.setDate(fechaInicioAjustada.getDate() - 1);
    }

    // Ajusta la fecha de fin para que siempre termine en sábado.
    const fechaFinAjustada = new Date(fechaFin);
    while (fechaFinAjustada.getDay() !== 6) {
      fechaFinAjustada.setDate(fechaFinAjustada.getDate() + 1);
    }

    let fechaActual = new Date(fechaInicioAjustada);
    let numeroSemana = 1;

    // Itera semana por semana desde la fecha de inicio ajustada hasta la de fin.
    while (fechaActual <= fechaFinAjustada) {
      const inicioSemana = new Date(fechaActual);
      const finSemana = new Date(fechaActual);
      finSemana.setDate(finSemana.getDate() + 6);

      const dias = [];
      // Crea los 7 días de la semana.
      for (let i = 0; i < 7; i++) {
        const fechaDia = new Date(inicioSemana);
        fechaDia.setDate(inicioSemana.getDate() + i);
        // `enRango` determina si el día está dentro del período seleccionado por el usuario.
        const enRango = fechaDia >= fechaInicio && fechaDia <= fechaFin;
        dias.push({
          fecha: new Date(fechaDia),
          nombreDia: this.diasSemana[fechaDia.getDay()],
          esFestivo: this.esFestivo(fechaDia), // Detección automática de festivos
          enRango: enRango,
        });
      }

      // Añade la semana al array siempre, para que el cálculo incluya todos los días de la semana completa
      semanas.push({
        numero: numeroSemana,
        inicioSemana,
        finSemana,
        dias,
      });

      fechaActual.setDate(fechaActual.getDate() + 7); // Avanza a la siguiente semana.
      numeroSemana++;
    }

    return semanas;
  }

  /**
   * Determina si una fecha es festivo (domingo o festivo predefinido).
   */
  esFestivo(fecha) {
    if (fecha.getDay() === 0) {
      return true; // Los domingos siempre son festivos.
    }
    // Formatea la fecha a 'YYYY-MM-DD' para buscarla en la base de datos.
    const anio = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const dia = fecha.getDate().toString().padStart(2, "0");
    const fechaFormateada = `${anio}-${mes}-${dia}`;

    return this.festivosColombia.has(fechaFormateada);
  }

  /**
   * Agrega un empleado a la estructura de datos y genera su calendario.
   */
  agregarEmpleado(documento, nombre, salario, fechaInicio, fechaFin) {
    if (this.empleados.has(documento)) {
        alert(`El empleado con documento ${documento} ya existe.`);
        return false;
    }

    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);

    const semanas = this.generarSemanas(inicio, fin);

    this.empleados.set(documento, {
        documento,
        nombre,
        salario,
        fechaInicio,
        fechaFin,
        semanas,
        resultados: null,
        turnosGuardados: new Map() // Mapa persistente para turnos: fecha -> {turno, inicioManual, finManual}
    });
    return true;
  }

  abrirModalEmpleado() {
    // Pre-rellena las fechas en el modal con las del formulario principal
    const fechaInicioGeneral = document.getElementById('fecha-inicio').value;
    const fechaFinGeneral = document.getElementById('fecha-fin').value;
    const salarioGeneral = document.getElementById('salario-mensual').value;

    document.getElementById('modal-fecha-inicio').value = fechaInicioGeneral;
    document.getElementById('modal-fecha-fin').value = fechaFinGeneral;
    document.getElementById('modal-salario').value = salarioGeneral;

    // Actualizar título del modal con progreso
    const tituloModal = document.querySelector('#modal-agregar-empleado .modal-header h2');
    const progreso = this.empleadosAgregados + 1;
    tituloModal.textContent = `Agregar Empleado ${progreso} de ${this.numeroEmpleadosDefinido}`;

    // Muestra el modal
    document.getElementById('modal-agregar-empleado').style.display = 'flex';
  }

  agregarEmpleadoDesdeModal() {
    const documento = document.getElementById('modal-documento').value.trim();
    const nombre = document.getElementById('modal-nombre').value.trim();
    const salarioStr = document.getElementById('modal-salario').value.replace(/\D/g, '');
    const salario = parseFloat(salarioStr) || 0;
    const fechaInicio = document.getElementById('modal-fecha-inicio').value;
    const fechaFin = document.getElementById('modal-fecha-fin').value;

    if (!documento || !nombre || !salario || !fechaInicio || !fechaFin) {
        alert('Todos los campos son obligatorios.');
        return;
    }

    if (this.agregarEmpleado(documento, nombre, salario, fechaInicio, fechaFin)) {
        this.empleadosAgregados++;
        this.mostrarFormularioTurnos(); // Redibuja toda la sección
        document.getElementById('modal-agregar-empleado').style.display = 'none';
        // Limpiar modal
        document.getElementById('modal-documento').value = '';
        document.getElementById('modal-nombre').value = '';
        document.getElementById('modal-salario').value = '';
        document.getElementById('modal-fecha-inicio').value = '';
        document.getElementById('modal-fecha-fin').value = '';

        // Si no hemos completado el número definido, abrir modal nuevamente
        if (this.empleadosAgregados < this.numeroEmpleadosDefinido) {
            setTimeout(() => this.abrirModalEmpleado(), 100);
        } else {
            // Si completamos el número definido, permitir agregar más manualmente
            // El botón "Agregar Empleado" seguirá funcionando normalmente
        }
    }
  }

  abrirModalEditarEmpleado(documento) {
    const empleado = this.empleados.get(documento);
    if (!empleado) return;

    const tituloModal = document.querySelector('#modal-agregar-empleado .modal-header h2');
    tituloModal.textContent = `Editar Empleado`;

    document.getElementById('modal-documento').value = empleado.documento;
    document.getElementById('modal-documento').readOnly = true; // Prevent editing the document
    document.getElementById('modal-nombre').value = empleado.nombre;
    document.getElementById('modal-salario').value = new Intl.NumberFormat('es-CO').format(empleado.salario);
    document.getElementById('modal-fecha-inicio').value = empleado.fechaInicio;
    document.getElementById('modal-fecha-fin').value = empleado.fechaFin;

    const btnConfirmar = document.getElementById('btn-confirmar-agregar-empleado');
    btnConfirmar.textContent = 'Actualizar Empleado';

    // Clone and replace the button to remove old event listeners
    const newBtnConfirmar = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);

    newBtnConfirmar.addEventListener('click', () => this.actualizarEmpleadoDesdeModal(documento), { once: true });


    document.getElementById('modal-agregar-empleado').style.display = 'flex';
  }

  /**
   * Actualiza un empleado desde el modal de edición
   * CORREGIDO: NO borra los turnos preguardados al cambiar el período
   * La edición solo ajusta el rango visible, no reinicia los datos
   */
  actualizarEmpleadoDesdeModal(documento) {
    const empleado = this.empleados.get(documento);
    if (!empleado) return;

    const nombre = document.getElementById('modal-nombre').value.trim();
    const salarioStr = document.getElementById('modal-salario').value.replace(/\D/g, '');
    const salario = parseFloat(salarioStr) || 0;
    const fechaInicio = document.getElementById('modal-fecha-inicio').value;
    const fechaFin = document.getElementById('modal-fecha-fin').value;

    if (!nombre || !salario || !fechaInicio || !fechaFin) {
        alert('Todos los campos son obligatorios.');
        return;
    }

    // CRÍTICO: Guardar los turnos existentes ANTES de regenerar las semanas
    // Esto preserva toda la información ya ingresada
    const turnosGuardadosBackup = new Map(empleado.turnosGuardados);

    // Además, guardar los turnos actuales del DOM que aún no se han pre-guardado
    empleado.semanas.forEach(semana => {
      semana.dias.forEach((dia, index) => {
        if (dia.enRango) {
          const selector = document.querySelector(
            `[data-empleado="${empleado.documento}"][data-semana="${semana.numero}"][data-dia="${index}"]`
          );
          if (selector && selector.value && selector.value !== "C") {
            const fechaKey = dia.fecha.toISOString().split('T')[0];
            // Solo guardar si no existe ya en turnosGuardados (para no sobrescribir datos pre-guardados)
            if (!turnosGuardadosBackup.has(fechaKey)) {
              const turnoData = { turno: selector.value };
              if (selector.value === "M") {
                const manualInputs = document.querySelector(
                  `#manual-time-${empleado.documento}-${semana.numero}-${index}`
                );
                if (manualInputs) {
                  turnoData.inicioManual = manualInputs.querySelector(".manual-inicio").value;
                  turnoData.finManual = manualInputs.querySelector(".manual-fin").value;
                }
              }
              turnosGuardadosBackup.set(fechaKey, turnoData);
            }
          }
        }
      });
    });

    // Actualizar datos básicos del empleado
    empleado.nombre = nombre;
    empleado.salario = salario;
    empleado.fechaInicio = fechaInicio;
    empleado.fechaFin = fechaFin;

    // Regenerar las semanas con el nuevo período
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);
    empleado.semanas = this.generarSemanas(inicio, fin);

    // CRÍTICO: Restaurar los turnos guardados
    // Los turnos persistentes se mantienen intactos
    empleado.turnosGuardados = turnosGuardadosBackup;

    // Mantener el estado de pre-guardado si tenía turnos
    if (turnosGuardadosBackup.size > 0) {
      empleado.preGuardado = true;
    }

    this.mostrarFormularioTurnos(); // Redraw the entire section
    document.getElementById('modal-agregar-empleado').style.display = 'none';

    // Restore the modal to its original state for adding new employees
    const tituloModal = document.querySelector('#modal-agregar-empleado .modal-header h2');
    const progreso = this.empleadosAgregados + 1;
    tituloModal.textContent = `Agregar Empleado ${progreso} de ${this.numeroEmpleadosDefinido}`;
    document.getElementById('modal-documento').readOnly = false;
    document.getElementById('modal-documento').value = '';
    document.getElementById('modal-nombre').value = '';
    document.getElementById('modal-salario').value = '';
    document.getElementById('modal-fecha-inicio').value = '';
    document.getElementById('modal-fecha-fin').value = '';
    const btnConfirmar = document.getElementById('btn-confirmar-agregar-empleado');
    btnConfirmar.textContent = 'Confirmar y Agregar';

    const newBtnConfirmar = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);
    newBtnConfirmar.addEventListener('click', () => this.agregarEmpleadoDesdeModal());

    this.mostrarNotificacion(`Empleado ${empleado.nombre} actualizado exitosamente. Los turnos existentes se han preservado.`, "success");
  }

  /**
   * Muestra el formulario de turnos para todas las semanas
   */
  mostrarFormularioTurnos() {
    const contenedor = document.getElementById("contenedor-semanas");
    contenedor.innerHTML = ""; // Limpia el contenedor antes de dibujar.

    if (this.empleados.size === 0) {
        document.getElementById("info-periodo").innerHTML = `<p>No hay empleados para programar.</p>`;
        return;
    }

    // Información general del período (basado en el primer empleado)
    const primerEmpleado = this.empleados.values().next().value;
    if (primerEmpleado && primerEmpleado.semanas.length > 0) {
        const fechaInicioGeneral = document.getElementById("fecha-inicio").value;
        const fechaFinGeneral = document.getElementById("fecha-fin").value;
        document.getElementById("info-periodo").innerHTML = `
            <p><strong>Período General:</strong> ${new Date(fechaInicioGeneral + 'T00:00:00').toLocaleDateString('es-ES')} - ${new Date(fechaFinGeneral + 'T00:00:00').toLocaleDateString('es-ES')}</p>
            <p><strong>Total de empleados:</strong> ${this.empleados.size}</p>
        `;
    } else {
        document.getElementById("info-periodo").innerHTML = '';
    }

    // Mostrar lista de empleados
    this.mostrarListaEmpleados();

    const dynamicCodes = Object.keys(this.configuracion.turnosDinamicos || {})
      .filter((codigo) => this.tiposTurno[codigo]);

    const fixedBeforeSpecial = ["C", "M"].filter((codigo) => this.tiposTurno[codigo]);

    const specialCodes = Object.keys(this.configuracion.tiposTurnoEspeciales || {})
      .filter((codigo) => this.tiposTurno[codigo]);

    const remainingCodes = Object.keys(this.tiposTurno)
      .filter((codigo) => !dynamicCodes.includes(codigo) && !fixedBeforeSpecial.includes(codigo) && !specialCodes.includes(codigo));

    const orderedCodes = [
      ...dynamicCodes,
      ...fixedBeforeSpecial,
      ...remainingCodes,
      ...specialCodes,
    ];

    const opcionesTurno = orderedCodes
      .map((codigo) => {
        const tipo = this.tiposTurno[codigo];
        const color = tipo.color || (this.configuracion.turnosDinamicos && this.configuracion.turnosDinamicos[codigo] && this.configuracion.turnosDinamicos[codigo].color) || "#9e9e9e";
        const texto = `${codigo} - ${this.formatearNombreYHorarioTexto(codigo)}`.trim();
        const selectedAttr = codigo === 'C' ? ' selected' : '';
        return `<option value="${codigo}" data-color="${color}"${selectedAttr}>◼ ${texto}</option>`;
      })
      .join("");

    // Itera sobre cada semana para crear su bloque HTML.
    this.empleados.forEach(empleado => {
        const seccionEmpleado = document.createElement('div');
        seccionEmpleado.className = 'empleado-seccion';
        seccionEmpleado.id = `seccion-empleado-${empleado.documento}`;

        seccionEmpleado.innerHTML = `
            <div class="empleado-header">
                <h3>${empleado.nombre} (${empleado.documento})</h3>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="empleado-body"></div>
        `;
        contenedor.appendChild(seccionEmpleado);

        const bodyEmpleado = seccionEmpleado.querySelector('.empleado-body');

        empleado.semanas.forEach((semana) => {
            const divSemana = document.createElement("div");
            divSemana.className = "semana-container";
            const inicioSemana = semana.dias[0].fecha.toLocaleDateString("es-ES");
            const finSemana = semana.dias[semana.dias.length - 1].fecha.toLocaleDateString("es-ES");
            divSemana.innerHTML = `
        <h4>Semana ${semana.numero} (${inicioSemana} - ${finSemana})</h4>
        <div class="dias-semana">
          ${semana.dias
            // Itera sobre cada día de la semana para crear su tarjeta.
            .map(
              (dia, index) => `
            <div class="dia-turno ${!dia.enRango ? "fuera-rango" : ""} ${
                dia.esFestivo ? "festivo" : ""
              }">
              <label>${dia.nombreDia}<br><small>${dia.fecha.toLocaleDateString(
                "es-ES"
              )}</small></label>
              <div class="selector-wrapper">
                <span class="select-indicator" aria-hidden></span>
                <select class="selector-turno" data-empleado="${empleado.documento}" data-semana="${
                semana.numero
              }" data-dia="${index}" data-fuera-rango="${!dia.enRango}">${opcionesTurno}</select>
              </div>
              <div class="manual-time-inputs" id="manual-time-${empleado.documento}-${
                semana.numero
              }-${index}">
                <input type="time" class="manual-inicio" value="${dia.inicioManual || '07:00'}">
                <input type="time" class="manual-fin" value="${dia.finManual || '19:00'}">
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `; // Fin innerHTML de divSemana
            bodyEmpleado.appendChild(divSemana);
        }); // Fin forEach semana

        // Botón individual de Pre-guardar para este empleado
        const btnPreGuardarIndividual = document.createElement("button");
        btnPreGuardarIndividual.className = "btn-pre-guardar-individual";
        btnPreGuardarIndividual.textContent = `💾 Pre-guardar Turnos de ${empleado.nombre}`;
        btnPreGuardarIndividual.addEventListener("click", () => this.preGuardarTurnosEmpleado(empleado.documento));
        bodyEmpleado.appendChild(btnPreGuardarIndividual);

        // Evento para colapsar/expandir
        const header = seccionEmpleado.querySelector('.empleado-header');
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            bodyEmpleado.classList.toggle('collapsed');
        });

    });



    // Asigna eventos a los nuevos selectores de turno creados.
    document.querySelectorAll(".selector-turno").forEach((selector) => {
      this.gestionarVisibilidadManual(selector);
      selector.addEventListener("change", (e) =>
        this.gestionarVisibilidadManual(e.target)
      );
    });

    // Inicializar reemplazo visual personalizado para selects (lista coloreada)
    this.inicializarCustomSelects();

    // Set the values for pre-saved data from turnosGuardados
    this.empleados.forEach(empleado => {
      empleado.semanas.forEach((semana) => {
        semana.dias.forEach((dia, index) => {
          if (dia.enRango) {
            const fechaKey = dia.fecha.toISOString().split('T')[0];
            const turnoGuardado = empleado.turnosGuardados.get(fechaKey);
            const selector = document.querySelector(
              `[data-empleado="${empleado.documento}"][data-semana="${semana.numero}"][data-dia="${index}"]`
            );
            if (selector && turnoGuardado) {
              selector.value = turnoGuardado.turno;
              // Notificar cambio para que tanto estilos como el custom-select se actualicen
              selector.dispatchEvent(new Event('change'));
              this.gestionarVisibilidadManual(selector);
              if (turnoGuardado.turno === 'M') {
                const manualInputs = document.querySelector(
                  `#manual-time-${empleado.documento}-${semana.numero}-${index}`
                );
                if (manualInputs) {
                  manualInputs.querySelector('.manual-inicio').value = turnoGuardado.inicioManual || '07:00';
                  manualInputs.querySelector('.manual-fin').value = turnoGuardado.finManual || '19:00';
                }
              }
            }
          }
        });
      });
    });

  }
  // Muestra u oculta los campos de hora para el turno "Manual".
  gestionarVisibilidadManual(selector) {
    this.actualizarEstiloSelector(selector);
    const diaContainer = selector.closest(".dia-turno");
    const manualInputs = diaContainer.querySelector(".manual-time-inputs");
    manualInputs.style.display = selector.value === "M" ? "flex" : "none";
  }

  /**
   * Muestra la lista de empleados con indicadores de estado
   */
  mostrarListaEmpleados() {
    const contenedorLista = document.getElementById("lista-empleados");
    if (!contenedorLista) return;

    contenedorLista.innerHTML = "<h3>Lista de Empleados</h3>";

    this.empleados.forEach(empleado => {
      const itemEmpleado = document.createElement("div");
      itemEmpleado.className = "item-empleado";
      itemEmpleado.dataset.documento = empleado.documento;

      // Verificar si el empleado tiene turnos asignados o pre-guardados
      const tieneTurnos = empleado.semanas.some(semana =>
        semana.dias.some(dia => {
          if (!dia.enRango) return false;
          const selector = document.querySelector(
            `[data-empleado="${empleado.documento}"][data-semana="${semana.numero}"][data-dia="${dia.fecha.getDay()}"]`
          );
          return selector && selector.value !== "";
        })
      );

      const preGuardado = empleado.preGuardado || false;

      if (preGuardado) {
        itemEmpleado.classList.add("empleado-pre-guardado");
      } else {
        itemEmpleado.classList.add(tieneTurnos ? "empleado-con-turnos" : "empleado-sin-turnos");
      }

      itemEmpleado.innerHTML = `
        <span class="empleado-nombre">${empleado.nombre}</span>
        <span class="empleado-documento">(${empleado.documento})</span>
        <div class="empleado-fechas">
            <span class="fecha">Inicio: ${empleado.fechaInicio}</span>
            <span class="fecha">Fin: ${empleado.fechaFin}</span>
        </div>
        <span class="estado-turnos">${preGuardado ? "💾 Pre-guardado" : (tieneTurnos ? "✅ Turnos Asignados" : "⏳ Sin Turnos")}</span>
        <button class="btn-editar-empleado" data-documento="${empleado.documento}">✏️</button>
      `;

      contenedorLista.appendChild(itemEmpleado);

      itemEmpleado.querySelector('.btn-editar-empleado').addEventListener('click', (e) => {
        const documento = e.currentTarget.dataset.documento;
        this.abrirModalEditarEmpleado(documento);
      });
    });
  }

  /**
   * Pre-guarda los turnos actuales para un empleado específico
   */
  preGuardarTurnosEmpleado(documentoEmpleado) {
    const empleado = Array.from(this.empleados.values()).find(emp => emp.documento === documentoEmpleado);
    if (!empleado) return;

    empleado.semanas.forEach(semana => {
      semana.dias.forEach((dia, index) => {
        if (dia.enRango) {
          const selector = document.querySelector(
            `[data-empleado="${empleado.documento}"][data-semana="${semana.numero}"][data-dia="${index}"]`
          );
          if (selector && selector.value !== "") {
            const fechaKey = dia.fecha.toISOString().split('T')[0]; // YYYY-MM-DD
            const turnoData = { turno: selector.value };
            if (selector.value === "M") {
              const manualInputs = document.querySelector(
                `#manual-time-${empleado.documento}-${semana.numero}-${index}`
              );
              if (manualInputs) {
                turnoData.inicioManual = manualInputs.querySelector(".manual-inicio").value;
                turnoData.finManual = manualInputs.querySelector(".manual-fin").value;
              }
            }
            empleado.turnosGuardados.set(fechaKey, turnoData);
          }
        }
      });
    });

    // Marcar empleado como pre-guardado
    empleado.preGuardado = true;

    this.mostrarListaEmpleados(); // Actualizar la lista después de pre-guardar
    this.mostrarNotificacion(`Turnos pre-guardados para ${empleado.nombre}`, "success");
  }

  /**
   * Actualiza el estilo de un selector de turno según su valor.
   */
  actualizarEstiloSelector(selector) {
    // Aplica estilos inline basados en la configuración del turno (color, contraste, borde)
    const codigo = selector.value;
    // Preferir color declarado en el <option> (data-color) si existe, útil para opciones generadas dinámicamente
    const opt = selector.selectedOptions && selector.selectedOptions[0];
    let estilos = null;
    if (opt && opt.dataset && opt.dataset.color) {
      estilos = this.calcularEstilosDeColor(opt.dataset.color);
    } else {
      estilos = this.obtenerColorTurno(codigo);
    }
    selector.className = "selector-turno";
    // Limpiar estilos previos
    selector.style.background = "";
    selector.style.color = "";
    selector.style.borderColor = "";
    if (estilos) {
      selector.style.background = estilos.bg;
      selector.style.color = estilos.text;
      selector.style.borderColor = estilos.border;
    }
    // Pintar el indicador dentro del wrapper si existe
    try {
      const wrapper = selector.closest('.selector-wrapper');
      if (wrapper) {
        const indicator = wrapper.querySelector('.select-indicator');
        if (indicator) {
          indicator.style.background = estilos ? estilos.bg : '';
          indicator.style.border = estilos ? `1px solid ${estilos.border}` : '';
        }
      }
    } catch (e) {}
    // Aplicar estilo al contenedor del día para que el turno asignado se vea como una tarjeta
    try {
      const diaContainer = selector.closest('.dia-turno');
      if (diaContainer) {
        if (selector.value && selector.value !== '') {
          diaContainer.style.background = estilos ? estilos.bg : '';
          diaContainer.style.color = estilos ? estilos.text : '';
          diaContainer.style.border = estilos ? `1px solid ${estilos.border}` : '';
          diaContainer.style.boxShadow = '0 4px 12px rgba(2,6,23,0.08)';
        } else {
          // Restaurar estilos por defecto
          diaContainer.style.background = '';
          diaContainer.style.color = '';
          diaContainer.style.border = '';
          diaContainer.style.boxShadow = '';
        }
      }
    } catch (e) {
      // No bloquear si no existe el DOM en modo headless
    }
  }

  /**
   * Calcula las horas de un turno específico con lógica mejorada
   */
  calcularHorasTurno(tipoTurno, fecha, horasAcumuladasParaExtras = 0, horasMaximas) {
    const resultado = {
      horasOrdinarias: 0,
      horasNocturnas: 0,
      horasFestivas: 0,
      horasNocturnasFestivas: 0,
      extrasOrdinarias: 0,
      extrasNocturnas: 0,
      extrasFestivas: 0,
      extrasNocturnasFestivas: 0,
      totalHoras: 0,
      horasEfectivasParaExtras: 0,
      horasEquivalentesTope: 0,
      horasDeuda: 0,
    };

    const turnoConfig = this.tiposTurno[tipoTurno];
    if (!turnoConfig || turnoConfig.horas === 0) return resultado;

    const esFestivo = this.esFestivo(fecha);
    // Calcular horas del turno asegurando que el descuento de alimentación se aplique
    let horasTurno = turnoConfig.horas;
    try {
      const turnoOrig = this.tiposTurno[tipoTurno] || this.configuracion.turnosDinamicos[tipoTurno];
      const es24h = turnoOrig && turnoOrig.inicio === turnoOrig.fin;
      const descontar = turnoOrig ? (turnoOrig.descontarAlimentacion !== false) : true;
      const confAlm = this.configuracionAlmuerzo || (typeof this.obtenerConfiguracionAlmuerzo === 'function' ? this.obtenerConfiguracionAlmuerzo() : { tipo: 'predefinido', tiempoEnHoras: 0.5 });
      if (turnoOrig && descontar) {
        horasTurno = this.calcularHorasTurnoConAlmuerzo(turnoOrig.inicio, turnoOrig.fin, confAlm, es24h);
      } else if (turnoOrig && !descontar) {
        horasTurno = this.calcularHorasDesdeTiempos(turnoOrig.inicio, turnoOrig.fin, false, 0);
      }
    } catch (e) {
      // En caso de error, fallback a lo que esté guardado
      horasTurno = turnoConfig.horas;
    }

    if (this.configuracion.tiposTurnoEspeciales[tipoTurno]) {
      // Los conceptos especiales NO se clasifican como horas trabajadas.
      // Solo algunos conceptos suman al tope semanal vía horas equivalentes.
      resultado.horasEquivalentesTope = this._obtenerHorasEquivalentesParaTope(tipoTurno);
      return resultado;
    }

    const turnosEfectivos = Object.keys(this.configuracion.turnosDinamicos || {}).concat(["M"]);
    if (turnosEfectivos.includes(tipoTurno)) {
      resultado.horasEfectivasParaExtras = horasTurno;
      resultado.totalHoras = horasTurno;
    }

    const turnoDinamico = this.configuracion.turnosDinamicos[tipoTurno];
    if (turnoDinamico) {
      this._procesarTurnoDetallado(
        resultado,
        fecha,
        horasTurno,
        turnoDinamico.inicio,
        turnoDinamico.fin,
        horasAcumuladasParaExtras,
        horasMaximas,
        turnoDinamico.descontarAlimentacion !== false
      );
    }

    return resultado;
  }

  _distribuirHoras(
    horas,
    esNocturno,
    esFestivo,
    resultado,
    horasAcumuladas,
    horasMaximas
  ) {
    const horasDisponibles = Math.max(0, horasMaximas - horasAcumuladas);
    const horasOrdinarias = Math.min(horas, horasDisponibles);
    const horasExtras = horas - horasOrdinarias;

    if (horasOrdinarias > 0) {
      if (esNocturno && esFestivo)
        resultado.horasNocturnasFestivas += horasOrdinarias;
      else if (esNocturno) resultado.horasNocturnas += horasOrdinarias;
      else if (esFestivo) resultado.horasFestivas += horasOrdinarias;
      else resultado.horasOrdinarias += horasOrdinarias;
    }

    if (horasExtras > 0) {
      if (esNocturno && esFestivo)
        resultado.extrasNocturnasFestivas += horasExtras;
      else if (esNocturno) resultado.extrasNocturnas += horasExtras;
      else if (esFestivo) resultado.extrasFestivas += horasExtras;
      else resultado.extrasOrdinarias += horasExtras;
    }
  }

  /**
   * Procesa turno de día con acumulado correcto
   */
  procesarTurnoDia(resultado, fecha, horasTurno, horasAcumuladas, horasMaximas) {
    // Mantener compatibilidad: delega al método genérico por tipo
    this.procesarTurnoPorTipo("D", resultado, fecha, horasTurno, horasAcumuladas, horasMaximas);
  }

  /**
   * Lógica centralizada para procesar turnos complejos (Noche, 24H) que pueden cruzar la medianoche.
   * Itera minuto a minuto para clasificar cada hora correctamente.
   */
  _procesarTurnoDetallado(
    resultado,
    fecha,
    horasTurno,
    inicioTurnoStr,
    finTurnoStr,
    horasAcumuladas,
    horasMaximas,
    descontarAlimentacion = true
  ) {
    const esFestivoInicio = this.esFestivo(fecha);
    const fechaSiguiente = new Date(fecha);
    fechaSiguiente.setDate(fecha.getDate() + 1);

    // El día siguiente es festivo si es domingo o está en nuestra lista de festivos.
    const esFestivoSiguiente = this.esFestivo(fechaSiguiente);

    const { inicio: inicioNocturnoStr, fin: finNocturnoStr } =
      this.configuracion.recargoNocturno;

    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Determinar configuración de alimentación final para este cálculo
    let confAlm = this.configuracionAlmuerzo || (typeof this.obtenerConfiguracionAlmuerzo === 'function' ? this.obtenerConfiguracionAlmuerzo() : { tipo: 'predefinido', tiempoEnHoras: 0.5 });
    if (descontarAlimentacion === false) {
      confAlm = { tipo: 'sin-almuerzo', tiempoEnHoras: 0 };
    }
    const es24h = (inicioTurnoStr === finTurnoStr);

    const ctxTurno = this._obtenerContextoAlimentacionTurno(
      inicioTurnoStr,
      finTurnoStr,
      confAlm,
      es24h
    );

    if (ctxTurno.inicioEfectivo >= ctxTurno.finProgramado) return;

    const isInLunchAbs = (absMinute) => {
      for (const w of ctxTurno.ventanasNoLaboradas) {
        if (absMinute >= w.start && absMinute < w.end) return true;
      }
      return false;
    };

    let minutosNocturnosDia1 = 0,
      minutosDiurnosDia1 = 0;
    let minutosNocturnosDia2 = 0,
      minutosDiurnosDia2 = 0;

    const inicioNocturnoMin = timeToMinutes(inicioNocturnoStr);
    const finNocturnoMin = timeToMinutes(finNocturnoStr);

    for (let minuto = ctxTurno.inicioEfectivo; minuto < ctxTurno.finProgramado; minuto++) {
      // Saltar minutos de almuerzo usando ventanas absolutas (ajustadas)
      if (isInLunchAbs(minuto)) continue;
      // minutoDelDia: minuto del día 0..1439
      const minutoDelDia = minuto % (24 * 60);
      let esNocturno;
      if (inicioNocturnoMin < finNocturnoMin) {
        esNocturno = minutoDelDia >= inicioNocturnoMin && minutoDelDia < finNocturnoMin;
      } else {
        esNocturno = minutoDelDia >= inicioNocturnoMin || minutoDelDia < finNocturnoMin;
      }
      if (minuto < 24 * 60) {
        // Día 1
        if (esNocturno) minutosNocturnosDia1++;
        else minutosDiurnosDia1++;
      } else {
        // Día 2
        if (esNocturno) minutosNocturnosDia2++;
        else minutosDiurnosDia2++;
      }
    }

    const horasNocturnasDia1 = minutosNocturnosDia1 / 60;
    const horasDiurnasDia1 = minutosDiurnosDia1 / 60;
    const horasNocturnasDia2 = minutosNocturnosDia2 / 60;
    const horasDiurnasDia2 = minutosDiurnosDia2 / 60;

    let horasAcumuladasLocal = horasAcumuladas;

    if (horasDiurnasDia1 > 0) {
      this._distribuirHoras(
        horasDiurnasDia1,
        false,
        esFestivoInicio,
        resultado,
        horasAcumuladasLocal,
        horasMaximas
      );
      horasAcumuladasLocal += horasDiurnasDia1;
    }
    if (horasNocturnasDia1 > 0) {
      this._distribuirHoras(
        horasNocturnasDia1,
        true,
        esFestivoInicio,
        resultado,
        horasAcumuladasLocal,
        horasMaximas
      );
      horasAcumuladasLocal += horasNocturnasDia1;
    }
    if (horasDiurnasDia2 > 0) {
      this._distribuirHoras(
        horasDiurnasDia2,
        false,
        esFestivoSiguiente,
        resultado,
        horasAcumuladasLocal,
        horasMaximas
      );
      horasAcumuladasLocal += horasDiurnasDia2;
    }
    if (horasNocturnasDia2 > 0) {
      this._distribuirHoras(
        horasNocturnasDia2,
        true,
        esFestivoSiguiente,
        resultado,
        horasAcumuladasLocal,
        horasMaximas
      );
    }
  }

  procesarTurnoNoche(resultado, fecha, horasTurno, horasAcumuladas, horasMaximas) {
    this.procesarTurnoPorTipo("N", resultado, fecha, horasTurno, horasAcumuladas, horasMaximas);
  }

  procesarTurno24Horas(resultado, fecha, horasTurno, horasAcumuladas, horasMaximas) {
    this.procesarTurnoPorTipo("24T", resultado, fecha, horasTurno, horasAcumuladas, horasMaximas);
  }

  /**
   * Procesa un turno a partir de su código/tipo consultando `this.tiposTurno`.
   * Esto elimina la dependencia a códigos rígidos y unifica el flujo de cálculo.
   */
  procesarTurnoPorTipo(tipoTurno, resultado, fecha, horasTurno, horasAcumuladas, horasMaximas) {
    const config = this.tiposTurno[tipoTurno];
    if (!config) return;
    const inicio = config.inicio || null;
    const fin = config.fin || null;
    // Si no hay inicio/fin, no procesamos minuto a minuto; sumar horas directamente
    if (!inicio || !fin) return;
    this._procesarTurnoDetallado(
      resultado,
      fecha,
      horasTurno,
      inicio,
      fin,
      horasAcumuladas,
      horasMaximas
    );
  }

  /**
   * Calcula todos los turnos del período
   * CORREGIDO: Ahora calcula horas considerando la semana COMPLETA (domingo a sábado)
   * aunque el período seleccionado no cubra todos los días
   */
  calcularTurnos() {
    if (this.empleados.size === 0) {
      alert("Primero debe generar el período de trabajo");
      return;
    }

    this.empleados.forEach(empleado => {
        const resultadosSemanas = [];

        empleado.semanas.forEach((semana) => {
      // --- PASO 1: ANÁLISIS PREVIO DE LA SEMANA COMPLETA ---
      // Obtener turnos de TODA la semana, incluyendo días fuera de rango (opacos)
      const turnosDeLaSemanaCompleta = semana.dias.map((dia, index) => {
        const asignacion = this._obtenerTurnoAsignadoParaDia(
          empleado,
          semana.numero,
          index,
          dia.fecha
        );
        return asignacion.turno;
      });

      const turnosConsideradosTrabajados = Object.keys(this.configuracion.turnosDinamicos || {}).concat(["M"]);
      const domingoTrabajado =
        turnosDeLaSemanaCompleta[0] &&
        turnosConsideradosTrabajados.includes(turnosDeLaSemanaCompleta[0]);
      let diasLibresCount = turnosDeLaSemanaCompleta.filter((t) => t === "C").length;

      // --- PASO 2: CÁLCULO DEL TOPE DE HORAS SEMANALES ---
      const turnosSemana = [];
      let horasTrabajadasSemana = 0;
      let horasEquivalentesPositivasSemana = 0; // I, PR, V: suman al acumulador de tope
      let horasEquivalentesNegativasSemana = 0; // A: restan del acumulador de tope
      const detalleHorasEquivalentesSemana = {};

      // El tope base es 42 h. SC (Sin Contrato) lo reduce por cada día lunes–sábado.
      // El domingo con SC NO reduce el tope.
      const horasMaximasSemanales = this.horasMaximasSemanalesNormal;
      let ajusteTope = 0;
      semana.dias.forEach((dia, index) => {
        if (index === 0) return; // domingo: SC no reduce tope
        const turno = turnosDeLaSemanaCompleta[index];
        if (!turno) return;
        const ajuste = this._obtenerAjusteConceptoEspecial(turno, false);
        ajusteTope += (ajuste.ajusteTope || 0);
      });
      const horasMaximasAjustadas = Math.max(0, horasMaximasSemanales + ajusteTope);

      // --- PASO 3: ACUMULAR HORAS DE TODA LA SEMANA (para cálculo correcto de extras) ---
      // CRÍTICO: Debemos acumular las horas en ORDEN cronológico de la semana completa
      let horasAcumuladasParaExtras = 0;

      // Primero calculamos las horas acumuladas ANTES de cada día
      const horasAcumuladasPorDia = [];

      semana.dias.forEach((dia, index) => {
        // Guardar el acumulado ANTES de este día
        horasAcumuladasPorDia[index] = horasAcumuladasParaExtras;

        const asignacionTurnoDia = this._obtenerTurnoAsignadoParaDia(
          empleado,
          semana.numero,
          index,
          dia.fecha
        );
        const turnoGuardado = asignacionTurnoDia.turnoGuardado;
        const turno = asignacionTurnoDia.turno;

        let resultadoDelTurno = {
          horasOrdinarias: 0,
          horasNocturnas: 0,
          horasFestivas: 0,
          horasNocturnasFestivas: 0,
          extrasOrdinarias: 0,
          extrasNocturnas: 0,
          extrasFestivas: 0,
          extrasNocturnasFestivas: 0,
          totalHoras: 0,
          horasEfectivasParaExtras: 0,
          horasEquivalentesTope: 0,
          horasDeuda: 0,
        };

        const ajusteConceptoEspecial = turno
          ? this._obtenerAjusteConceptoEspecial(turno, index === 0)
          : { ajusteAcumulador: 0, ajusteTope: 0 };
        // horasEquivalentesDia: solo el valor positivo, para compatibilidad con el campo de display
        const horasEquivalentesDia = Math.max(0, ajusteConceptoEspecial.ajusteAcumulador);

        if (turno && turnosConsideradosTrabajados.includes(turno)) {
          let horasTurno = 0;
          if (turno === 'M') {
            // Para turno manual, obtener las horas del turno guardado o del DOM
            if (turnoGuardado && turnoGuardado.inicioManual && turnoGuardado.finManual) {
              horasTurno = this.calcularHorasTurnoConAlmuerzo(
                turnoGuardado.inicioManual,
                turnoGuardado.finManual,
                this.configuracionAlmuerzo
              );
            } else {
              const manualContainer = document.querySelector(`#manual-time-${empleado.documento}-${semana.numero}-${index}`);
              if (manualContainer) {
                const inicioManual = manualContainer.querySelector('.manual-inicio').value;
                const finManual = manualContainer.querySelector('.manual-fin').value;
                horasTurno = this.calcularHorasTurnoConAlmuerzo(inicioManual, finManual, this.configuracionAlmuerzo);
              }
            }
          } else {
            // Turno no manual: calcular según configuración disponible
            const tipoCfg = this.configuracion.turnosDinamicos[turno] || this.tiposTurno[turno];
            if (tipoCfg) {
              const es24 = tipoCfg.inicio === tipoCfg.fin;
              if (tipoCfg.descontarAlimentacion !== false) {
                horasTurno = this.calcularHorasTurnoConAlmuerzo(tipoCfg.inicio, tipoCfg.fin, this.configuracionAlmuerzo, es24);
              } else {
                horasTurno = this.calcularHorasDesdeTiempos(tipoCfg.inicio, tipoCfg.fin, false, 0);
              }
            }
          }
          horasAcumuladasParaExtras += horasTurno;
          const esDomingoTrabajado =
            index === 0 && turnosConsideradosTrabajados.includes(turno);
          let hayLibreEnSemana = diasLibresCount > 0;
          let forzarExtrasDomingo = esDomingoTrabajado && !hayLibreEnSemana;

          if (esDomingoTrabajado && hayLibreEnSemana) {
            diasLibresCount--;
          }

          // CRÍTICO: Usar las horas acumuladas ANTES de este día
          const acumuladorDelDia = forzarExtrasDomingo
            ? horasMaximasAjustadas
            : horasAcumuladasPorDia[index];

          if (turno === "M") {
            const manualInputsContainer = document.querySelector(
              `#manual-time-${empleado.documento}-${semana.numero}-${index}`
            );
            const inicioManual =
              manualInputsContainer.querySelector(".manual-inicio").value;
            const finManual =
              manualInputsContainer.querySelector(".manual-fin").value;
            const horasCalculadas = this.calcularHorasTurnoConAlmuerzo(
              inicioManual,
              finManual,
              this.configuracionAlmuerzo
            );

            resultadoDelTurno = {
              horasOrdinarias: 0,
              horasNocturnas: 0,
              horasFestivas: 0,
              horasNocturnasFestivas: 0,
              extrasOrdinarias: 0,
              extrasNocturnas: 0,
              extrasFestivas: 0,
              extrasNocturnasFestivas: 0,
              totalHoras: horasCalculadas,
              horasEfectivasParaExtras: horasCalculadas,
              horasEquivalentesTope: 0,
              horasDeuda: 0,
            };

            this._procesarTurnoDetallado(
              resultadoDelTurno,
              dia.fecha,
              horasCalculadas,
              inicioManual,
              finManual,
              acumuladorDelDia,
              horasMaximasAjustadas,
              true
            );
            resultadoDelTurno.inicio = inicioManual;
            resultadoDelTurno.fin = finManual;
          } else {
            resultadoDelTurno = this.calcularHorasTurno(
              turno,
              dia.fecha,
              acumuladorDelDia,
              horasMaximasAjustadas
            );
            resultadoDelTurno.inicio = this.tiposTurno[turno]?.inicio || null;
            resultadoDelTurno.fin = this.tiposTurno[turno]?.fin || null;
          }

          horasTrabajadasSemana += resultadoDelTurno.totalHoras;
        } else if (turno) {
          // Mostrar cualquier turno no productivo o concepto especial (C, SC, V, I, etc.)
          resultadoDelTurno = {
            horasOrdinarias: 0,
            horasNocturnas: 0,
            horasFestivas: 0,
            horasNocturnasFestivas: 0,
            extrasOrdinarias: 0,
            extrasNocturnas: 0,
            extrasFestivas: 0,
            extrasNocturnasFestivas: 0,
            totalHoras: 0,
            horasEfectivasParaExtras: 0,
            horasEquivalentesTope: horasEquivalentesDia,
            horasDeuda: 0,
            inicio: this.tiposTurno[turno]?.inicio || null,
            fin: this.tiposTurno[turno]?.fin || null,
          };
        }

        // Aplicar ajuste del concepto especial al acumulador de extras
        if (ajusteConceptoEspecial.ajusteAcumulador > 0) {
          horasEquivalentesPositivasSemana += ajusteConceptoEspecial.ajusteAcumulador;
          horasAcumuladasParaExtras += ajusteConceptoEspecial.ajusteAcumulador;
          detalleHorasEquivalentesSemana[turno] =
            (detalleHorasEquivalentesSemana[turno] || 0) + ajusteConceptoEspecial.ajusteAcumulador;
        } else if (ajusteConceptoEspecial.ajusteAcumulador < 0) {
          horasEquivalentesNegativasSemana += Math.abs(ajusteConceptoEspecial.ajusteAcumulador);
          horasAcumuladasParaExtras = Math.max(
            0,
            horasAcumuladasParaExtras + ajusteConceptoEspecial.ajusteAcumulador
          );
        }

        turnosSemana.push({
          dia: dia.nombreDia,
          fecha: dia.fecha,
          turno: turno || 'C',
          esFestivo: dia.esFestivo,
          ...resultadoDelTurno,
        });
      });

      const resumenSemana = this.calcularResumenSemana(turnosSemana);
      // Tope efectivo: trabajadas + positivas (I/PR/V) - negativas (A), nunca menor a 0
      const horasAcumuladasParaTope = Math.max(
        0,
        horasTrabajadasSemana + horasEquivalentesPositivasSemana - horasEquivalentesNegativasSemana
      );
      resumenSemana.horasDeuda = Math.max(0, horasMaximasAjustadas - horasAcumuladasParaTope);
      resultadosSemanas.push({
        numero: semana.numero,
        inicioSemana: semana.inicioSemana,
        finSemana: semana.finSemana,
        turnos: turnosSemana,
        resumen: resumenSemana,
        horasMaximas: horasMaximasAjustadas,
        horasEquivalentesTope: horasEquivalentesPositivasSemana,
        horasEquivalentesNegativas: horasEquivalentesNegativasSemana,
        ajusteTope,
        horasAcumuladasParaTope,
        detalleHorasEquivalentesTope: detalleHorasEquivalentesSemana,
      });
    });
        empleado.resultados = resultadosSemanas;
    });

    this.mostrarResultados();
    this.navegarA("seccion-resultados");
  }

  

  /**
   * Calcula el resumen de una semana
   */
  calcularResumenSemana(turnos) {
    // Objeto para acumular los totales de la semana.
    const resumen = {
      totalHoras: 0,
      horasOrdinarias: 0,
      horasNocturnas: 0,
      horasFestivas: 0,
      horasNocturnasFestivas: 0,
      extrasOrdinarias: 0,
      extrasNocturnas: 0,
      extrasFestivas: 0,
      extrasNocturnasFestivas: 0,
      horasDeuda: 0,
    };

    // Suma los valores de cada día al resumen de la semana.
    turnos.forEach((turno) => {
      Object.keys(resumen).forEach((key) => {
        resumen[key] += turno[key] || 0;
      });
    });

    return resumen;
  }

  /**
   * Muestra los resultados calculados
   */
  mostrarResultados() {
    if (this.empleados.size === 0) {
        document.getElementById("info-empleado").innerHTML = `<p>No hay resultados para mostrar.</p>`;
        return;
    }

    const primerEmpleado = this.empleados.values().next().value;
    const fechaInicioGeneral = new Date(document.getElementById("fecha-inicio").value + 'T00:00:00');
    const fechaFinGeneral = new Date(document.getElementById("fecha-fin").value + 'T00:00:00');

    // Muestra la información del empleado y el período en la cabecera de resultados.
    document.getElementById("info-empleado").innerHTML = `
      <h4>Resultados para ${this.empleados.size} empleado(s)</h4>
      <p>Período General: ${fechaInicioGeneral.toLocaleDateString(
        "es-ES"
      )} - ${fechaFinGeneral.toLocaleDateString(
      "es-ES"
    )}</p>
    `;

    this.mostrarResultadosSemanales(); // Dibuja la tabla de resultados por semana.
    this.mostrarResumenTotal(); // Dibuja el resumen total del período.
    this.mostrarLiquidacion(); // Dibuja la tabla de liquidación de pago.
  }

  /**
   * Muestra los resultados semanales
   */
  mostrarResultadosSemanales() {
    const contenedor = document.getElementById("resultados-semanales");
    contenedor.innerHTML = "";

    this.empleados.forEach((empleado) => {
      // Itera sobre cada semana en los resultados.
      if (!empleado.resultados) return;

      const seccionEmpleado = document.createElement("div");
      seccionEmpleado.className = "empleado-seccion";
      seccionEmpleado.innerHTML = `
        <div class="empleado-header">
            <h3>${empleado.nombre} (${empleado.documento})</h3>
            <span class="toggle-icon">▼</span>
        </div>
        <div class="empleado-body"></div>
      `;
      contenedor.appendChild(seccionEmpleado);
      const bodyEmpleado = seccionEmpleado.querySelector(".empleado-body");

        if (!empleado.resultados) return;
        empleado.resultados.forEach((semana) => {
      const horasEquivalentesTope = semana.horasEquivalentesTope || 0;
      const horasEquivalentesNegativas = semana.horasEquivalentesNegativas || 0;
      const ajusteTopeSC = semana.ajusteTope || 0;
      const detalleEquivalentes = Object.entries(
        semana.detalleHorasEquivalentesTope || {}
      ).map(([codigo, horas]) => {
        const nombre = this.tiposTurno[codigo]?.nombre || codigo;
        return `${codigo} (${nombre}): ${Number(horas).toFixed(1)}h`;
      });
      const tooltipEquivalentes = detalleEquivalentes.length
        ? `Acumulado por conceptos especiales para tope semanal: ${detalleEquivalentes.join(", ")}`
        : "No hay horas equivalentes por conceptos especiales en esta semana.";
      const detalleVisible = detalleEquivalentes.length
        ? ` (${detalleEquivalentes.join(" · ")})`
        : "";

      const indicadorNegativo = horasEquivalentesNegativas > 0
        ? ` <span class="tope-equivalentes tope-negativo" title="Ausencias descuentan del acumulado semanal">• Ausencias: −${horasEquivalentesNegativas.toFixed(1)}h</span>`
        : "";
      const indicadorTopeAjuste = ajusteTopeSC < 0
        ? ` <span class="tope-equivalentes tope-sc" title="Sin Contrato reduce el tope semanal (solo lunes–sábado)">• SC: tope −${Math.abs(ajusteTopeSC).toFixed(1)}h</span>`
        : "";

      const divSemana = document.createElement("div");
      divSemana.className = "resultado-semana";
      divSemana.innerHTML = `
        <!-- Cabecera de la semana con su tope de horas -->
        <h4>Semana ${semana.numero} (${semana.inicioSemana.toLocaleDateString(
        "es-ES"
      )} - ${semana.finSemana.toLocaleDateString("es-ES")})</h4>
        <p class="tope-horas">Tope de horas para esta semana: ${
          semana.horasMaximas
        } horas
        <span class="tope-equivalentes" title="${tooltipEquivalentes.replace(/"/g, "&quot;")}">• Horas equivalentes (I/PR/V): ${horasEquivalentesTope.toFixed(1)}h${detalleVisible}</span>${indicadorNegativo}${indicadorTopeAjuste}
        </p>
        <div class="tabla-contenedor">
          <table class="tabla-turnos">
            <thead>
              <tr>
                <th>Día</th>
                <th>Turno</th>
                <th class="horas-ord">Horas<br>Ordinarias</th>
                <th class="horas-noc">Horas<br>Nocturnas</th>
                <th class="horas-fest">Horas<br>Festivas</th>
                <th class="horas-noc-fest">Horas<br>Noc. Festivas</th>
                <th class="extras-ord">Extras<br>Ordinarias</th>
                <th class="extras-noc">Extras<br>Nocturnas</th>
                <th class="extras-fest">Extras<br>Festivas</th>
                <th class="extras-noc-fest">Extras<br>Noc. Festivas</th>
                <th class="horas-turno">Horas<br>x Turno</th>
              </tr>
            </thead>
            <tbody>
              <!-- Itera sobre los turnos de la semana para crear las filas de la tabla -->
              ${semana.turnos
                .map((turno) => {
                  // Función auxiliar para dar estilo a las celdas con valores.
                  const celda = (valor, clase) => {
                    const val = parseFloat(valor);
                    const claseValor =
                      val > 0 ? "valor-positivo" : "valor-cero";
                    return `<td class="${clase} ${claseValor}">${val.toFixed(
                      1
                    )}</td>`;
                  };

                  const descripcionTurno = this.formatearNombreYHorarioTurno(
                    turno.turno
                  );
                  // Usar helper para generar badge consistente
                  const badgeHTML = this.crearBadgeTurnoHTML(turno.turno, descripcionTurno);

                  const totalHorasTurno =
                    (turno.horasOrdinarias || 0) +
                    (turno.horasNocturnas || 0) +
                    (turno.horasFestivas || 0) +
                    (turno.horasNocturnasFestivas || 0) +
                    (turno.extrasOrdinarias || 0) +
                    (turno.extrasNocturnas || 0) +
                    (turno.extrasFestivas || 0) +
                    (turno.extrasNocturnasFestivas || 0);

                  return `
                    <tr class="${turno.esFestivo ? "fila-festivo" : ""}">
                      <td><strong>${
                        turno.dia
                      }</strong><br><small>${turno.fecha.toLocaleDateString(
                    "es-ES"
                  )}</small></td>
                      <td>${badgeHTML}</td>
                      ${celda(turno.horasOrdinarias, "horas-ord")}
                      ${celda(turno.horasNocturnas, "horas-noc")}
                      ${celda(turno.horasFestivas, "horas-fest")}
                      ${celda(turno.horasNocturnasFestivas, "horas-noc-fest")}
                      ${celda(turno.extrasOrdinarias, "extras-ord")}
                      ${celda(turno.extrasNocturnas, "extras-noc")}
                      ${celda(turno.extrasFestivas, "extras-fest")}
                      ${celda(turno.extrasNocturnasFestivas, "extras-noc-fest")}
                      ${celda(totalHorasTurno, "horas-turno")}
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
            <!-- Pie de tabla con los totales de la semana -->
            <tfoot>
              <tr class="fila-total">
                <td colspan="2"><strong>TOTAL SEMANA</strong></td>
                <td class="horas-ord"><strong>${semana.resumen.horasOrdinarias.toFixed(
                  1
                )}</strong></td>
                <td class="horas-noc"><strong>${semana.resumen.horasNocturnas.toFixed(
                  1
                )}</strong></td>
                <td class="horas-fest"><strong>${semana.resumen.horasFestivas.toFixed(
                  1
                )}</strong></td>
                <td class="horas-noc-fest"><strong>${semana.resumen.horasNocturnasFestivas.toFixed(
                  1
                )}</strong></td>
                <td class="extras-ord"><strong>${semana.resumen.extrasOrdinarias.toFixed(
                  1
                )}</strong></td>
                <td class="extras-noc"><strong>${semana.resumen.extrasNocturnas.toFixed(
                  1
                )}</strong></td>
                <td class="extras-fest"><strong>${semana.resumen.extrasFestivas.toFixed(
                  1
                )}</strong></td>
                <td class="extras-noc-fest"><strong>${semana.resumen.extrasNocturnasFestivas.toFixed(
                  1
                )}</strong></td>
                <td class="horas-turno"><strong>${(
                  semana.resumen.horasOrdinarias +
                  semana.resumen.horasNocturnas +
                  semana.resumen.horasFestivas +
                  semana.resumen.horasNocturnasFestivas +
                  semana.resumen.extrasOrdinarias +
                  semana.resumen.extrasNocturnas +
                  semana.resumen.extrasFestivas +
                  semana.resumen.extrasNocturnasFestivas
                ).toFixed(1)}</strong></td>
              </tr>
              ${
                semana.resumen.horasDeuda > 0
                  ? `
              <tr class="fila-deuda">
                <td colspan="10"><strong>Horas Faltantes en la Semana</strong></td>
                <td><strong>${semana.resumen.horasDeuda.toFixed(
                  1
                )}</strong></td>
              </tr>
              `
                  : ""
              }
            </tfoot>
          </table>
        </div>
      `;
      // Añade el bloque de la semana al contenedor principal.
      bodyEmpleado.appendChild(divSemana);
    });

      // Evento para colapsar/expandir
      const header = seccionEmpleado.querySelector(".empleado-header");
      header.addEventListener("click", () => {
        header.classList.toggle("collapsed");
        bodyEmpleado.classList.toggle("collapsed");
      });
    });

  }

  /**
   * Muestra el resumen total del período
   */
  mostrarResumenTotal() {
    // Acumula los resúmenes de todas las semanas en un solo objeto.
    const resumenesPorEmpleado = [];

    this.empleados.forEach(empleado => {
        if (!empleado.resultados) return;

        const resumenTotalEmpleado = {
            totalHoras: 0, horasOrdinarias: 0, horasNocturnas: 0, horasFestivas: 0,
            horasNocturnasFestivas: 0, extrasOrdinarias: 0, extrasNocturnas: 0,
            extrasFestivas: 0, extrasNocturnasFestivas: 0, horasDeuda: 0,
        };

        empleado.resultados.forEach((semana) => {
            Object.keys(resumenTotalEmpleado).forEach((key) => {
                resumenTotalEmpleado[key] += semana.resumen[key];
            });
        });

        resumenesPorEmpleado.push({
            empleado: empleado,
            resumen: resumenTotalEmpleado
      });
    });

    const conf = this.configuracion;

    // Dibuja la grilla con el resumen total de cada tipo de hora.
    const contenedor = document.getElementById("grid-resumen-total");
    contenedor.innerHTML = "";

    resumenesPorEmpleado.forEach(({ empleado, resumen }) => {
        const divEmpleado = document.createElement('div');
        divEmpleado.className = 'empleado-seccion';
        divEmpleado.innerHTML = `
            <div class="empleado-header"><h3>${empleado.nombre}</h3> <span class="toggle-icon">▼</span></div>
            <div class="empleado-body">
                <div class="grid-resumen">
                    <div class="item-resumen">
                        <span class="etiqueta">Total Horas Trabajadas:</span>
                        <span class="valor">${resumen.totalHoras.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen">
                        <span class="etiqueta">Horas Ordinarias:</span>
                        <span class="valor">${resumen.horasOrdinarias.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen recargo-nocturno">
                        <span class="etiqueta">Recargo Nocturno (${conf.recargoNocturno.porcentaje}%):</span>
                        <span class="valor">${resumen.horasNocturnas.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen recargo-festivo">
                        <span class="etiqueta">Recargo Festivo (${conf.recargoFestivo.porcentaje}%):</span>
                        <span class="valor">${resumen.horasFestivas.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen recargo-noc-festivo">
                        <span class="etiqueta">Recargo Noc. Festivo (${conf.recargoNocturnoFestivo.porcentaje}%):</span>
                        <span class="valor">${resumen.horasNocturnasFestivas.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen extra-ordinaria">
                        <span class="etiqueta">Extra Ordinaria (${conf.extraDiurna.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasOrdinarias.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen extra-nocturna">
                        <span class="etiqueta">Extra Nocturna (${conf.extraNocturna.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasNocturnas.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen extra-festiva">
                        <span class="etiqueta">Extra Festiva (${conf.extraDiurnaFestiva.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasFestivas.toFixed(1)}</span>
                    </div>
                    <div class="item-resumen extra-noc-festiva">
                        <span class="etiqueta">Extra Noc. Festiva (${conf.extraNocturnaFestiva.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasNocturnasFestivas.toFixed(1)}</span>
                    </div>
                    ${resumen.horasDeuda > 0 ? `
                    <div class="item-resumen deuda">
                        <span class="etiqueta">Total Horas Faltantes:</span>
                        <span class="valor">${resumen.horasDeuda.toFixed(1)}</span>
                    </div>` : ""}
                </div>
            </div>
        `;
        contenedor.appendChild(divEmpleado);

        const header = divEmpleado.querySelector('.empleado-header');
        const body = divEmpleado.querySelector('.empleado-body');
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            body.classList.toggle('collapsed');
        });
    });
  }

  /**
   * Muestra la liquidación de pago basada en el salario.
   */
  mostrarLiquidacion() {
    const contenedor = document.getElementById("liquidacion-pago");
    contenedor.innerHTML = "";

    this.empleados.forEach(empleado => {
        if (!empleado.resultados || !empleado.salario || empleado.salario <= 0) {
            return; // No muestra liquidación si no hay datos o salario
        }

        const salarioMensual = empleado.salario;
        const nombreEmpleado = empleado.nombre;
        const documentoEmpleado = empleado.documento;

        const valorHoraOrdinaria = salarioMensual / 220;

        const resumenTotal = empleado.resultados.reduce((acc, semana) => {
            Object.keys(semana.resumen).forEach((key) => {
                acc[key] = (acc[key] || 0) + semana.resumen[key];
            });
            return acc;
        }, {});

        // Define los conceptos a liquidar (solo recargos y extras).
        const conceptos = [
            { etiqueta: "Recargo Nocturno", horas: resumenTotal.horasNocturnas, porcentaje: this.configuracion.recargoNocturno.porcentaje, tipo: "recargo" },
            { etiqueta: "Recargo Festivo", horas: resumenTotal.horasFestivas, porcentaje: this.configuracion.recargoFestivo.porcentaje, tipo: "recargo" },
            { etiqueta: "Recargo Nocturno Festivo", horas: resumenTotal.horasNocturnasFestivas, porcentaje: this.configuracion.recargoNocturnoFestivo.porcentaje, tipo: "recargo" },
            { etiqueta: "Horas Extras Ordinarias", horas: resumenTotal.extrasOrdinarias, porcentaje: this.configuracion.extraDiurna.porcentaje, tipo: "extra" },
            { etiqueta: "Horas Extras Nocturnas", horas: resumenTotal.extrasNocturnas, porcentaje: this.configuracion.extraNocturna.porcentaje, tipo: "extra" },
            { etiqueta: "Horas Extras Festivas", horas: resumenTotal.extrasFestivas, porcentaje: this.configuracion.extraDiurnaFestiva.porcentaje, tipo: "extra" },
            { etiqueta: "Horas Extras Nocturnas Festivas", horas: resumenTotal.extrasNocturnasFestivas, porcentaje: this.configuracion.extraNocturnaFestiva.porcentaje, tipo: "extra" },
        ];

        let totalAPagar = 0;

        const filasTabla = conceptos.map((c) => {
            if (c.horas <= 0) return "";

            let valorUnitario, subtotal;
            if (c.tipo === "recargo") {
                valorUnitario = valorHoraOrdinaria * (c.porcentaje / 100);
            } else { // 'extra'
                valorUnitario = valorHoraOrdinaria * (1 + c.porcentaje / 100);
            }
            subtotal = c.horas * valorUnitario;
            totalAPagar += subtotal;

            return `
                <tr>
                    <td>${c.etiqueta}</td>
                    <td>${c.horas.toFixed(1)}</td>
                    <td class="col-moneda">${valorUnitario.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}</td>
                    <td class="col-moneda">${subtotal.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}</td>
                </tr>
            `;
        }).join("");

        const opcionesMoneda = { style: "currency", currency: "COP", maximumFractionDigits: 0 };

        const divLiquidacion = document.createElement('div');
        divLiquidacion.className = 'liquidacion-contenedor';
        divLiquidacion.innerHTML = `
            <h3>Liquidación de Pago - ${nombreEmpleado} (${documentoEmpleado})</h3>
            <p class="info-salario">
                Salario Base: <strong>${salarioMensual.toLocaleString("es-CO", opcionesMoneda)}</strong> |
                Valor Hora Ordinaria: <strong>${valorHoraOrdinaria.toLocaleString("es-CO", opcionesMoneda)}</strong>
            </p>
            <div class="tabla-contenedor">
                <table class="tabla-turnos tabla-liquidacion">
                    <thead><tr><th>Concepto</th><th>Cantidad Horas</th><th class="col-moneda">Valor Unitario</th><th class="col-moneda">Subtotal</th></tr></thead>
                    <tbody>${filasTabla}</tbody>
                    <tfoot>
                        <tr class="fila-total-liquidacion">
                            <td colspan="3">TOTAL ADICIONALES A PAGAR</td>
                            <td class="col-moneda">${totalAPagar.toLocaleString("es-CO", opcionesMoneda)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        contenedor.appendChild(divLiquidacion);
      });
  }

  /**
   * Cambia entre pestañas de resultados
   */
  cambiarPestana(pestana) {
    // Quita la clase 'activa' de todas las pestañas y contenidos.
    document
      .querySelectorAll(".pestana")
      .forEach((p) => p.classList.remove("activa"));
    document
      .querySelectorAll(".contenido-pestana")
      .forEach((c) => c.classList.remove("activo"));

    // Añade la clase 'activa' a la pestaña y contenido seleccionados.
    document
      .querySelector(`[data-pestana="${pestana}"]`)
      .classList.add("activa");
    document.getElementById(`contenido-${pestana}`).classList.add("activo");
  }

  /**
   * Limpia todo el formulario
   */
  limpiarTodo() {
    const nombreEmpleadoInput = document.getElementById("nombre-empleado");
    const documentoEmpleadoInput = document.getElementById("documento-empleado");
    const salarioInput = document.getElementById("salario-mensual");

    if (nombreEmpleadoInput) nombreEmpleadoInput.value = "";
    if (documentoEmpleadoInput) documentoEmpleadoInput.value = "";
    if (salarioInput) salarioInput.value = "1.750.905";

    this.empleados.clear();

    const contenedorSemanas = document.getElementById("contenedor-semanas");
    if (contenedorSemanas) contenedorSemanas.innerHTML = "";

    this.configurarFechasActuales(); // Restablece las fechas por defecto.
    this.navegarA("seccion-configuracion"); // Vuelve a la primera pantalla.
  }

  /**
   * Exporta los resultados a un archivo Excel con formato.
   */
  async exportarResultados() {
    if (this.empleados.size === 0) {
      alert("No hay resultados para exportar");
      return;
    }

    const wb = XLSX.utils.book_new();
    const conf = this.configuracion;

    // --- 1. Hoja de Informe de Horas Extras (Nuevo) ---
    const dataInformeHoras = this._generarDatosInformeHorasExtras();
    const wsInformeHoras = XLSX.utils.aoa_to_sheet(dataInformeHoras.data);
    wsInformeHoras["!cols"] = dataInformeHoras.cols;
    XLSX.utils.book_append_sheet(wb, wsInformeHoras, "Informe Horas Extras");

    // --- 2. Hoja de Liquidación de Pago ---
    const dataLiquidacion = this._generarDatosLiquidacionParaExportar(); // Ya maneja múltiples empleados
    const wsLiquidacion = XLSX.utils.aoa_to_sheet(dataLiquidacion);
    wsLiquidacion["!cols"] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLiquidacion, "Liquidación de Pago");

    // --- 3. Hoja de Resumen Total de Horas ---
    const dataResumen = [["Empleado", "Documento", "Concepto", "Total Horas"]];
    this.empleados.forEach(empleado => {
        if (!empleado.resultados) return;

        const resumenTotal = empleado.resultados.reduce((acc, semana) => {
            Object.keys(semana.resumen).forEach((key) => {
                acc[key] = (acc[key] || 0) + semana.resumen[key];
            });
            return acc;
        }, {
            totalHoras: 0, horasOrdinarias: 0, horasNocturnas: 0, horasFestivas: 0,
            horasNocturnasFestivas: 0, extrasOrdinarias: 0, extrasNocturnas: 0,
            extrasFestivas: 0, extrasNocturnasFestivas: 0, horasDeuda: 0,
        });

        dataResumen.push(
            [empleado.nombre, empleado.documento, "Horas Ordinarias", this._formatearNumeroExcel(resumenTotal.horasOrdinarias)],
            ["", "", `Recargo Nocturno (${conf.recargoNocturno.porcentaje}%)`, this._formatearNumeroExcel(resumenTotal.horasNocturnas)],
            ["", "", `Recargo Festivo (${conf.recargoFestivo.porcentaje}%)`, this._formatearNumeroExcel(resumenTotal.horasFestivas)],
            ["", "", `Recargo Noc. Festivo (${conf.recargoNocturnoFestivo.porcentaje}%)`, this._formatearNumeroExcel(resumenTotal.horasNocturnasFestivas)],
            ["", "", `Extra Ordinaria (${conf.extraDiurna.porcentaje}%)`, this._formatearNumeroExcel(resumenTotal.extrasOrdinarias)],
            ["", "", `Extra Nocturna (${conf.extraNocturna.porcentaje}%)`, this._formatearNumeroExcel(resumenTotal.extrasNocturnas)],
            ["", "", `Extra Festiva (${conf.extraDiurnaFestiva.porcentaje}%)`, this._formatearNumeroExcel(resumenTotal.extrasFestivas)],
            ["", "", `Extra Noc. Festiva (${conf.extraNocturnaFestiva.porcentaje}%)`, this._formatearNumeroExcel(resumenTotal.extrasNocturnasFestivas)],
            ["", "", "TOTAL HORAS TRABAJADAS", this._formatearNumeroExcel(resumenTotal.totalHoras)],
            ["", "", "TOTAL HORAS FALTANTES", this._formatearNumeroExcel(resumenTotal.horasDeuda)],
            [] // Fila vacía para separar empleados
        );
    });

    const wsResumen = XLSX.utils.aoa_to_sheet(dataResumen);
    wsResumen["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Total Horas");

    // --- 4. Hojas de Resultados Semanales ---
    const semanasUnificadas = {};
    this.empleados.forEach(empleado => {
        if (!empleado.resultados) return;
        empleado.resultados.forEach(semana => {
            if (!semanasUnificadas[semana.numero]) {
                semanasUnificadas[semana.numero] = {
                    numero: semana.numero,
                    empleados: []
                };
            }
            semanasUnificadas[semana.numero].empleados.push({
                nombre: empleado.nombre,
                documento: empleado.documento,
                turnos: semana.turnos,
                resumen: semana.resumen
            });
        });
    });

    Object.values(semanasUnificadas).forEach(semana => {
      const header = [
        "Empleado",
        "Día",
        "Fecha",
        "Turno",
        "Color",
        "H. Ord.",
        "H. Noc.",
        "H. Fest.",
        "H. N.F.",
        "E. Ord.",
        "E. Noc.",
        "E. Fest.",
        "E. N.F.",
        "Horas x Turno",
      ];

      const wsData = [header];

      semana.empleados.forEach(empleado => {
          const dataEmpleado = empleado.turnos.map((t) => {
                const descripcionTurno = this.formatearNombreYHorarioTexto(t.turno);
              const totalHorasTurno = (t.horasOrdinarias || 0) + (t.horasNocturnas || 0) + (t.horasFestivas || 0) + (t.horasNocturnasFestivas || 0) + (t.extrasOrdinarias || 0) + (t.extrasNocturnas || 0) + (t.extrasFestivas || 0) + (t.extrasNocturnasFestivas || 0);
                const colorHex = this.tiposTurno[t.turno]?.color || "#9e9e9e";
                return [
                  empleado.nombre,
                  t.dia,
                  t.fecha.toLocaleDateString("es-ES"),
                  descripcionTurno,
                  colorHex,
                  this._formatearNumeroExcel(t.horasOrdinarias),
                  this._formatearNumeroExcel(t.horasNocturnas),
                  this._formatearNumeroExcel(t.horasFestivas),
                  this._formatearNumeroExcel(t.horasNocturnasFestivas),
                  this._formatearNumeroExcel(t.extrasOrdinarias),
                  this._formatearNumeroExcel(t.extrasNocturnas),
                  this._formatearNumeroExcel(t.extrasFestivas),
                  this._formatearNumeroExcel(t.extrasNocturnasFestivas),
                  this._formatearNumeroExcel(totalHorasTurno),
              ];
          });

          wsData.push(...dataEmpleado);

          const totalHorasSemana = Object.values(empleado.resumen).reduce((a, b) => a + b, 0) - empleado.resumen.horasDeuda;
          const footerEmpleado = [
              `TOTAL ${empleado.nombre.toUpperCase()}`, "", "", "",
              this._formatearNumeroExcel(empleado.resumen.horasOrdinarias),
              this._formatearNumeroExcel(empleado.resumen.horasNocturnas),
              this._formatearNumeroExcel(empleado.resumen.horasFestivas),
              this._formatearNumeroExcel(empleado.resumen.horasNocturnasFestivas),
              this._formatearNumeroExcel(empleado.resumen.extrasOrdinarias),
              this._formatearNumeroExcel(empleado.resumen.extrasNocturnas),
              this._formatearNumeroExcel(empleado.resumen.extrasFestivas),
              this._formatearNumeroExcel(empleado.resumen.extrasNocturnasFestivas),
              this._formatearNumeroExcel(totalHorasSemana),
          ];
          wsData.push(footerEmpleado);

          if (empleado.resumen.horasDeuda > 0) {
              wsData.push([
                  "", "", "", "Horas Faltantes", "", "", "", "", "", "", "", "",
                  this._formatearNumeroExcel(empleado.resumen.horasDeuda),
              ]);
          }
          wsData.push([]); // Fila vacía para separar empleados
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 25 },
        { wch: 12 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, `Semana ${semana.numero}`);
    });

    // --- 5. Hoja de Resumen de Tipos de Turno (Formato Vertical) ---
    const semanasResultados = this.empleados.values().next().value?.resultados || [];

    // Cabecera: "Tipo de Turno", "Semana 1", "Semana 2", ...
    const headersTurnos = [
      "Empleado",
      "Tipo de Turno",
      ...semanasResultados.map(semana => `Semana ${semana.numero}`),
      "Total Período"
    ];
    const dataResumenTurnos = [headersTurnos];

    this.empleados.forEach(empleado => {
        if (!empleado.resultados) return;

        const tiposDeTurnoUsados = [...new Set(empleado.resultados.flatMap(s => s.turnos.map(t => t.turno)))];
        const totalesEmpleado = { total: 0 };
        semanasResultados.forEach(s => { totalesEmpleado[s.numero] = 0; });

        tiposDeTurnoUsados.forEach(tipo => {
            if (!tipo) return; // Ignorar turnos nulos o vacíos

            const fila = [empleado.nombre, this.tiposTurno[tipo]?.nombre || tipo];
            let totalTurnoPeriodo = 0;

            semanasResultados.forEach(semanaRef => {
                const semanaEmpleado = empleado.resultados.find(s => s.numero === semanaRef.numero);
                const conteo = semanaEmpleado ? semanaEmpleado.turnos.filter(t => t.turno === tipo).length : 0;
                fila.push(this._formatearNumeroExcel(conteo));
                totalTurnoPeriodo += conteo;
                totalesEmpleado[semanaRef.numero] += conteo;
            });

            fila.push(this._formatearNumeroExcel(totalTurnoPeriodo));
            totalesEmpleado.total += totalTurnoPeriodo;
            dataResumenTurnos.push(fila);
        });

        // Fila de totales por empleado
        const filaTotal = [`TOTAL ${empleado.nombre.toUpperCase()}`, ""];
        semanasResultados.forEach(semanaRef => {
            filaTotal.push(this._formatearNumeroExcel(totalesEmpleado[semanaRef.numero]));
        });
        filaTotal.push(this._formatearNumeroExcel(totalesEmpleado.total));
        dataResumenTurnos.push(filaTotal);
        dataResumenTurnos.push([]); // Fila vacía para separar
    });

    const wsResumenTurnos = XLSX.utils.aoa_to_sheet(dataResumenTurnos);
    // Ajustar anchos de columna: la primera más ancha, las demás iguales
    wsResumenTurnos["!cols"] = [
      { wch: 30 }, // Columna Empleado
      { wch: 25 }, // Columna Tipo de Turno
      ...semanasResultados.map(() => ({ wch: 15 })), // Columnas de semanas
      { wch: 15 }  // Columna Total
    ];
    XLSX.utils.book_append_sheet(wb, wsResumenTurnos, "Resumen de Turnos");

    // --- Lógica de Guardado --- Corregido el error de sintaxis aquí
    const nombreArchivo = `Reporte de Horas - Varios Empleados - ${new Date().toLocaleDateString("es-ES").replace(/\//g, "-")}.xlsx`;

    if (window.electronAPI) {
      try {
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
        const result = await window.electronAPI.saveFile({
          data: wbout,
          fileName: nombreArchivo,
        });
        if (result.success) {
          alert(`¡Reporte exportado exitosamente en: ${result.path}`);
        } else {
          if (result.message !== "Guardado cancelado por el usuario.") {
            alert(`Error al guardar: ${result.message}`);
          }
        }
      } catch (error) {
        console.error(
          "Error al invocar el guardado de archivo en Electron:",
          error
        );
        alert("Ocurrió un error inesperado al intentar exportar.");
      }
    } else {
      XLSX.writeFile(wb, nombreArchivo);
    }
  }

  _generarDatosLiquidacionParaExportar() {
    const data = [];
    const header = [ "Empleado", "Documento", "Concepto", "Cantidad Horas", "Valor Unitario", "Subtotal" ];
    data.push(header);

    this.empleados.forEach(empleado => {
        if (!empleado.resultados || !empleado.salario || empleado.salario <= 0) return;

        const valorHoraOrdinaria = empleado.salario / 220;
        const resumenTotal = empleado.resultados.reduce((acc, semana) => {
            Object.keys(semana.resumen).forEach((key) => {
                acc[key] = (acc[key] || 0) + semana.resumen[key];
            });
            return acc;
        }, {});

    const conceptos = [
      {
        etiqueta: "Recargo Nocturno",
        horas: resumenTotal.horasNocturnas,
        porcentaje: this.configuracion.recargoNocturno.porcentaje,
        tipo: "recargo",
      },
      {
        etiqueta: "Recargo Festivo",
        horas: resumenTotal.horasFestivas,
        porcentaje: this.configuracion.recargoFestivo.porcentaje,
        tipo: "recargo",
      },
      {
        etiqueta: "Recargo Nocturno Festivo",
        horas: resumenTotal.horasNocturnasFestivas,
        porcentaje: this.configuracion.recargoNocturnoFestivo.porcentaje,
        tipo: "recargo",
      },
      {
        etiqueta: "Horas Extras Ordinarias",
        horas: resumenTotal.extrasOrdinarias,
        porcentaje: this.configuracion.extraDiurna.porcentaje,
        tipo: "extra",
      },
      {
        etiqueta: "Horas Extras Nocturnas",
        horas: resumenTotal.extrasNocturnas,
        porcentaje: this.configuracion.extraNocturna.porcentaje,
        tipo: "extra",
      },
      {
        etiqueta: "Horas Extras Festivas",
        horas: resumenTotal.extrasFestivas,
        porcentaje: this.configuracion.extraDiurnaFestiva.porcentaje,
        tipo: "extra",
      },
      {
        etiqueta: "Horas Extras Nocturnas Festivas",
        horas: resumenTotal.extrasNocturnasFestivas,
        porcentaje: this.configuracion.extraNocturnaFestiva.porcentaje,
        tipo: "extra",
      },
    ];

        let totalAPagarEmpleado = 0;

        const filas = conceptos
            .filter((c) => c.horas > 0)
            .map((c) => {
                let valorUnitario, subtotal;
                if (c.tipo === "recargo") {
                    valorUnitario = valorHoraOrdinaria * (c.porcentaje / 100);
                } else { // 'extra'
                    valorUnitario = valorHoraOrdinaria * (1 + c.porcentaje / 100);
                }
                subtotal = c.horas * valorUnitario;
                totalAPagarEmpleado += subtotal;
                return [
                    empleado.nombre,
                    empleado.documento,
                    c.etiqueta,
                    this._formatearNumeroExcel(c.horas),
                    valorUnitario, // Dejar como número para que Excel lo formatee
                    subtotal     // Dejar como número para que Excel lo formatee
                ];
            });

        if (filas.length > 0) {
            data.push(...filas);
            const footer = ["", "", `TOTAL ${empleado.nombre.toUpperCase()}`, "", "", totalAPagarEmpleado]; // Dejar como número
            data.push(footer);
            data.push([]); // Separador
        }
    });

    if (data.length === 1) { // Solo el header
        return [["No hay datos de liquidación para exportar."]];
    }
    // Formatear los números a string para la visualización final en Excel
    return data.map(row => row.map(cell => {
        if (typeof cell === 'number') {
            return cell.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        }
        return cell;
    }));

  }

  _formatearNumeroExcel(num) {
    if (num === 0 || !num) {
      return "";
    }
    // Convierte a número con máximo 2 decimales para redondear correctamente
    const numeroRedondeado = parseFloat(num.toFixed(2));
    // Convierte a string (que elimina ceros finales) y reemplaza el punto por la coma
    return numeroRedondeado.toString().replace('.', ',');
  }


  _generarDatosInformeHorasExtras() {
    // Parte 1: Tabla de conceptos
    const header1 = [
      "Informe Generado:", "", "", "", "", "", "",
      "Horas Extras Diurnas",
      "Horas Extras Nocturnas",
      "Horas Recargo Festivo Diurno",
      "Horas Recargo Festivo Nocturno",
      "Horas Extra Festivo Diurno",
      "Horas Extra Festivo Nocturno",
      "Horas Recargo Nocturno",
    ];

    const header2 = [
      "Usuario Nro#", "Nombre", "Fecha", "Tipo de turno", "Horario de entrada", "Horario de salida", "Horas Trabajadas",
      this.configuracion.codigoExportacion?.horasExtrasDiurnas || "045",
      this.configuracion.codigoExportacion?.horasExtrasNocturnas || "046",
      this.configuracion.codigoExportacion?.recargoFestivoDiurno || "011",
      this.configuracion.codigoExportacion?.recargoFestivoNocturno || "012",
      this.configuracion.codigoExportacion?.horasExtrasFestivasDiurnas || "047",
      this.configuracion.codigoExportacion?.horasExtrasFestivasNocturnas || "048",
      this.configuracion.codigoExportacion?.recargoNocturno || "010",
      "Dia"
    ];

    const data = [];
    const totales = {
      extrasOrdinarias: 0, extrasNocturnas: 0, horasFestivas: 0, horasNocturnasFestivas: 0,
      extrasFestivas: 0, extrasNocturnasFestivas: 0, horasNocturnas: 0,
    };

    // Parte 3: Filas de datos
    this.empleados.forEach(empleado => {
        if (!empleado.resultados) return;
        empleado.resultados.forEach(semana => {
            semana.turnos.forEach(turno => {
                const totalHorasTurno =
                (turno.horasOrdinarias || 0) + (turno.horasNocturnas || 0) + (turno.horasFestivas || 0) +
                (turno.horasNocturnasFestivas || 0) + (turno.extrasOrdinarias || 0) + (turno.extrasNocturnas || 0) +
                (turno.extrasFestivas || 0) + (turno.extrasNocturnasFestivas || 0);

                // Solo incluir filas con horas trabajadas
                if (totalHorasTurno > 0) {
                    const formatHora = (hora) => {
                        if (!hora) return "";
                        const [h, m] = hora.split(":");
                        return `${h}:${m}`;
                    };

                    let horarioEntrada = formatHora(turno.inicio);
                    let horarioSalida = formatHora(turno.fin);

                    // Si es un concepto especial (sin horario de entrada/salida), muestra el nombre del concepto.
                    const esTurnoEspecial = this.configuracion.tiposTurnoEspeciales[turno.turno];
                    if (esTurnoEspecial && !turno.inicio && turno.turno !== 'M') {
                        horarioEntrada = this.tiposTurno[turno.turno]?.nombre || turno.turno;
                    }

                    const tipoTurnoNombre = this.tiposTurno[turno.turno]?.nombre || turno.turno;

                    const fila = [
                        empleado.documento,
                        empleado.nombre,
                        turno.fecha.toLocaleDateString('es-CO'),
                        tipoTurnoNombre,
                        horarioEntrada,
                        horarioSalida,
                        this._formatearNumeroExcel(totalHorasTurno),
                        this._formatearNumeroExcel(turno.extrasOrdinarias),
                        this._formatearNumeroExcel(turno.extrasNocturnas),
                        this._formatearNumeroExcel(turno.horasFestivas),
                        this._formatearNumeroExcel(turno.horasNocturnasFestivas),
                        this._formatearNumeroExcel(turno.extrasFestivas),
                        this._formatearNumeroExcel(turno.extrasNocturnasFestivas),
                        this._formatearNumeroExcel(turno.horasNocturnas),
                        turno.dia
                    ];
                    data.push(fila);

                    // Acumular totales
                    totales.extrasOrdinarias += turno.extrasOrdinarias || 0;
                    totales.extrasNocturnas += turno.extrasNocturnas || 0;
                    totales.horasFestivas += turno.horasFestivas || 0;
                    totales.horasNocturnasFestivas += turno.horasNocturnasFestivas || 0;
                    totales.extrasFestivas += turno.extrasFestivas || 0;
                    totales.extrasNocturnasFestivas += turno.extrasNocturnasFestivas || 0;
                    totales.horasNocturnas += turno.horasNocturnas || 0;
                }
            });
        });
    });

    // Parte 4: Fila de totales
    const footer = [
      "", "", "", "", "", "", "TOTALES:",
      this._formatearNumeroExcel(totales.extrasOrdinarias),
      this._formatearNumeroExcel(totales.extrasNocturnas),
      this._formatearNumeroExcel(totales.horasFestivas),
      this._formatearNumeroExcel(totales.horasNocturnasFestivas),
      this._formatearNumeroExcel(totales.extrasFestivas),
      this._formatearNumeroExcel(totales.extrasNocturnasFestivas),
      this._formatearNumeroExcel(totales.horasNocturnas),
      ""
    ];

    const cols = [ {wch: 15}, {wch: 30}, {wch: 12}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12} ];

    return { data: [header1, header2, ...data, footer], cols };
  }
}

// Exponer la clase en `window` para entornos donde el scope no la establece automáticamente (tests, runners)
if (typeof window !== 'undefined') {
  window.SistemaTurnosMejorado = window.SistemaTurnosMejorado || SistemaTurnosMejorado;
}

// Auto-instanciar solo cuando la página parece ser la UI principal (evitar fallos en test runner)
document.addEventListener("DOMContentLoaded", () => {
  const hasUI = document.getElementById('seccion-configuracion') || document.getElementById('contenedor-semanas') || document.getElementById('app');
  if (hasUI) {
    try {
      new SistemaTurnosMejorado();
    } catch (e) {
      console.error('No se pudo inicializar la aplicación automáticamente:', e);
    }
  }
});

// Exportar la clase para entornos Node (tests automatizados)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SistemaTurnosMejorado;
}
