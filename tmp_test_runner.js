const fs = require('fs');
// Provide minimal globals to avoid DOM errors
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// Minimal document stub to satisfy DOM references in TURNOS.js
global.document = {
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ style: {}, appendChild: () => {}, querySelector: () => null }),
  body: { appendChild: () => {} },
  head: { appendChild: () => {} }
};
global.window = undefined;
// Require the module (TURNOS.js exposes the class via module.exports for testing)
const SistemaTurnosMejorado = require('./TURNOS.js');
const s = new SistemaTurnosMejorado({ skipUI: true });

const tests = [
  {inicio: '07:00', fin: '19:00', conf: { tipo: 'predefinido', tiempoEnHoras: 1 }, es24: false, expectedHours: 11},
  {inicio: '07:00', fin: '19:00', conf: { tipo: 'predefinido', tiempoEnHoras: 0.5 }, es24: false, expectedHours: 11.5},
  {inicio: '19:00', fin: '07:00', conf: { tipo: 'predefinido', tiempoEnHoras: 1 }, es24: false, expectedHours: 11},
  {inicio: '06:30', fin: '15:30', conf: { tipo: 'predefinido', tiempoEnHoras: 0.5 }, es24: false, expectedHours: 8.5},
  {inicio: '07:00', fin: '07:00', conf: { tipo: 'predefinido', tiempoEnHoras: 0.5 }, es24: true, expectedHours: 24 - 0.5},
];

for (const t of tests) {
  const minutos = s.contarMinutosEfectivos(t.inicio, t.fin, t.conf, t.es24);
  const horas = minutos / 60;
  console.log(`${t.inicio} -> ${t.fin} | alm ${t.conf.tiempoEnHoras}h | horas=${horas} (esperado ${t.expectedHours})`);
}
