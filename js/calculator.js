// ============================================================
//  CALCULADORA
// ============================================================

let calcState = { display: '0', prevValue: null, operator: null, waitingForNewValue: false };

function openCalculator() {
  document.getElementById('calcModal').classList.add('open');
}

function closeCalculator() {
  document.getElementById('calcModal').classList.remove('open');
}

function calcRender() {
  document.getElementById('calcDisplay').textContent = calcState.display;
}

function calcInput(digit) {
  if (calcState.waitingForNewValue) {
    calcState.display = digit;
    calcState.waitingForNewValue = false;
  } else {
    calcState.display = calcState.display === '0' ? digit : calcState.display + digit;
  }
  calcRender();
}

function calcDecimal() {
  if (calcState.waitingForNewValue) {
    calcState.display = '0.';
    calcState.waitingForNewValue = false;
  } else if (!calcState.display.includes('.')) {
    calcState.display += '.';
  }
  calcRender();
}

function calcBackspace() {
  if (calcState.waitingForNewValue) return;
  calcState.display = calcState.display.length > 1 ? calcState.display.slice(0, -1) : '0';
  calcRender();
}

function calcClear() {
  calcState = { display: '0', prevValue: null, operator: null, waitingForNewValue: false };
  calcRender();
}

function calcCompute(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
    case '%': return a % b;
    default: return b;
  }
}

function calcOperator(op) {
  const current = parseFloat(calcState.display);
  if (calcState.operator && !calcState.waitingForNewValue) {
    const result = calcCompute(calcState.prevValue, current, calcState.operator);
    calcState.display = formatCalcResult(result);
    calcState.prevValue = result;
  } else {
    calcState.prevValue = current;
  }
  calcState.operator = op;
  calcState.waitingForNewValue = true;
  calcRender();
}

function calcEquals() {
  if (calcState.operator === null) return;
  const current = parseFloat(calcState.display);
  const result = calcCompute(calcState.prevValue, current, calcState.operator);
  calcState.display = formatCalcResult(result);
  calcState.operator = null;
  calcState.prevValue = null;
  calcState.waitingForNewValue = true;
  calcRender();
}

function formatCalcResult(n) {
  if (isNaN(n) || !isFinite(n)) return 'Error';
  return String(Math.round(n * 1e10) / 1e10);
}
