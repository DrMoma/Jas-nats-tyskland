/**
 * Kalkulator. A real one — four functions, percent, sign flip, repeated equals
 * and keyboard entry. Norwegian decimal comma on the way out, both the comma
 * and the point accepted on the way in.
 */

const KEYS = [
  { label: 'AC', act: 'clear', cls: 'calc-fn' },
  { label: '+/−', act: 'neg', cls: 'calc-fn' },
  { label: '%', act: 'pct', cls: 'calc-fn' },
  { label: '÷', op: '/', cls: 'calc-op' },
  { label: '7', num: '7' },
  { label: '8', num: '8' },
  { label: '9', num: '9' },
  { label: '×', op: '*', cls: 'calc-op' },
  { label: '4', num: '4' },
  { label: '5', num: '5' },
  { label: '6', num: '6' },
  { label: '−', op: '-', cls: 'calc-op' },
  { label: '1', num: '1' },
  { label: '2', num: '2' },
  { label: '3', num: '3' },
  { label: '+', op: '+', cls: 'calc-op' },
  { label: '0', num: '0', cls: 'calc-wide' },
  { label: ',', num: '.' },
  { label: '=', act: 'eq', cls: 'calc-op' },
];

const MAX_DIGITS = 12;

export function createCalculatorApp() {
  const el = document.createElement('div');
  el.className = 'calc-app';
  el.tabIndex = 0;
  el.innerHTML = `
    <div class="calc-display"><span class="calc-value">0</span></div>
    <div class="calc-keys"></div>
  `;

  const valueEl = el.querySelector('.calc-value');
  const keysEl = el.querySelector('.calc-keys');

  let current = '0'; // the number being typed, as text
  let stored = null; // the left-hand side, once an operator is pending
  let op = null;
  let fresh = true; // next digit replaces the display instead of appending
  let repeat = null; // { op, operand } so pressing = again repeats

  const buttons = new Map();

  const render = () => {
    let out = current;
    const n = Number(current);
    if (!Number.isFinite(n)) {
      out = 'ikke et tall';
    } else if (current.replace(/[-.]/g, '').length > MAX_DIGITS) {
      out = String(Number(n.toPrecision(10)));
    }
    valueEl.textContent = out.replace('.', ',');
    valueEl.classList.toggle('is-long', out.length > 9);
  };

  const markOp = () => {
    buttons.forEach((btn, key) => {
      if (key.startsWith('op:')) btn.classList.toggle('is-active', key === `op:${op}`);
    });
  };

  const digit = (d) => {
    if (fresh) {
      current = d === '.' ? '0.' : d;
      fresh = false;
    } else if (d === '.') {
      if (!current.includes('.')) current += '.';
    } else if (current === '0') {
      current = d;
    } else if (current.replace(/[-.]/g, '').length < MAX_DIGITS) {
      current += d;
    }
    render();
  };

  const compute = (a, b, o) => {
    if (o === '+') return a + b;
    if (o === '-') return a - b;
    if (o === '*') return a * b;
    return a / b;
  };

  const setOp = (o) => {
    // Chaining without pressing equals resolves what is already pending first,
    // which is what every calculator does and what fingers expect.
    if (op !== null && !fresh) {
      current = String(compute(stored, Number(current), op));
    }
    stored = Number(current);
    op = o;
    fresh = true;
    repeat = null;
    render();
    markOp();
  };

  const equals = () => {
    if (op !== null) {
      const b = Number(current);
      repeat = { op, operand: b };
      current = String(compute(stored, b, op));
      stored = null;
      op = null;
    } else if (repeat) {
      current = String(compute(Number(current), repeat.operand, repeat.op));
    } else {
      return;
    }
    fresh = true;
    render();
    markOp();
  };

  const act = (a) => {
    if (a === 'clear') {
      current = '0';
      stored = null;
      op = null;
      fresh = true;
      repeat = null;
    } else if (a === 'neg') {
      current = String(-Number(current));
    } else if (a === 'pct') {
      current = String(Number(current) / 100);
      fresh = false;
    } else if (a === 'eq') {
      equals();
      return;
    }
    render();
    markOp();
  };

  KEYS.forEach((key) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `calc-key ${key.cls || ''}`.trim();
    btn.textContent = key.label;
    btn.addEventListener('click', () => {
      if (key.num !== undefined) digit(key.num);
      else if (key.op) setOp(key.op);
      else act(key.act);
      el.focus();
    });
    keysEl.appendChild(btn);
    if (key.op) buttons.set(`op:${key.op}`, btn);
  });

  el.addEventListener('keydown', (e) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) digit(k);
    else if (k === '.' || k === ',') digit('.');
    else if (k === '+' || k === '-' || k === '*' || k === '/') setOp(k);
    else if (k === 'x' || k === 'X') setOp('*');
    else if (k === 'Enter' || k === '=') equals();
    else if (k === 'Backspace') {
      current = current.length > 1 ? current.slice(0, -1) : '0';
      if (current === '-') current = '0';
      fresh = current === '0';
      render();
    } else if (k === 'c' || k === 'C' || k === 'Delete') act('clear');
    else return;
    e.preventDefault();
  });

  render();
  return el;
}
