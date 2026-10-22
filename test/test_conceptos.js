// Test: reglas de comportamiento de conceptos especiales
// Ejecutar con Node.js headless (sin DOM)

// Elemento DOM falso: cualquier propiedad es otro elemento falso invocable
function elementoFalso() {
  const valores = { value: '', innerHTML: '', textContent: '' };
  const fn = function() { return elementoFalso(); };
  return new Proxy(fn, {
    get(_, prop) {
      if (prop in valores) return valores[prop];
      if (prop === "querySelector") return () => null;
      if (prop === "querySelectorAll") return () => [];
      if (prop === Symbol.toPrimitive) return () => '';
      return elementoFalso();
    },
    set(_, prop, v) { valores[prop] = v; return true; }
  });
}
global.document = {
  addEventListener: function() {},
  querySelector: function() { return null; },
  querySelectorAll: function() { return []; },
  getElementById: elementoFalso,
  createElement: elementoFalso
};
global.window = {};
global.localStorage = { getItem: function() { return null; }, setItem: function() {} };
global.alert = function() {};
global.confirm = function() { return false; };

const SistemaTurnosMejorado = require(__dirname + "/../archivos/TURNOS.js");

const app = new SistemaTurnosMejorado();
app.configuracion = {
  ...app.configuracion,
  tiposTurnoEspeciales: {
    I:  { nombre: "Incapacitado",       horas: 7, descripcion: "Incapacidad"        },
    PR: { nombre: "Permiso remunerado", horas: 7, descripcion: "Permiso remunerado" },
    V:  { nombre: "Vacaciones",         horas: 7, descripcion: "Vacaciones"         },
    A:  { nombre: "Ausencia",           horas: 7, descripcion: "Ausencia"           },
    SC: { nombre: "Sin contrato",       horas: 7, descripcion: "Sin contrato"       },
  },
  versionConceptos: 2
};

let ok = 0, fail = 0;
function assert(desc, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((pass ? "✓" : "✗") + " " + desc);
  if (!pass) console.log("  Esperado:", expected, "  Actual:", actual);
  pass ? ok++ : fail++;
}

// --- Helpers ---
assert("I  no suma acumulador, cubre deuda 7",  app._obtenerAjusteConceptoEspecial("I",  false), { ajusteAcumulador: 0,  ajusteTope: 0,  horasCubreDeuda: 7 });
assert("PR no suma acumulador, cubre deuda 7",  app._obtenerAjusteConceptoEspecial("PR", false), { ajusteAcumulador: 0,  ajusteTope: 0,  horasCubreDeuda: 7 });
assert("V  no suma acumulador, cubre deuda 7",  app._obtenerAjusteConceptoEspecial("V",  false), { ajusteAcumulador: 0,  ajusteTope: 0,  horasCubreDeuda: 7 });
assert("A  resta acumulador -7", app._obtenerAjusteConceptoEspecial("A",  false), { ajusteAcumulador: -7, ajusteTope: 0,  horasCubreDeuda: 0 });
assert("SC reduce tope -7 (Lun)",app._obtenerAjusteConceptoEspecial("SC", false), { ajusteAcumulador: 0,  ajusteTope: -7, horasCubreDeuda: 0 });
assert("SC DOM no reduce tope",  app._obtenerAjusteConceptoEspecial("SC", true),  { ajusteAcumulador: 0,  ajusteTope: 0,  horasCubreDeuda: 0 });
assert("C  ninguno",             app._obtenerAjusteConceptoEspecial("C",  false), { ajusteAcumulador: 0,  ajusteTope: 0,  horasCubreDeuda: 0 });

// --- Comportamiento ---
assert("I  = cubre_deuda", app._obtenerComportamientoConceptoEspecial("I"),  "cubre_deuda");
assert("PR = cubre_deuda", app._obtenerComportamientoConceptoEspecial("PR"), "cubre_deuda");
assert("V  = cubre_deuda", app._obtenerComportamientoConceptoEspecial("V"),  "cubre_deuda");
assert("A  = resta",       app._obtenerComportamientoConceptoEspecial("A"),  "resta");
assert("SC = reduce_tope", app._obtenerComportamientoConceptoEspecial("SC"), "reduce_tope");

// --- SC con horas configuradas en 8 (dinámico) ---
app.configuracion.tiposTurnoEspeciales.SC.horas = 8;
assert("SC reduce tope -8 (dinamico)", app._obtenerAjusteConceptoEspecial("SC", false), { ajusteAcumulador: 0, ajusteTope: -8, horasCubreDeuda: 0 });
app.configuracion.tiposTurnoEspeciales.SC.horas = 7;

// --- Semana completa: I/PR/V no generan horas ni adelantan extras, pero cubren deuda ---
app.configuracion.turnosDinamicos = {
  D: { nombre: "Dia", inicio: "06:00", fin: "14:00", activo: true, descontarAlimentacion: false },
};
app.actualizarTiposTurno();
app.mostrarResultados = function() {};
app.navegarA = function() {};

// Semana dom 18-oct-2026 a sab 24-oct-2026 (sin festivos lunes-sabado)
function calcularSemana(turnos) {
  const dias = turnos.map((_, i) => ({ fecha: new Date(2026, 9, 18 + i, 12), nombreDia: "d" + i, esFestivo: i === 0 }));
  const turnosGuardados = new Map();
  dias.forEach((d, i) => turnosGuardados.set(d.fecha.toISOString().split("T")[0], { turno: turnos[i] }));
  const empleado = { documento: "1", turnosGuardados, semanas: [{ numero: 1, dias, inicioSemana: dias[0].fecha, finSemana: dias[6].fecha }] };
  app.empleados = new Map([["1", empleado]]);
  app.calcularTurnos();
  return empleado.resultados[0];
}
const extras = (r) => r.extrasOrdinarias + r.extrasNocturnas + r.extrasFestivas + r.extrasNocturnasFestivas;

let sem = calcularSemana(["C", "I", "D", "D", "D", "D", "D"]);
assert("I + 40h trabajadas: 0 extras", extras(sem.resumen), 0);
assert("I + 40h trabajadas: 40h ordinarias", sem.resumen.horasOrdinarias, 40);
assert("I + 40h trabajadas: deuda 0 (40 + 7 cubre 42)", sem.resumen.horasDeuda, 0);
assert("Dia I no genera horas", [sem.turnos[1].totalHoras, sem.turnos[1].horasOrdinarias, extras(sem.turnos[1])], [0, 0, 0]);
assert("Dia I informa 7h justificadas", sem.turnos[1].horasEquivalentesTope, 7);
assert("Tope sigue en 42", sem.horasMaximas, 42);

sem = calcularSemana(["C", "V", "PR", "D", "D", "D", "D"]);
assert("V + PR + 32h trabajadas: 0 extras", extras(sem.resumen), 0);
assert("V + PR + 32h trabajadas: deuda 0 (32 + 14 cubre 42)", sem.resumen.horasDeuda, 0);

sem = calcularSemana(["C", "I", "I", "D", "D", "D", "C"]);
assert("2 I + 24h trabajadas: deuda 4 (42 - 24 - 14)", sem.resumen.horasDeuda, 4);

sem = calcularSemana(["C", "D", "D", "D", "D", "D", "D"]);
assert("Control 48h trabajadas: 6 extras", extras(sem.resumen), 6);

// --- Exportación: los días con I/PR/V deben salir en el Informe Horas Extras ---
calcularSemana(["C", "I", "V", "PR", "D", "D", "C"]);
const informe = app._generarDatosInformeHorasExtras().data;
const filaDe = (fechaTxt) => informe.find((f) => f[2] === fechaTxt);
const fechaCO = (dia) => new Date(2026, 9, dia, 12).toLocaleDateString("es-CO");
assert("Informe incluye fecha de I (19-oct)", filaDe(fechaCO(19))?.[3], "Incapacitado");
assert("Informe incluye fecha de V (20-oct)", filaDe(fechaCO(20))?.[3], "Vacaciones");
assert("Informe incluye fecha de PR (21-oct)", filaDe(fechaCO(21))?.[3], "Permiso remunerado");
assert("Fila de I con 0 horas trabajadas", Number(filaDe(fechaCO(19))?.[6]), 0);
assert("Informe no incluye dias libres C", filaDe(fechaCO(18)), undefined);

console.log("\nResultado:", ok, "OK,", fail, "FAIL");
process.exit(fail > 0 ? 1 : 0);
