// Entorno mínimo para ejecutar TURNOS.js en Node.js (sin navegador).
// Simula document/window/localStorage lo justo para instanciar la clase.

function elementoFalso() {
  const valores = { value: "", innerHTML: "", textContent: "" };
  const fn = function () { return elementoFalso(); };
  return new Proxy(fn, {
    get(_, prop) {
      if (prop in valores) return valores[prop];
      if (prop === "length") return 0;
      if (prop === "querySelector") return () => elementoFalso();
      if (prop === "querySelectorAll") return () => [];
      if (prop === Symbol.toPrimitive) return () => "";
      return elementoFalso();
    },
    set(_, prop, v) { valores[prop] = v; return true; },
  });
}

function crearAlmacen() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    clear: () => datos.clear(),
  };
}

global.document = {
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById: elementoFalso,
  createElement: elementoFalso,
};
global.window = { addEventListener() {} };
global.localStorage = crearAlmacen();
global.sessionStorage = crearAlmacen();
global.alert = () => {};
global.confirm = () => true;

const SistemaTurnosMejorado = require(__dirname + "/../archivos/TURNOS.js");

/**
 * Crea una instancia lista para calcular, con turnos de prueba y alimentación de 1 hora.
 */
function crearApp({ almuerzo = { tipo: "predefinido", tiempoEnHoras: 1 } } = {}) {
  global.localStorage.clear();
  const app = new SistemaTurnosMejorado({ skipUI: true });
  app.configuracionAlmuerzo = almuerzo;
  app.configuracion.turnosDinamicos = {
    D: { id: "t_dia", nombre: "Día", codigo: "D", inicio: "06:00", fin: "18:00", color: "#fef3c7", descontarAlimentacion: true, activo: true },
    N: { id: "t_noche", nombre: "Noche", codigo: "N", inicio: "18:00", fin: "06:00", color: "#dbeafe", descontarAlimentacion: true, activo: true },
    "24T": { id: "t_24", nombre: "24 Horas", codigo: "24T", inicio: "07:00", fin: "07:00", color: "#e9d5ff", descontarAlimentacion: true, activo: true },
    S7: { id: "t_s7", nombre: "Siete", codigo: "S7", inicio: "07:00", fin: "14:00", color: "#a7f3d0", descontarAlimentacion: false, activo: true },
    X10: { id: "t_x10", nombre: "Diez", codigo: "X10", inicio: "07:00", fin: "17:00", color: "#fde68a", descontarAlimentacion: false, activo: true },
    NM: { id: "t_nm", nombre: "Noche corta", codigo: "NM", inicio: "22:00", fin: "06:00", color: "#c7d2fe", descontarAlimentacion: false, activo: true },
    MA: { id: "t_ma", nombre: "Madrugada", codigo: "MA", inicio: "04:00", fin: "12:00", color: "#fecaca", descontarAlimentacion: false, activo: true },
  };
  app.actualizarTiposTurno();
  app.mostrarResultados = () => {};
  app.navegarA = () => {};
  app.mostrarNotificacion = () => {};
  return app;
}

/**
 * Agrega un empleado cuyo período es [inicio, inicio + 7*semanas - 1] y le asigna turnos.
 * @param {string[][]} semanas  Turnos por semana, de domingo a sábado.
 */
function agregarEmpleado(app, { documento = "100", nombre = "Empleado Prueba", salario = 1750905, inicio, semanas }) {
  const [a, m, d] = inicio.split("-").map(Number);
  const fin = new Date(a, m - 1, d + semanas.length * 7 - 1);
  const finKey = app._fechaKey(fin);
  app.agregarEmpleado(documento, nombre, salario, inicio, finKey);
  const emp = app.empleados.get(documento);
  semanas.forEach((turnos, s) => {
    turnos.forEach((turno, i) => {
      const fecha = new Date(a, m - 1, d + s * 7 + i);
      emp.turnosGuardados.set(app._fechaKey(fecha), { turno });
    });
  });
  return emp;
}

let ok = 0;
let fail = 0;
function assert(descripcion, actual, esperado) {
  const pasa = JSON.stringify(actual) === JSON.stringify(esperado);
  console.log((pasa ? "  ✓ " : "  ✗ ") + descripcion);
  if (!pasa) console.log("     Esperado:", JSON.stringify(esperado), " Actual:", JSON.stringify(actual));
  pasa ? ok++ : fail++;
}
function seccion(titulo) {
  console.log(`\n${titulo}`);
}
function terminar() {
  console.log(`\nResultado: ${ok} OK, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

const r2 = (x) => Math.round((x || 0) * 100) / 100;
const extras = (r) => r2(r.extrasOrdinarias + r.extrasNocturnas + r.extrasFestivas + r.extrasNocturnasFestivas);

module.exports = { SistemaTurnosMejorado, crearApp, agregarEmpleado, assert, seccion, terminar, r2, extras };
