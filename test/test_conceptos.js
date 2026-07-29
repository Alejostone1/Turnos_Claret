// Test: reglas de comportamiento de conceptos especiales
// Ejecutar con Node.js headless (sin DOM)

global.document = {
  addEventListener: function() {},
  getElementById: function() { return { addEventListener: function(){}, value: '' }; },
  querySelector: function() { return null; },
  querySelectorAll: function() { return []; },
  getElementById: function() {
    return { addEventListener: function(){}, value: '', innerHTML: '', textContent: '', style: {}, classList: { add:function(){}, remove:function(){}, toggle:function(){} }, querySelectorAll: function(){ return []; } };
  }
};
global.window = {};
global.localStorage = { getItem: function() { return null; }, setItem: function() {} };
global.alert = function() {};
global.confirm = function() { return false; };

const SistemaTurnosMejorado = require(__dirname + "/../archivos/TURNOS.js");

const app = new SistemaTurnosMejorado();
app.configuracion = {
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
assert("I  suma acumulador +7",  app._obtenerAjusteConceptoEspecial("I",  false), { ajusteAcumulador: 7,  ajusteTope: 0  });
assert("PR suma acumulador +7",  app._obtenerAjusteConceptoEspecial("PR", false), { ajusteAcumulador: 7,  ajusteTope: 0  });
assert("V  suma acumulador +7",  app._obtenerAjusteConceptoEspecial("V",  false), { ajusteAcumulador: 7,  ajusteTope: 0  });
assert("A  resta acumulador -7", app._obtenerAjusteConceptoEspecial("A",  false), { ajusteAcumulador: -7, ajusteTope: 0  });
assert("SC reduce tope -7 (Lun)",app._obtenerAjusteConceptoEspecial("SC", false), { ajusteAcumulador: 0,  ajusteTope: -7 });
assert("SC DOM no reduce tope",  app._obtenerAjusteConceptoEspecial("SC", true),  { ajusteAcumulador: 0,  ajusteTope: 0  });
assert("C  ninguno",             app._obtenerAjusteConceptoEspecial("C",  false), { ajusteAcumulador: 0,  ajusteTope: 0  });

// --- Comportamiento ---
assert("I  = suma",        app._obtenerComportamientoConceptoEspecial("I"),  "suma");
assert("PR = suma",        app._obtenerComportamientoConceptoEspecial("PR"), "suma");
assert("V  = suma",        app._obtenerComportamientoConceptoEspecial("V"),  "suma");
assert("A  = resta",       app._obtenerComportamientoConceptoEspecial("A"),  "resta");
assert("SC = reduce_tope", app._obtenerComportamientoConceptoEspecial("SC"), "reduce_tope");

// --- SC con horas configuradas en 8 (dinámico) ---
app.configuracion.tiposTurnoEspeciales.SC.horas = 8;
assert("SC reduce tope -8 (dinamico)", app._obtenerAjusteConceptoEspecial("SC", false), { ajusteAcumulador: 0, ajusteTope: -8 });
app.configuracion.tiposTurnoEspeciales.SC.horas = 7;

console.log("\nResultado:", ok, "OK,", fail, "FAIL");
process.exit(fail > 0 ? 1 : 0);
