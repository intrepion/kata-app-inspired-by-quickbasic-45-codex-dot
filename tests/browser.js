const frame = document.querySelector('iframe'), results = document.querySelector('#results');
let passes = 0, failures = 0, d, w;
const backup = localStorage.getItem('bytewell-draft-v1');
function assert(value, name) { const li = document.createElement('li'); li.className = value ? 'pass' : 'fail'; li.textContent = `${value ? 'PASS' : 'FAIL'} · ${name}`; results.append(li); if (value) passes++; else failures++; }
const delay = ms => new Promise(r => setTimeout(r, ms));
async function wait(fn, limit = 8000) { const end = Date.now() + limit; while (!fn()) { if (Date.now() > end) throw new Error('Timed out waiting for UI'); await delay(20); } }
const $ = id => d.getElementById(id);
const click = id => $(id).click();
function fill(id, value) { $(id).value = value; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); }
const finish = () => wait(() => $('status').textContent.startsWith('Finished.'));
async function source(text) { fill('editor', text); await delay(0); }
async function example(name) { Array.from(d.querySelectorAll('.example')).find(x => x.textContent.includes(name)).click(); if ($('replace-dialog').open) click('confirm-replace'); await delay(0); }
try {
  await wait(() => frame.contentDocument?.getElementById('editor') && frame.contentDocument.getElementById('examples').children.length === 5);
  d = frame.contentDocument; w = frame.contentWindow;
  await example('Orbit study'); click('run'); await finish();
  assert($('output').textContent.includes('ORBIT STUDY'), 'Orbit example runs to completion');
  assert(!$('canvas').hidden && $('canvas').width === 640 && $('canvas').height === 480, 'Graphics use the documented canvas size');
  const pixels = $('canvas').getContext('2d').getImageData(0, 0, 640, 480).data; let bright = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 100) bright++;
  assert(bright > 1000, 'Graphics draw real visible pixels');
  const workspaceBottom = d.querySelector('.workspace').getBoundingClientRect().bottom;
  assert(d.querySelector('.editor-panel').getBoundingClientRect().bottom <= workspaceBottom + 1 && d.querySelector('.result-panel').getBoundingClientRect().bottom <= workspaceBottom + 1, 'Editor and output remain within their grid row');
  assert(d.querySelector('.immediate').getBoundingClientRect().top >= workspaceBottom - 1, 'Immediate controls do not overlap the source panels');
  await example('Fibonacci steps'); click('step');
  assert($('status').textContent.startsWith('Paused') && $('steps').textContent.includes('1 STATEMENTS'), 'Single step advances exactly one statement');
  assert($('line-numbers').querySelector('.current') !== null, 'Next source statement is marked');
  click('run'); await finish();
  assert($('variables').textContent.includes('NEXTVALUE') && $('variables').textContent.includes('233'), 'Variables are populated after execution');
  fill('immediate', 'PRINT a + b'); $('immediate-form').requestSubmit();
  assert($('output').textContent.includes('377'), 'Immediate reads live program variables');
  await source('INPUT "A number? "; n\nPRINT n ^ 2'); click('run'); await wait(() => !$('input-form').hidden);
  assert($('run').disabled && $('immediate').disabled, 'INPUT pauses run and Immediate controls');
  fill('input-value', 'not a number'); $('input-form').requestSubmit();
  assert($('input-error').textContent.includes('valid number') && !$('input-form').hidden, 'Invalid numeric INPUT is recoverable');
  fill('input-value', '12'); $('input-form').requestSubmit(); await finish();
  assert($('output').textContent.includes('144'), 'Valid INPUT resumes the program');
  await source('x=1\nPRINT 1/0'); click('run'); await wait(() => $('status').textContent.includes('Division by zero'));
  assert($('status').textContent.startsWith('Line 2:') && $('line-numbers').querySelector('.error')?.textContent === '02', 'Runtime errors identify and mark the physical line');
  await source('DIM a(10)'); click('run');
  assert($('status').textContent.includes('Unsupported') && $('status').textContent.startsWith('Line 1:'), 'Unsupported syntax produces a visible error');
  await source('again:\nGOTO again'); click('run'); await delay(50); click('stop');
  assert($('status').textContent.startsWith('Paused') && !$('run').disabled, 'A runaway program can be paused');
  click('run'); await wait(() => $('status').textContent.includes('Execution limit'), 20000);
  assert($('status').textContent.includes('100,000') && !$('run').disabled, 'Runaway execution stops at its limit and restores controls');
  await source('PRINT "keep my source"'); click('new');
  assert($('replace-dialog').open, 'Replacing edited source asks for confirmation');
  click('cancel-replace'); assert($('editor').value.includes('keep my source'), 'Cancel preserves the current source');
  click('new'); $('replace-dialog').dispatchEvent(new w.Event('cancel')); $('replace-dialog').close();
  assert($('editor').value.includes('keep my source'), 'Dismissal preserves current source');
  click('new'); click('confirm-replace'); assert($('filename').value === 'UNTITLED.BAS', 'Confirmed replacement creates a new program');
  const imported = 'name$ = "Import works"\nPRINT name$\nEND\n';
  const transfer = new w.DataTransfer(); transfer.items.add(new w.File([imported], 'ROUNDTRIP.BAS', { type: 'text/plain' })); $('file').files = transfer.files; $('file').dispatchEvent(new w.Event('change', { bubbles: true }));
  await wait(() => $('filename').value === 'ROUNDTRIP.BAS');
  assert($('editor').value === imported, 'BAS import preserves exact source');
  click('run'); await finish(); assert($('output').textContent.includes('Import works'), 'Imported source executes');
  let exported = null, exportName = null; const create = w.URL.createObjectURL, anchorClick = w.HTMLAnchorElement.prototype.click;
  w.URL.createObjectURL = blob => { exported = blob; return create.call(w.URL, blob); };
  w.HTMLAnchorElement.prototype.click = function() { exportName = this.download; };
  click('export'); w.URL.createObjectURL = create; w.HTMLAnchorElement.prototype.click = anchorClick;
  assert(exported && (await exported.text()) === imported && exportName === 'ROUNDTRIP.bas', 'Export builds the exact portable BAS contents and name');
  fill('filename', 'RESTORE.BAS'); click('save');
  await new Promise(resolve => { frame.onload = resolve; frame.contentWindow.location.reload(); }); d = frame.contentDocument; w = frame.contentWindow; await wait(() => $('save-state').textContent === 'DRAFT RESTORED');
  assert($('editor').value === imported && $('filename').value === 'RESTORE.BAS', 'Saved draft and filename survive reload');
  assert($('output').textContent === '', 'Restoring a draft does not execute it');
  click('guide'); assert($('guide-dialog').open && $('guide-dialog').textContent.includes('not a DOS emulator'), 'Guide clearly states compatibility limits'); click('close-guide');
  assert(!$('guide-dialog').open, 'Guide closes without navigation');
  await example('Hello, world'); click('run'); await wait(() => !$('input-form').hidden); click('reset');
  assert($('input-form').hidden && !$('run').disabled && $('output').textContent === '', 'Reset cancels pending INPUT and clears output');
  await example('Color blocks'); click('run'); await finish(); assert(!$('canvas').hidden, 'Repeated example switching and graphics execution work');
  await example('Orbit study'); click('run'); await finish();
} catch (error) { assert(false, error.stack || error.message); }
finally {
  if (backup === null) localStorage.removeItem('bytewell-draft-v1'); else localStorage.setItem('bytewell-draft-v1', backup);
  document.querySelector('#summary').textContent = `${passes} passed, ${failures} failed. Browser UI regression complete.`;
  document.title = `Bytewell QA: ${passes} passed, ${failures} failed`;
}
