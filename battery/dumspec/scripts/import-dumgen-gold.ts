/**
 * One-off import of Dumgen's remaining German gold into dumspec as Draft
 * records (ADR 0037, amended). Each case enters verbatim as a `legacy` entry
 * of the record for its sentence: an existing record keeps its Review Depth
 * and targets, and a sentence without one gets a new Draft, Partial, Authored
 * record citing the ADRs the case names. A classification or sentence
 * analysis case a record already holds is skipped. Intake items become Text
 * Records keyed by their raw text. Nothing is reshaped; the model has moved,
 * so the records are reshaped later in one pass. A source file's
 * demonstration and evaluation ids stay in Dumgen, in a `sidecar.json` beside
 * it.
 *
 * It reads Dumgen's files and helpers at runtime, so dumspec does not
 * type-check against Dumgen. It ran once, before the sources were deleted
 * from Dumgen; rerunning needs the commit before the import and a built
 * promptsmith:
 *
 *   bun run --cwd battery/promptsmith build:js
 *   bun scripts/import-dumgen-gold.ts
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import type { LegacyCase, SegmentKind } from "../src/types.js";

type CaseSegment = { kind: SegmentKind; text: string; surface?: string };
type Golden = Record<string, unknown> & {
	input: Record<string, unknown>;
	idealOutput: unknown;
	explanation?: string;
	sources?: { path?: string }[];
};
type SourceFile = Record<string, unknown> & {
	cases: Record<string, Golden>;
};
type RecordTarget = {
	memberSegmentIndices: number[];
	route: { family: string; kind: string };
	notes?: { rationale?: string };
	attestation: {
		surface: { lemma: { family: string; kind: string } };
		members: { attested: string }[];
	};
};
type RecordFile = {
	$schema: string;
	sentence: string;
	segments: CaseSegment[];
	coverage: "Full" | "Partial";
	reviewDepth?: string;
	provenance: { kind: "Authored" };
	sources: { adrs: string[]; rules: unknown[]; references: unknown[] };
	targets: RecordTarget[];
	noTarget: { memberSegmentIndices: number[]; reason: string }[];
	legacy?: LegacyCase[];
};
type Span = readonly [start: number, end: number];

const repository = new URL("../../../", import.meta.url);
const dumgen = new URL("battery/dumgen/", repository);
const german = new URL("src/concrete-lang/de/", dumgen);
const recordsDirectory = new URL("../records/", import.meta.url);

// Dumgen's Segmenter and record-file helpers, the ones its earlier
// migrations into dumspec used.
const dumgenModule = (path: string) => import(new URL(path, dumgen).href);
const { segmentGerman } = (await dumgenModule(
	"src/concrete-lang/de/segmentation/segment.ts",
)) as { segmentGerman: (text: string) => { segments: CaseSegment[] } };
const { recordSegments, slugOf, serialize, formatWritten } =
	(await dumgenModule("codegen/record-files.ts")) as {
		recordSegments: (segments: readonly CaseSegment[]) => CaseSegment[];
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
const plain = (segments: readonly CaseSegment[]) =>
	JSON.stringify(segments.map(({ kind, text }) => ({ kind, text })));
const sentenceOf = (segments: readonly { text: string }[]) =>
	segments.map((segment) => segment.text).join("");

function offsets(segments: readonly { text: string }[]): Span[] {
	let offset = 0;
	return segments.map(({ text }) => {
		const start = offset;
		offset += text.length;
		return [start, offset] as const;
	});
}

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

/** The spans of Segments picked by index. */
const spansOf = (segments: readonly CaseSegment[], indices: number[]) =>
	indices.flatMap((index) => {
		const span = offsets(segments)[index];
		return span ? [span] : [];
	});

// Every record, by id, with whether this run changed it and how it was
// written.
const records = new Map<
	string,
	{ file: RecordFile; text?: string; changed: boolean }
>();
const takenIds = new Set<string>();
for (const path of readdirSync(recordsDirectory, {
	recursive: true,
	encoding: "utf8",
})) {
	if (!path.endsWith(".json")) continue;
	const id = path.slice(0, -".json".length);
	takenIds.add(id);
	if (!id.startsWith("de/")) continue;
	const text = readFileSync(new URL(path, recordsDirectory), "utf8");
	records.set(id, { file: JSON.parse(text), text, changed: false });
}
const recordOfSentence = new Map<string, string>();
for (const [id, { file }] of [...records].toSorted(([left], [right]) =>
	left.localeCompare(right),
))
	if (!recordOfSentence.has(file.sentence))
		recordOfSentence.set(file.sentence, id);

const systemAdrs = new Set(
	readdirSync(new URL("docs/adr/", repository)).flatMap((file) => {
		const number = /^(\d{4})-/u.exec(file)?.[1];
		return number ? [`ADR-${number}`] : [];
	}),
);
/** The system ADRs a case names in its explanation or sources. */
function citedAdrs(golden: Partial<Golden>): string[] {
	const named = [
		...(golden.explanation ?? "").matchAll(/\bADR[ -]?(\d{4})\b/gu),
		...(golden.sources ?? []).flatMap((source) => [
			...(source.path ?? "").matchAll(/^docs\/adr\/(\d{4})-/gu),
		]),
	].map((match) => `ADR-${match[1]}`);
	return [...new Set(named)].filter((adr) => systemAdrs.has(adr));
}

type Imported = {
	source: string;
	caseId: string;
	record: string;
	created: boolean;
};
const imported: Imported[] = [];
const skipped: { source: string; caseId: string; record: string }[] = [];

/**
 * Appends a case to the record of its sentence, creating a Draft record when
 * there is none. `segments` are the case's own, when it has them.
 */
function importCase(options: {
	source: string;
	caseId: string;
	sentence: string;
	segments?: readonly CaseSegment[];
	spans?: readonly Span[];
	golden: Partial<Golden>;
	payload: unknown;
}) {
	const { source, caseId, sentence, spans = [], golden, payload } = options;
	let id = recordOfSentence.get(sentence);
	if (id === undefined) {
		id = `de/${slugOf(sentence)}`;
		for (let suffix = 2; takenIds.has(id); suffix++)
			id = `de/${slugOf(sentence)}-${suffix}`;
		takenIds.add(id);
		recordOfSentence.set(sentence, id);
		records.set(id, {
			file: {
				$schema: "../../schema/spec-record.de.json",
				sentence,
				segments: options.segments
					? recordSegments(options.segments)
					: segmentGerman(sentence).segments,
				coverage: "Partial",
				provenance: { kind: "Authored" },
				sources: { adrs: [], rules: [], references: [] },
				targets: [],
				noTarget: [],
			},
			changed: true,
		});
	}
	const record = records.get(id);
	if (!record) throw Error(`Lost ${id}`);
	const { file } = record;
	const created = record.text === undefined;
	if (record.text?.includes('"legacy"'))
		throw Error(`${id} already holds imported cases`);
	if (created)
		for (const adr of citedAdrs(golden))
			if (!file.sources.adrs.includes(adr)) file.sources.adrs.push(adr);
	const members = offsets(file.segments).flatMap(([start, end], index) =>
		file.segments[index]?.kind === "ResolvableText" &&
		spans.some(([from, to]) => from < end && start < to)
			? [index]
			: [],
	);
	file.legacy ??= [];
	file.legacy.push({
		source,
		caseId,
		...(members.length ? { memberSegmentIndices: members } : {}),
		case: payload,
	});
	record.changed = true;
	imported.push({ source, caseId, record: id, created });
}

/** Imports every case of a file whose input marks its target in context. */
function importMarked(
	path: string,
	cases: Record<string, Golden>,
	extra: (caseId: string) => Record<string, unknown> = () => ({}),
) {
	for (const [caseId, golden] of Object.entries(cases)) {
		const { sentence, spans } = unmark(
			golden.input.markedContext as string,
		);
		importCase({
			source: sourcePath(path),
			caseId,
			sentence,
			spans,
			golden,
			payload: { ...golden, ...extra(caseId) },
		});
	}
}

// Target classification: skip a case a record already holds.
const targetPath = "target-classification/source-data.json";
const targetSidecar = readJson<{ cases: Record<string, { id?: string }> }>(
	stageFile("target-classification/sidecar.json"),
);
const servedCaseIds = new Set(
	Object.entries(targetSidecar.cases).flatMap(([key, entry]) =>
		key.includes("@") && entry.id ? [entry.id] : [],
	),
);
const drafts = readJson<{
	drafts: Record<string, { attestation?: RecordTarget["attestation"] }>;
}>(new URL("evidence/target-attestation-drafts/drafts.json", dumgen)).drafts;
const lemmaOf = (target: RecordTarget) => target.attestation.surface.lemma;
for (const [caseId, golden] of Object.entries(
	readJson<SourceFile>(stageFile(targetPath)).cases,
)) {
	const input = golden.input as {
		clickedSegmentIndex: number;
		segments: CaseSegment[];
	};
	const ideal = golden.idealOutput as
		| { family: string; kind: string; memberSegmentIndices: number[] }
		| { decision: "Unresolved" };
	const sentence = sentenceOf(input.segments);
	const existing = recordOfSentence.get(sentence);
	const file = existing ? records.get(existing)?.file : undefined;
	const held =
		file &&
		plain(file.segments) === plain(input.segments) &&
		("decision" in ideal
			? file.noTarget.some((entry) =>
					entry.memberSegmentIndices.includes(
						input.clickedSegmentIndex,
					),
				)
			: file.targets.some(
					(target) =>
						lemmaOf(target).family === ideal.family &&
						lemmaOf(target).kind === ideal.kind &&
						JSON.stringify(target.memberSegmentIndices) ===
							JSON.stringify(ideal.memberSegmentIndices),
				));
	if (servedCaseIds.has(caseId) || (held && existing)) {
		skipped.push({
			source: sourcePath(targetPath),
			caseId,
			record: existing ?? "(sidecar)",
		});
		continue;
	}
	const indices =
		"decision" in ideal
			? [input.clickedSegmentIndex]
			: ideal.memberSegmentIndices;
	importCase({
		source: sourcePath(targetPath),
		caseId,
		sentence,
		segments: input.segments,
		spans: spansOf(input.segments, indices),
		golden,
		payload: golden,
	});
	// A drafted Attestation joins only the new Draft record it made.
	const attestation = drafts[caseId]?.attestation;
	const record = records.get(recordOfSentence.get(sentence) ?? "");
	if (attestation && record && !record.text && !("decision" in ideal))
		record.file.targets.push({
			memberSegmentIndices: ideal.memberSegmentIndices,
			route: { family: ideal.family, kind: ideal.kind },
			...(golden.explanation
				? { notes: { rationale: golden.explanation } }
				: {}),
			attestation,
		});
}

// Sentence analysis: skip a case a Full record holds exactly.
const sentencePath = "sentence-analysis/source-data.json";
for (const [caseId, golden] of Object.entries(
	readJson<SourceFile>(stageFile(sentencePath)).cases,
)) {
	const segments = (golden.input as { segments: CaseSegment[] }).segments;
	const ideal = golden.idealOutput as {
		targets?: { kind: string; members: { offset: number }[] }[];
		phrasemes?: unknown[];
	};
	const sentence = sentenceOf(segments);
	const existing = recordOfSentence.get(sentence);
	const file = existing ? records.get(existing)?.file : undefined;
	const indexAt = new Map(
		offsets(segments).map(([start], index) => [start, index]),
	);
	const expected = (ideal.targets ?? [])
		.map(
			(target) =>
				`Lexeme/${target.kind}:${target.members.map(({ offset }) => indexAt.get(offset)).join(",")}`,
		)
		.toSorted();
	const held =
		file?.coverage === "Full" &&
		plain(file.segments) === plain(segments) &&
		ideal.phrasemes?.length === 0 &&
		JSON.stringify(
			file.targets
				.map(
					(target) =>
						`${lemmaOf(target).family}/${lemmaOf(target).kind}:${target.memberSegmentIndices.join(",")}`,
				)
				.toSorted(),
		) === JSON.stringify(expected);
	if (held && existing) {
		skipped.push({
			source: sourcePath(sentencePath),
			caseId,
			record: existing,
		});
		continue;
	}
	importCase({
		source: sourcePath(sentencePath),
		caseId,
		sentence,
		segments,
		golden,
		payload: golden,
	});
}

// Knowledge production. Draft translations keep their reviewed alternatives
// beside the case.
const sidecars: [URL, Record<string, unknown>][] = [];
/** The file's cases, and its demonstration ids kept in a Dumgen sidecar. */
function casesOf(path: string): Record<string, Golden> {
	const { cases, ...rest } = readJson<SourceFile>(stageFile(path));
	delete rest.reviewedAlternatives;
	if (
		(rest.demonstrationIds as unknown[] | undefined)?.length ||
		(rest.localDemonstrations as unknown[] | undefined)?.length
	)
		sidecars.push([new URL("sidecar.json", stageFile(path)), rest]);
	return cases;
}
for (const path of [
	"knowledge-production/lexeme/source-data.json",
	"knowledge-production/phraseme/source-data.json",
	"knowledge-production/valency/source-data.json",
])
	importMarked(path, casesOf(path));
const translationsPath =
	"knowledge-production/draft-translations/source-data.json";
const alternatives = readJson<{
	reviewedAlternatives: Record<string, unknown>;
}>(stageFile(translationsPath)).reviewedAlternatives;
importMarked(translationsPath, casesOf(translationsPath), (caseId) =>
	alternatives[caseId] ? { reviewedAlternatives: alternatives[caseId] } : {},
);

// Reading Emoji Description: resolve, the generation examples and the
// operation cases, which repeat resolve and generate cases in the
// operation's shape.
const resolvePath = "reading-emoji-description/resolve/source-data.json";
importMarked(resolvePath, casesOf(resolvePath));
const generatePath = "reading-emoji-description/generate/cases.ts";
const { examples, additionalDemonstrationIds, additionalEvaluationIds } =
	(await import(stageFile(generatePath).href)) as {
		examples: ({ id: string; context: string } & Record<string, unknown>)[];
		additionalDemonstrationIds: string[];
		additionalEvaluationIds: string[];
	};
sidecars.push([
	new URL("sidecar.json", stageFile(generatePath)),
	{
		demonstrationIds: additionalDemonstrationIds,
		evaluationIds: additionalEvaluationIds,
	},
]);
for (const example of examples) {
	const { sentence, spans } = unmark(example.context);
	importCase({
		source: sourcePath(generatePath),
		caseId: `reading-generation-${example.id}`,
		sentence,
		spans,
		golden: {},
		payload: example,
	});
}
const emojiOperationPath = "reading-emoji-description/operation-cases.json";
for (const [caseId, golden] of Object.entries(
	readJson<Record<string, Golden>>(stageFile(emojiOperationPath)),
)) {
	const encounter = golden.input.encounter as {
		sentence: { segments: CaseSegment[] };
		target: { memberSegmentIndices: number[] };
	};
	const segments = encounter.sentence.segments;
	importCase({
		source: sourcePath(emojiOperationPath),
		caseId,
		sentence: sentenceOf(segments),
		spans: spansOf(segments, encounter.target.memberSegmentIndices),
		golden,
		payload: golden,
	});
}

// Text intake: one Text Record per raw text, holding each item with its
// ideal output.
type TextRecordFile = {
	$schema: string;
	sourceText: string;
	status: "Draft";
	legacy: LegacyCase[];
};
const textRecords = new Map<string, { id: string; file: TextRecordFile }>();
function importText(
	source: string,
	caseId: string,
	sourceText: string,
	payload: unknown,
) {
	let entry = textRecords.get(sourceText);
	if (!entry) {
		const name = slugOf(caseId.replace(/^intake-/u, ""));
		let id = `text/${name}`;
		for (let suffix = 2; takenIds.has(id); suffix++)
			id = `text/${name}-${suffix}`;
		takenIds.add(id);
		entry = {
			id,
			file: {
				$schema: "../../schema/text-record.json",
				sourceText,
				status: "Draft",
				legacy: [],
			},
		};
		textRecords.set(sourceText, entry);
	}
	entry.file.legacy.push({ source, caseId, case: payload });
	imported.push({ source, caseId, record: entry.id, created: true });
}
const intakePath = "segmentation/source-data.json";
for (const [key, golden] of Object.entries(casesOf(intakePath))) {
	const items = (
		golden.input as { items: { id: string; sourceText: string }[] }
	).items;
	const ideals = (golden.idealOutput as { items: { id: string }[] }).items;
	for (const item of items)
		importText(
			sourcePath(intakePath),
			`${key}/${item.id}`,
			item.sourceText,
			{
				input: item,
				idealOutput: ideals.find((ideal) => ideal.id === item.id),
				...(golden.explanation
					? { explanation: golden.explanation }
					: {}),
			},
		);
}
const intakeOperationPath = "segmentation/operation-cases.json";
for (const [key, golden] of Object.entries(
	readJson<Record<string, Golden>>(stageFile(intakeOperationPath)),
)) {
	const texts = (golden.input as { sourceSentences: string[] })
		.sourceSentences;
	const ideals = golden.idealOutput as unknown[];
	for (const [index, sourceText] of texts.entries())
		importText(
			sourcePath(intakeOperationPath),
			`${key}/${index}`,
			sourceText,
			{
				input: sourceText,
				idealOutput: ideals[index],
			},
		);
}

// Write the records: an existing file gains its `legacy` array at the end
// and keeps the rest of its text.
const written: string[] = [];
for (const [id, record] of records) {
	if (!record.changed) continue;
	const path = fileURLToPath(new URL(`${id}.json`, recordsDirectory));
	if (record.text) {
		const legacy = JSON.stringify(
			record.file.legacy,
			null,
			"\t",
		).replaceAll("\n", "\n\t");
		const end = record.text.lastIndexOf("\n}");
		writeFileSync(
			path,
			`${record.text.slice(0, end)},\n\t"legacy": ${legacy}${record.text.slice(end)}`,
		);
	} else {
		record.file.sources.adrs.sort();
		writeFileSync(path, serialize(record.file));
	}
	written.push(path);
}
mkdirSync(new URL("text/", recordsDirectory), { recursive: true });
for (const { id, file } of textRecords.values()) {
	const url = new URL(`${id}.json`, recordsDirectory);
	if (existsSync(url)) throw Error(`${id} exists`);
	writeJson(url, file);
	written.push(fileURLToPath(url));
}
for (const [url, sidecar] of sidecars) {
	if (existsSync(url)) throw Error(`${url.pathname} exists`);
	writeJson(url, sidecar);
}
formatWritten(written);

const count = <T>(items: readonly T[], key: (item: T) => string) => {
	const counts: Record<string, number> = {};
	for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
	return counts;
};
console.log(
	"imported per source",
	count(imported, (item) => item.source),
);
console.log(
	"into existing records per source",
	count(
		imported.filter((item) => !item.created),
		(item) => item.source,
	),
);
console.log(
	"skipped per source",
	count(skipped, (item) => item.source),
);
for (const item of skipped)
	console.log(`  skipped ${item.caseId}: held by ${item.record}`);
console.log(
	`${new Set(imported.filter((item) => item.created && item.record.startsWith("de/")).map((item) => item.record)).size} new Spec Records, ${textRecords.size} Text Records, ${new Set(imported.filter((item) => !item.created).map((item) => item.record)).size} existing records extended`,
);
