import { Machine, compile, LIMITS, formatValue } from './basic.js';
import { examples } from './examples.js';
const $ = id => document.getElementById(id);
const editor = $('editor'), canvas = $('canvas'), ctx = canvas.getContext('2d'), STORE = 'bytewell-draft-v1';
const palette = ['#101a20','#253a9c','#3b8748','#38858c','#b44444','#a94e9d','#aa763c','#c9cec6','#2a3e43','#727be7','#8ade82','#82dfd1','#ef8e79','#d794d6','#e9cf82','#e8ecdc'];
let machine = null, active = false, token = 0, errorLine = 0, dirty = false, pendingReplacement = null, selected = 'orbit', storageFailed = false;
let background = 0, foreground = 15, graphics = false, lastValidSource = '';
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function notice(message, error = false) { $('status').textContent = message; document.querySelector('.statusbar').classList.toggle('error', error); }
function highlightLine(line) {
  const re = /("(?:[^\"]|\"\")*"|'[^\n]*|\bREM\b[^\n]*|\b(?:PRINT|INPUT|LET|IF|THEN|ELSE|END|FOR|TO|STEP|NEXT|WHILE|WEND|GOTO|GOSUB|RETURN|STOP|CLS|COLOR|SCREEN|PSET|LINE|CIRCLE|AND|OR|NOT|MOD|ABS|INT|SQR|SIN|COS|LEN|RND|STR\$|VAL|CHR\$|ASC|LEFT\$|RIGHT\$|MID\$)\b|\b\d+(?:\.\d*)?\b)/gi;
  let html = '', last = 0;
  for (const match of line.matchAll(re)) {
    html += esc(line.slice(last, match.index)); const s = match[0];
    const type = /^'|^REM\b/i.test(s) ? 'comment' : s[0] === '"' ? 'string' : /^\d/.test(s) ? 'number' : 'keyword';
    html += `<span class="${type}">${esc(s)}</span>`; last = match.index + s.length;
  }
  return html + esc(line.slice(last));
}
function renderCode() {
  lastValidSource = editor.value;
  const current = errorLine || (machine && !['done', 'error'].includes(machine.status) ? machine.program.nodes[machine.pc]?.line : 0);
  const lines = editor.value.split('\n');
  $('highlight').innerHTML = lines.map((line, i) => `<span${current === i + 1 ? ' class="executing"' : ''}>${highlightLine(line) || ' '}</span>`).join('\n') + '\n';
  $('line-numbers').innerHTML = lines.map((_, i) => `<span class="${current === i + 1 ? errorLine ? 'error' : 'current' : ''}">${String(i + 1).padStart(2, '0')}</span>`).join(''); syncScroll(); cursor();
}
function syncScroll() { $('highlight').scrollTop = editor.scrollTop; $('highlight').scrollLeft = editor.scrollLeft; $('line-numbers').scrollTop = editor.scrollTop; }
function cursor() { const prefix = editor.value.slice(0, editor.selectionStart).split('\n'); $('cursor').textContent = `Ln ${prefix.length}, Col ${prefix.at(-1).length + 1}`; }
function persist(manual = false) {
  try { localStorage.setItem(STORE, JSON.stringify({ source: editor.value, filename: $('filename').value, selected, dirty: manual ? false : dirty })); storageFailed = false; if (manual) dirty = false; $('save-state').textContent = manual ? 'SAVED ON DEVICE' : 'DRAFT SAVED'; if (manual) notice('Saved on this browser. Export a .bas file for a portable copy.'); }
  catch { storageFailed = true; $('save-state').textContent = 'NOT SAVED'; notice('Browser storage is unavailable or full. Export your .bas file to keep it.', true); }
}
function clearScreen() { $('output').textContent = ''; ctx.fillStyle = palette[background]; ctx.fillRect(0, 0, 640, 480); }
const hooks = {
  print(text) { $('screen-empty').hidden = true; $('output').textContent += text; },
  clear() { clearScreen(); },
  color(fg, bg) { foreground = fg; background = bg; $('output').style.color = palette[fg]; document.querySelector('.screen').style.background = palette[bg]; },
  screen(mode) { graphics = mode === 12; canvas.hidden = !graphics; $('screen-empty').hidden = true; $('mode').textContent = graphics ? '640 × 480 / 16 COLORS' : 'TEXT MODE'; if (graphics) { ctx.fillStyle = palette[background]; ctx.fillRect(0, 0, 640, 480); } },
  input(data) { $('input-form').hidden = false; $('input-label').textContent = data.prompt; $('input-value').value = ''; $('input-error').textContent = ''; $('input-value').focus(); },
  draw(e) {
    ctx.fillStyle = ctx.strokeStyle = palette[e.color]; ctx.lineWidth = 1;
    if (e.type === 'point') ctx.fillRect(Math.round(e.point[0]), Math.round(e.point[1]), 1, 1);
    if (e.type === 'line') { const [x, y] = e.from, [x2, y2] = e.to; if (e.shape === 'BF') ctx.fillRect(x, y, x2 - x, y2 - y); else if (e.shape === 'B') ctx.strokeRect(x, y, x2 - x, y2 - y); else { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); } }
    if (e.type === 'circle') { ctx.beginPath(); ctx.arc(...e.point, e.radius, 0, Math.PI * 2); ctx.stroke(); }
  }
};
function renderVariables() {
  const values = machine ? Object.entries(machine.variables) : [];
  $('variables').replaceChildren();
  if (!values.length) { const p = document.createElement('p'); p.className = 'empty-watch'; p.textContent = 'Run or step to inspect your variables.'; $('variables').append(p); }
  for (const [name, value] of values) { const row = document.createElement('div'), label = document.createElement('span'), val = document.createElement('b'); row.className = 'variable'; label.textContent = name; val.textContent = typeof value === 'string' ? `"${value}"` : formatValue(value); val.title = val.textContent; row.append(label, val); $('variables').append(row); }
  $('steps').textContent = `${(machine?.steps || 0).toLocaleString()} STATEMENTS`;
}
function buttons() { const waiting = machine?.status === 'waiting'; $('run').disabled = active || waiting; $('step').disabled = active || waiting; $('stop').disabled = !active; $('immediate').disabled = active || waiting; $('immediate-form').querySelector('button').disabled = active || waiting; $('run').innerHTML = machine && ['ready', 'paused'].includes(machine.status) && machine.pc > 0 ? '▶ Continue <kbd>F5</kbd>' : '▶ Run <kbd>F5</kbd>'; }
function reset(message = true) { token++; active = false; machine = null; errorLine = 0; graphics = false; foreground = 15; background = 0; canvas.hidden = true; $('mode').textContent = 'TEXT MODE'; $('output').style.color = ''; document.querySelector('.screen').style.background = ''; $('screen-empty').hidden = false; $('input-form').hidden = true; clearScreen(); renderCode(); renderVariables(); buttons(); if (message) notice('Runtime reset. Your source is unchanged.'); }
function showError(error) { active = false; errorLine = error.line || 0; notice(`${errorLine ? `Line ${errorLine}: ` : ''}${error.message}`, true); if (errorLine) { const lineHeight = parseFloat(getComputedStyle(editor).lineHeight); editor.scrollTop = Math.max(0, (errorLine - 4) * lineHeight); } renderCode(); renderVariables(); buttons(); }
function prepare() {
  if (machine && !['done', 'error'].includes(machine.status) && machine.program.source === editor.value) return true;
  reset(false);
  try { machine = new Machine(editor.value, hooks); $('screen-empty').hidden = true; return true; }
  catch (error) { showError(error); return false; }
}
function settle() {
  active = false; renderVariables(); renderCode(); buttons();
  if (machine.status === 'ready' || machine.status === 'paused') { const nextLine = machine.program.nodes[machine.pc]?.line; if (nextLine) { const height = parseFloat(getComputedStyle(editor).lineHeight), top = (nextLine - 1) * height + 17; if (top < editor.scrollTop || top + height > editor.scrollTop + editor.clientHeight) { editor.scrollTop = Math.max(0, top - editor.clientHeight / 3); syncScroll(); } } }
  if (machine.status === 'done') notice(`Finished. ${machine.steps.toLocaleString()} statements executed. Make a change and run again.`);
  else if (machine.status === 'waiting') notice(`Waiting for INPUT on line ${machine.line}.`);
  else notice(`Paused ${machine.program.nodes[machine.pc] ? `before line ${machine.program.nodes[machine.pc].line}` : 'at the end'}. Step or Continue to explore.`);
}
function run() {
  if (active || machine?.status === 'waiting' || !prepare()) return;
  active = true; errorLine = 0; machine.status = 'ready'; const mine = ++token; buttons(); notice('Running… Esc pauses execution.');
  function batch() {
    if (mine !== token || !active) return;
    try { for (let i = 0; i < 150; i++) if (machine.step() !== 'ready') { settle(); return; } renderVariables(); renderCode(); setTimeout(batch, 0); }
    catch (error) { showError(error); }
  }
  setTimeout(batch, 0);
}
function step() { if (active || machine?.status === 'waiting' || !prepare()) return; errorLine = 0; try { machine.step(); settle(); } catch (error) { showError(error); } }
function pause() { if (!active) return; active = false; token++; machine.status = 'paused'; settle(); }
function requestReplacement(action) { if (dirty) { pendingReplacement = action; $('replace-dialog').showModal(); } else action(); }
function chooseExample(id) { const example = examples.find(e => e.id === id); if (!example) return; reset(false); editor.value = example.source; $('filename').value = example.filename; selected = id; dirty = false; renderExamples(); renderCode(); persist(true); notice(`${example.title} loaded. Run it, or step through one statement at a time.`); }
function renderExamples() {
  $('examples').replaceChildren();
  for (const e of examples) { const button = document.createElement('button'); button.className = `example${selected === e.id ? ' active' : ''}`; button.title = e.description; button.setAttribute('aria-pressed', String(selected === e.id)); const title = document.createElement('strong'), tag = document.createElement('span'); title.textContent = e.title; tag.textContent = e.tag; button.append(title, tag); button.onclick = () => requestReplacement(() => chooseExample(e.id)); $('examples').append(button); }
}
function downloadSource() {
  const filename = ($('filename').value || 'UNTITLED.BAS').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/(?:\.bas)?$/i, '.bas');
  const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); dirty = false; persist(); notice(`Exported ${filename}. Keep this copy to move between browsers or devices.`);
}
editor.addEventListener('input', () => { if (editor.value.length > LIMITS.source || editor.value.split('\n').length > LIMITS.lines || editor.value.split('\n').some(line => line.length > LIMITS.line)) { editor.value = lastValidSource; notice('Edit exceeds a safety limit: 200,000 characters, 5,000 lines, or 2,048 characters per line. Previous source kept.', true); return; } lastValidSource = editor.value; reset(false); selected = ''; dirty = true; renderExamples(); renderCode(); persist(); if (!storageFailed) notice('Source changed. Runtime reset; draft saved on this browser.'); });
editor.addEventListener('scroll', syncScroll); editor.addEventListener('click', cursor); editor.addEventListener('keyup', cursor);
editor.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const start = editor.selectionStart, end = editor.selectionEnd; editor.setRangeText('  ', start, end, 'end'); editor.dispatchEvent(new Event('input')); } });
$('filename').addEventListener('input', () => { dirty = true; persist(); });
$('run').onclick = run; $('step').onclick = step; $('stop').onclick = pause; $('reset').onclick = () => reset(); $('save').onclick = () => persist(true); $('export').onclick = downloadSource;
$('new').onclick = () => requestReplacement(() => { reset(false); editor.value = "' A fresh start\nCLS\nPRINT \"Hello, Bytewell.\"\n"; $('filename').value = 'UNTITLED.BAS'; selected = ''; dirty = false; renderExamples(); renderCode(); persist(true); notice('A fresh start. Write a little BASIC and press Run.'); editor.focus(); });
$('open').onclick = () => $('file').click();
$('file').onchange = async e => {
  const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
  if (file.size > LIMITS.source) { notice('File is too large. Open a UTF-8 .bas file under 200 KB.', true); return; }
  try {
    const source = await file.text(); if (source.includes('\0') || source.includes('\uFFFD')) throw new Error('This is not valid plain UTF-8 BASIC text.'); if (source.split('\n').length > LIMITS.lines || source.split('\n').some(line => line.length > LIMITS.line)) throw new Error('Source exceeds 5,000 lines or 2,048 characters per line.');
    requestReplacement(() => { reset(false); editor.value = source.replace(/\r\n?/g, '\n'); $('filename').value = file.name.slice(0, 64); selected = ''; dirty = false; renderExamples(); renderCode(); persist(true); notice(`Opened ${file.name}. Run checks its compatibility with the supported subset.`); });
  } catch (error) { notice(`Could not open file: ${error.message}`, true); }
};
$('cancel-replace').onclick = () => { pendingReplacement = null; $('replace-dialog').close(); };
$('confirm-replace').onclick = () => { const action = pendingReplacement; pendingReplacement = null; $('replace-dialog').close(); action?.(); };
$('replace-dialog').addEventListener('cancel', () => { pendingReplacement = null; });
$('input-form').onsubmit = e => { e.preventDefault(); if (!machine || machine.status !== 'waiting') return; try { machine.provideInput($('input-value').value); $('input-form').hidden = true; renderVariables(); run(); } catch (error) { $('input-error').textContent = error.message; } };
$('immediate-form').onsubmit = e => {
  e.preventDefault(); if (active || machine?.status === 'waiting') return;
  const text = $('immediate').value.trim(); if (!text) return;
  try {
    const program = compile(text); if (program.nodes.length !== 1 || !['ASSIGN', 'PRINT', 'CLS', 'COLOR', 'PSET', 'LINE', 'CIRCLE'].includes(program.nodes[0].op)) throw new Error('Immediate accepts one assignment, PRINT, CLS, COLOR, PSET, LINE, or CIRCLE.');
    if (!machine) machine = new Machine(editor.value, hooks);
    machine.execute(program.nodes[0]); renderVariables(); buttons(); notice(`Immediate executed: ${text.slice(0, 95)}`);
  } catch (error) { notice(`Immediate: ${error.message}`, true); }
};
$('guide').onclick = () => $('guide-dialog').showModal(); $('close-guide').onclick = () => $('guide-dialog').close();
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'F5') { e.preventDefault(); run(); }
  if (e.key === 'F8') { e.preventDefault(); step(); }
  if (e.key === 'Escape') pause();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); persist(true); }
});
window.addEventListener('beforeunload', e => { if (storageFailed && dirty) { e.preventDefault(); e.returnValue = ''; } });
let restored = false;
try { const saved = JSON.parse(localStorage.getItem(STORE)); if (saved && typeof saved.source === 'string' && saved.source.length <= LIMITS.source && saved.source.split('\n').length <= LIMITS.lines && !saved.source.split('\n').some(line => line.length > LIMITS.line) && typeof saved.filename === 'string') { editor.value = saved.source; $('filename').value = saved.filename.slice(0, 64); selected = saved.selected || ''; dirty = !!saved.dirty; restored = true; } } catch { /* A corrupt browser draft never prevents opening the app. */ }
if (!restored) { editor.value = examples[0].source; $('filename').value = examples[0].filename; }
lastValidSource = editor.value;
renderExamples(); renderCode(); renderVariables(); clearScreen(); buttons();
if (restored) { $('save-state').textContent = 'DRAFT RESTORED'; notice('Your browser draft is restored. Run when you are ready.'); }
else run();
