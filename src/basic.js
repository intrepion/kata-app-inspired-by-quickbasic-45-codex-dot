// Bytewell's small, independent BASIC interpreter. No eval, Function or host access.
export const LIMITS = Object.freeze({ source: 200000, lines: 5000, line: 2048, steps: 100000, output: 65536, string: 8192, variables: 256, drawing: 10000 });
export class BasicError extends Error {
  constructor(message, line = 0) { super(message); this.name = 'BasicError'; this.line = line; }
}
const fail = message => { throw new BasicError(message); };
const num = value => typeof value === 'number' && Number.isFinite(value) ? value : fail('Expected a finite number.');
const str = value => typeof value === 'string' ? value : fail('Expected a string.');
const bounded = value => typeof value === 'string' ? (value.length <= LIMITS.string ? value : fail('String limit exceeded (8,192 characters).')) : num(value);
export const formatValue = value => typeof value === 'number' ? String(Number(value.toPrecision(12))) : value;
const isName = text => /^[A-Z][A-Z0-9_]*\$?$/i.test(text);

function tokens(text) {
  const list = []; let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text[i] === '"') {
      let value = ''; i++; let closed = false;
      while (i < text.length) {
        if (text[i] === '"') { if (text[i + 1] === '"') { value += '"'; i += 2; } else { i++; closed = true; break; } }
        else value += text[i++];
      }
      if (!closed) fail('Unclosed string.');
      list.push({ type: 'value', value }); continue;
    }
    const n = text.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (n) { list.push({ type: 'value', value: num(Number(n[0])) }); i += n[0].length; continue; }
    const id = text.slice(i).match(/^[a-zA-Z][a-zA-Z0-9_]*\$?/);
    if (id) { list.push({ type: 'name', value: id[0].toUpperCase() }); i += id[0].length; continue; }
    const op = text.slice(i).match(/^(?:<=|>=|<>|[+\-*/\\^=<>(),])/);
    if (op) { list.push({ type: 'op', value: op[0] }); i += op[0].length; continue; }
    fail(`Unexpected character “${text[i]}”.`);
  }
  return list;
}
const powers = { OR: 1, AND: 2, '=': 4, '<>': 4, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, MOD: 6, '\\': 7, '*': 8, '/': 8, '^': 10 };
export function expression(text, variables = Object.create(null), random = Math.random) {
  if (!text.trim()) fail('Expected an expression.');
  if (text.length > LIMITS.line) fail('Expression is too long.');
  const ts = tokens(text); let at = 0;
  const call = (name, args) => {
    const arity = (min, max = min) => { if (args.length < min || args.length > max) fail(`${name} expects ${min === max ? min : `${min}–${max}`} argument(s).`); };
    switch (name) {
      case 'ABS': arity(1); return Math.abs(num(args[0]));
      case 'INT': arity(1); return Math.floor(num(args[0]));
      case 'SQR': arity(1); return Math.sqrt(num(args[0]));
      case 'SIN': arity(1); return Math.sin(num(args[0]));
      case 'COS': arity(1); return Math.cos(num(args[0]));
      case 'LEN': arity(1); return str(args[0]).length;
      case 'STR$': arity(1); return (num(args[0]) >= 0 ? ' ' : '') + formatValue(args[0]);
      case 'VAL': { arity(1); const n = parseFloat(str(args[0])); return Number.isNaN(n) ? 0 : n; }
      case 'CHR$': arity(1); if (num(args[0]) < 0 || args[0] > 255) fail('CHR$ expects a value from 0 to 255.'); return String.fromCharCode(Math.trunc(args[0]));
      case 'ASC': arity(1); if (!str(args[0]).length) fail('ASC cannot read an empty string.'); return args[0].charCodeAt(0);
      case 'LEFT$': case 'RIGHT$': { arity(2); const s = str(args[0]), n = Math.trunc(num(args[1])); if (n < 0) fail('Length cannot be negative.'); return name === 'LEFT$' ? s.slice(0, n) : n ? s.slice(-n) : ''; }
      case 'MID$': { arity(2, 3); const s = str(args[0]), start = Math.trunc(num(args[1])), length = args.length === 3 ? Math.trunc(num(args[2])) : s.length; if (start < 1 || length < 0) fail('MID$ requires a positive start and nonnegative length.'); return s.slice(start - 1, start - 1 + length); }
      case 'RND': arity(0); return random();
      default: fail(`Unsupported function “${name}”. Arrays and user functions are not supported.`);
    }
  };
  function parse(min = 0, depth = 0) {
    if (depth > 64) fail('Expression nesting limit exceeded.');
    const token = ts[at++]; if (!token) fail('Incomplete expression.');
    let value;
    if (token.type === 'op' && (token.value === '+' || token.value === '-')) value = (token.value === '-' ? -1 : 1) * num(parse(9, depth + 1));
    else if (token.type === 'name' && token.value === 'NOT') value = ~num(parse(3, depth + 1));
    else if (token.type === 'op' && token.value === '(') { value = parse(0, depth + 1); if (ts[at++]?.value !== ')') fail('Expected “)”.'); }
    else if (token.type === 'value') value = token.value;
    else if (token.type === 'name') {
      if (ts[at]?.value === '(') {
        at++; const args = [];
        if (ts[at]?.value !== ')') { do { args.push(parse(0, depth + 1)); if (ts[at]?.value !== ',') break; at++; } while (true); }
        if (ts[at++]?.value !== ')') fail('Expected “)” after function arguments.');
        value = call(token.value, args);
      } else value = token.value === 'RND' ? random() : (variables[token.value] ?? (token.value.endsWith('$') ? '' : 0));
    } else fail('Expected a number, string or variable.');
    while (at < ts.length) {
      const op = ts[at].value, power = ts[at].type === 'value' ? undefined : powers[op];
      if (power === undefined || power < min) break;
      at++; const right = parse(op === '^' ? power : power + 1, depth + 1);
      if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
        if (typeof value !== typeof right) fail('Cannot compare strings and numbers.');
        value = ({ '=': value === right, '<>': value !== right, '<': value < right, '>': value > right, '<=': value <= right, '>=': value >= right })[op] ? -1 : 0;
      } else if (op === '+' && typeof value === 'string' && typeof right === 'string') value += right;
      else {
        const a = num(value), b = num(right);
        if (['/', '\\', 'MOD'].includes(op) && b === 0) fail('Division by zero.');
        switch (op) {
          case '+': value = a + b; break; case '-': value = a - b; break;
          case '*': value = a * b; break; case '/': value = a / b; break;
          case '\\': value = Math.trunc(a / b); break; case 'MOD': value = Math.trunc(a) % Math.trunc(b); break;
          case '^': value = a ** b; break; case 'AND': value = a & b; break; case 'OR': value = a | b; break;
        }
      }
      bounded(value);
    }
    return bounded(value);
  }
  const result = parse(); if (at !== ts.length) fail(`Unexpected token “${ts[at].value}”.`); return result;
}

// Delimit only outside quoted strings and parentheses.
export function splitOutside(text, delimiters = ',;') {
  let quoted = false, depth = 0, start = 0; const parts = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quoted && text[i + 1] === '"') { i++; continue; } quoted = !quoted; }
    if (quoted) continue;
    if (text[i] === '(') depth++; if (text[i] === ')') depth--;
    if (depth === 0 && delimiters.includes(text[i])) { parts.push({ text: text.slice(start, i).trim(), delimiter: text[i] }); start = i + 1; }
  }
  parts.push({ text: text.slice(start).trim(), delimiter: '' }); return parts;
}
function stripComment(text) {
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quoted && text[i + 1] === '"') { i++; continue; } quoted = !quoted; }
    if (!quoted && text[i] === "'") return text.slice(0, i).trim();
  }
  return text.trim();
}
function keywordSplit(text, keyword) {
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quoted && text[i + 1] === '"') { i++; continue; } quoted = !quoted; }
    if (!quoted && text.slice(i, i + keyword.length).toUpperCase() === keyword && /\s/.test(text[i - 1] || ' ') && /\s/.test(text[i + keyword.length] || ' ')) return [text.slice(0, i).trim(), text.slice(i + keyword.length).trim()];
  }
  return null;
}
function coordinateTuple(text) {
  text = text.trim(); if (text[0] !== '(') fail('Expected coordinates in parentheses.');
  let depth = 0, quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quoted && text[i + 1] === '"') { i++; continue; } quoted = !quoted; }
    if (quoted) continue;
    if (text[i] === '(') depth++;
    if (text[i] === ')' && --depth === 0) return [text.slice(1, i), text.slice(i + 1).trim()];
  }
  fail('Unclosed coordinate parentheses.');
}
function statement(text, line, inline = false) {
  let m; const node = { line, text };
  const make = (op, extra = {}) => ({ ...node, op, ...extra });
  if (!text || /^REM(?:\s|$)/i.test(text)) return make('NOP');
  if ((m = text.match(/^IF\s+(.+)$/i))) {
    if (inline) fail('Nested inline IF is unsupported. Use block IF.');
    const parts = keywordSplit(m[1], 'THEN'); if (!parts) fail('IF needs THEN.');
    if (!parts[1]) return make('IF', { condition: parts[0] });
    const branches = keywordSplit(parts[1], 'ELSE') || [parts[1], ''];
    const parseBranch = branch => /^\d+$/.test(branch) ? statement(`GOTO ${branch}`, line, true) : statement(branch, line, true);
    return make('INLINE', { condition: parts[0], yes: parseBranch(branches[0]), no: parseBranch(branches[1]) });
  }
  if (/^ELSE$/i.test(text)) return make('ELSE');
  if (/^END\s+IF$/i.test(text)) return make('ENDIF');
  if ((m = text.match(/^FOR\s+([A-Z][A-Z0-9_]*)\s*=\s*(.+)$/i))) {
    const range = keywordSplit(m[2], 'TO'); if (!range) fail('FOR needs TO.');
    const endStep = keywordSplit(range[1], 'STEP') || [range[1], '1'];
    return make('FOR', { name: m[1].toUpperCase(), start: range[0], end: endStep[0], increment: endStep[1] });
  }
  if ((m = text.match(/^NEXT(?:\s+([A-Z][A-Z0-9_]*))?$/i))) return make('NEXT', { name: m[1]?.toUpperCase() });
  if ((m = text.match(/^WHILE\s+(.+)$/i))) return make('WHILE', { condition: m[1] });
  if (/^WEND$/i.test(text)) return make('WEND');
  if ((m = text.match(/^(?:LET\s+)?([A-Z][A-Z0-9_]*\$?)\s*=\s*(.+)$/i))) return make('ASSIGN', { name: m[1].toUpperCase(), value: m[2] });
  if ((m = text.match(/^(?:PRINT\b|\?)(.*)$/i))) return make('PRINT', { value: m[1].trim() });
  if ((m = text.match(/^INPUT\s+(.+)$/i))) {
    const fields = splitOutside(m[1], ';');
    if (fields.length > 2) fail('INPUT supports one variable and an optional prompt.');
    const name = fields.at(-1).text.toUpperCase(); if (!isName(name)) fail('INPUT requires one scalar variable.');
    return make('INPUT', { name, prompt: fields.length === 2 ? fields[0].text : '"? "' });
  }
  if ((m = text.match(/^(GOTO|GOSUB)\s+([A-Z][A-Z0-9_]*|\d+)$/i))) return make(m[1].toUpperCase(), { label: m[2].toUpperCase() });
  if (/^(END|STOP|RETURN|CLS)$/i.test(text)) return make(text.toUpperCase());
  if ((m = text.match(/^(COLOR|SCREEN)\s+(.+)$/i))) return make(m[1].toUpperCase(), { value: m[2] });
  if ((m = text.match(/^(PSET|LINE|CIRCLE)\s*(\(.*)$/i))) {
    const op = m[1].toUpperCase(), [coordinates, rest] = coordinateTuple(m[2]);
    if (op === 'LINE') {
      if (!rest.startsWith('-')) fail('LINE needs (x,y)-(x,y).');
      const [to, tail] = coordinateTuple(rest.slice(1));
      if (tail && !tail.startsWith(',')) fail('Expected a comma before the color.');
      return make('LINE', { from: coordinates, to, extra: tail.slice(1).trim() });
    }
    if ((rest && !rest.startsWith(',')) || (op === 'CIRCLE' && !rest.startsWith(','))) fail('Expected a comma after the coordinates.');
    return op === 'PSET' ? make(op, { coordinates, color: rest.slice(1).trim() }) : make(op, { coordinates, extra: rest.slice(1).trim() });
  }
  fail(`Unsupported or invalid statement: ${text.slice(0, 55)}. See Language guide.`);
}

export function compile(source) {
  if (typeof source !== 'string' || source.length > LIMITS.source) fail('Source must be text under 200,000 characters.');
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > LIMITS.lines) fail('Program exceeds 5,000 lines.');
  const nodes = [], labels = new Map(), stack = [];
  function label(name, line) { if (labels.has(name)) throw new BasicError(`Duplicate label ${name}.`, line); labels.set(name, nodes.length); }
  lines.forEach((raw, index) => {
    const line = index + 1;
    try {
      if (raw.length > LIMITS.line) fail('Line exceeds 2,048 characters.');
      let text = stripComment(raw), m;
      if ((m = text.match(/^(\d+)\s*(.*)$/))) { label(m[1], line); text = m[2]; }
      if ((m = text.match(/^([A-Z][A-Z0-9_]*):\s*$/i))) { label(m[1].toUpperCase(), line); return; }
      const n = statement(text, line); if (n.op === 'NOP') return;
      const index = nodes.length;
      if (['IF', 'FOR', 'WHILE'].includes(n.op)) stack.push({ op: n.op, index });
      if (n.op === 'ELSE') {
        const top = stack.at(-1); if (!top || top.op !== 'IF' || top.elseIndex !== undefined) fail('ELSE without matching IF.');
        top.elseIndex = index; nodes[top.index].jump = index + 1;
      }
      if (['ENDIF', 'NEXT', 'WEND'].includes(n.op)) {
        const expected = { ENDIF: 'IF', NEXT: 'FOR', WEND: 'WHILE' }[n.op], top = stack.pop();
        if (!top || top.op !== expected) fail(`${n.op} without matching ${expected}.`);
        if (n.op === 'NEXT' && n.name && n.name !== nodes[top.index].name) fail(`NEXT must name ${nodes[top.index].name}.`);
        nodes[top.elseIndex ?? top.index].jump = index + 1; n.jump = top.index;
      }
      nodes.push(n);
    } catch (error) { error.line = line; throw error; }
  });
  if (stack.length) { const n = nodes[stack.at(-1).index]; throw new BasicError(`Unclosed ${n.op} block.`, n.line); }
  const verify = n => {
    if (n.op === 'GOTO' || n.op === 'GOSUB') { if (!labels.has(n.label)) throw new BasicError(`Unknown label ${n.label}.`, n.line); n.jump = labels.get(n.label); }
    if (n.op === 'INLINE') { for (const b of [n.yes, n.no]) { if (['IF', 'ELSE', 'ENDIF', 'FOR', 'NEXT', 'WHILE', 'WEND', 'INPUT'].includes(b.op)) throw new BasicError('This statement needs its own line, outside inline IF.', n.line); verify(b); } }
  };
  nodes.forEach(verify); return { nodes, source };
}

export class Machine {
  constructor(source, hooks = {}, options = {}) {
    this.program = compile(source); this.hooks = hooks; this.variables = Object.create(null);
    this.pc = 0; this.steps = 0; this.line = 0; this.output = ''; this.column = 0; this.status = 'ready'; this.loops = new Map(); this.calls = [];
    this.foreground = 15; this.background = 0; this.mode = 0; this.draws = 0; this.maxSteps = options.maxSteps ?? LIMITS.steps;
  }
  value(text) { return expression(text, this.variables, this.hooks.random || Math.random); }
  assign(name, value) {
    if (name.endsWith('$')) str(value); else num(value);
    if (!Object.hasOwn(this.variables, name) && Object.keys(this.variables).length >= LIMITS.variables) fail('Variable limit exceeded (256).');
    this.variables[name] = bounded(value);
  }
  print(text) { if (this.output.length + text.length > LIMITS.output) fail('Output limit exceeded (65,536 characters).'); this.output += text; this.column = text.includes('\n') ? text.length - text.lastIndexOf('\n') - 1 : this.column + text.length; this.hooks.print?.(text); }
  color(text, fallback = this.foreground) { const c = text ? num(this.value(text)) : fallback; if (!Number.isInteger(c) || c < 0 || c > 15) fail('Color must be an integer from 0 to 15.'); return c; }
  point(text) { const p = splitOutside(text, ','); if (p.length !== 2) fail('Expected two coordinates: (x, y).'); return p.map(x => { const n = num(this.value(x.text)); if (Math.abs(n) > 100000) fail('Coordinate outside safe range.'); return n; }); }
  draw(event) { if (this.mode !== 12) fail('Use SCREEN 12 before drawing.'); if (++this.draws > LIMITS.drawing) fail('Drawing limit exceeded (10,000 shapes).'); this.hooks.draw?.(event); }
  execute(n) {
    switch (n.op) {
      case 'NOP': case 'ENDIF': break;
      case 'ASSIGN': this.assign(n.name, this.value(n.value)); break;
      case 'PRINT': {
        const parts = splitOutside(n.value);
        for (const part of parts) {
          if (part.text) { const value = this.value(part.text); this.print(typeof value === 'number' ? `${value >= 0 ? ' ' : ''}${formatValue(value)} ` : value); }
          if (part.delimiter === ',') this.print(' '.repeat(14 - this.column % 14));
        }
        if (!/[;,]\s*$/.test(n.value)) this.print('\n'); break;
      }
      case 'INPUT': this.pending = { name: n.name, prompt: str(this.value(n.prompt)) }; this.status = 'waiting'; this.hooks.input?.(this.pending); break;
      case 'IF': if (!num(this.value(n.condition))) this.pc = n.jump; break;
      case 'INLINE': this.execute(num(this.value(n.condition)) ? n.yes : n.no); break;
      case 'ELSE': this.pc = n.jump; break;
      case 'FOR': {
        const start = num(this.value(n.start)), end = num(this.value(n.end)), increment = num(this.value(n.increment));
        if (!increment) fail('FOR STEP cannot be zero.'); this.assign(n.name, start);
        if (increment > 0 ? start > end : start < end) this.pc = n.jump;
        else this.loops.set(this.pc - 1, { name: n.name, end, increment }); break;
      }
      case 'NEXT': {
        const loop = this.loops.get(n.jump); if (!loop) fail('NEXT reached without an active FOR.');
        const value = num(this.variables[loop.name]) + loop.increment; this.assign(loop.name, value);
        if (loop.increment > 0 ? value <= loop.end : value >= loop.end) this.pc = n.jump + 1;
        else this.loops.delete(n.jump); break;
      }
      case 'WHILE': if (!num(this.value(n.condition))) this.pc = n.jump; break;
      case 'WEND': this.pc = n.jump; break;
      case 'GOTO': this.pc = n.jump; break;
      case 'GOSUB': if (this.calls.length >= 128) fail('Subroutine nesting limit exceeded (128).'); this.calls.push(this.pc); this.pc = n.jump; break;
      case 'RETURN': if (!this.calls.length) fail('RETURN without GOSUB.'); this.pc = this.calls.pop(); break;
      case 'END': this.status = 'done'; break;
      case 'STOP': this.status = 'paused'; break;
      case 'CLS': this.output = ''; this.column = 0; this.hooks.clear?.(); break;
      case 'SCREEN': { const mode = num(this.value(n.value)); if (![0, 12].includes(mode)) fail('Only SCREEN 0 (text) and SCREEN 12 (640×480) are supported.'); this.mode = mode; this.hooks.screen?.(mode); break; }
      case 'COLOR': { const fields = splitOutside(n.value, ','); if (fields.length > 2) fail('COLOR accepts foreground and optional background.'); this.foreground = this.color(fields[0].text); if (fields[1]) this.background = this.color(fields[1].text); this.hooks.color?.(this.foreground, this.background); break; }
      case 'PSET': this.draw({ type: 'point', point: this.point(n.coordinates), color: this.color(n.color) }); break;
      case 'LINE': { const fields = n.extra ? splitOutside(n.extra, ',') : []; if (fields.length > 2) fail('LINE accepts a color and optional B or BF.'); const shape = fields[1]?.text.toUpperCase() || ''; if (!['', 'B', 'BF'].includes(shape)) fail('LINE shape must be B or BF.'); this.draw({ type: 'line', from: this.point(n.from), to: this.point(n.to), color: this.color(fields[0]?.text), shape }); break; }
      case 'CIRCLE': { const fields = splitOutside(n.extra, ','); if (fields.length > 2) fail('CIRCLE accepts a radius and optional color.'); const radius = num(this.value(fields[0].text)); if (radius < 0 || radius > 100000) fail('Radius must be between 0 and 100,000.'); this.draw({ type: 'circle', point: this.point(n.coordinates), radius, color: this.color(fields[1]?.text) }); break; }
      default: fail(`Unsupported instruction ${n.op}.`);
    }
  }
  step() {
    if (['done', 'error', 'waiting'].includes(this.status)) return this.status;
    if (this.pc >= this.program.nodes.length) { this.status = 'done'; return this.status; }
    const n = this.program.nodes[this.pc++]; this.line = n.line; this.status = 'ready';
    try {
      if (this.steps >= this.maxSteps) fail(`Execution limit reached (${this.maxSteps.toLocaleString()} statements). Check for an infinite loop.`);
      this.steps++;
      this.execute(n); if (this.status === 'ready' && this.pc >= this.program.nodes.length) this.status = 'done';
    } catch (error) { error.line = this.line; this.status = 'error'; throw error; }
    return this.status;
  }
  provideInput(text) {
    if (this.status !== 'waiting') fail('Program is not waiting for INPUT.');
    const value = this.pending.name.endsWith('$') ? text : (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()) ? Number(text.trim()) : fail('Enter a valid number.'));
    this.assign(this.pending.name, value); this.print(`${this.pending.prompt}${text}\n`); this.pending = null; this.status = 'ready';
  }
}
