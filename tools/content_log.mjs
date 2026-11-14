import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';

const header = /\[([^\]]+)\]\[(error|warn(?:ing)?)\]\s*-?\s*(.*)$/i;
const functionHeader = /^Function\s+(\S+)\s+failed to load correctly\b/i;
const functionLine = /^Error on line\s+(\d+):\s*(.+)$/i;
const scriptLocation = /\b((?:[\w./\\ -]+\/)?[\w.-]+\.(?:m?js)):(\d+)(?::(\d+))?/;
const watchdog = /\[Watchdog\]/i;
const projectError = /\[Shop for Ore(?: WorldEdit)?\]\s+(?:(?:Command|Score recovery|Wipe recovery|Bot spawn failed|Function limits repair failed)\b|(?:startup:|cleanup:|\{))/i;

export function createContentLogParser(emit) {
	let pending;
	function flush() {
		if (pending && !pending.onlyHeader) {
			const { onlyHeader, ...entry } = pending;
			emit(entry);
		}
		pending = undefined;
	}
	function addLocation(entry, text) {
		if (entry.file) return;
		const match = scriptLocation.exec(text);
		if (!match) return;
		entry.file = match[1].trim().replaceAll('\\', '/');
		entry.line = Number(match[2]);
		if (match[3]) entry.column = Number(match[3]);
	}
	function push(raw) {
		const parsed = header.exec(raw);
		const message = (parsed?.[3] ?? raw).trim();
		const kind = parsed?.[1].toLowerCase();
		const severity = parsed?.[2].toLowerCase() === 'error' ? 'error' : 'warning';
		const line = functionLine.exec(message);
		if (line && pending?.kind === 'function' && (!kind || kind === 'commands')) {
			emit({ kind: 'function', severity: pending.severity, file: pending.file,
				line: Number(line[1]), message: line[2], raw: [...pending.raw, raw] });
			pending.onlyHeader = true;
			pending.reportedLine = true;
			return;
		}
		if (pending?.kind === 'script' && /^(?:at\s|Caused by:)/i.test(message) &&
			(!kind || kind === 'scripting')) {
			pending.raw.push(raw);
			addLocation(pending, message);
			return;
		}
		if (pending?.kind === 'function' && pending.onlyHeader && !pending.reportedLine) {
			pending.onlyHeader = false;
		}
		flush();
		if (kind === 'commands') {
			const fn = functionHeader.exec(message);
			pending = { kind: 'function', severity, message, raw: [raw] };
			if (fn) {
				pending.file = fn[1].endsWith('.mcfunction') ? fn[1] : fn[1] + '.mcfunction';
				pending.onlyHeader = true;
			}
		} else if (kind === 'scripting' && (severity === 'error' || watchdog.test(message) || projectError.test(message))) {
			pending = { kind: watchdog.test(message) ? 'watchdog' : 'script', severity, message, raw: [raw] };
			addLocation(pending, message);
		}
	}
	return {
		push,
		finish() {
			if (pending?.onlyHeader && !pending.reportedLine) pending.onlyHeader = false;
			flush();
		}
	};
}

export function summarize(entries) {
	const groups = new Map();
	for (const entry of entries) {
		const key = JSON.stringify([entry.kind, entry.severity, entry.file, entry.line, entry.column, entry.message]);
		const group = groups.get(key);
		if (group) group.count++;
		else groups.set(key, { ...entry, count: 1 });
	}
	return [...groups.values()];
}

function show(entries, json) {
	for (const entry of summarize(entries)) {
		if (json) {
			console.log(JSON.stringify(entry));
			continue;
		}
		const where = entry.file
			? entry.file + (entry.line ? ':' + entry.line : '') + (entry.column ? ':' + entry.column : '')
			: 'без указания файла';
		console.log('[' + entry.severity + '/' + entry.kind + '] ' + where +
			(entry.count > 1 ? ' ×' + entry.count : '') + ' — ' + entry.message);
		for (const line of entry.raw) console.log('  ' + line);
	}
}

async function readLog(file, follow, json) {
	let offset = 0;
	let identity;
	let decoder = new StringDecoder('utf8');
	let remainder = '';
	let entries = [];
	const parser = createContentLogParser(entry => entries.push(entry));
	function drain() {
		show(entries, json);
		entries = [];
	}
	function finish() {
		const last = remainder + decoder.end();
		if (last) parser.push(last.replace(/\r$/, ''));
		parser.finish();
		drain();
	}
	do {
		let stat;
		try { stat = fs.statSync(file); }
		catch (error) {
			if (!follow || error.code !== 'ENOENT') throw error;
			await delay(500);
			continue;
		}
		const key = stat.dev + ':' + stat.ino + ':' + stat.birthtimeMs;
		if (identity !== undefined && (identity !== key || stat.size < offset)) {
			finish();
			offset = 0;
			decoder = new StringDecoder('utf8');
			remainder = '';
		}
		identity = key;
		if (stat.size > offset) {
			for await (const chunk of fs.createReadStream(file, { start: offset, end: stat.size - 1 })) {
				offset += chunk.length;
				const lines = (remainder + decoder.write(chunk)).split(/\r?\n/);
				remainder = lines.pop();
				for (const line of lines) parser.push(line);
			}
		} else if (follow && !remainder) {
			// Дать движку время дописать stack trace или строки ошибки функции.
			parser.finish();
		}
		if (!follow) {
			finish();
			return;
		}
		drain();
		await delay(500);
	} while (follow);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	const files = args.filter(arg => !arg.startsWith('--'));
	if (files.length !== 1 || args.some(arg => arg.startsWith('--') && arg !== '--follow' && arg !== '--json')) {
		console.error('Usage: node tools/content_log.mjs <ContentLog file> [--follow] [--json]');
		process.exitCode = 2;
	} else {
		try { await readLog(files[0], args.includes('--follow'), args.includes('--json')); }
		catch (error) { console.error(error.message); process.exitCode = 1; }
	}
}
