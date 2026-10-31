#!/usr/bin/env python3
# Проверка и сортировка локализации карты (resource_packs/main-rp-shop_for_ore/texts/*.lang).
#
#   python3 tools/lang.py check   — найти ошибки, ничего не меняя
#   python3 tools/lang.py sort    — разложить ключи по блокам и выровнять порядок во всех языках
#
# Как устроен файл .lang: шапка (комментарии «## …»), затем блоки. Блок — заголовок и строка префиксов:
#
#   ## --- ДОСТИЖЕНИЯ ---
#   ##   menu.achievements.*, ach.*, chat.ach.*, chat.cmd.achievement.*
#   menu.achievements.title=…
#
# Префикс со звёздочкой — все ключи, которые с него начинаются (а «x.*» — ещё и сам ключ x); без звёздочки — один ключ.
# Ключ относится к блоку, у которого самый длинный подходящий префикс: chat.cmd.mute.done уйдёт
# в блок с «chat.cmd.mute.*», а не в блок с «chat.cmd.*». Главный файл — ru_RU: в остальных языках
# те же блоки (названия переведены, строки префиксов — одинаковые) и тот же порядок ключей.
#
# Новый ключ: допиши его в любом месте файла (во всех четырёх языках) и запусти sort — он сам встанет
# в свой блок. Новый блок: добавь заголовок и строку префиксов во все четыре файла в одно и то же место.
# Кодировка, BOM и переводы строк каждого файла сохраняются.

import codecs
import os
import re
import sys

TEXTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'resource_packs', 'main-rp-shop_for_ore', 'texts')
LANGS = ['ru_RU', 'en_US', 'es_ES', 'uk_UA']
MAIN = 'ru_RU'
HEADER = re.compile(r'^## --- (.+) ---$')
PATTERNS = re.compile(r'^##\s{2,}(\S.*)$')
PARAM = re.compile(r'%(\d+\$)?s')
GLYPH = re.compile('[-]')


class LangError(Exception):
	pass


def read(lang):
	data = open(os.path.join(TEXTS, lang + '.lang'), 'rb').read()
	bom = data.startswith(codecs.BOM_UTF8)
	text = data.decode('utf-8-sig')
	newline = '\r\n' if '\r\n' in text else '\n'
	return {'bom': bom, 'newline': newline, 'final': text.endswith(newline), 'lines': text.split(newline)}


def write(lang, f, lines):
	text = f['newline'].join(lines) + (f['newline'] if f['final'] else '')
	data = text.encode('utf-8')
	open(os.path.join(TEXTS, lang + '.lang'), 'wb').write((codecs.BOM_UTF8 if f['bom'] else b'') + data)


def parse(lang, lines):
	"""Шапка и блоки: [{name, patterns: [...], raw: строка префиксов, keys: [(ключ, строка)]}]."""
	banner, sections, errors = [], [], []
	i = 0
	while i < len(lines) and not HEADER.match(lines[i]):
		banner.append(lines[i])
		i += 1
	while banner and not banner[-1].strip():
		banner.pop()
	while i < len(lines):
		line = lines[i]
		m = HEADER.match(line)
		if m:
			p = PATTERNS.match(lines[i + 1]) if i + 1 < len(lines) else None
			if not p:
				errors.append(f'{lang}:{i + 2}: после заголовка «{m.group(1)}» нет строки префиксов («##   префикс.*, …»)')
				pats = []
			else:
				pats = [x.strip() for x in p.group(1).split(',') if x.strip()]
				i += 1
			sections.append({'name': m.group(1), 'patterns': pats, 'raw': ', '.join(pats), 'keys': []})
		elif not line.strip():
			pass
		elif line.startswith('#'):
			errors.append(f'{lang}:{i + 1}: комментарий внутри блока — комментарии только в шапке и заголовках блоков')
		elif '=' in line:
			key = line.split('=', 1)[0]
			sections[-1]['keys'].append((key, line))
		else:
			errors.append(f'{lang}:{i + 1}: строка без «=»: {line[:60]}')
		i += 1
	return banner, sections, errors


def score(pattern, key):
	if pattern.endswith('.*') and key == pattern[:-2]:
		return len(pattern) - 2          # «chat.cmd.kick.*» подходит и самому ключу chat.cmd.kick
	if pattern.endswith('*'):
		return len(pattern) - 1 if key.startswith(pattern[:-1]) else -1
	return 10000 if key == pattern else -1


def home(sections, key):
	"""Номер блока ключа (самый длинный подходящий префикс) или ошибка."""
	best, where = -1, []
	for n, s in enumerate(sections):
		for p in s['patterns']:
			sc = score(p, key)
			if sc > best:
				best, where = sc, [n]
			elif sc == best and sc >= 0 and n not in where:
				where.append(n)
	if best < 0:
		raise LangError(f'ключ {key} не подходит ни к одному блоку — добавь префикс в строку блока')
	if len(where) > 1:
		raise LangError(f'ключ {key} одинаково подходит к блокам ' + ', '.join(sections[n]['name'] for n in where))
	return where[0]


def load_all():
	files = {lang: read(lang) for lang in LANGS}
	parsed = {lang: parse(lang, files[lang]['lines']) for lang in LANGS}
	return files, parsed


def check():
	files, parsed = load_all()
	errors = []
	for lang in LANGS:
		errors += parsed[lang][2]
	main = parsed[MAIN][1]
	main_raw = [s['raw'] for s in main]
	values = {}
	for lang in LANGS:
		sections = parsed[lang][1]
		if [s['raw'] for s in sections] != main_raw:
			errors.append(f'{lang}: блоки или строки префиксов не совпадают с {MAIN} (число блоков {len(sections)} и {len(main)})')
		seen = {}
		for n, s in enumerate(sections):
			for key, line in s['keys']:
				if key in seen:
					errors.append(f'{lang}: ключ {key} повторяется')
				seen[key] = line.split('=', 1)[1]
				try:
					h = home(sections, key)
					if h != n:
						errors.append(f'{lang}: ключ {key} стоит в блоке «{s["name"]}», а его место — «{sections[h]["name"]}»')
				except LangError as e:
					errors.append(f'{lang}: {e}')
		values[lang] = seen
	order = [k for s in main for k, _ in s['keys']]
	for lang in LANGS:
		if lang == MAIN:
			continue
		mine = [k for s in parsed[lang][1] for k, _ in s['keys']]
		missing = [k for k in order if k not in values[lang]]
		extra = [k for k in mine if k not in values[MAIN]]
		if missing:
			errors.append(f'{lang}: нет ключей: ' + ', '.join(missing[:10]) + (' …' if len(missing) > 10 else ''))
		if extra:
			errors.append(f'{lang}: лишние ключи (нет в {MAIN}): ' + ', '.join(extra[:10]))
		if not missing and not extra and mine != order:
			errors.append(f'{lang}: порядок ключей не как в {MAIN} — запусти sort')
		for key in order:
			if key not in values[lang]:
				continue
			a, b = values[MAIN][key], values[lang][key]
			if sorted(PARAM.findall(a)) != sorted(PARAM.findall(b)):
				errors.append(f'{lang}: {key} — параметры %…s не как в {MAIN}')
			if sorted(GLYPH.findall(a)) != sorted(GLYPH.findall(b)):
				errors.append(f'{lang}: {key} — значки шрифта не как в {MAIN}')
	return errors


def sort():
	files, parsed = load_all()
	problems = [e for lang in LANGS for e in parsed[lang][2]]
	if problems:
		raise LangError('сначала исправь разметку:\n  ' + '\n  '.join(problems))
	main_sections = parsed[MAIN][1]
	main_raw = [s['raw'] for s in main_sections]
	# Порядок ключей главного языка — после раскладки по блокам
	order = {}
	for lang in [MAIN] + [x for x in LANGS if x != MAIN]:
		banner, sections, _ = parsed[lang]
		if [s['raw'] for s in sections] != main_raw:
			raise LangError(f'{lang}: блоки не совпадают с {MAIN} — добавь недостающие заголовки и строки префиксов')
		buckets = [[] for _ in sections]
		for s in sections:
			for key, line in s['keys']:
				buckets[home(sections, key)].append((key, line))
		if lang == MAIN:
			order = {key: i for i, (key, _) in enumerate(kl for b in buckets for kl in b)}
		else:
			for b in buckets:
				b.sort(key=lambda kl: order.get(kl[0], len(order)))
		out = list(banner)
		for s, b in zip(sections, buckets):
			out += ['', f'## --- {s["name"]} ---', f'##   {s["raw"]}'] + [line for _, line in b]
		write(lang, files[lang], out)


def main():
	cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
	try:
		if cmd == 'sort':
			sort()
		elif cmd != 'check':
			print(__doc__ or 'tools/lang.py check | sort')
			return 2
		errors = check()
	except LangError as e:
		print('ОШИБКА:', e)
		return 1
	for e in errors:
		print(e)
	print(f'{len(errors)} ошибок' if errors else 'ok: блоки, ключи, порядок, параметры и значки совпадают во всех языках')
	return 1 if errors else 0


if __name__ == '__main__':
	sys.exit(main())
