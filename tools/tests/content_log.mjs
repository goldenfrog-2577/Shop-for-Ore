import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createContentLogParser, summarize } from '../content_log.mjs';

const header = '[Commands][warning]-Function locations/caves_cliffs failed to load correctly with error(s):';
const badFill = "[Commands][warning]-Error on line 22: command failed to parse with error 'Ошибка синтаксиса: непредвиденное «replace»'";
const badBrick = '[Commands][warning]-Error on line 328: unexpected «stone_bricks»';
const loadError = '[Scripting][error]-Error: could not resolve module ./utils.js';
const runtime = '[Scripting][Error]-Script threw an exception: TypeError: Cannot read property of undefined';
const stack = '    at repair (scripts/system/core/player_scores.js:34:8)';
const pulse = '[Scripting][warning]-[Shop for Ore] Command legacy heartbeat: objective is missing';
const spike = '[Scripting][warning]-[Watchdog] 195.246 ms script spike detected in behavior pack';
const lines = [
	header, badFill, badBrick, header, badFill, loadError,
	runtime, stack, pulse, spike,
	'[Item][error]-Vanilla item definition ignored',
	'[Scripting][warning]-[Shop for Ore] Загрузка завершена · файлов: 63'
];

const entries = [];
const parser = createContentLogParser(entry => entries.push(entry));
for (const line of lines) parser.push(line);
parser.finish();
assert.deepEqual(entries.map(({ kind, line }) => [kind, line]), [
	['function', 22], ['function', 328], ['function', 22],
	['script', undefined], ['script', 34], ['script', undefined], ['watchdog', undefined]
]);
assert.equal(entries[0].file, 'locations/caves_cliffs.mcfunction');
assert.deepEqual(entries[0].raw, [header, badFill]);
assert.equal(entries[4].file, 'scripts/system/core/player_scores.js');
assert.equal(entries[4].column, 8);
assert.deepEqual(entries[4].raw, [runtime, stack]);
assert.equal(summarize(entries)[0].count, 2);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfo-content-log-'));
try {
	const input = path.join(dir, 'ContentLog пример.txt');
	fs.writeFileSync(input, lines.join('\r\n'));
	const script = fileURLToPath(new URL('../content_log.mjs', import.meta.url));
	const result = spawnSync(process.execPath, [script, input, '--json'], { encoding: 'utf8', timeout: 10000 });
	assert.equal(result.status, 0, result.stderr);
	assert.deepEqual(result.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line)), summarize(entries));
} finally {
	fs.rmSync(dir, { recursive: true });
}

console.log('PASS: function load errors, script failures and stack traces, runtime diagnostics, Watchdog, grouping and CLI.');
