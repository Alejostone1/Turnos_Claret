// Test: reglas de comportamiento de conceptos especiales
// Ejecutar: node test/test_conceptos.js
const { crearApp, agregarEmpleado, assert, seccion, terminar } = require("./entorno_prueba");

const app = crearApp();

seccion("Comportamiento por concepto");
assert("I  = suma_tope",   app._obtenerComportamientoConceptoEspecial("I"),  "suma_tope");
assert("V  = suma_tope",   app._obtenerComportamientoConceptoEspecial("V"),  "suma_tope");
assert("PR = cubre_deuda", app._obtenerComportamientoConceptoEspecial("PR"), "cubre_deuda");
assert("A  = resta",       app._obtenerComportamientoConceptoEspecial("A"),  "resta");
assert("SC = reduce_tope", app._obtenerComportamientoConceptoEspecial("SC"), "reduce_tope");
assert("C  = ninguno",     app._obtenerComportamientoConceptoEspecial("C"),  "ninguno");

seccion("Ajustes al acumulado y al tope");
const habil = { esFestivo: false, semanaConTurnoReal: true };
assert("I lunes con turno real: suma 7,33",
  app._obtenerAjusteConceptoEspecial("I", false, habil),
  { ajusteAcumulador: 7.33, ajusteTope: 0, horasCubreDeuda: 7.33, horasReconocidas: 7.33 });
assert("V domingo: no suma",
  app._obtenerAjusteConceptoEspecial("V", true, habil),
  { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: 0, horasReconocidas: 0 });
assert("V festivo: no suma",
  app._obtenerAjusteConceptoEspecial("V", false, { esFestivo: true, semanaConTurnoReal: true }),
  { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: 0, horasReconocidas: 0 });
assert("I sin turno real en la semana: no suma, pero cubre deuda",
  app._obtenerAjusteConceptoEspecial("I", false, { esFestivo: false, semanaConTurnoReal: false }),
  { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: 7.33, horasReconocidas: 0 });
assert("PR: solo cubre deuda",
  app._obtenerAjusteConceptoEspecial("PR", false, habil),
  { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: 7, horasReconocidas: 0 });
assert("A: resta 7",
  app._obtenerAjusteConceptoEspecial("A", false),
  { ajusteAcumulador: -7, ajusteTope: 0, horasCubreDeuda: 0, horasReconocidas: 0 });
assert("SC lunes: reduce el tope 7",
  app._obtenerAjusteConceptoEspecial("SC", false),
  { ajusteAcumulador: 0, ajusteTope: -7, horasCubreDeuda: 0, horasReconocidas: 0 });
assert("SC domingo: no reduce el tope",
  app._obtenerAjusteConceptoEspecial("SC", true),
  { ajusteAcumulador: 0, ajusteTope: 0, horasCubreDeuda: 0, horasReconocidas: 0 });

app.configuracion.tiposTurnoEspeciales.SC.horas = 8;
assert("SC con 8 h configuradas reduce el tope 8", app._obtenerAjusteConceptoEspecial("SC", false).ajusteTope, -8);
app.configuracion.tiposTurnoEspeciales.SC.horas = 7;

seccion("Conceptos personalizados reconocidos por nombre");
app.configuracion.tiposTurnoEspeciales.LM = { nombre: "Licencia por incapacidad médica", horas: 7.33, descripcion: "" };
assert("Concepto con 'incapacidad' en el nombre se trata como I", app._obtenerComportamientoConceptoEspecial("LM"), "suma_tope");
delete app.configuracion.tiposTurnoEspeciales.LM;

seccion("El Informe Horas Extras incluye las fechas de los conceptos");
{
  const a = crearApp();
  agregarEmpleado(a, { documento: "11", nombre: "ale", inicio: "2026-10-04", semanas: [
    ["V", "V", "V", "V", "V", "D", "D"],
    ["I", "I", "I", "D", "D", "I", "C"],
  ] });
  a.calcularTurnos();
  const filas = a._generarDatosInformeHorasExtras().data;
  const fecha = (d) => new Date(2026, 9, d).toLocaleDateString("es-CO");
  const tipo = (d) => (filas.find((f) => f[2] === fecha(d)) || [])[3];
  assert("4/10 domingo de vacaciones", tipo(4), "Vacaciones");
  assert("8/10 vacaciones", tipo(8), "Vacaciones");
  assert("11/10 incapacidad", tipo(11), "Incapacitado");
  assert("16/10 incapacidad", tipo(16), "Incapacitado");
  assert("17/10 libre no aparece", tipo(17), undefined);
  assert("Días con concepto: 0 horas trabajadas", (filas.find((f) => f[2] === fecha(5)) || [])[6], "");
}

terminar();
