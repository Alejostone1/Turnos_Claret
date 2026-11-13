// Pruebas del motor de cálculo, persistencia, resultados individuales y exportación.
// Ejecutar: node test/test_motor.js
const { crearApp, agregarEmpleado, assert, seccion, terminar, r2, extras } = require("./entorno_prueba");

const SEMANA = "2026-10-18";          // domingo; lunes a sábado sin festivos
const SEMANA_FESTIVO = "2026-11-15";  // domingo; lunes 16-nov-2026 es festivo

function calcular(semanas, opciones = {}) {
  const app = crearApp(opciones);
  const emp = agregarEmpleado(app, { inicio: opciones.inicio || SEMANA, semanas });
  app.calcularTurnos();
  return { app, emp, semana: emp.resultados[0], resultados: emp.resultados };
}

// ─── Tope semanal ─────────────────────────────────────────────────────────
seccion("Tope semanal de 42 horas");
{
  const { semana } = calcular([["C", "S7", "S7", "S7", "S7", "S7", "S7"]]);
  assert("42 horas exactas: 0 extras", extras(semana.resumen), 0);
  assert("42 horas exactas: 42 ordinarias", r2(semana.resumen.horasOrdinarias), 42);
}
{
  const { semana } = calcular([["C", "S7", "S7", "S7", "S7", "S7", "X10"]]);
  assert("45 horas reales: 3 extras", extras(semana.resumen), 3);
  assert("45 horas reales: extras diurnas ordinarias", r2(semana.resumen.extrasOrdinarias), 3);
}
{
  const { resultados } = calcular([
    ["C", "S7", "S7", "S7", "S7", "S7", "X10"],
    ["C", "S7", "S7", "S7", "S7", "S7", "S7"],
  ]);
  assert("El acumulado se reinicia cada domingo (semana 2 sin extras)", extras(resultados[1].resumen), 0);
}

// ─── Incapacidad y vacaciones ─────────────────────────────────────────────
seccion("Incapacidad y vacaciones (7,33 h; no domingo ni festivo; requiere turno real)");
{
  const { semana } = calcular([["C", "I", "I", "I", "I", "I", "I"]]);
  assert("Incapacidad lunes a sábado sin trabajo: 0 horas computables", semana.resumen.horasIncapacidad, 0);
  assert("Incapacidad lunes a sábado sin trabajo: 0 extras", extras(semana.resumen), 0);
  assert("Incapacidad lunes a sábado sin trabajo: no genera horas trabajadas", semana.resumen.totalHoras, 0);
  assert("Incapacidad lunes a sábado sin trabajo: deuda cubierta", semana.resumen.horasDeuda, 0);
}
{
  const { semana } = calcular([["I", "D", "C", "C", "C", "C", "C"]]);
  assert("Incapacidad en domingo: 0 horas reconocidas", semana.turnos[0].horasIncapacidad, 0);
}
{
  const { semana } = calcular([["C", "I", "D", "C", "C", "C", "C"]]);
  assert("Incapacidad lunes + un turno trabajado: 7,33 horas reconocidas", semana.resumen.horasIncapacidad, 7.33);
  assert("El día de incapacidad no genera horas ordinarias", semana.turnos[1].horasOrdinarias, 0);
}
{
  // Ejemplo obligatorio 2.3: 3 turnos de 11 h + 7,33 h de incapacidad = 40,33 h
  const { semana } = calcular([["I", "I", "D", "D", "D", "C", "C"]]);
  assert("Ejemplo 2.3: 33 horas trabajadas", r2(semana.resumen.totalHoras), 33);
  assert("Ejemplo 2.3: 7,33 h de incapacidad (el domingo no suma)", semana.resumen.horasIncapacidad, 7.33);
  assert("Ejemplo 2.3: 0 extras (40,33 < 42)", extras(semana.resumen), 0);
}
{
  // Vacaciones lun–mié (21,99 h) y luego tres turnos de 11 h (33 h): 54,99 h → 12,99 extras
  const { semana } = calcular([["V", "V", "V", "V", "D", "D", "D"]]);
  assert("Vacaciones en domingo: 0 horas", semana.turnos[0].horasVacaciones, 0);
  assert("Vacaciones lun–mié: 21,99 horas reconocidas", semana.resumen.horasVacaciones, 21.99);
  assert("Vacaciones + trabajo: 12,99 extras (54,99 − 42)", extras(semana.resumen), 12.99);
  assert("Vacaciones + trabajo: 20,01 ordinarias (42 − 21,99)", r2(semana.resumen.horasOrdinarias), 20.01);
  assert("Las extras empiezan el viernes, cuando se cruza el tope", r2(extras(semana.turnos[5])), 1.99);
  assert("Todo el sábado es extra", r2(extras(semana.turnos[6])), 11);
}
{
  const { semana } = calcular([["C", "V", "D", "C", "C", "C", "C"]], { inicio: SEMANA_FESTIVO });
  assert("Vacaciones en festivo (lunes 16-nov-2026): 0 horas", semana.turnos[1].horasVacaciones, 0);
  assert("El festivo queda identificado", semana.turnos[1].esFestivo, true);
}
{
  const { resultados } = calcular([
    ["I", "I", "I", "I", "I", "I", "I"],
    ["C", "S7", "S7", "S7", "S7", "S7", "S7"],
  ]);
  assert("Semana completa incapacitado: 0 horas al tope", resultados[0].resumen.horasIncapacidad, 0);
  assert("Semana completa incapacitado: no altera la semana siguiente", extras(resultados[1].resumen), 0);
}
{
  const { semana } = calcular([["C", "PR", "D", "D", "D", "D", "C"]]);
  assert("Permiso remunerado no suma al tope (44 h trabajadas → 2 extras)", extras(semana.resumen), 2);
}

// ─── Clasificación horaria ────────────────────────────────────────────────
seccion("Clasificación nocturna, festiva y cruces de medianoche");
{
  const { semana } = calcular([["C", "C", "NM", "C", "C", "C", "C"]]);
  assert("Turno nocturno 22:00–06:00 un martes: 8 h nocturnas", r2(semana.turnos[2].horasNocturnas), 8);
}
{
  const { semana } = calcular([["C", "C", "C", "C", "C", "C", "NM"]]);
  const sabado = semana.turnos[6];
  assert("Sábado 22:00 → domingo 06:00: 2 h nocturnas del sábado", r2(sabado.horasNocturnas), 2);
  assert("Sábado 22:00 → domingo 06:00: 6 h nocturnas festivas del domingo", r2(sabado.horasNocturnasFestivas), 6);
}
{
  const { app, semana } = calcular([["C", "C", "24T", "C", "C", "C", "C"]], { almuerzo: { tipo: "predefinido", tiempoEnHoras: 0.5 } });
  const t = semana.turnos[2];
  assert("Turno de 24 h con 2 pausas de 30 min: 23 horas", r2(t.totalHoras), 23);
  assert("Turno de 24 h: 12,5 h diurnas", r2(t.horasOrdinarias), 12.5);
  assert("Turno de 24 h: 10,5 h nocturnas", r2(t.horasNocturnas), 10.5);
  void app;
}
{
  // 35 h antes del sábado y turno de madrugada 04:00–12:00: el tope se cruza a las 11:00.
  // Antes se procesaban primero las horas diurnas y la extra salía (mal) nocturna.
  const { semana } = calcular([["C", "S7", "S7", "S7", "S7", "S7", "MA"]]);
  const sabado = semana.turnos[6];
  assert("Cruce del tope en orden cronológico: 2 h nocturnas ordinarias (04–06)", r2(sabado.horasNocturnas), 2);
  assert("Cruce del tope: 1 h extra diurna (11–12), no nocturna", [r2(sabado.extrasOrdinarias), r2(sabado.extrasNocturnas)], [1, 0]);
}
{
  // Tope alcanzado antes del sábado: el turno nocturno del sábado es todo extra
  const { semana } = calcular([["C", "S7", "S7", "S7", "S7", "S7", "S7"], ], {});
  void semana;
  const r = calcular([["C", "S7", "S7", "S7", "S7", "S7", "NM"]]).semana;
  // 35 h antes del sábado: 7 h ordinarias y 1 h extra (la última, ya en domingo)
  const sab = r.turnos[6];
  assert("Sábado nocturno que cruza el tope: solo el excedente es extra", r2(extras(sab)), 1);
  assert("El excedente cae en domingo: extra nocturna festiva", r2(sab.extrasNocturnasFestivas), 1);
}

// ─── Alimentación ─────────────────────────────────────────────────────────
seccion("Descuento de alimentación");
{
  const app = crearApp();
  assert("30 minutos: 12 h → 11,5 h", app.calcularHorasTurnoConAlmuerzo("07:00", "19:00", { tipo: "predefinido", tiempoEnHoras: 0.5 }), 11.5);
  assert("1 hora: 12 h → 11 h", app.calcularHorasTurnoConAlmuerzo("07:00", "19:00", { tipo: "predefinido", tiempoEnHoras: 1 }), 11);
  assert("Personalizado 12:00–13:30: 12 h → 10,5 h", app.calcularHorasTurnoConAlmuerzo("07:00", "19:00", { tipo: "personalizado", inicio: "12:00", fin: "13:30" }), 10.5);
  assert("Sin almuerzo: 12 h", app.calcularHorasTurnoConAlmuerzo("07:00", "19:00", { tipo: "sin-almuerzo" }), 12);
}

// ─── Turnos dinámicos ─────────────────────────────────────────────────────
seccion("Eliminación de turnos dinámicos");
{
  const app = crearApp();
  const emp = agregarEmpleado(app, { inicio: SEMANA, semanas: [["C", "MA", "MA", "D", "C", "C", "C"]] });
  app.guardarConfiguracion();
  const eliminado = app.eliminarTurnoDinamico("MA", { confirmar: false });
  const guardada = JSON.parse(localStorage.getItem("configuracionTurnos"));
  assert("El turno se elimina", eliminado, true);
  assert("Desaparece de la configuración", "MA" in app.configuracion.turnosDinamicos, false);
  assert("Desaparece del selector de tipos", "MA" in app.tiposTurno, false);
  assert("Desaparece de la configuración guardada", "MA" in guardada.turnosDinamicos, false);
  assert("Se eliminan sus referencias en la programación", [...emp.turnosGuardados.values()].some((t) => t.turno === "MA"), false);
  assert("Las demás asignaciones se conservan", [...emp.turnosGuardados.values()].filter((t) => t.turno === "D").length, 1);
  assert("Los turnos base están protegidos", app.eliminarTurnoDinamico("D", { confirmar: false }), false);
}
{
  const app = crearApp();
  agregarEmpleado(app, { documento: "1", inicio: SEMANA, semanas: [["C", "D", "D", "C", "C", "C", "C"]] });
  agregarEmpleado(app, { documento: "2", inicio: SEMANA, semanas: [["C", "N", "N", "C", "C", "C", "C"]] });
  app.guardarEstadoProgramacion();
  app.eliminarEmpleado("1", { confirmar: false });
  const guardado = JSON.parse(localStorage.getItem("programacionTurnos_v1"));
  assert("Eliminar empleado: sale de la programación", [...app.empleados.keys()], ["2"]);
  assert("Eliminar empleado: sale de lo guardado", guardado.empleados.map((e) => e.documento), ["2"]);
}

// ─── Pre-guardado ─────────────────────────────────────────────────────────
seccion("Pre-guardado y recuperación");
{
  const app = crearApp();
  const emp = agregarEmpleado(app, { documento: "0123", inicio: SEMANA, semanas: [["C", "D", "I", "V", "PR", "N", "C"]] });
  emp.turnosGuardados.set(app._fechaKey(new Date(2026, 9, 24)), { turno: "M", inicioManual: "08:00", finManual: "12:00" });
  assert("Pre-guardar guarda en el navegador", app.preGuardarTurnosEmpleado("0123", { silencioso: true }), true);

  const otra = crearApp();
  localStorage.setItem("programacionTurnos_v1", JSON.stringify(app.serializarProgramacion()));
  const datos = otra.leerEstadoProgramacion();
  otra.restaurarProgramacionDesdeDatos(datos);
  const recuperado = otra.empleados.get("0123");
  assert("Se recupera el empleado (conserva ceros iniciales)", recuperado && recuperado.documento, "0123");
  assert("Se recuperan todos los turnos", Object.fromEntries(recuperado.turnosGuardados), Object.fromEntries(emp.turnosGuardados));
  assert("Se recupera el estado pre-guardado", recuperado.preGuardado, true);
  otra.calcularTurnos();
  app.calcularTurnos();
  assert("La programación recuperada calcula igual", recuperado.resultados[0].resumen, emp.resultados[0].resumen);
}

// ─── Resultados individuales y exportación ────────────────────────────────
seccion("Resultados individuales y exportación a Excel");
{
  const app = crearApp();
  agregarEmpleado(app, { documento: "1", nombre: "Ana", inicio: SEMANA, semanas: [["C", "V", "V", "V", "D", "D", "D"]] });
  agregarEmpleado(app, { documento: "2", nombre: "Luis", inicio: SEMANA, semanas: [["C", "S7", "S7", "S7", "S7", "S7", "X10"]] });

  app.calcularTurnos(["1"]);
  assert("Resultado individual: solo el empleado seleccionado", app._empleadosEnResultados().map((e) => e.documento), ["1"]);
  const libroIndividual = app.construirLibroExcel();
  const informe = libroIndividual.hojas.find((h) => h.nombre === "Informe Horas Extras").filas;
  assert("Exportación individual: solo filas del empleado", informe.slice(2, -1).every((f) => f[0] === "1"), true);

  app.calcularTurnos(null);
  assert("Resultado general: todos los empleados", app._empleadosEnResultados().map((e) => e.documento), ["1", "2"]);
  const libro = app.construirLibroExcel();
  const hoja = (nombre) => libro.hojas.find((h) => h.nombre === nombre);
  assert("Hojas con nombres claros",
    libro.hojas.map((h) => h.nombre),
    ["Informe Horas Extras", "Novedades de Nómina", "Liquidación de Pago", "Resumen Total Horas", "Semana 1", "Resumen de Turnos"]);

  const ana = app.empleados.get("1");
  const resumenAna = app.calcularResumenPeriodo(ana);
  const filasResumen = hoja("Resumen Total Horas").filas;
  const valor = (doc, concepto) => {
    let actual = null;
    for (const f of filasResumen) {
      if (f[1]) actual = f[1];
      if (actual === doc && f[2] === concepto) return f[3];
    }
    return undefined;
  };
  assert("Excel = pantalla: horas ordinarias", valor("1", "Horas Ordinarias"), resumenAna.horasOrdinarias);
  assert("Excel = pantalla: vacaciones reconocidas", valor("1", "Horas reconocidas por vacaciones (suman al tope)"), resumenAna.horasVacaciones);
  assert("Excel = pantalla: total trabajadas", valor("1", "TOTAL HORAS TRABAJADAS"), resumenAna.totalHoras);

  const liq = app.calcularLiquidacionEmpleado(ana);
  const filaTotalLiq = hoja("Liquidación de Pago").filas.find((f) => f[2] === "TOTAL ANA");
  assert("Excel = pantalla: total liquidación", filaTotalLiq[5], Math.round(liq.total));

  const semana1 = hoja("Semana 1").filas;
  const totalAna = semana1.find((f) => f[0] === "TOTAL ANA");
  const semanaAna = ana.resultados[0].resumen;
  assert("Hoja semanal: totales alineados con sus columnas",
    totalAna.slice(7, 15),
    ["horasOrdinarias", "horasNocturnas", "horasFestivas", "horasNocturnasFestivas", "extrasOrdinarias", "extrasNocturnas", "extrasFestivas", "extrasNocturnasFestivas"].map((k) => semanaAna[k]));
  assert("Hoja semanal: 'Horas x Turno' = suma de categorías (sin duplicar)", totalAna[15], r2(semanaAna.totalHoras));
  assert("Hoja semanal: 7 filas por empleado (domingo a sábado)", semana1.filter((f) => f[1] === "1" && !String(f[0]).startsWith("TOTAL")).length, 7);

  const novedades = hoja("Novedades de Nómina").filas;
  assert("Novedades: las 3 fechas de vacaciones de Ana", novedades.filter((f) => f[0] === "1" && f[5] === "V").map((f) => f[2]),
    [19, 20, 21].map((d) => new Date(2026, 9, d).toLocaleDateString("es-CO")));
  assert("Informe: incluye las fechas de vacaciones", informe.length > 0 && hoja("Informe Horas Extras").filas.filter((f) => f[0] === "1" && f[3] === "Vacaciones").length, 3);

  const filasInforme = hoja("Informe Horas Extras").filas.slice(2, -1);
  const claves = filasInforme.map((f) => `${f[0]}|${f[2]}`);
  assert("Informe: sin registros duplicados", new Set(claves).size, claves.length);
  const totalExtrasInforme = r2(filasInforme.reduce((acc, f) => acc + (Number(f[7]) || 0), 0));
  const totalExtrasPantalla = r2(["1", "2"].reduce((acc, d) => acc + app.calcularResumenPeriodo(app.empleados.get(d)).extrasOrdinarias, 0));
  assert("Informe: total de extras diurnas = pantalla", totalExtrasInforme, totalExtrasPantalla);
  assert("Informe: números como números (no texto)", typeof filasInforme.find((f) => f[0] === "2")[6], "number");
}

// ─── Validaciones y configuración ─────────────────────────────────────────
seccion("Documento, contraseña y colores fijos");
{
  const app = crearApp();
  assert("Documento: quita letras, espacios y símbolos", app.normalizarDocumento(" 01 2a-3."), "0123");
  assert("Documento válido solo con dígitos", [app.esDocumentoValido("0123"), app.esDocumentoValido("12a"), app.esDocumentoValido("")], [true, false, false]);
  assert("Contraseña correcta: Alejostone", app.validarClaveConfiguracion("Alejostone"), true);
  assert("Contraseña anterior ya no sirve", app.validarClaveConfiguracion("Alejostone13"), false);

  app.configuracion.tiposTurnoEspeciales.I.color = "#000000";
  app.actualizarTiposTurno();
  assert("Incapacidad conserva su azul aunque se cambie la configuración", app.obtenerColorTurno("I").bg, "#1E88E5");
  assert("Colores fijos", ["I", "SC", "PR", "A", "V"].map((c) => app.tiposTurno[c].color),
    ["#1E88E5", "#9E9E9E", "#9CCC65", "#E53935", "#2E7D32"]);

  localStorage.setItem("configuracionTurnos", JSON.stringify({
    ...app.configuracion,
    versionConceptos: 2,
    tiposTurnoEspeciales: { ...app.configuracion.tiposTurnoEspeciales, I: { nombre: "Incapacitado", horas: 7, descripcion: "Incapacidad", color: "#42A5F5" } },
  }));
  const migrada = app.cargarConfiguracion();
  assert("Migración: incapacidad de 7 h pasa a 7,33 h", migrada.tiposTurnoEspeciales.I.horas, 7.33);
  assert("Migración: se restaura el color fijo", migrada.tiposTurnoEspeciales.I.color, "#1E88E5");
}

terminar();
