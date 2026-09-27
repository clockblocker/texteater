/**
 * One-off import of the rest of Dumgen's gold into dumspec as Draft records
 * (ADR 0037, amended), after `import-dumgen-gold.ts`: the morpheme and
 * translation Knowledge cases, the lexical-breakdown and morphological-tree
 * cases (the future morphemic breakdown, ADR 0041), and the three Reading
 * Emoji Description generation cases. Each case enters verbatim as a
 * `legacy` entry of the record for its sentence, in the language of the
 * Lemma it describes; an existing record keeps its status and targets. A
 * source file's demonstration ids stay in Dumgen, in a `sidecar.json` beside
 * it, and the generation prompt stays in its `source-data.json`.
 *
 * It ran once, before the sources were deleted from Dumgen; rerunning needs
 * the commit before the import and a built promptsmith:
 *
 *   bun run --cwd battery/promptsmith build:js
 *   bun scripts/import-dumgen-gold-remainder.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { LegacyCase, SegmentKind } from "../src/types.js";

type Language = "de" | "en";
type CaseSegment = { kind: SegmentKind; text: string; surface?: string };
type Golden = Record<string, unknown> & {
	input: Record<string, unknown> & {
		markedContext: string;
		owner?: { lemmaDescriptor?: { language?: Language } };
	};
	explanation?: string;
	sources?: { path?: string }[];
};
type SourceFile = Record<string, unknown> & {
	cases: Record<string, Golden>;
};
type RecordFile = {
	$schema: string;
	sentence: string;
	segments: CaseSegment[];
	coverage: "Partial";
	status: "Draft" | "Reviewed";
	provenance: { kind: "Authored" };
	sources: { adrs: string[]; rules: unknown[]; references: unknown[] };
	targets: unknown[];
	noTarget: unknown[];
	legacy?: LegacyCase[];
};
type Span = readonly [start: number, end: number];

const repository = new URL("../../../", import.meta.url);
const dumgen = new URL("battery/dumgen/", repository);
const german = new URL("src/concrete-lang/de/", dumgen);
const recordsDirectory = new URL("../records/", import.meta.url);

const dumgenModule = (path: string) => import(new URL(path, dumgen).href);
type Segmenter = (text: string) => { segments: CaseSegment[] };
const segmenters: Record<Language, Segmenter> = {
	de: (
		(await dumgenModule(
			"src/concrete-lang/de/segmentation/segment.ts",
		)) as {
			segmentGerman: Segmenter;
		}
	).segmentGerman,
	en: (
		(await dumgenModule(
			"src/concrete-lang/en/segmentation/segment.ts",
		)) as {
			segmentEnglish: Segmenter;
		}
	).segmentEnglish,
};
const { slugOf, serialize, formatWritten } = (await dumgenModule(
	"codegen/record-files.ts",
)) as {
	slugOf: (sentence: string) => string;
	serialize: (value: unknown) => string;
	formatWritten: (paths: readonly string[]) => void;
};

const readJson = <T>(url: URL): T => JSON.parse(readFileSync(url, "utf8"));
const writeJson = (url: URL, value: unknown) =>
	writeFileSync(url, `${JSON.stringify(value, null, "\t")}\n`);
const stageFile = (path: string) => new URL(path, german);
const sourcePath = (path: string) =>
	fileURLToPath(stageFile(path)).slice(fileURLToPath(repository).length);

/** The sentence and the character spans of its `<TARGET>` tags. */
function unmark(markedContext: string): { sentence: string; spans: Span[] } {
	const spans: Span[] = [];
	let sentence = "";
	for (const part of markedContext.split(/(<TARGET>.*?<\/TARGET>)/gu)) {
		if (!part.startsWith("<TARGET>")) {
			sentence += part;
			continue;
		}
		const text = part.slice("<TARGET>".length, -"</TARGET>".length);
		spans.push([sentence.length, sentence.length + text.length]);
		sentence += text;
	}
	return { sentence, spans };
}

// Every record, by id, with its text when it existed before this run.
const records = new Map<
	string,
	{ file: RecordFile; text?: string; imported: number; changed: boolean }
>();
const takenIds = new Set<string>();
for (const path of readdirSync(recordsDirectory, {
	recursive: true,
	encoding: "utf8",
}).toSorted()) {
	if (!path.endsWith(".json")) continue;
	const id = path.slice(0, -".json".length);
	takenIds.add(id);
	if (!/^(?:de|en)\//u.test(id)) continue;
	const text = readFileSync(new URL(path, recordsDirectory), "utf8");
	const file: RecordFile = JSON.parse(text);
	records.set(id, {
		file,
		text,
		imported: file.legacy?.length ?? 0,
		changed: false,
	});
}
const recordOfSentence = new Map<string, string>();
for (const [id, { file }] of records) {
	const key = `${id.slice(0, 2)} ${file.sentence}`;
	if (!recordOfSentence.has(key)) recordOfSentence.set(key, id);
}

const systemAdrs = new Set(
	readdirSync(new URL("docs/adr/", repository)).flatMap((file) => {
		const number = /^(\d{4})-/u.exec(file)?.[1];
		return number ? [`ADR-${number}`] : [];
	}),
);
function citedAdrs(golden: Golden): string[] {
	const named = [
		...(golden.explanation ?? "").matchAll(/\bADR[ -]?(\d{4})\b/gu),
		...(golden.sources ?? []).flatMap((source) => [
			...(source.path ?? "").matchAll(/^docs\/adr\/(\d{4})-/gu),
		]),
	].map((match) => `ADR-${match[1]}`);
	return [...new Set(named)].filter((adr) => systemAdrs.has(adr));
}

const imported: { source: string; record: string; created: boolean }[] = [];

function importCase(source: string, caseId: string, golden: Golden) {
	const language = golden.input.owner?.lemmaDescriptor?.language ?? "de";
	const { sentence, spans } = unmark(golden.input.markedContext);
	const key = `${language} ${sentence}`;
	let id = recordOfSentence.get(key);
	if (id === undefined) {
		id = `${language}/${slugOf(sentence)}`;
		for (let suffix = 2; takenIds.has(id); suffix++)
			id = `${language}/${slugOf(sentence)}-${suffix}`;
		takenIds.add(id);
		recordOfSentence.set(key, id);
		records.set(id, {
			file: {
				$schema: `../../schema/spec-record.${language}.json`,
				sentence,
				segments: segmenters[language](sentence).segments,
				coverage: "Partial",
				status: "Draft",
				provenance: { kind: "Authored" },
				sources: { adrs: [], rules: [], references: [] },
				targets: [],
				noTarget: [],
			},
			imported: 0,
			changed: true,
		});
	}
	const record = records.get(id);
	if (!record) throw Error(`Lost ${id}`);
	const { file } = record;
	const created = record.text === undefined;
	if (created)
		for (const adr of citedAdrs(golden))
			if (!file.sources.adrs.includes(adr)) file.sources.adrs.push(adr);
	let offset = 0;
	const members = file.segments.flatMap(({ kind, text }, index) => {
		const start = offset;
		offset += text.length;
		return kind === "ResolvableText" &&
			spans.some(([from, to]) => from < offset && start < to)
			? [index]
			: [];
	});
	file.legacy ??= [];
	file.legacy.push({
		source,
		caseId,
		...(members.length ? { memberSegmentIndices: members } : {}),
		case: golden,
	});
	record.changed = true;
	imported.push({ source, record: id, created });
}

const sidecars: [URL, Record<string, unknown>][] = [];
for (const path of [
	"knowledge-production/morpheme/source-data.json",
	"knowledge-production/translation/source-data.json",
	"knowledge-production/lexical-breakdown/resolution/source-data.json",
	"knowledge-production/lexical-breakdown/segmentation/source-data.json",
	"knowledge-production/morphological-tree/resolution/source-data.json",
	"knowledge-production/morphological-tree/segmentation/source-data.json",
	"reading-emoji-description/generate/source-data.json",
]) {
	const { cases, ...rest } = readJson<SourceFile>(stageFile(path));
	for (const [caseId, golden] of Object.entries(cases))
		importCase(sourcePath(path), caseId, golden);
	// The generation prompt is pipeline code and keeps its file.
	if ("body" in rest) writeJson(stageFile(path), rest);
	else if ((rest.demonstrationIds as unknown[] | undefined)?.length)
		sidecars.push([new URL("sidecar.json", stageFile(path)), rest]);
}

const written: string[] = [];
for (const [id, record] of records) {
	if (!record.changed) continue;
	const path = fileURLToPath(new URL(`${id}.json`, recordsDirectory));
	if (record.text) {
		// Append this run's cases and keep the rest of the file's text.
		const added = (record.file.legacy ?? []).slice(record.imported);
		const entries = added
			.map(
				(entry) =>
					`\t\t${JSON.stringify(entry, null, "\t").replaceAll("\n", "\n\t\t")}`,
			)
			.join(",\n");
		const closing = "\n\t]\n}\n";
		writeFileSync(
			path,
			record.imported > 0 && record.text.endsWith(closing)
				? `${record.text.slice(0, -closing.length)},\n${entries}${closing}`
				: `${record.text.slice(0, record.text.lastIndexOf("\n}"))},\n\t"legacy": [\n${entries}${closing}`,
		);
	} else {
		record.file.sources.adrs.sort();
		writeFileSync(path, serialize(record.file));
	}
	written.push(path);
}
for (const [url, sidecar] of sidecars) {
	if (existsSync(url)) throw Error(`${url.pathname} exists`);
	writeJson(url, sidecar);
}
formatWritten(written);

const perSource: Record<string, { new: number; existing: number }> = {};
for (const { source, created } of imported) {
	perSource[source] ??= { new: 0, existing: 0 };
	(perSource[source] as { new: number; existing: number })[
		created ? "new" : "existing"
	]++;
}
console.log(perSource);
console.log(
	`${new Set(imported.filter((item) => item.created).map((item) => item.record)).size} new records, ${new Set(imported.filter((item) => !item.created).map((item) => item.record)).size} existing records extended`,
);
