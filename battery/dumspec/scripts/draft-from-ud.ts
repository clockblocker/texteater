/**
 * Drafts Full German Spec Records from the committed UD parse of public-domain
 * paragraphs (#732): `ud-drafts/paragraphs.json` holds the paragraphs with
 * their provenance, and `ud-drafts/paragraphs.conllu` Stanza's parse of them
 * (`ud-drafts/annotate.py`). Each sentence becomes one Draft record under
 * `records/de/`, and `ud-drafts/manifest.json` keeps each quoted text's
 * paragraphs as ordered record ids, in the shape of a future Text Record.
 *
 * A record file that already exists for the sentence is kept, since a person
 * may have corrected it; `--overwrite` redrafts it.
 *
 *   bun scripts/draft-from-ud.ts [--overwrite]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readConllu, type UdSentence } from "./ud-drafts/conllu.js";
import { type DraftSource, draftRecord, slugOf } from "./ud-drafts/draft.js";

interface Paragraph {
	id: string;
	author: string;
	authorDied: number;
	work: string;
	year: number;
	source: { url: string; text: string; edition: string };
	place: string;
	sentences: string[];
}

const directory = new URL("../ud-drafts/", import.meta.url);
const recordsDirectory = new URL("../records/", import.meta.url);
const overwrite = process.argv.includes("--overwrite");

const { paragraphs } = JSON.parse(
	readFileSync(new URL("paragraphs.json", directory), "utf8"),
) as { paragraphs: Paragraph[] };
const parsed = readConllu(
	readFileSync(new URL("paragraphs.conllu", directory), "utf8"),
);
const parser = /^Stanza [^ ]+/u.exec(parsed[0]?.comments.parser ?? "")?.[0];
if (!parser) throw Error("paragraphs.conllu names no parser");

/** JSON with each object of plain values on one line, as records are kept. */
function serialize(value: unknown): string {
	const write = (item: unknown, indent: string): string => {
		if (item === null || typeof item !== "object")
			return JSON.stringify(item);
		const inner = `${indent}\t`;
		const entries = Array.isArray(item)
			? item.map((element) => [undefined, element] as const)
			: Object.entries(item);
		if (entries.length === 0) return Array.isArray(item) ? "[]" : "{}";
		const plain = entries.every(
			([, element]) => element === null || typeof element !== "object",
		);
		const parts = entries.map(
			([key, element]) =>
				`${key === undefined ? "" : `${JSON.stringify(key)}: `}${write(element, inner)}`,
		);
		const [open, close] = Array.isArray(item) ? ["[", "]"] : ["{", "}"];
		if (plain)
			return Array.isArray(item)
				? `${open}${parts.join(", ")}${close}`
				: `${open} ${parts.join(", ")} ${close}`;
		return `${open}\n${parts.map((part) => inner + part).join(",\n")}\n${indent}${close}`;
	};
	return `${write(value, "")}\n`;
}

/** The record id for a sentence: its slug, suffixed past another sentence's. */
function recordId(sentence: string, taken: ReadonlySet<string>): string {
	const base = `de/${slugOf(sentence)}`;
	for (let suffix = 1; ; suffix++) {
		const id = suffix === 1 ? base : `${base}-${suffix}`;
		const url = new URL(`${id}.json`, recordsDirectory);
		if (taken.has(id)) continue;
		if (!existsSync(url)) return id;
		const existing = JSON.parse(readFileSync(url, "utf8")) as {
			sentence: string;
		};
		if (existing.sentence === sentence) return id;
	}
}

const written: string[] = [];
const kept: string[] = [];
const taken = new Set<string>();
const texts: Record<string, unknown> = {};
for (const paragraph of paragraphs) {
	const sentences = parsed.filter((sentence) =>
		sentence.comments.sent_id?.startsWith(`${paragraph.id}-`),
	);
	if (
		sentences.map((sentence) => sentence.text).join("\n") !==
		paragraph.sentences.join("\n")
	)
		throw Error(`The parse of ${paragraph.id} is stale: rerun annotate.py`);
	const title = `Project Gutenberg eBook #${/\d+$/u.exec(paragraph.source.url)?.[0]}: ${paragraph.author}, ${paragraph.work}`;
	const reference = {
		title,
		url: paragraph.source.url,
		supports: `The sentence, quoted from ${paragraph.source.edition}. ${paragraph.place}.`,
	};
	const source: DraftSource = {
		work: paragraph.work,
		author: paragraph.author,
		year: paragraph.year,
		reference,
	};
	const ids = sentences.map((sentence: UdSentence) => {
		const id = recordId(sentence.text, taken);
		taken.add(id);
		const url = new URL(`${id}.json`, recordsDirectory);
		if (existsSync(url) && !overwrite) {
			kept.push(id);
			return id;
		}
		writeFileSync(url, serialize(draftRecord(sentence, source, parser)));
		written.push(fileURLToPath(url));
		return id;
	});
	texts[paragraph.id] = {
		sourceText: paragraph.sentences.join(" "),
		paragraphs: [{ sentences: ids }],
		status: "Draft",
		sources: {
			adrs: [],
			rules: [],
			references: [
				{
					...reference,
					supports: `The paragraph, quoted from ${paragraph.source.edition}. ${paragraph.place}.`,
				},
			],
		},
		provenance: {
			kind: "Quoted",
			work: paragraph.work,
			author: paragraph.author,
			year: paragraph.year,
		},
	};
}
const manifest = fileURLToPath(new URL("manifest.json", directory));
writeFileSync(manifest, `${JSON.stringify({ texts }, null, "\t")}\n`);
const biome = fileURLToPath(
	new URL("../../../node_modules/.bin/biome", import.meta.url),
);
Bun.spawnSync([biome, "format", "--write", manifest, ...written]);
console.log(
	`${written.length} records drafted, ${kept.length} kept; manifest ${manifest}`,
);
