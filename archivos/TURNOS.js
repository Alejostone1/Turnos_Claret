/**
 * Sistema de Control de Turnos y Cálculo de Horas Extras - Versión Mejorada
 * Maneja períodos completos con cálculo semanal y acumulado correcto
 * Versión: 5.0
 *
 * CAMBIOS v5.0:
 * - Incapacidad y vacaciones suman 7,33 h al tope de 42 h (no en domingo ni festivo,
 *   y solo si la semana tiene al menos un turno realmente trabajado)
 * - Clasificación cronológica real al cruzar el tope (antes se agrupaba diurno/nocturno)
 * - Selector de turnos con tarjetas, colores fijos de conceptos, contraseña de configuración
 * - Pre-guardado persistente, resultados individuales, eliminación real de turnos y empleados
 * - Exportación Excel auditada (números reales, columnas alineadas, hoja de novedades)
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
   * Reemplaza cada <select> de turno por un selector visual de tarjetas.
   * El <select> nativo sigue siendo la fuente de verdad (oculto y sincronizado),
   * así el cálculo, el pre-guardado y la accesibilidad no dependen del componente visual.
   */
  inicializarCustomSelects() {
    if (typeof document === 'undefined') return;

    // Un único listener global cierra el panel abierto (no uno por selector)
    if (!this._selectorGlobalInit) {
      this._selectorGlobalInit = true;
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.turno-picker-panel') && !e.target.closest('.custom-select-toggle')) {
          this._cerrarPanelTurnos();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this._cerrarPanelTurnos(true);
      });
    }

    document.querySelectorAll('.selector-wrapper').forEach(wrapper => {
      const select = wrapper.querySelector('.selector-turno');
      if (!select || select.dataset.customInit === '1') return;

      const custom = document.createElement('div');
      custom.className = 'custom-select';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'custom-select-toggle';
      toggle.setAttribute('aria-haspopup', 'dialog');
      toggle.setAttribute('aria-expanded', 'false');

      const valueSpan = document.createElement('div');
      valueSpan.className = 'custom-select-value';

      const caret = document.createElement('span');
      caret.className = 'select-caret';
      caret.textContent = '▾';

      toggle.appendChild(valueSpan);
      toggle.appendChild(caret);
      custom.appendChild(toggle);

      wrapper.insertBefore(custom, select);
      select.setAttribute('aria-hidden', 'true');
      select.tabIndex = -1;
      select.dataset.customInit = '1';

      // Mantener sincronizado el valor mostrado cuando el <select> cambie
      select.addEventListener('change', () => this._updateCustomValue(select, valueSpan));

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._panelTurnosAbierto && this._panelTurnosAbierto.select === select) {
          this._cerrarPanelTurnos();
        } else {
          this._abrirPanelTurnos(select, toggle);
        }
      });

      this._updateCustomValue(select, valueSpan);
    });
  }

  /**
   * Datos de presentación de una opción de turno: nombre, horario y color.
   */
  _datosOpcionTurno(opt) {
    const codigo = opt.value;
    const tipo = this.tiposTurno?.[codigo] || {};
    const color = this._esConceptoConColorFijo(codigo)
      ? SistemaTurnosMejorado.COLORES_CONCEPTOS_FIJOS[codigo]
      : (opt.dataset.color || tipo.color || '#9e9e9e');
    const detalle = tipo.inicio && tipo.fin
      ? `${this.formatearHoraAMPM(tipo.inicio)} – ${this.formatearHoraAMPM(tipo.fin)}`
      : (tipo.descripcion && tipo.descripcion !== tipo.nombre ? tipo.descripcion : '');
    return { codigo, nombre: tipo.nombre || codigo, detalle, color, grupo: opt.dataset.grupo || 'turno' };
  }

  _abrirPanelTurnos(select, toggle) {
    this._cerrarPanelTurnos();

    const panel = document.createElement('div');
    panel.className = 'turno-picker-panel';
    panel.setAttribute('role', 'dialog');

    const diaTurno = select.closest('.dia-turno');
    const label = diaTurno?.querySelector('label');
    const etiquetaDia = label
      ? (label.innerText || label.textContent).split(/\n+/).map((t) => t.trim()).filter(Boolean).join(' · ')
      : '';

    const opciones = Array.from(select.options).map((opt) => this._datosOpcionTurno(opt));
    const grupos = [
      { titulo: 'Turnos', items: opciones.filter((o) => o.grupo !== 'concepto') },
      { titulo: 'Conceptos de nómina', items: opciones.filter((o) => o.grupo === 'concepto') },
    ].filter((g) => g.items.length);

    panel.innerHTML = `
      <div class="turno-picker-header">
        <span class="turno-picker-titulo">Seleccionar turno</span>
        <span class="turno-picker-dia">${this._escaparHTML(etiquetaDia)}</span>
      </div>
      ${grupos.map((g) => `
        <div class="turno-picker-grupo">
          <div class="turno-picker-grupo-titulo">${g.titulo}</div>
          <div class="turno-picker-grid">
            ${g.items.map((o) => {
              const estilos = this.calcularEstilosDeColor(o.color);
              const activo = o.codigo === select.value;
              return `
                <button type="button" class="turno-card${activo ? ' seleccionado' : ''}" data-value="${this._escaparHTML(o.codigo)}"
                  style="--turno-color:${o.color}; --turno-texto:${estilos.text};" aria-pressed="${activo}">
                  <span class="turno-card-codigo">${this._escaparHTML(o.codigo)}</span>
                  <span class="turno-card-info">
                    <span class="turno-card-nombre">${this._escaparHTML(o.nombre)}</span>
                    ${o.detalle ? `<span class="turno-card-detalle">${this._escaparHTML(o.detalle)}</span>` : ''}
                  </span>
                  <span class="turno-card-check" aria-hidden="true">${activo ? '✓' : ''}</span>
                </button>`;
            }).join('')}
          </div>
        </div>`).join('')}
    `;

    panel.addEventListener('click', (e) => {
      const card = e.target.closest('.turno-card');
      if (!card) return;
      e.stopPropagation();
      select.value = card.dataset.value;
      // bubbles: true para que el contenedor detecte el cambio (cambios sin guardar)
      select.dispatchEvent(new Event('change', { bubbles: true }));
      this._cerrarPanelTurnos(true);
    });

    document.body.appendChild(panel);
    this._panelTurnosAbierto = { panel, select, toggle };
    toggle.setAttribute('aria-expanded', 'true');

    // Posicionar junto al selector sin salirse de la ventana
    const rect = toggle.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const ancho = Math.min(600, vw - 24);
    panel.style.width = `${ancho}px`;
    const alto = Math.min(panel.scrollHeight, vh - 32);
    panel.style.maxHeight = `${vh - 32}px`;
    let left = rect.left + window.scrollX;
    if (left + ancho > window.scrollX + vw - 12) left = window.scrollX + vw - ancho - 12;
    left = Math.max(window.scrollX + 12, left);
    let top = rect.bottom + window.scrollY + 6;
    if (rect.bottom + alto + 12 > vh && rect.top > alto + 12) {
      top = rect.top + window.scrollY - alto - 6;
    } else if (rect.bottom + alto + 12 > vh) {
      top = window.scrollY + Math.max(16, vh - alto - 16);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;

    const seleccionado = panel.querySelector('.turno-card.seleccionado') || panel.querySelector('.turno-card');
    if (seleccionado) seleccionado.focus({ preventScroll: true });
  }

  _cerrarPanelTurnos(devolverFoco = false) {
    const abierto = this._panelTurnosAbierto;
    if (!abierto) return;
    abierto.panel.remove();
    abierto.toggle.setAttribute('aria-expanded', 'false');
    if (devolverFoco) abierto.toggle.focus({ preventScroll: true });
    this._panelTurnosAbierto = null;
  }

  _updateCustomValue(select, valueSpan) {
    const opt = select.options[select.selectedIndex];
    if (!opt) return;
    const datos = this._datosOpcionTurno(opt);
    const estilos = this.calcularEstilosDeColor(datos.color);

    valueSpan.innerHTML = `
      <span class="custom-select-texto" title="${this._escaparHTML(`${datos.codigo} · ${datos.nombre}${datos.detalle ? ` (${datos.detalle})` : ''}`)}">
        <span class="custom-select-nombre">${this._escaparHTML(datos.nombre)}</span>
        ${datos.detalle ? `<span class="custom-select-detalle">${this._escaparHTML(datos.detalle)}</span>` : ''}
      </span>`;

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
    };

    // Conceptos base: color fijo, nunca sobrescrito por configuración
    if (this._esConceptoConColorFijo(codigo)) {
      return this.calcularEstilosDeColor(SistemaTurnosMejorado.COLORES_CONCEPTOS_FIJOS[codigo]);
    }

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
    return `<span class="turno-badge" style="${inline}"><span class="turno-text">${texto}</span></span>`;
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
    Object.entries(SistemaTurnosMejorado.COLORES_CONCEPTOS_FIJOS).forEach(([codigo, color]) => {
      if (this.tiposTurno[codigo]) this.tiposTurno[codigo] = { ...this.tiposTurno[codigo], color };
    });

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
        tiposTurnoEspeciales: this._conceptosPorDefecto(),
        versionConceptos: 3,
      };
    }
    let huboLimpiezaInicial = this._eliminarConceptosObsoletos(config);

    // Asegurarse de que la configuración vieja tenga los nuevos tipos
    if (!config.tiposTurnoEspeciales) {
      config.tiposTurnoEspeciales = this._conceptosPorDefecto();
    }

    // Migración v2: A y SC pasan a tener horas equivalentes funcionales (7h)
    if (!config.versionConceptos || config.versionConceptos < 2) {
      const esp = config.tiposTurnoEspeciales;
      if (esp?.A && esp.A.horas === 0) esp.A.horas = 7;
      if (esp?.SC && esp.SC.horas === 0) esp.SC.horas = 7;
      config.versionConceptos = 2;
    }

    // Migración v3: I y V pasan de 7 h (valor anterior por defecto) a 7,33 h
    if (config.versionConceptos < 3) {
      const esp = config.tiposTurnoEspeciales;
      ["I", "V"].forEach((codigo) => {
        if (esp?.[codigo] && Number(esp[codigo].horas) === 7) esp[codigo].horas = 7.33;
      });
      config.versionConceptos = 3;
      huboLimpiezaInicial = true;
    }

    // Los conceptos base conservan siempre su color identificativo
    if (this._aplicarColoresFijos(config)) huboLimpiezaInicial = true;

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

  /**
   * Conceptos de nómina base. I y V aportan 7,33 h por defecto.
   */
  _conceptosPorDefecto() {
    const c = SistemaTurnosMejorado.COLORES_CONCEPTOS_FIJOS;
    return {
      I: { nombre: "Incapacitado", horas: 7.33, descripcion: "Incapacidad", color: c.I },
      SC: { nombre: "Sin contrato", horas: 7, descripcion: "Sin contrato", color: c.SC },
      PR: { nombre: "Permiso remunerado", horas: 7, descripcion: "Permiso remunerado", color: c.PR },
      A: { nombre: "Ausencia", horas: 7, descripcion: "Ausencia", color: c.A },
      V: { nombre: "Vacaciones", horas: 7.33, descripcion: "Vacaciones", color: c.V },
    };
  }

  /**
   * Fuerza el color identificativo de los conceptos base. Retorna true si cambió algo.
   */
  _aplicarColoresFijos(config) {
    let cambio = false;
    const esp = config && config.tiposTurnoEspeciales;
    if (!esp) return false;
    Object.entries(SistemaTurnosMejorado.COLORES_CONCEPTOS_FIJOS).forEach(([codigo, color]) => {
      if (esp[codigo] && esp[codigo].color !== color) {
        esp[codigo].color = color;
        cambio = true;
      }
    });
    return cambio;
  }

  _describirReglaConcepto(codigo) {
    switch (this._obtenerComportamientoConceptoEspecial(codigo)) {
      case "suma_tope":
        return "Suma estas horas al acumulado de 42 h (no en domingo ni festivo, y solo si la semana tiene un turno trabajado).";
      case "cubre_deuda":
        return "No suma para extras; solo cubre las horas faltantes de la semana.";
      case "resta":
        return "Resta estas horas del acumulado semanal.";
      case "reduce_tope":
        return "Reduce el tope semanal en estas horas (lunes a sábado).";
      default:
        return "Sin efecto en el cálculo semanal.";
    }
  }

  _esConceptoConColorFijo(codigo) {
    return Object.prototype.hasOwnProperty.call(SistemaTurnosMejorado.COLORES_CONCEPTOS_FIJOS, codigo);
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

  /**
   * Clave de fecha YYYY-MM-DD en hora LOCAL.
   * (toISOString usa UTC y puede correr la fecha un día según la zona horaria.)
   */
  _fechaKey(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  }

  /**
   * Determina el comportamiento de un concepto especial respecto al tope semanal:
   * 'suma_tope'   → I, V: suman sus horas al acumulado semanal (no en domingo ni festivo,
   *                 y solo si la semana tiene al menos un turno realmente trabajado)
   * 'cubre_deuda' → PR: no suma al acumulado de extras; solo cubre la deuda semanal
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
    if (codigoNorm === "pr" || (texto.includes("permiso") && texto.includes("remuner"))) return "cubre_deuda";
    if (
      ["i", "v"].includes(codigoNorm) ||
      texto.includes("incapac") ||
      texto.includes("vacacion")
    ) return "suma_tope";

    return "ninguno";
  }

  /**
   * Tipo de concepto reconocido para reportes: 'incapacidad', 'vacaciones', 'permiso' o null.
   */
  _obtenerCategoriaConcepto(codigo) {
    const tipoConfig = this.configuracion?.tiposTurnoEspeciales?.[codigo];
    if (!tipoConfig) return null;
    const codigoNorm = this._normalizarTexto(codigo);
    const texto = `${this._normalizarTexto(tipoConfig.nombre)} ${this._normalizarTexto(tipoConfig.descripcion)}`;
    if (codigoNorm === "i" || texto.includes("incapac")) return "incapacidad";
    if (codigoNorm === "v" || texto.includes("vacacion")) return "vacaciones";
    if (codigoNorm === "pr" || (texto.includes("permiso") && texto.includes("remuner"))) return "permiso";
    return null;
  }

  /**
   * Retorna { ajusteAcumulador, ajusteTope, horasCubreDeuda, horasReconocidas } para un concepto.
   * - ajusteAcumulador: variación al acumulador de horas para extras (>0 I/V, <0 A)
   * - ajusteTope:       variación al tope semanal (<0 para SC, 0 para el resto)
   * - horasCubreDeuda:  horas justificadas que descuentan la deuda semanal (I/PR/V)
   * - horasReconocidas: horas de I/V que efectivamente suman al acumulado semanal
   * @param {string}  codigo  Código del concepto
   * @param {boolean} esDomingo  true si el día es domingo (SC no reduce tope en domingo)
   * @param {object}  [contexto]  { esFestivo, semanaConTurnoReal } para I/V
   */
  _obtenerAjusteConceptoEspecial(codigo, esDomingo = false, contexto = {}) {
    const comportamiento = this._obtenerComportamientoConceptoEspecial(codigo);
    const tipoConfig = this.configuracion?.tiposTurnoEspeciales?.[codigo];
    const horas = tipoConfig ? (parseFloat(tipoConfig.horas) || 0) : 0;
    const esDiaNoHabil = esDomingo || Boolean(contexto.esFestivo);

    switch (comportamiento) {
      case "suma_tope": {
        // Domingo y festivo nunca aportan. Sin turno real en la semana tampoco.
        const cuenta = !esDiaNoHabil && contexto.semanaConTurnoReal !== false;
        const reconocidas = cuenta ? horas : 0;
        return {
          ajusteAcumulador: reconocidas,
          ajusteTope: 0,
          horasCubreDeuda: esDiaNoHabil ? 0 : horas,
          horasReconocidas: reconocidas,
        };
      }
      case "cubre_deuda":
        return { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: esDiaNoHabil ? 0 : horas, horasReconocidas: 0 };
      case "resta":
        return { ajusteAcumulador: -horas, ajusteTope: 0, horasCubreDeuda: 0, horasReconocidas: 0 };
      case "reduce_tope":
        return { ajusteAcumulador: 0, ajusteTope: esDomingo ? 0 : -horas, horasCubreDeuda: 0, horasReconocidas: 0 };
      default:
        return { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: 0, horasReconocidas: 0 };
    }
  }

  /**
   * Turno asignado a un día. Lo que está en pantalla manda; si el selector no existe
   * (por ejemplo al restaurar o en pruebas) se usa lo guardado.
   */
  _obtenerTurnoAsignadoParaDia(empleado, semanaNumero, indexDia, fechaDia) {
    const fechaKey = this._fechaKey(fechaDia);
    const turnoGuardado = empleado.turnosGuardados.get(fechaKey) || null;

    const selector = typeof document !== "undefined" && document.querySelector
      ? document.querySelector(
          `[data-empleado="${empleado.documento}"][data-semana="${semanaNumero}"][data-dia="${indexDia}"]`
        )
      : null;
    if (selector && selector.value) {
      const coincide = turnoGuardado && turnoGuardado.turno === selector.value;
      return { turno: selector.value, turnoGuardado: coincide ? turnoGuardado : null };
    }

    if (turnoGuardado && turnoGuardado.turno) {
      return { turno: turnoGuardado.turno, turnoGuardado };
    }
    return { turno: null, turnoGuardado: null };
  }

  guardarConfiguracion() {
    this._aplicarColoresFijos(this.configuracion);
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
            <div style="display: flex; gap: 5px; align-items: center;">
                ${SistemaTurnosMejorado.TURNOS_PROTEGIDOS.includes(turno.codigo)
                  ? '<span class="shift-protegido" title="Turno base del sistema: no se puede eliminar">🔒 Base</span>'
                  : `<button class="action-btn-small toggle-shift-btn" data-codigo="${turno.codigo}" title="${turno.activo ? 'Desactivar' : 'Activar'}" style="background:transparent; border:none; cursor:pointer; font-size: 1.2rem; opacity: ${turno.activo ? '1' : '0.5'};">
                    ${turno.activo ? '✅' : '❌'}
                </button>
                <button class="action-btn-small delete-shift-btn" data-codigo="${turno.codigo}" title="Eliminar turno" aria-label="Eliminar turno ${turno.nombre}">
                    🗑️
                </button>`}
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

    this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));
    this.guardarConfiguracion();
    this.actualizarTiposTurno();
    this.generarTarjetasTurnosDinamicos();
    this._refrescarProgramacion();
  }

  actualizarTurnoDinamico(element) {
    const oldCodigo = element.dataset.codigo;
    const turno = this.configuracion.turnosDinamicos[oldCodigo];
    if (!turno) return;
    // Conservar lo que está en pantalla antes de cambiar la configuración del turno
    this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));

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
            this._reemplazarReferenciasTurno(oldCodigo, newCodigo);
        }
    }

    this.guardarConfiguracion();
    this.actualizarTiposTurno();
    if (element.classList.contains('shift-code-input')) {
        this.generarTarjetasTurnosDinamicos();
    }
    this._refrescarProgramacion();
  }

  toggleTurnoDinamico(codigo) {
    if (SistemaTurnosMejorado.TURNOS_PROTEGIDOS.includes(codigo)) {
        alert("Los turnos base de sistema no pueden ser desactivados, solo modificados. (Si no los usas, puedes cambiar su color o nombre)");
        return;
    }
    const turno = this.configuracion.turnosDinamicos[codigo];
    if (turno) {
        this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));
        turno.activo = !turno.activo;
        this.guardarConfiguracion();
        this.actualizarTiposTurno();
        this.generarTarjetasTurnosDinamicos();
        this._refrescarProgramacion();
    }
  }

  eliminarTurnoDinamico(codigo, { confirmar = true } = {}) {
    if (SistemaTurnosMejorado.TURNOS_PROTEGIDOS.includes(codigo)) {
        alert("Los turnos base de sistema no pueden ser eliminados para preservar compatibilidad con registros antiguos. Puedes modificar su inicio/fin.");
        return false;
    }
    const turno = this.configuracion.turnosDinamicos[codigo];
    if (!turno) return false;

    // Conservar lo que está en pantalla antes de contar y limpiar referencias
    this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));
    const usos = this._contarUsosTurno(codigo);
    const detalleUsos = usos > 0
      ? `\n\nEstá asignado en ${usos} día(s) de la programación actual; esos días quedarán como "Libre".`
      : "";
    if (confirmar && !confirm(`¿Eliminar definitivamente el turno '${turno.nombre}' (${codigo})?${detalleUsos}`)) {
      return false;
    }

    delete this.configuracion.turnosDinamicos[codigo];
    this.guardarConfiguracion();
    this.actualizarTiposTurno();
    this.generarTarjetasTurnosDinamicos();
    this._reemplazarReferenciasTurno(codigo, null);
    this._refrescarProgramacion();
    return true;
  }

  _contarUsosTurno(codigo) {
    let usos = 0;
    this.empleados.forEach((emp) => {
      emp.turnosGuardados.forEach((data) => { if (data.turno === codigo) usos++; });
    });
    return usos;
  }

  /**
   * Renombra (nuevoCodigo) o elimina (nuevoCodigo = null) un código de turno en toda la programación.
   */
  _reemplazarReferenciasTurno(codigo, nuevoCodigo) {
    this.empleados.forEach((emp) => {
      emp.turnosGuardados.forEach((data, fechaKey) => {
        if (data.turno !== codigo) return;
        if (nuevoCodigo) data.turno = nuevoCodigo;
        else emp.turnosGuardados.delete(fechaKey);
      });
      emp.resultados = null;
    });
  }

  /**
   * Redibuja la programación (selectores incluidos) con los turnos vigentes y la persiste.
   */
  _refrescarProgramacion() {
    if (this.empleados.size === 0) return;
    const contenedor = typeof document !== "undefined" ? document.getElementById("contenedor-semanas") : null;
    if (contenedor && contenedor.children.length) this.mostrarFormularioTurnos();
    this.guardarEstadoProgramacion();
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

      const colorFijo = this._esConceptoConColorFijo(codigo);
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
            <p class="config-input-help">${this._describirReglaConcepto(codigo)}</p>
            <input type="number" id="config-horas-${codigo}" class="config-input-especial" value="${tipo.horas}" data-codigo="${codigo}" data-prop="horas" step="0.01" min="0">
          </div>
          <div class="config-input-group">
            <label for="config-color-${codigo}" class="config-label">Color</label>
            <p class="config-input-help">${colorFijo ? "Color identificativo fijo del sistema." : "Color usado para identificarlo visualmente."}</p>
            <div class="config-color-preview-row">
              <span class="config-color-swatch" style="background: ${tipo.color || '#9e9e9e'}" aria-hidden="true"></span>
              <span class="config-color-value">${tipo.color || '#9e9e9e'}</span>
            </div>
            <input type="color" id="config-color-${codigo}" class="config-input-especial config-input-color" value="${tipo.color || '#9e9e9e'}" data-codigo="${codigo}" data-prop="color"${colorFijo ? ' disabled title="Color fijo del sistema"' : ''}>
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
              <span class="config-meta-value" title="${metadata.color}">
                <span class="config-color-dot" aria-hidden="true"></span>
                ${metadata.color}
              </span>
            </span>
            <span class="config-meta-item">
              <span class="config-meta-label">Código interno</span>
              <span class="config-meta-value" title="${metadata.codigoExportacion}">${metadata.codigoExportacion}</span>
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
          if (this._esConceptoConColorFijo(codigo)) {
            alert(`El concepto "${codigo}" es un concepto base del sistema y no se puede eliminar.`);
            return;
          }
          if (
            confirm(
              `¿Estás seguro de que quieres eliminar el concepto "${codigo}"?`
            )
          ) {
            delete this.configuracion.tiposTurnoEspeciales[codigo];
            this.guardarConfiguracion();
            this.actualizarTiposTurno();
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
      color: "#7E57C2",
    };

    this.guardarConfiguracion();
    this.actualizarTiposTurno();
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
        tiposTurnoEspeciales: this._conceptosPorDefecto(),
        versionConceptos: 3,
        // Se conservan los turnos dinámicos: restaurar solo afecta recargos y conceptos
        turnosDinamicos: this.configuracion.turnosDinamicos,
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
      this.actualizarTiposTurno();
      this.generarTarjetasRecargos();
      this.generarTarjetasExtras();
      this.generarTarjetasTiposTurnoEspeciales();

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

    // Documento: solo números (sin letras, espacios ni caracteres especiales; conserva ceros iniciales)
    const inputDocumento = document.getElementById('modal-documento');
    if (inputDocumento) {
      inputDocumento.addEventListener('input', (e) => {
        const limpio = this.normalizarDocumento(e.target.value);
        if (limpio !== e.target.value) {
          e.target.value = limpio;
          this._mostrarErrorDocumento('El documento solo admite números.');
        } else {
          this._mostrarErrorDocumento('');
        }
      });
      inputDocumento.addEventListener('keydown', (e) => {
        if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this._mostrarErrorDocumento('El documento solo admite números.');
        }
      });
    }

    // Marcar cambios sin guardar en la programación
    const contenedorSemanas = document.getElementById('contenedor-semanas');
    if (contenedorSemanas) {
      const marcar = (e) => {
        const selector = e.target.closest('.selector-turno') ||
          e.target.closest('.dia-turno')?.querySelector('.selector-turno');
        if (selector) this._marcarCambiosSinGuardar(selector.dataset.empleado);
      };
      contenedorSemanas.addEventListener('change', marcar);
    }

    // Protección contra pérdida accidental de información
    window.addEventListener('beforeunload', (e) => {
      const hayPendientes = Array.from(this.empleados.values()).some((emp) => emp.cambiosSinGuardar);
      if (hayPendientes) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    this._mostrarAvisoProgramacionGuardada();

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

  /**
   * Acceso al módulo de configuración con contraseña.
   * Una vez autorizada, la sesión del navegador no vuelve a pedirla.
   * Nota: es una validación solo de frontend; no es seguridad real.
   */
  solicitarContraseñaParaConfig() {
    if (this._configAutorizada()) {
      this.navegarA("seccion-sistema-configuracion");
      return;
    }

    const modal = document.getElementById("modal-clave-config");
    const input = document.getElementById("input-clave-config");
    const error = document.getElementById("error-clave-config");
    if (!modal || !input) return;

    input.value = "";
    error.textContent = "";
    modal.style.display = "flex";
    setTimeout(() => input.focus(), 50);

    const cerrar = () => {
      modal.style.display = "none";
      btnEntrar.removeEventListener("click", validar);
      btnCancelar.removeEventListener("click", cerrar);
      input.removeEventListener("keydown", onKey);
    };
    const validar = () => {
      if (this.validarClaveConfiguracion(input.value)) {
        try { sessionStorage.setItem("configAutorizada", "1"); } catch (e) {}
        this._configAutorizadaMemoria = true;
        cerrar();
        this.navegarA("seccion-sistema-configuracion");
      } else {
        error.textContent = input.value ? "Contraseña incorrecta. Inténtelo de nuevo." : "Ingrese la contraseña.";
        input.select();
      }
    };
    const onKey = (e) => {
      if (e.key === "Enter") validar();
      if (e.key === "Escape") cerrar();
    };
    const btnEntrar = document.getElementById("btn-entrar-clave-config");
    const btnCancelar = document.getElementById("btn-cancelar-clave-config");
    btnEntrar.addEventListener("click", validar);
    btnCancelar.addEventListener("click", cerrar);
    input.addEventListener("keydown", onKey);
  }

  validarClaveConfiguracion(valor) {
    return valor === SistemaTurnosMejorado.CLAVE_CONFIGURACION;
  }

  _configAutorizada() {
    if (this._configAutorizadaMemoria) return true;
    try { return sessionStorage.getItem("configAutorizada") === "1"; } catch (e) { return false; }
  }

  /**
   * Deja solo dígitos en un documento (sin espacios, letras ni símbolos). Conserva ceros iniciales.
   */
  normalizarDocumento(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  esDocumentoValido(valor) {
    return /^\d+$/.test(String(valor || ""));
  }

  _mostrarErrorDocumento(mensaje) {
    const el = document.getElementById("error-documento");
    if (el) el.textContent = mensaje;
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

    document.getElementById("fecha-inicio").value = this._fechaKey(inicioMes);
    document.getElementById("fecha-fin").value = this._fechaKey(finMes);

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

    // Si ya hay una programación, no se pierde sin confirmación
    let conservarProgramacion = false;
    if (this.empleados.size > 0) {
      conservarProgramacion = !confirm(
        `Ya existe una programación con ${this.empleados.size} empleado(s).\n\n` +
        `Aceptar: descartarla e iniciar un período nuevo.\n` +
        `Cancelar: volver a la programación actual (se aplican los cambios de alimentación y turnos).`
      );
    }

    // Obtiene la configuración de almuerzo ACTUAL del formulario (no la de un cálculo anterior)
    this.configuracionAlmuerzo = null;
    const configuracionAlmuerzo = this.obtenerConfiguracionAlmuerzo();
    this.configuracionAlmuerzo = configuracionAlmuerzo;
    this.actualizarTiposTurno();

    if (conservarProgramacion) {
      this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));
      this.mostrarFormularioTurnos();
      this.guardarEstadoProgramacion();
      this.navegarA("seccion-turnos");
      return;
    }

    // Obtener el número de empleados definido
    const numeroEmpleadosDefinido = parseInt(document.getElementById("numero-empleados").value) || 1;
    this.numeroEmpleadosDefinido = numeroEmpleadosDefinido;
    this.empleadosAgregados = 0;

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

    // Limpiar empleados anteriores (y la programación guardada)
    this.empleados.clear();
    this.filtroResultados = null;
    this.borrarEstadoProgramacion();
    this._ocultarAvisoProgramacionGuardada();

    // Siempre abrir el modal para ingresar empleados
    this.abrirModalEmpleado();

    this.mostrarFormularioTurnos();
    this.navegarA("seccion-turnos");
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
    const documentoBruto = document.getElementById('modal-documento').value;
    const documento = this.normalizarDocumento(documentoBruto);
    const nombre = document.getElementById('modal-nombre').value.trim();
    const salarioStr = document.getElementById('modal-salario').value.replace(/\D/g, '');
    const salario = parseFloat(salarioStr) || 0;
    const fechaInicio = document.getElementById('modal-fecha-inicio').value;
    const fechaFin = document.getElementById('modal-fecha-fin').value;

    if (!this.esDocumentoValido(documentoBruto.trim())) {
        this._mostrarErrorDocumento(documentoBruto.trim()
          ? 'El documento solo puede contener números.'
          : 'El documento es obligatorio.');
        document.getElementById('modal-documento').focus();
        return;
    }

    if (!documento || !nombre || !salario || !fechaInicio || !fechaFin) {
        alert('Todos los campos son obligatorios.');
        return;
    }

    if (fechaInicio > fechaFin) {
        alert('La fecha de inicio del empleado debe ser anterior o igual a la fecha de fin.');
        return;
    }

    // Conservar lo que ya está programado en pantalla antes de redibujar
    this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));

    if (this.agregarEmpleado(documento, nombre, salario, fechaInicio, fechaFin)) {
        this.empleadosAgregados++;
        this._mostrarErrorDocumento('');
        this.mostrarFormularioTurnos(); // Redibuja toda la sección
        this.guardarEstadoProgramacion();
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

    if (fechaInicio > fechaFin) {
        alert('La fecha de inicio del empleado debe ser anterior o igual a la fecha de fin.');
        return;
    }

    // CRÍTICO: conservar todo lo programado (incluido lo que está en pantalla sin pre-guardar)
    // antes de regenerar las semanas
    this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));
    const turnosGuardadosBackup = new Map(empleado.turnosGuardados);

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
    this.guardarEstadoProgramacion();
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
        const grupo = this.configuracion.tiposTurnoEspeciales?.[codigo] ? 'concepto' : 'turno';
        return `<option value="${codigo}" data-color="${color}" data-grupo="${grupo}"${selectedAttr}>${texto}</option>`;
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

        // Acciones individuales: pre-guardar y ver resultados solo de este empleado
        const acciones = document.createElement("div");
        acciones.className = "empleado-acciones";
        acciones.innerHTML = `
            <span class="estado-guardado" id="estado-guardado-${empleado.documento}"></span>
            <div class="empleado-acciones-botones">
                <button type="button" class="btn-pre-guardar-individual">💾 Pre-guardar</button>
                <button type="button" class="btn-ver-resultados-individual">📊 Ver resultados de ${this._escaparHTML(empleado.nombre)}</button>
            </div>
        `;
        acciones.querySelector(".btn-pre-guardar-individual")
          .addEventListener("click", () => this.preGuardarTurnosEmpleado(empleado.documento));
        acciones.querySelector(".btn-ver-resultados-individual")
          .addEventListener("click", () => this.verResultadosEmpleado(empleado.documento));
        bodyEmpleado.appendChild(acciones);

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

    // Restaurar en pantalla lo guardado (todos los días de la semana, también los fuera de rango)
    this.empleados.forEach(empleado => {
      empleado.semanas.forEach((semana) => {
        semana.dias.forEach((dia, index) => {
          const fechaKey = this._fechaKey(dia.fecha);
          const turnoGuardado = empleado.turnosGuardados.get(fechaKey);
          const selector = document.querySelector(
            `[data-empleado="${empleado.documento}"][data-semana="${semana.numero}"][data-dia="${index}"]`
          );
          // Un turno que ya no existe (p. ej. eliminado) no se restaura
          if (selector && turnoGuardado && this.tiposTurno[turnoGuardado.turno]) {
            if (turnoGuardado.turno === 'M') {
              const manualInputs = document.querySelector(
                `#manual-time-${empleado.documento}-${semana.numero}-${index}`
              );
              if (manualInputs) {
                manualInputs.querySelector('.manual-inicio').value = turnoGuardado.inicioManual || '07:00';
                manualInputs.querySelector('.manual-fin').value = turnoGuardado.finManual || '19:00';
              }
            }
            selector.value = turnoGuardado.turno;
            // Notificar cambio para que tanto estilos como el selector visual se actualicen
            selector.dispatchEvent(new CustomEvent('change', { detail: { restauracion: true } }));
            this.gestionarVisibilidadManual(selector);
          }
        });
      });
      this._actualizarEstadoGuardado(empleado);
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

      if (preGuardado && !empleado.cambiosSinGuardar) {
        itemEmpleado.classList.add("empleado-pre-guardado");
      } else {
        itemEmpleado.classList.add(tieneTurnos ? "empleado-con-turnos" : "empleado-sin-turnos");
      }

      const estado = empleado.cambiosSinGuardar
        ? "✏️ Cambios sin guardar"
        : (preGuardado ? "💾 Pre-guardado" : (tieneTurnos ? "✅ Turnos Asignados" : "⏳ Sin Turnos"));

      itemEmpleado.innerHTML = `
        <span class="empleado-nombre">${this._escaparHTML(empleado.nombre)}</span>
        <span class="empleado-documento">(${empleado.documento})</span>
        <div class="empleado-fechas">
            <span class="fecha">Inicio: ${empleado.fechaInicio}</span>
            <span class="fecha">Fin: ${empleado.fechaFin}</span>
        </div>
        <span class="estado-turnos">${estado}</span>
        <button class="btn-ver-resultados-lista" data-documento="${empleado.documento}" title="Ver resultados de este empleado">📊</button>
        <button class="btn-editar-empleado" data-documento="${empleado.documento}" title="Editar empleado">✏️</button>
        <button class="btn-eliminar-empleado" data-documento="${empleado.documento}" title="Eliminar empleado">🗑️</button>
      `;

      contenedorLista.appendChild(itemEmpleado);

      itemEmpleado.querySelector('.btn-editar-empleado').addEventListener('click', (e) => {
        const documento = e.currentTarget.dataset.documento;
        this.abrirModalEditarEmpleado(documento);
      });
      itemEmpleado.querySelector('.btn-ver-resultados-lista').addEventListener('click', (e) => {
        this.verResultadosEmpleado(e.currentTarget.dataset.documento);
      });
      itemEmpleado.querySelector('.btn-eliminar-empleado').addEventListener('click', (e) => {
        this.eliminarEmpleado(e.currentTarget.dataset.documento);
      });
    });
  }

  /**
   * Pre-guarda los turnos actuales para un empleado específico
   */
  preGuardarTurnosEmpleado(documentoEmpleado, { silencioso = false } = {}) {
    const empleado = this.empleados.get(documentoEmpleado);
    if (!empleado) return false;

    this._sincronizarTurnosDesdeDOM(empleado);
    empleado.preGuardado = true;
    empleado.cambiosSinGuardar = false;
    empleado.guardadoEn = new Date().toISOString();

    const ok = this.guardarEstadoProgramacion();
    this.mostrarListaEmpleados(); // Actualizar la lista después de pre-guardar
    this._actualizarEstadoGuardado(empleado);
    if (!silencioso) {
      this.mostrarNotificacion(
        ok
          ? `Turnos pre-guardados para ${empleado.nombre}`
          : `No se pudo guardar en el navegador. Los turnos de ${empleado.nombre} solo quedan en esta sesión.`,
        ok ? "success" : "info"
      );
    }
    return ok;
  }

  /**
   * Copia a `turnosGuardados` lo que está en pantalla para TODOS los días de las semanas
   * del empleado (incluidos los días fuera de rango, que cuentan para el tope semanal).
   */
  _sincronizarTurnosDesdeDOM(empleado) {
    if (typeof document === "undefined" || !document.querySelector) return;
    empleado.semanas.forEach((semana) => {
      semana.dias.forEach((dia, index) => {
        const selector = document.querySelector(
          `[data-empleado="${empleado.documento}"][data-semana="${semana.numero}"][data-dia="${index}"]`
        );
        if (!selector || !selector.value) return;
        const turnoData = { turno: selector.value };
        if (selector.value === "M") {
          const horario = this._obtenerHorarioManual(empleado, semana.numero, index, null);
          if (horario) {
            turnoData.inicioManual = horario.inicio;
            turnoData.finManual = horario.fin;
          }
        }
        empleado.turnosGuardados.set(this._fechaKey(dia.fecha), turnoData);
      });
    });
  }

  _marcarCambiosSinGuardar(documento) {
    const empleado = this.empleados.get(documento);
    if (!empleado) return;
    const yaMarcado = empleado.cambiosSinGuardar;
    empleado.cambiosSinGuardar = true;
    this._actualizarEstadoGuardado(empleado);
    if (!yaMarcado) this.mostrarListaEmpleados();
  }

  _actualizarEstadoGuardado(empleado) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(`estado-guardado-${empleado.documento}`);
    if (!el) return;
    if (empleado.cambiosSinGuardar) {
      el.className = "estado-guardado estado-pendiente";
      el.textContent = "● Cambios sin guardar";
    } else if (empleado.preGuardado) {
      const hora = empleado.guardadoEn
        ? new Date(empleado.guardadoEn).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
        : "";
      el.className = "estado-guardado estado-ok";
      el.textContent = `✔ Guardado${hora ? ` (${hora})` : ""}`;
    } else {
      el.className = "estado-guardado";
      el.textContent = "Sin guardar";
    }
  }

  /**
   * Elimina un empleado de la programación (y de lo guardado en el navegador).
   */
  eliminarEmpleado(documento, { confirmar = true } = {}) {
    const empleado = this.empleados.get(documento);
    if (!empleado) return false;
    if (confirmar && !confirm(`¿Eliminar a ${empleado.nombre} (${documento}) y toda su programación?`)) return false;
    this.empleados.forEach((emp) => this._sincronizarTurnosDesdeDOM(emp));
    this.empleados.delete(documento);
    if (this.filtroResultados) this.filtroResultados = this.filtroResultados.filter((d) => d !== documento);
    this.empleadosAgregados = this.empleados.size;
    this.mostrarFormularioTurnos();
    this.guardarEstadoProgramacion();
    this.mostrarNotificacion(`Empleado ${empleado.nombre} eliminado.`, "success");
    return true;
  }

  /**
   * Pre-guarda y muestra los resultados exclusivamente de un empleado.
   */
  verResultadosEmpleado(documento) {
    if (!this.empleados.has(documento)) return;
    this.preGuardarTurnosEmpleado(documento, { silencioso: true });
    this.calcularTurnos([documento]);
  }

  _escaparHTML(texto) {
    return String(texto ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ─── Persistencia de la programación (localStorage) ────────────────────────

  static get CLAVE_PROGRAMACION() {
    return "programacionTurnos_v1";
  }

  /**
   * Serializa período, alimentación y empleados con sus turnos (datos reales, no la vista).
   */
  serializarProgramacion() {
    const leer = (id) => (typeof document !== "undefined" && document.getElementById(id)) ? document.getElementById(id).value : "";
    return {
      version: 1,
      guardadoEn: new Date().toISOString(),
      periodo: {
        fechaInicio: leer("fecha-inicio"),
        fechaFin: leer("fecha-fin"),
        numeroEmpleados: this.numeroEmpleadosDefinido,
        salario: leer("salario-mensual"),
      },
      almuerzo: this.configuracionAlmuerzo || null,
      empleados: Array.from(this.empleados.values()).map((emp) => ({
        documento: emp.documento,
        nombre: emp.nombre,
        salario: emp.salario,
        fechaInicio: emp.fechaInicio,
        fechaFin: emp.fechaFin,
        preGuardado: Boolean(emp.preGuardado),
        guardadoEn: emp.guardadoEn || null,
        turnos: Object.fromEntries(emp.turnosGuardados),
      })),
    };
  }

  guardarEstadoProgramacion() {
    try {
      if (this.empleados.size === 0) {
        localStorage.removeItem(SistemaTurnosMejorado.CLAVE_PROGRAMACION);
        return true;
      }
      localStorage.setItem(
        SistemaTurnosMejorado.CLAVE_PROGRAMACION,
        JSON.stringify(this.serializarProgramacion())
      );
      return true;
    } catch (e) {
      console.error("No se pudo guardar la programación:", e);
      return false;
    }
  }

  leerEstadoProgramacion() {
    try {
      const crudo = localStorage.getItem(SistemaTurnosMejorado.CLAVE_PROGRAMACION);
      if (!crudo) return null;
      const datos = JSON.parse(crudo);
      return datos && Array.isArray(datos.empleados) && datos.empleados.length ? datos : null;
    } catch (e) {
      return null;
    }
  }

  borrarEstadoProgramacion() {
    try { localStorage.removeItem(SistemaTurnosMejorado.CLAVE_PROGRAMACION); } catch (e) {}
  }

  /**
   * Reconstruye empleados y turnos desde un estado serializado (sin tocar la pantalla).
   */
  restaurarProgramacionDesdeDatos(datos) {
    this.empleados.clear();
    this.filtroResultados = null;
    this.numeroEmpleadosDefinido = datos.periodo?.numeroEmpleados || datos.empleados.length;
    if (datos.almuerzo) this.configuracionAlmuerzo = datos.almuerzo;
    datos.empleados.forEach((e) => {
      const documento = this.normalizarDocumento(e.documento);
      if (!documento) return;
      const inicio = new Date(`${e.fechaInicio}T00:00:00`);
      const fin = new Date(`${e.fechaFin}T00:00:00`);
      this.empleados.set(documento, {
        documento,
        nombre: e.nombre,
        salario: Number(e.salario) || 0,
        fechaInicio: e.fechaInicio,
        fechaFin: e.fechaFin,
        semanas: this.generarSemanas(inicio, fin),
        resultados: null,
        preGuardado: Boolean(e.preGuardado),
        guardadoEn: e.guardadoEn || null,
        cambiosSinGuardar: false,
        turnosGuardados: new Map(Object.entries(e.turnos || {})),
      });
    });
    this.empleadosAgregados = this.empleados.size;
    return this.empleados.size;
  }

  /**
   * Restaura en pantalla la programación guardada y abre la sección de turnos.
   */
  continuarProgramacionGuardada() {
    const datos = this.leerEstadoProgramacion();
    if (!datos) {
      this._ocultarAvisoProgramacionGuardada();
      return;
    }
    const p = datos.periodo || {};
    if (p.fechaInicio) document.getElementById("fecha-inicio").value = p.fechaInicio;
    if (p.fechaFin) document.getElementById("fecha-fin").value = p.fechaFin;
    if (p.numeroEmpleados) document.getElementById("numero-empleados").value = p.numeroEmpleados;
    if (p.salario) document.getElementById("salario-mensual").value = p.salario;
    this.mostrarDiaSemana(document.getElementById("fecha-inicio").value, "dia-semana-inicio");
    this.mostrarDiaSemana(document.getElementById("fecha-fin").value, "dia-semana-fin");
    this._aplicarAlmuerzoEnFormulario(datos.almuerzo);

    this.restaurarProgramacionDesdeDatos(datos);
    this.actualizarTiposTurno();
    this._ocultarAvisoProgramacionGuardada();
    this.mostrarFormularioTurnos();
    this.navegarA("seccion-turnos");
    this.mostrarNotificacion(`Programación recuperada: ${this.empleados.size} empleado(s).`, "success");
  }

  _aplicarAlmuerzoEnFormulario(almuerzo) {
    if (!almuerzo || typeof document === "undefined") return;
    const radio = document.querySelector(`input[name="tipo-almuerzo"][value="${almuerzo.tipo}"]`);
    if (radio) radio.checked = true;
    if (almuerzo.tipo === "predefinido") {
      const tiempo = document.querySelector(`input[name="tiempo-almuerzo"][value="${almuerzo.tiempoEnHoras}"]`);
      if (tiempo) tiempo.checked = true;
    }
    if (almuerzo.tipo === "personalizado") {
      if (almuerzo.inicio) document.getElementById("inicio-almuerzo").value = almuerzo.inicio;
      if (almuerzo.fin) document.getElementById("fin-almuerzo").value = almuerzo.fin;
    }
    this.manejarTipoAlmuerzo(almuerzo.tipo);
  }

  _mostrarAvisoProgramacionGuardada() {
    const aviso = document.getElementById("aviso-programacion-guardada");
    const datos = this.leerEstadoProgramacion();
    if (!aviso || !datos) return;
    const p = datos.periodo || {};
    const fecha = datos.guardadoEn
      ? new Date(datos.guardadoEn).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
      : "";
    const formato = (f) => f ? new Date(`${f}T00:00:00`).toLocaleDateString("es-CO") : "—";
    aviso.querySelector(".aviso-detalle").textContent =
      `${datos.empleados.length} empleado(s) · Período ${formato(p.fechaInicio)} – ${formato(p.fechaFin)}` +
      (fecha ? ` · Guardada el ${fecha}` : "");
    aviso.style.display = "flex";
    aviso.querySelector(".btn-continuar-programacion").onclick = () => this.continuarProgramacionGuardada();
    aviso.querySelector(".btn-descartar-programacion").onclick = () => {
      if (confirm("¿Descartar la programación guardada? Esta acción no se puede deshacer.")) {
        this.borrarEstadoProgramacion();
        this._ocultarAvisoProgramacionGuardada();
      }
    };
  }

  _ocultarAvisoProgramacionGuardada() {
    const aviso = typeof document !== "undefined" ? document.getElementById("aviso-programacion-guardada") : null;
    if (aviso) aviso.style.display = "none";
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
      // Los conceptos especiales NO son horas trabajadas: no generan ordinarias,
      // extras ni recargos. I/PR/V solo informan las horas que cubren la deuda semanal.
      const ajusteEspecial = this._obtenerAjusteConceptoEspecial(tipoTurno, fecha.getDay() === 0);
      resultado.horasEquivalentesTope = ajusteEspecial.horasCubreDeuda || 0;
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

    const inicioNocturnoMin = timeToMinutes(inicioNocturnoStr);
    const finNocturnoMin = timeToMinutes(finNocturnoStr);

    // Agrupar los minutos trabajados en tramos CRONOLÓGICOS de igual naturaleza
    // (día del calendario + diurno/nocturno). Así, al cruzar el tope semanal, solo
    // el tiempo posterior a ese instante exacto se clasifica como extra.
    const tramos = [];
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
      const esDiaSiguiente = minuto >= 24 * 60;
      const ultimo = tramos[tramos.length - 1];
      if (ultimo && ultimo.esNocturno === esNocturno && ultimo.esDiaSiguiente === esDiaSiguiente) {
        ultimo.minutos++;
      } else {
        tramos.push({ esNocturno, esDiaSiguiente, minutos: 1 });
      }
    }

    let horasAcumuladasLocal = horasAcumuladas;
    tramos.forEach((tramo) => {
      const horas = tramo.minutos / 60;
      this._distribuirHoras(
        horas,
        tramo.esNocturno,
        tramo.esDiaSiguiente ? esFestivoSiguiente : esFestivoInicio,
        resultado,
        horasAcumuladasLocal,
        horasMaximas
      );
      horasAcumuladasLocal += horas;
    });
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
   * Calcula los turnos del período y muestra los resultados.
   * La semana siempre se evalúa COMPLETA (domingo a sábado), aunque el período
   * seleccionado no cubra todos sus días.
   * @param {string[]|null} documentos  Empleados a calcular; null = todos.
   */
  calcularTurnos(documentos = null) {
    if (this.empleados.size === 0) {
      alert("Primero debe generar el período de trabajo");
      return;
    }

    const seleccion = Array.isArray(documentos) && documentos.length
      ? documentos.filter((doc) => this.empleados.has(doc))
      : null;
    this.filtroResultados = seleccion;

    this._empleadosEnResultados().forEach((empleado) => {
      // Lo que está en pantalla queda guardado: el cálculo y la persistencia usan los mismos datos
      this._sincronizarTurnosDesdeDOM(empleado);
      empleado.resultados = this._calcularResultadosEmpleado(empleado);
    });
    this.guardarEstadoProgramacion();

    this.mostrarResultados();
    this.navegarA("seccion-resultados");
  }

  /**
   * Empleados visibles en resultados/exportación: todos, o solo los del filtro individual.
   */
  _empleadosEnResultados() {
    const todos = Array.from(this.empleados.values());
    if (!this.filtroResultados || !this.filtroResultados.length) return todos;
    return todos.filter((emp) => this.filtroResultados.includes(emp.documento));
  }

  _redondearHoras(valor) {
    return Math.round((Number(valor) || 0) * 1e6) / 1e6;
  }

  /**
   * Horario real (inicio/fin) de un turno manual: pantalla primero, luego lo guardado.
   */
  _obtenerHorarioManual(empleado, semanaNumero, index, turnoGuardado) {
    const contenedor = typeof document !== "undefined" && document.querySelector
      ? document.querySelector(`#manual-time-${empleado.documento}-${semanaNumero}-${index}`)
      : null;
    if (contenedor) {
      const inicio = contenedor.querySelector(".manual-inicio")?.value;
      const fin = contenedor.querySelector(".manual-fin")?.value;
      if (inicio && fin) return { inicio, fin };
    }
    if (turnoGuardado && turnoGuardado.inicioManual && turnoGuardado.finManual) {
      return { inicio: turnoGuardado.inicioManual, fin: turnoGuardado.finManual };
    }
    return null;
  }

  /**
   * Motor de cálculo de un empleado. Devuelve un arreglo de resultados por semana.
   *
   * Reglas del acumulado semanal (se reinicia cada domingo):
   * - Turnos trabajados (dinámicos y manual) suman sus horas reales.
   * - I y V suman sus horas configuradas, excepto domingo y festivo, y solo si en esa
   *   semana hay al menos un turno realmente trabajado. No son horas trabajadas:
   *   nunca generan horas ordinarias ni extras por sí mismas.
   * - A resta sus horas del acumulado; SC reduce el tope (lunes a sábado).
   * - PR no suma para extras; solo cubre la deuda.
   * - Las horas de cada turno se clasifican cronológicamente contra el acumulado.
   */
  _calcularResultadosEmpleado(empleado) {
    const resultadosSemanas = [];
    const turnosConsideradosTrabajados = Object.keys(this.configuracion.turnosDinamicos || {}).concat(["M"]);

    empleado.semanas.forEach((semana) => {
      // --- PASO 1: ANÁLISIS PREVIO DE LA SEMANA COMPLETA ---
      // Turnos de TODA la semana, incluyendo días fuera de rango (opacos)
      const asignaciones = semana.dias.map((dia, index) =>
        this._obtenerTurnoAsignadoParaDia(empleado, semana.numero, index, dia.fecha)
      );
      const turnosDeLaSemanaCompleta = asignaciones.map((a) => a.turno);

      const semanaConTurnoReal = turnosDeLaSemanaCompleta.some(
        (t) => t && turnosConsideradosTrabajados.includes(t)
      );
      let diasLibresCount = turnosDeLaSemanaCompleta.filter((t) => t === "C").length;

      // --- PASO 2: TOPE DE HORAS SEMANALES ---
      // El tope base es 42 h. SC (Sin Contrato) lo reduce por cada día lunes–sábado.
      const horasMaximasSemanales = this.horasMaximasSemanalesNormal;
      let ajusteTope = 0;
      semana.dias.forEach((dia, index) => {
        if (index === 0) return; // domingo: SC no reduce tope
        const turno = turnosDeLaSemanaCompleta[index];
        if (!turno) return;
        ajusteTope += this._obtenerAjusteConceptoEspecial(turno, false).ajusteTope || 0;
      });
      const horasMaximasAjustadas = Math.max(0, horasMaximasSemanales + ajusteTope);

      // --- PASO 3: ACUMULAR EN ORDEN CRONOLÓGICO ---
      const turnosSemana = [];
      let horasTrabajadasSemana = 0;
      let horasCubreDeudaSemana = 0; // I, PR, V: horas justificadas para la deuda
      let horasEquivalentesNegativasSemana = 0; // A: restan del acumulador
      let horasReconocidasTopeSemana = 0; // I, V: horas que sí suman al acumulado
      const detalleHorasEquivalentesSemana = {};
      let horasAcumuladasParaExtras = 0;

      semana.dias.forEach((dia, index) => {
        const { turno, turnoGuardado } = asignaciones[index];
        const esFestivoDia = this.esFestivo(dia.fecha);
        // Acumulado ANTES de este día
        const acumuladoAntesDelDia = horasAcumuladasParaExtras;

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
          horasIncapacidad: 0,
          horasVacaciones: 0,
          horasDeuda: 0,
          inicio: null,
          fin: null,
        };

        const ajusteConcepto = turno
          ? this._obtenerAjusteConceptoEspecial(turno, index === 0, { esFestivo: esFestivoDia, semanaConTurnoReal })
          : { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: 0, horasReconocidas: 0 };

        if (turno && turnosConsideradosTrabajados.includes(turno)) {
          // Domingo trabajado sin ningún día libre en la semana: sus horas son extras
          const esDomingoTrabajado = index === 0;
          const forzarExtrasDomingo = esDomingoTrabajado && diasLibresCount === 0;
          if (esDomingoTrabajado && diasLibresCount > 0) diasLibresCount--;

          const acumuladorDelDia = forzarExtrasDomingo ? horasMaximasAjustadas : acumuladoAntesDelDia;

          if (turno === "M") {
            const horario = this._obtenerHorarioManual(empleado, semana.numero, index, turnoGuardado);
            if (horario) {
              const horasCalculadas = this.calcularHorasTurnoConAlmuerzo(
                horario.inicio,
                horario.fin,
                this.configuracionAlmuerzo
              );
              resultadoDelTurno.totalHoras = horasCalculadas;
              resultadoDelTurno.horasEfectivasParaExtras = horasCalculadas;
              this._procesarTurnoDetallado(
                resultadoDelTurno,
                dia.fecha,
                horasCalculadas,
                horario.inicio,
                horario.fin,
                acumuladorDelDia,
                horasMaximasAjustadas,
                true
              );
              resultadoDelTurno.inicio = horario.inicio;
              resultadoDelTurno.fin = horario.fin;
            }
          } else {
            resultadoDelTurno = {
              ...resultadoDelTurno,
              ...this.calcularHorasTurno(turno, dia.fecha, acumuladorDelDia, horasMaximasAjustadas),
              inicio: this.tiposTurno[turno]?.inicio || null,
              fin: this.tiposTurno[turno]?.fin || null,
            };
          }

          horasAcumuladasParaExtras += resultadoDelTurno.totalHoras;
          horasTrabajadasSemana += resultadoDelTurno.totalHoras;
        } else if (turno) {
          // Día no trabajado: libre o concepto de nómina. Nunca genera horas trabajadas.
          resultadoDelTurno.inicio = this.tiposTurno[turno]?.inicio || null;
          resultadoDelTurno.fin = this.tiposTurno[turno]?.fin || null;
        }

        // Conceptos de nómina sobre el acumulado y la deuda
        const horasCubreDeuda = ajusteConcepto.horasCubreDeuda || 0;
        const horasReconocidas = ajusteConcepto.horasReconocidas || 0;
        resultadoDelTurno.horasEquivalentesTope = horasCubreDeuda;
        if (horasCubreDeuda > 0) {
          horasCubreDeudaSemana += horasCubreDeuda;
          detalleHorasEquivalentesSemana[turno] =
            (detalleHorasEquivalentesSemana[turno] || 0) + horasCubreDeuda;
        }
        if (horasReconocidas > 0) {
          // I/V: suman al acumulado en el orden en que ocurren
          horasAcumuladasParaExtras += horasReconocidas;
          horasReconocidasTopeSemana += horasReconocidas;
          const categoria = this._obtenerCategoriaConcepto(turno);
          if (categoria === "incapacidad") resultadoDelTurno.horasIncapacidad = horasReconocidas;
          if (categoria === "vacaciones") resultadoDelTurno.horasVacaciones = horasReconocidas;
        }
        if (ajusteConcepto.ajusteAcumulador < 0) {
          // A (Ausencia): resta del acumulado
          horasEquivalentesNegativasSemana += Math.abs(ajusteConcepto.ajusteAcumulador);
          horasAcumuladasParaExtras = Math.max(0, horasAcumuladasParaExtras + ajusteConcepto.ajusteAcumulador);
        }

        [
          "horasOrdinarias", "horasNocturnas", "horasFestivas", "horasNocturnasFestivas",
          "extrasOrdinarias", "extrasNocturnas", "extrasFestivas", "extrasNocturnasFestivas",
          "totalHoras", "horasEfectivasParaExtras", "horasEquivalentesTope",
          "horasIncapacidad", "horasVacaciones",
        ].forEach((key) => {
          resultadoDelTurno[key] = this._redondearHoras(resultadoDelTurno[key]);
        });

        turnosSemana.push({
          dia: dia.nombreDia,
          fecha: dia.fecha,
          turno: turno || "C",
          esFestivo: esFestivoDia,
          esDomingo: index === 0,
          enRango: dia.enRango !== false,
          ...resultadoDelTurno,
        });
      });

      const resumenSemana = this.calcularResumenSemana(turnosSemana);
      // Deuda: trabajadas + justificadas (I/PR/V) - ausencias (A), nunca menor a 0
      const horasAcumuladasParaTope = Math.max(
        0,
        horasTrabajadasSemana + horasCubreDeudaSemana - horasEquivalentesNegativasSemana
      );
      resumenSemana.horasDeuda = this._redondearHoras(Math.max(0, horasMaximasAjustadas - horasAcumuladasParaTope));
      resultadosSemanas.push({
        numero: semana.numero,
        inicioSemana: semana.inicioSemana,
        finSemana: semana.finSemana,
        turnos: turnosSemana,
        resumen: resumenSemana,
        horasMaximas: horasMaximasAjustadas,
        horasEquivalentesTope: this._redondearHoras(horasCubreDeudaSemana),
        horasReconocidasTope: this._redondearHoras(horasReconocidasTopeSemana),
        horasEquivalentesNegativas: horasEquivalentesNegativasSemana,
        semanaConTurnoReal,
        ajusteTope,
        horasAcumuladasParaTope: this._redondearHoras(horasAcumuladasParaTope),
        detalleHorasEquivalentesTope: detalleHorasEquivalentesSemana,
      });
    });

    return resultadosSemanas;
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
      horasIncapacidad: 0,
      horasVacaciones: 0,
      horasDeuda: 0,
    };

    // Suma los valores de cada día al resumen de la semana.
    turnos.forEach((turno) => {
      Object.keys(resumen).forEach((key) => {
        resumen[key] += turno[key] || 0;
      });
    });
    Object.keys(resumen).forEach((key) => {
      resumen[key] = this._redondearHoras(resumen[key]);
    });

    return resumen;
  }

  /**
   * Muestra los resultados calculados
   */
  mostrarResultados() {
    const lista = this._empleadosEnResultados();
    if (lista.length === 0) {
        document.getElementById("info-empleado").innerHTML = `<p>No hay resultados para mostrar.</p>`;
        return;
    }

    const individual = Boolean(this.filtroResultados && this.filtroResultados.length);
    const formato = (f) => new Date(`${f}T00:00:00`).toLocaleDateString("es-CO");

    // Muestra la información del empleado y el período en la cabecera de resultados.
    if (individual && lista.length === 1) {
      const emp = lista[0];
      document.getElementById("info-empleado").innerHTML = `
        <div class="info-resultado-individual">
          <div>
            <span class="etiqueta-modo">Resultado individual</span>
            <h4>${this._escaparHTML(emp.nombre)} <small>(Documento ${emp.documento})</small></h4>
            <p>Período: ${formato(emp.fechaInicio)} – ${formato(emp.fechaFin)}</p>
          </div>
          <button type="button" class="boton-secundario" id="btn-ver-todos-resultados">Ver resultados de todos</button>
        </div>
      `;
      document.getElementById("btn-ver-todos-resultados")
        .addEventListener("click", () => this.calcularTurnos(null));
    } else {
      const fechaInicioGeneral = document.getElementById("fecha-inicio").value;
      const fechaFinGeneral = document.getElementById("fecha-fin").value;
      document.getElementById("info-empleado").innerHTML = `
        <h4>Resultados para ${lista.length} empleado(s)</h4>
        <p>Período General: ${formato(fechaInicioGeneral)} – ${formato(fechaFinGeneral)}</p>
      `;
    }
    const btnExportar = document.getElementById("btn-exportar");
    if (btnExportar) {
      btnExportar.textContent = individual && lista.length === 1
        ? `Exportar resultados de ${lista[0].nombre}`
        : "Exportar Resultados";
    }

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

    this._empleadosEnResultados().forEach((empleado) => {
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
        return `${codigo} (${nombre}): ${Number(horas).toFixed(2)}h`;
      });
      const tooltipEquivalentes = detalleEquivalentes.length
        ? `Horas justificadas que cubren la deuda semanal: ${detalleEquivalentes.join(", ")}`
        : "No hay horas justificadas por conceptos especiales en esta semana.";
      const detalleVisible = detalleEquivalentes.length
        ? ` (${detalleEquivalentes.join(" · ")})`
        : "";
      const reconocidasIncap = semana.resumen.horasIncapacidad || 0;
      const reconocidasVac = semana.resumen.horasVacaciones || 0;
      const tieneIV = semana.turnos.some((t) => ["incapacidad", "vacaciones"].includes(this._obtenerCategoriaConcepto(t.turno)));
      const indicadorReconocidas = tieneIV
        ? (semana.semanaConTurnoReal
            ? ` <span class="tope-equivalentes tope-reconocidas" title="Incapacidad y vacaciones suman al acumulado de 42 h (no en domingo ni festivo)">• Suman al tope: Incapacidad ${reconocidasIncap.toFixed(2)}h · Vacaciones ${reconocidasVac.toFixed(2)}h</span>`
            : ` <span class="tope-equivalentes tope-sin-turno" title="Sin turnos trabajados en la semana, incapacidad y vacaciones no suman al acumulado">• Sin turno trabajado: I/V no suman al tope</span>`)
        : "";

      const indicadorNegativo = horasEquivalentesNegativas > 0
        ? ` <span class="tope-equivalentes tope-negativo" title="Ausencias descuentan del acumulado semanal">• Ausencias: −${horasEquivalentesNegativas.toFixed(2)}h</span>`
        : "";
      const indicadorTopeAjuste = ajusteTopeSC < 0
        ? ` <span class="tope-equivalentes tope-sc" title="Sin Contrato reduce el tope semanal (solo lunes–sábado)">• SC: tope −${Math.abs(ajusteTopeSC).toFixed(2)}h</span>`
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
        ${indicadorReconocidas}
        <span class="tope-equivalentes" title="${tooltipEquivalentes.replace(/"/g, "&quot;")}">• Justificadas para deuda (I/PR/V): ${horasEquivalentesTope.toFixed(2)}h${detalleVisible}</span>${indicadorNegativo}${indicadorTopeAjuste}
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
                    return `<td class="${clase} ${claseValor}">${val.toFixed(2)}</td>`;
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
                <td class="horas-ord"><strong>${semana.resumen.horasOrdinarias.toFixed(2)}</strong></td>
                <td class="horas-noc"><strong>${semana.resumen.horasNocturnas.toFixed(2)}</strong></td>
                <td class="horas-fest"><strong>${semana.resumen.horasFestivas.toFixed(2)}</strong></td>
                <td class="horas-noc-fest"><strong>${semana.resumen.horasNocturnasFestivas.toFixed(2)}</strong></td>
                <td class="extras-ord"><strong>${semana.resumen.extrasOrdinarias.toFixed(2)}</strong></td>
                <td class="extras-noc"><strong>${semana.resumen.extrasNocturnas.toFixed(2)}</strong></td>
                <td class="extras-fest"><strong>${semana.resumen.extrasFestivas.toFixed(2)}</strong></td>
                <td class="extras-noc-fest"><strong>${semana.resumen.extrasNocturnasFestivas.toFixed(2)}</strong></td>
                <td class="horas-turno"><strong>${(
                  semana.resumen.horasOrdinarias +
                  semana.resumen.horasNocturnas +
                  semana.resumen.horasFestivas +
                  semana.resumen.horasNocturnasFestivas +
                  semana.resumen.extrasOrdinarias +
                  semana.resumen.extrasNocturnas +
                  semana.resumen.extrasFestivas +
                  semana.resumen.extrasNocturnasFestivas
                ).toFixed(2)}</strong></td>
              </tr>
              ${
                semana.resumen.horasDeuda > 0
                  ? `
              <tr class="fila-deuda">
                <td colspan="10"><strong>Horas Faltantes en la Semana</strong></td>
                <td><strong>${semana.resumen.horasDeuda.toFixed(2)}</strong></td>
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
  /**
   * Suma de todos los resúmenes semanales de un empleado (misma fuente para pantalla y Excel).
   */
  calcularResumenPeriodo(empleado) {
    const total = {
      totalHoras: 0, horasOrdinarias: 0, horasNocturnas: 0, horasFestivas: 0,
      horasNocturnasFestivas: 0, extrasOrdinarias: 0, extrasNocturnas: 0,
      extrasFestivas: 0, extrasNocturnasFestivas: 0, horasIncapacidad: 0,
      horasVacaciones: 0, horasDeuda: 0,
    };
    (empleado.resultados || []).forEach((semana) => {
      Object.keys(total).forEach((key) => {
        total[key] += semana.resumen[key] || 0;
      });
    });
    Object.keys(total).forEach((key) => { total[key] = this._redondearHoras(total[key]); });
    return total;
  }

  /**
   * Conceptos de liquidación (recargos y extras) con valor unitario y subtotal.
   * Recargo: valor hora × %. Extra: valor hora × (1 + %).
   */
  calcularLiquidacionEmpleado(empleado) {
    const valorHoraOrdinaria = (empleado.salario || 0) / 220;
    const r = this.calcularResumenPeriodo(empleado);
    const c = this.configuracion;
    const conceptos = [
      { etiqueta: "Recargo Nocturno", horas: r.horasNocturnas, porcentaje: c.recargoNocturno.porcentaje, tipo: "recargo" },
      { etiqueta: "Recargo Festivo", horas: r.horasFestivas, porcentaje: c.recargoFestivo.porcentaje, tipo: "recargo" },
      { etiqueta: "Recargo Nocturno Festivo", horas: r.horasNocturnasFestivas, porcentaje: c.recargoNocturnoFestivo.porcentaje, tipo: "recargo" },
      { etiqueta: "Horas Extras Ordinarias", horas: r.extrasOrdinarias, porcentaje: c.extraDiurna.porcentaje, tipo: "extra" },
      { etiqueta: "Horas Extras Nocturnas", horas: r.extrasNocturnas, porcentaje: c.extraNocturna.porcentaje, tipo: "extra" },
      { etiqueta: "Horas Extras Festivas", horas: r.extrasFestivas, porcentaje: c.extraDiurnaFestiva.porcentaje, tipo: "extra" },
      { etiqueta: "Horas Extras Nocturnas Festivas", horas: r.extrasNocturnasFestivas, porcentaje: c.extraNocturnaFestiva.porcentaje, tipo: "extra" },
    ]
      .filter((x) => x.horas > 0)
      .map((x) => {
        const valorUnitario = x.tipo === "recargo"
          ? valorHoraOrdinaria * (x.porcentaje / 100)
          : valorHoraOrdinaria * (1 + x.porcentaje / 100);
        return { ...x, valorUnitario, subtotal: x.horas * valorUnitario };
      });
    const total = conceptos.reduce((acc, x) => acc + x.subtotal, 0);
    return { valorHoraOrdinaria, conceptos, total };
  }

  mostrarResumenTotal() {
    // Acumula los resúmenes de todas las semanas en un solo objeto.
    const resumenesPorEmpleado = [];

    this._empleadosEnResultados().forEach(empleado => {
        if (!empleado.resultados) return;

        const resumenTotalEmpleado = this.calcularResumenPeriodo(empleado);

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
                        <span class="valor">${resumen.totalHoras.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen">
                        <span class="etiqueta">Horas Ordinarias:</span>
                        <span class="valor">${resumen.horasOrdinarias.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen reconocida-incapacidad">
                        <span class="etiqueta">Horas reconocidas por incapacidad:</span>
                        <span class="valor">${resumen.horasIncapacidad.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen reconocida-vacaciones">
                        <span class="etiqueta">Horas reconocidas por vacaciones:</span>
                        <span class="valor">${resumen.horasVacaciones.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen recargo-nocturno">
                        <span class="etiqueta">Recargo Nocturno (${conf.recargoNocturno.porcentaje}%):</span>
                        <span class="valor">${resumen.horasNocturnas.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen recargo-festivo">
                        <span class="etiqueta">Recargo Festivo (${conf.recargoFestivo.porcentaje}%):</span>
                        <span class="valor">${resumen.horasFestivas.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen recargo-noc-festivo">
                        <span class="etiqueta">Recargo Noc. Festivo (${conf.recargoNocturnoFestivo.porcentaje}%):</span>
                        <span class="valor">${resumen.horasNocturnasFestivas.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen extra-ordinaria">
                        <span class="etiqueta">Extra Ordinaria (${conf.extraDiurna.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasOrdinarias.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen extra-nocturna">
                        <span class="etiqueta">Extra Nocturna (${conf.extraNocturna.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasNocturnas.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen extra-festiva">
                        <span class="etiqueta">Extra Festiva (${conf.extraDiurnaFestiva.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasFestivas.toFixed(2)}</span>
                    </div>
                    <div class="item-resumen extra-noc-festiva">
                        <span class="etiqueta">Extra Noc. Festiva (${conf.extraNocturnaFestiva.porcentaje}%):</span>
                        <span class="valor">${resumen.extrasNocturnasFestivas.toFixed(2)}</span>
                    </div>
                    ${resumen.horasDeuda > 0 ? `
                    <div class="item-resumen deuda">
                        <span class="etiqueta">Total Horas Faltantes:</span>
                        <span class="valor">${resumen.horasDeuda.toFixed(2)}</span>
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

    this._empleadosEnResultados().forEach(empleado => {
        if (!empleado.resultados || !empleado.salario || empleado.salario <= 0) {
            return; // No muestra liquidación si no hay datos o salario
        }

        const salarioMensual = empleado.salario;
        const nombreEmpleado = empleado.nombre;
        const documentoEmpleado = empleado.documento;

        // Misma fuente que la hoja "Liquidación de Pago" del Excel
        const liquidacion = this.calcularLiquidacionEmpleado(empleado);
        const valorHoraOrdinaria = liquidacion.valorHoraOrdinaria;
        const totalAPagar = liquidacion.total;
        const moneda = (v) => v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

        const filasTabla = liquidacion.conceptos.map((c) => `
                <tr>
                    <td>${c.etiqueta}</td>
                    <td>${c.horas.toFixed(2)}</td>
                    <td class="col-moneda">${moneda(c.valorUnitario)}</td>
                    <td class="col-moneda">${moneda(c.subtotal)}</td>
                </tr>
            `).join("");

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
    const hayDatos = this.empleados.size > 0 || this.leerEstadoProgramacion();
    if (hayDatos && !confirm("¿Borrar todos los empleados y la programación guardada? Esta acción no se puede deshacer.")) {
      return;
    }
    this.borrarEstadoProgramacion();
    this._ocultarAvisoProgramacionGuardada();
    this.filtroResultados = null;
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
   * Exporta a Excel exactamente los resultados calculados en pantalla
   * (todos los empleados, o solo el del resultado individual).
   */
  async exportarResultados() {
    const empleados = this._empleadosEnResultados().filter((e) => e.resultados);
    if (empleados.length === 0) {
      alert("No hay resultados para exportar. Calcule primero los resultados.");
      return;
    }
    if (typeof XLSX === "undefined") {
      alert("No se pudo cargar la librería de Excel. Verifique la conexión a internet y recargue la página.");
      return;
    }

    const libro = this.construirLibroExcel();
    const wb = XLSX.utils.book_new();
    libro.hojas.forEach((hoja) => {
      XLSX.utils.book_append_sheet(wb, this._crearHojaExcel(hoja), hoja.nombre);
    });

    const fecha = new Date().toLocaleDateString("es-CO").replace(/\//g, "-");
    const nombreArchivo = empleados.length === 1 && this.filtroResultados
      ? `Reporte de Horas - ${empleados[0].nombre} (${empleados[0].documento}) - ${fecha}.xlsx`
      : `Reporte de Horas - Varios Empleados - ${fecha}.xlsx`;

    if (window.electronAPI) {
      try {
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64", cellStyles: true });
        const result = await window.electronAPI.saveFile({
          data: wbout,
          fileName: nombreArchivo,
        });
        if (result.success) {
          alert(`¡Reporte exportado exitosamente en: ${result.path}`);
        } else if (result.message !== "Guardado cancelado por el usuario.") {
          alert(`Error al guardar: ${result.message}`);
        }
      } catch (error) {
        console.error("Error al invocar el guardado de archivo en Electron:", error);
        alert("Ocurrió un error inesperado al intentar exportar.");
      }
    } else {
      XLSX.writeFile(wb, nombreArchivo, { cellStyles: true });
      this.mostrarNotificacion(`Excel generado: ${nombreArchivo}`, "success");
    }
  }

  /**
   * Convierte una hoja descrita por construirLibroExcel() en una hoja de SheetJS,
   * con formatos numéricos y estilos (los estilos requieren xlsx-js-style).
   */
  _crearHojaExcel(hoja) {
    const ws = XLSX.utils.aoa_to_sheet(hoja.filas);
    ws["!cols"] = hoja.cols.map((wch) => ({ wch }));
    const rango = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    const borde = { style: "thin", color: { rgb: "D0D7E2" } };
    const bordes = { top: borde, bottom: borde, left: borde, right: borde };

    for (let r = rango.s.r; r <= rango.e.r; r++) {
      for (let c = rango.s.c; c <= rango.e.c; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        const celda = ws[ref];
        if (!celda) continue;
        const estilo = { font: { name: "Calibri", sz: 11 }, alignment: { vertical: "center" } };

        if (celda.t === "n") {
          const formato = hoja.formatos?.[c] || "0.00";
          celda.z = formato;
          estilo.numFmt = formato;
          estilo.alignment.horizontal = "right";
        }
        if (hoja.encabezados?.includes(r)) {
          estilo.font = { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
          estilo.fill = { patternType: "solid", fgColor: { rgb: "1F3A5F" } };
          estilo.alignment = { vertical: "center", horizontal: "center", wrapText: true };
        } else if (hoja.totales?.includes(r)) {
          estilo.font = { name: "Calibri", sz: 11, bold: true };
          estilo.fill = { patternType: "solid", fgColor: { rgb: "E8EEF6" } };
        }
        const relleno = hoja.rellenos?.find((x) => x.r === r && x.c === c);
        if (relleno) {
          const color = relleno.color.replace("#", "").toUpperCase();
          const texto = this.calcularEstilosDeColor(relleno.color).text.replace("#", "").toUpperCase();
          estilo.fill = { patternType: "solid", fgColor: { rgb: color } };
          estilo.font = { ...estilo.font, color: { rgb: texto === "FFFFFF" ? "FFFFFF" : "1E293B" } };
        }
        if (!hoja.sinBordes?.includes(r)) estilo.border = bordes;
        celda.s = estilo;
      }
    }
    if (hoja.congelarFilas) {
      ws["!freeze"] = { xSplit: 0, ySplit: hoja.congelarFilas };
      ws["!views"] = [{ state: "frozen", ySplit: hoja.congelarFilas }];
    }
    return ws;
  }

  /**
   * Construye el contenido de todas las hojas del Excel a partir de los resultados
   * calculados. No depende del DOM ni de la librería XLSX (se prueba en Node).
   * @returns {{hojas: Array<{nombre, filas, cols, encabezados, totales, formatos, rellenos}>}}
   */
  construirLibroExcel() {
    const empleados = this._empleadosEnResultados().filter((e) => e.resultados);
    const hojas = [];

    // 1. Informe de horas extras (formato de importación a nómina)
    const informe = this._generarDatosInformeHorasExtras();
    hojas.push({
      nombre: "Informe Horas Extras",
      filas: informe.data,
      cols: informe.cols.map((c) => c.wch),
      encabezados: [0, 1],
      totales: [informe.data.length - 1],
      formatos: {},
      rellenos: informe.rellenos,
      congelarFilas: 2,
    });

    // 2. Novedades de nómina: días de incapacidad, vacaciones, permisos y demás conceptos
    hojas.push(this._generarHojaNovedades(empleados));

    // 3. Liquidación de pago
    hojas.push(this._generarHojaLiquidacion(empleados));

    // 4. Resumen total del período por empleado
    hojas.push(this._generarHojaResumenTotal(empleados));

    // 5. Una hoja por semana
    this._generarHojasSemanales(empleados).forEach((h) => hojas.push(h));

    // 6. Conteo de turnos por tipo y semana
    hojas.push(this._generarHojaResumenTurnos(empleados));

    return { hojas };
  }

  _tipoDiaTexto(turno) {
    if (turno.esDomingo) return "Domingo";
    if (turno.esFestivo) return "Festivo";
    return "Hábil";
  }

  _colorTurno(codigo) {
    return this.obtenerColorTurno(codigo)?.bg || this.tiposTurno[codigo]?.color || "#9e9e9e";
  }

  _generarHojaNovedades(empleados) {
    const filas = [[
      "Documento", "Nombre", "Fecha", "Día", "Tipo de día", "Código", "Concepto",
      "Horas configuradas", "Horas sumadas al tope", "Horas que cubren deuda", "Observación",
    ]];
    const rellenos = [];
    empleados.forEach((emp) => {
      emp.resultados.forEach((semana) => {
        semana.turnos.forEach((t) => {
          if (!this.configuracion.tiposTurnoEspeciales?.[t.turno]) return;
          const config = this.configuracion.tiposTurnoEspeciales[t.turno];
          const comportamiento = this._obtenerComportamientoConceptoEspecial(t.turno);
          const sumadas = (t.horasIncapacidad || 0) + (t.horasVacaciones || 0);
          let observacion = "";
          if (comportamiento === "suma_tope") {
            if (t.esDomingo || t.esFestivo) observacion = "Domingo/festivo: no suma al tope";
            else if (!semana.semanaConTurnoReal) observacion = "Semana sin turno trabajado: no suma al tope";
            else observacion = "Suma al acumulado de 42 h";
          } else if (comportamiento === "cubre_deuda") observacion = "Solo cubre horas faltantes";
          else if (comportamiento === "resta") observacion = "Resta del acumulado semanal";
          else if (comportamiento === "reduce_tope") observacion = t.esDomingo ? "Domingo: no reduce el tope" : "Reduce el tope semanal";
          if (t.enRango === false) observacion += " (día fuera del período)";

          rellenos.push({ r: filas.length, c: 6, color: this._colorTurno(t.turno) });
          filas.push([
            emp.documento,
            emp.nombre,
            t.fecha.toLocaleDateString("es-CO"),
            t.dia,
            this._tipoDiaTexto(t),
            t.turno,
            config.nombre || t.turno,
            Number(config.horas) || 0,
            this._redondearHoras(sumadas),
            t.horasEquivalentesTope || 0,
            observacion,
          ]);
        });
      });
    });
    if (filas.length === 1) filas.push(["Sin novedades en el período."]);
    return {
      nombre: "Novedades de Nómina",
      filas,
      cols: [14, 28, 12, 11, 12, 8, 22, 12, 12, 12, 40],
      encabezados: [0],
      totales: [],
      formatos: {},
      rellenos,
      congelarFilas: 1,
    };
  }

  _generarHojaLiquidacion(empleados) {
    const filas = [["Empleado", "Documento", "Concepto", "Cantidad Horas", "Valor Unitario", "Subtotal"]];
    const totales = [];
    empleados.forEach((emp) => {
      if (!emp.salario || emp.salario <= 0) return;
      const liq = this.calcularLiquidacionEmpleado(emp);
      if (!liq.conceptos.length) {
        filas.push([emp.nombre, emp.documento, "Sin recargos ni extras en el período", 0, 0, 0]);
      }
      liq.conceptos.forEach((c) => {
        filas.push([emp.nombre, emp.documento, c.etiqueta, this._redondearHoras(c.horas), Math.round(c.valorUnitario), Math.round(c.subtotal)]);
      });
      totales.push(filas.length);
      filas.push(["", "", `TOTAL ${emp.nombre.toUpperCase()}`, "", "", Math.round(liq.total)]);
      filas.push([]);
    });
    if (filas.length === 1) filas.push(["No hay datos de liquidación para exportar."]);
    return {
      nombre: "Liquidación de Pago",
      filas,
      cols: [30, 14, 34, 15, 18, 18],
      encabezados: [0],
      totales,
      formatos: { 3: "0.00", 4: '"$"#,##0', 5: '"$"#,##0' },
      rellenos: [],
      sinBordes: filas.map((f, i) => (f.length === 0 ? i : -1)).filter((i) => i >= 0),
      congelarFilas: 1,
    };
  }

  _generarHojaResumenTotal(empleados) {
    const conf = this.configuracion;
    const filas = [["Empleado", "Documento", "Concepto", "Total Horas"]];
    const totales = [];
    empleados.forEach((emp) => {
      const r = this.calcularResumenPeriodo(emp);
      filas.push(
        [emp.nombre, emp.documento, "Horas Ordinarias", r.horasOrdinarias],
        ["", "", `Recargo Nocturno (${conf.recargoNocturno.porcentaje}%)`, r.horasNocturnas],
        ["", "", `Recargo Festivo (${conf.recargoFestivo.porcentaje}%)`, r.horasFestivas],
        ["", "", `Recargo Noc. Festivo (${conf.recargoNocturnoFestivo.porcentaje}%)`, r.horasNocturnasFestivas],
        ["", "", `Extra Ordinaria (${conf.extraDiurna.porcentaje}%)`, r.extrasOrdinarias],
        ["", "", `Extra Nocturna (${conf.extraNocturna.porcentaje}%)`, r.extrasNocturnas],
        ["", "", `Extra Festiva (${conf.extraDiurnaFestiva.porcentaje}%)`, r.extrasFestivas],
        ["", "", `Extra Noc. Festiva (${conf.extraNocturnaFestiva.porcentaje}%)`, r.extrasNocturnasFestivas],
        ["", "", "Horas reconocidas por incapacidad (suman al tope)", r.horasIncapacidad],
        ["", "", "Horas reconocidas por vacaciones (suman al tope)", r.horasVacaciones],
      );
      totales.push(filas.length, filas.length + 1);
      filas.push(
        ["", "", "TOTAL HORAS TRABAJADAS", r.totalHoras],
        ["", "", "TOTAL HORAS FALTANTES", r.horasDeuda],
        []
      );
    });
    return {
      nombre: "Resumen Total Horas",
      filas,
      cols: [30, 14, 48, 14],
      encabezados: [0],
      totales,
      formatos: { 3: "0.00" },
      rellenos: [],
      sinBordes: filas.map((f, i) => (f.length === 0 ? i : -1)).filter((i) => i >= 0),
      congelarFilas: 1,
    };
  }

  _generarHojasSemanales(empleados) {
    const porSemana = new Map();
    empleados.forEach((emp) => {
      emp.resultados.forEach((semana) => {
        if (!porSemana.has(semana.numero)) porSemana.set(semana.numero, []);
        porSemana.get(semana.numero).push({ emp, semana });
      });
    });

    const categorias = [
      "horasOrdinarias", "horasNocturnas", "horasFestivas", "horasNocturnasFestivas",
      "extrasOrdinarias", "extrasNocturnas", "extrasFestivas", "extrasNocturnasFestivas",
    ];
    const totalCategorias = (obj) => this._redondearHoras(categorias.reduce((acc, k) => acc + (obj[k] || 0), 0));

    return Array.from(porSemana.keys()).sort((a, b) => a - b).map((numero) => {
      const filas = [[
        "Empleado", "Documento", "Día", "Fecha", "Tipo de día", "En período", "Turno",
        "H. Ord.", "H. Noc.", "H. Fest.", "H. N.F.", "E. Ord.", "E. Noc.", "E. Fest.", "E. N.F.",
        "Horas x Turno", "Inc./Vac. al tope",
      ]];
      const totales = [];
      const rellenos = [];
      porSemana.get(numero).forEach(({ emp, semana }) => {
        semana.turnos.forEach((t) => {
          rellenos.push({ r: filas.length, c: 6, color: this._colorTurno(t.turno) });
          filas.push([
            emp.nombre,
            emp.documento,
            t.dia,
            t.fecha.toLocaleDateString("es-CO"),
            this._tipoDiaTexto(t),
            t.enRango === false ? "No" : "Sí",
            this.formatearNombreYHorarioTexto(t.turno),
            ...categorias.map((k) => t[k] || 0),
            totalCategorias(t),
            this._redondearHoras((t.horasIncapacidad || 0) + (t.horasVacaciones || 0)),
          ]);
        });
        const r = semana.resumen;
        totales.push(filas.length);
        filas.push([
          `TOTAL ${emp.nombre.toUpperCase()}`, emp.documento, "", "", "", "", `Tope: ${semana.horasMaximas} h`,
          ...categorias.map((k) => r[k] || 0),
          totalCategorias(r),
          this._redondearHoras((r.horasIncapacidad || 0) + (r.horasVacaciones || 0)),
        ]);
        if (r.horasDeuda > 0) {
          totales.push(filas.length);
          filas.push(["", "", "", "", "", "", "Horas faltantes en la semana", "", "", "", "", "", "", "", "", r.horasDeuda, ""]);
        }
        filas.push([]);
      });
      return {
        nombre: `Semana ${numero}`,
        filas,
        cols: [28, 13, 11, 11, 11, 9, 30, 8, 8, 8, 8, 8, 8, 8, 8, 12, 13],
        encabezados: [0],
        totales,
        formatos: {},
        rellenos,
        sinBordes: filas.map((f, i) => (f.length === 0 ? i : -1)).filter((i) => i >= 0),
        congelarFilas: 1,
      };
    });
  }

  _generarHojaResumenTurnos(empleados) {
    const numerosSemana = [...new Set(empleados.flatMap((e) => e.resultados.map((s) => s.numero)))].sort((a, b) => a - b);
    const filas = [["Empleado", "Tipo de Turno", ...numerosSemana.map((n) => `Semana ${n}`), "Total Período"]];
    const totales = [];
    const rellenos = [];
    empleados.forEach((emp) => {
      const tipos = [...new Set(emp.resultados.flatMap((s) => s.turnos.map((t) => t.turno)))].filter(Boolean);
      const totalPorSemana = Object.fromEntries(numerosSemana.map((n) => [n, 0]));
      let totalGeneral = 0;
      tipos.forEach((tipo) => {
        const fila = [emp.nombre, this.tiposTurno[tipo]?.nombre || tipo];
        let totalTipo = 0;
        numerosSemana.forEach((n) => {
          const semana = emp.resultados.find((s) => s.numero === n);
          const conteo = semana ? semana.turnos.filter((t) => t.turno === tipo).length : 0;
          fila.push(conteo);
          totalTipo += conteo;
          totalPorSemana[n] += conteo;
        });
        fila.push(totalTipo);
        totalGeneral += totalTipo;
        rellenos.push({ r: filas.length, c: 1, color: this._colorTurno(tipo) });
        filas.push(fila);
      });
      totales.push(filas.length);
      filas.push([`TOTAL ${emp.nombre.toUpperCase()}`, "", ...numerosSemana.map((n) => totalPorSemana[n]), totalGeneral]);
      filas.push([]);
    });
    return {
      nombre: "Resumen de Turnos",
      filas,
      cols: [30, 25, ...numerosSemana.map(() => 11), 13],
      encabezados: [0],
      totales,
      formatos: Object.fromEntries([...numerosSemana.map((_, i) => [i + 2, "0"]), [numerosSemana.length + 2, "0"]]),
      rellenos,
      sinBordes: filas.map((f, i) => (f.length === 0 ? i : -1)).filter((i) => i >= 0),
      congelarFilas: 1,
    };
  }

  /**
   * Número para Excel: vacío si es 0, redondeado a 2 decimales en otro caso.
   */
  _formatearNumeroExcel(num) {
    if (num === 0 || !num) {
      return "";
    }
    return Math.round(num * 100) / 100;
  }

  /**
   * Hoja "Informe Horas Extras": una fila por día trabajado o con concepto de nómina.
   * Conserva el orden de columnas y los códigos de exportación para la importación a nómina.
   */
  _generarDatosInformeHorasExtras() {
    // Parte 1: Tabla de conceptos
    const header1 = [
      "Informe Generado:", new Date().toLocaleDateString("es-CO"), "", "", "", "", "",
      "Horas Extras Diurnas",
      "Horas Extras Nocturnas",
      "Horas Recargo Festivo Diurno",
      "Horas Recargo Festivo Nocturno",
      "Horas Extra Festivo Diurno",
      "Horas Extra Festivo Nocturno",
      "Horas Recargo Nocturno",
      "",
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
    const rellenos = [];
    const totales = {
      extrasOrdinarias: 0, extrasNocturnas: 0, horasFestivas: 0, horasNocturnasFestivas: 0,
      extrasFestivas: 0, extrasNocturnasFestivas: 0, horasNocturnas: 0,
    };
    const formatHora = (hora) => {
      if (!hora) return "";
      const [h, m] = hora.split(":");
      return `${h}:${m}`;
    };

    this._empleadosEnResultados().forEach(empleado => {
        if (!empleado.resultados) return;
        empleado.resultados.forEach(semana => {
            semana.turnos.forEach(turno => {
                const totalHorasTurno =
                (turno.horasOrdinarias || 0) + (turno.horasNocturnas || 0) + (turno.horasFestivas || 0) +
                (turno.horasNocturnasFestivas || 0) + (turno.extrasOrdinarias || 0) + (turno.extrasNocturnas || 0) +
                (turno.extrasFestivas || 0) + (turno.extrasNocturnasFestivas || 0);

                // Incluir filas con horas trabajadas y también los días con concepto especial
                // (I, PR, V, A, SC...) para que sus fechas queden en el informe aunque no sumen horas.
                const esTurnoEspecial = this.configuracion.tiposTurnoEspeciales[turno.turno];
                if (!(totalHorasTurno > 0 || esTurnoEspecial)) return;

                let horarioEntrada = formatHora(turno.inicio);
                const horarioSalida = formatHora(turno.fin);

                // Si es un concepto especial (sin horario de entrada/salida), muestra el nombre del concepto.
                if (esTurnoEspecial && !turno.inicio && turno.turno !== 'M') {
                    horarioEntrada = this.tiposTurno[turno.turno]?.nombre || turno.turno;
                }

                const tipoTurnoNombre = this.tiposTurno[turno.turno]?.nombre || turno.turno;

                rellenos.push({ r: data.length + 2, c: 3, color: this._colorTurno(turno.turno) });
                data.push([
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
                ]);

                Object.keys(totales).forEach((k) => { totales[k] += turno[k] || 0; });
            });
        });
    });

    // Fila de totales
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

    const cols = [ {wch: 15}, {wch: 30}, {wch: 12}, {wch: 20}, {wch: 18}, {wch: 18}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 12}, {wch: 12} ];

    return { data: [header1, header2, ...data, footer], cols, rellenos };
  }
}

// Colores identificativos que los conceptos base conservan siempre
SistemaTurnosMejorado.COLORES_CONCEPTOS_FIJOS = Object.freeze({
  I: "#1E88E5",  // Incapacidad: azul
  SC: "#9E9E9E", // Sin contrato: gris
  PR: "#9CCC65", // Permiso remunerado: verde claro
  A: "#E53935",  // Ausencia: rojo
  V: "#2E7D32",  // Vacaciones: verde
});

// Turnos base que no se pueden eliminar ni desactivar
SistemaTurnosMejorado.TURNOS_PROTEGIDOS = Object.freeze(["D", "N", "24T"]);

// Contraseña del módulo de configuración (solo frontend: no es seguridad real)
SistemaTurnosMejorado.CLAVE_CONFIGURACION = "Alejostone";

// Exponer la clase en `window` para entornos donde el scope no la establece automáticamente (tests, runners)
if (typeof window !== 'undefined') {
  window.SistemaTurnosMejorado = window.SistemaTurnosMejorado || SistemaTurnosMejorado;
}

// Auto-instanciar solo cuando la página parece ser la UI principal (evitar fallos en test runner)
document.addEventListener("DOMContentLoaded", () => {
  const hasUI = document.getElementById('seccion-configuracion') || document.getElementById('contenedor-semanas') || document.getElementById('app');
  if (hasUI) {
    try {
      // Instancia accesible para soporte y pruebas de extremo a extremo
      window.sistemaTurnos = new SistemaTurnosMejorado();
    } catch (e) {
      console.error('No se pudo inicializar la aplicación automáticamente:', e);
    }
  }
});

// Exportar la clase para entornos Node (tests automatizados)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SistemaTurnosMejorado;
}
