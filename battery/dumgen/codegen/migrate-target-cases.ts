/**
 * Moves target-classification cases from `source-data.json` into Spec Records
 * (ADR 0037, #632) and writes the review sheet for the priority cases.
 *
 * A case moves when a record already holds its target, or when its drafted
 * Attestation (`cli/draft-target-attestations.ts`) can enter a Draft record:
 * a new record for a Sentence with none, or a Draft record whose targets it
 * does not overlap. A Sentence with a Reviewed record takes no drafted
 * target; neither does a draft whose members or route disagree with the
 * case. Those cases stay in `source-data.json` and are flagged in the sheet.
 * The four Unresolved cases enter as No Target entries. Nothing becomes
 * Reviewed. Rerunning is safe: a case a record already serves stays put.
 *
 *   bun codegen/migrate-target-cases.ts && bun run generate
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type * as Dumling from "dumling/types";
import { loadSpecRecords } from "dumspec";
import type * as Dumspec from "dumspec/types";
import { stableJson } from "promptsmith";
import {
	draftsPath,
	priorityCaseIds,
	type TargetDraft,
	type TargetDrafts,
} from "../cli/draft-target-attestations.js";
import { germanFusionTable } from "../src/concrete-lang/de/fusion-entries.js";
import {
	fusedWordAt,
	fusedWordSegments,
} from "../src/universal/fusion-table.js";
import {
	clickOf,
	projectTargetCase,
	readTargetSidecar,
} from "./project-target-cases.js";

type Reference = Dumspec.Reference;
type CaseSegment = { kind: Dumspec.SegmentKind; text: string };
type Golden = {
	input: { clickedSegmentIndex: number; segments: CaseSegment[] };
	idealOutput:
		| { family: string; kind: string; memberSegmentIndices: number[] }
		| { decision: "Unresolved" };
	explanation?: string;
	contaminationKeys?: string[];
	sources?: Reference[];
};
type RecordFile = {
	$schema?: string;
	sentence: string;
	segments: (CaseSegment & { surface?: string })[];
	coverage: Dumspec.Coverage;
	status: Dumspec.ReviewStatus;
	provenance: Dumspec.Provenance;
	sources: {
		adrs: string[];
		rules: Dumspec.RuleCitation[];
		references: Reference[];
	};
	targets: {
		memberSegmentIndices: number[];
		notes?: { rationale?: string; knownMistakes?: string[] };
		attestation: Dumling.Attestation;
	}[];
	noTarget: Dumspec.NoTarget[];
};
type SidecarEntry = Record<string, unknown>;

const repository = new URL("../../../", import.meta.url);
const recordsDirectory = new URL("battery/dumspec/records/", repository);
const stage = new URL(
	"../src/concrete-lang/de/target-classification/",
	import.meta.url,
);
const sheetPath = new URL("review-sheet.md", draftsPath);

/** The system ADRs a record can cite. */
const adrs = new Set(
	readdirSync(new URL("docs/adr/", repository)).flatMap((file) => {
		const number = /^(\d{4})-/u.exec(file)?.[1];
		return number ? [`ADR-${number}`] : [];
	}),
);

const sourceDataPath = new URL("source-data.json", stage);
const sourceData: { cases: Record<string, Golden> } & Record<string, unknown> =
	JSON.parse(readFileSync(sourceDataPath, "utf8"));
const sidecar = readTargetSidecar(stage);
const drafts: Record<string, TargetDraft> = existsSync(draftsPath)
	? (JSON.parse(readFileSync(draftsPath, "utf8")) as TargetDrafts).drafts
	: {};
const configuration = existsSync(draftsPath)
	? (JSON.parse(readFileSync(draftsPath, "utf8")) as TargetDrafts)
			.configuration
	: undefined;

/**
 * Every German record, its file as written, whether that file puts each
 * object on its own lines, and whether this run changed it.
 */
const records = new Map<
	string,
	{
		file: RecordFile;
		loaded?: Dumspec.SpecRecord;
		expanded?: boolean;
		changed: boolean;
	}
>();
for (const record of loadSpecRecords())
	if (record.language === "de") {
		const text = readFileSync(
			new URL(`${record.id}.json`, recordsDirectory),
			"utf8",
		);
		records.set(record.id, {
			file: JSON.parse(text),
			loaded: record,
			expanded: /\{\n\t*"kind": /u.test(text),
			changed: false,
		});
	}

const plainSegments = (segments: readonly CaseSegment[]) =>
	stableJson(segments.map(({ kind, text }) => ({ kind, text })));
const sentenceOf = (segments: readonly CaseSegment[]) =>
	segments.map((segment) => segment.text).join("");
const lemmaOf = (attestation: Dumling.Attestation) =>
	attestation.surface.lemma as { family: string; kind: string };
const claimed = (file: RecordFile) =>
	new Set([
		...file.targets.flatMap((target) => target.memberSegmentIndices),
		...file.noTarget.map((entry) => entry.segment),
	]);

/** The record target or No Target entry equal to the case's expectation. */
function servingSegment(file: RecordFile, golden: Golden): boolean {
	if (plainSegments(file.segments) !== plainSegments(golden.input.segments))
		return false;
	const click = golden.input.clickedSegmentIndex;
	const expected = golden.idealOutput;
	if ("decision" in expected)
		return file.noTarget.some((entry) => entry.segment === click);
	return file.targets.some((target) => {
		const lemma = lemmaOf(target.attestation);
		return (
			lemma.family === expected.family &&
			lemma.kind === expected.kind &&
			stableJson(target.memberSegmentIndices) ===
				stableJson(expected.memberSegmentIndices)
		);
	});
}

/** Why a drafted Attestation cannot stand for the case's expected target. */
function disagreement(
	attestation: Dumling.Attestation,
	golden: Golden,
): string | undefined {
	const expected = golden.idealOutput;
	if ("decision" in expected) return "the case expects Unresolved";
	const lemma = lemmaOf(attestation);
	if (lemma.family !== expected.family || lemma.kind !== expected.kind)
		return `route ${lemma.family}/${lemma.kind}`;
	const attested = attestation.members.map((member) => member.attested);
	const segments = expected.memberSegmentIndices.map(
		(index) => golden.input.segments[index]?.text,
	);
	return stableJson(attested) === stableJson(segments)
		? undefined
		: `members ${attested.join(" + ")}`;
}

const transliterations: Record<string, string> = {
	ä: "ae",
	ö: "oe",
	ü: "ue",
	ß: "ss",
};
function slugOf(sentence: string): string {
	const words = sentence
		.normalize("NFC")
		.toLocaleLowerCase("de")
		.replace(/[äöüß]/gu, (letter) => transliterations[letter] ?? letter)
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-|-$/gu, "")
		.split("-")
		.filter(Boolean);
	let slug = "";
	for (const word of words) {
		if (slug && slug.length + word.length + 1 > 60) break;
		slug = slug ? `${slug}-${word}` : word;
	}
	return slug || "satz";
}

/** The case Segments with the surface of each fused-word piece. */
function recordSegments(segments: readonly CaseSegment[]) {
	const withSurfaces: (CaseSegment & { surface?: string })[] = segments.map(
		({ kind, text }) => ({ kind, text }),
	);
	for (let index = 0; index < segments.length; index++) {
		const run = fusedWordAt(germanFusionTable, segments, index);
		if (!run) continue;
		const pieces = fusedWordSegments(
			germanFusionTable,
			run.map((position) => segments[position]?.text ?? "").join(""),
		);
		for (const [position, piece] of (pieces ?? []).entries()) {
			const segment = withSurfaces[index + position];
			if (segment && piece.surface && piece.text === segment.text)
				segment.surface = piece.surface;
		}
	}
	return withSurfaces;
}

function citedAdrs(text: string | undefined): string[] {
	return [...(text ?? "").matchAll(/\bADR[ -]?(\d{4})\b/gu)]
		.map((match) => `ADR-${match[1]}`)
		.filter((adr) => adrs.has(adr));
}
function issueReferences(text: string | undefined, supports: string) {
	return [
		...new Set(
			[
				...(text ?? "").matchAll(
					/(?:#|\bissue |\bticket |\bmap )(\d+)\b/gu,
				),
			].map((match) => match[1] as string),
		),
	]
		.sort()
		.map((issue) => ({
			title: `clockblocker/texteater#${issue}`,
			url: `https://github.com/clockblocker/texteater/issues/${issue}`,
			supports,
		}));
}
/**
 * Cites the case's ADRs, issues and sources in a record this run writes. A
 * Reviewed record is never written.
 */
function cite(file: RecordFile, golden: Golden, supports: string) {
	for (const adr of citedAdrs(golden.explanation))
		if (!file.sources.adrs.includes(adr)) file.sources.adrs.push(adr);
	for (const reference of [
		...(golden.sources ?? []),
		...issueReferences(golden.explanation, supports),
	])
		if (
			!file.sources.references.some(
				(existing) => stableJson(existing) === stableJson(reference),
			)
		)
			file.sources.references.push(reference);
}

type Row = {
	id: string;
	golden: Golden;
	/** drafted, failed and why, or not drafted. */
	draft: string;
	attestation?: Dumling.Attestation;
	disagreement?: string;
	placement: string;
};
/** A drafting failure's first sentence, which names its cause. */
const failed = (failure: string) => `failed: ${failure.split(". ")[0]}`;
const rows = new Map<string, Row>();
const priority = new Set(priorityCaseIds);
const takenIds = new Set(records.keys());
const moved = new Map<string, { key: string; entry: SidecarEntry }>();
const counts = {
	drafted: 0,
	failed: 0,
	notDrafted: 0,
	disagreements: 0,
	heldBackReviewed: 0,
	heldBackDraft: 0,
	servedExisting: 0,
	added: 0,
	created: 0,
	noTarget: 0,
};

/** Moves a case to the record target that serves its click. */
function serve(id: string, golden: Golden, recordId: string) {
	const file = records.get(recordId)?.file;
	if (!file) throw Error(`No record ${recordId}`);
	const click = golden.input.clickedSegmentIndex;
	const target = file.targets.find((candidate) =>
		candidate.memberSegmentIndices.includes(click),
	);
	const noTarget = file.noTarget.find((entry) => entry.segment === click);
	const authored = target?.notes?.rationale ?? noTarget?.reason;
	const entry: SidecarEntry = { id };
	if (golden.explanation !== authored)
		entry.explanation = golden.explanation ?? null;
	if (golden.contaminationKeys)
		entry.contaminationKeys = golden.contaminationKeys;
	if (golden.sources) entry.sources = golden.sources;
	moved.set(id, { key: `${recordId}@${click}`, entry });
}

/** A new Draft record for the Sentence, or a free Draft record to join. */
function draftRecordFor(
	golden: Golden,
	claim: readonly number[],
): { heldBack: string } | { recordId: string; created: boolean } {
	const sentence = sentenceOf(golden.input.segments);
	const sameSentence = [...records.entries()].filter(
		([, { file }]) => file.sentence === sentence,
	);
	const reviewed = sameSentence.find(
		([, { file }]) => file.status === "Reviewed",
	);
	if (reviewed) return { heldBack: `Reviewed record ${reviewed[0]}` };
	for (const [recordId, { file }] of sameSentence) {
		if (
			plainSegments(file.segments) !==
			plainSegments(golden.input.segments)
		)
			continue;
		const taken = claimed(file);
		if (claim.every((index) => !taken.has(index)))
			return { recordId, created: false };
	}
	// A Draft record this run did not write keeps its analysis; two new
	// records may share a Sentence when their targets overlap.
	const existing = sameSentence
		.filter(([, { loaded }]) => loaded)
		.map(([recordId]) => recordId);
	if (existing.length)
		return {
			heldBack: `conflicts with Draft record ${existing.join(", ")}`,
		};
	let recordId = `de/${slugOf(sentence)}`;
	for (let suffix = 2; takenIds.has(recordId); suffix++)
		recordId = `de/${slugOf(sentence)}-${suffix}`;
	takenIds.add(recordId);
	records.set(recordId, {
		file: {
			$schema: "../../schema/spec-record.de.json",
			sentence,
			segments: recordSegments(golden.input.segments),
			coverage: "Partial",
			status: "Draft",
			provenance: { kind: "Authored" },
			sources: { adrs: [], rules: [], references: [] },
			targets: [],
			noTarget: [],
		},
		changed: true,
	});
	return { recordId, created: true };
}

for (const [key, entry] of Object.entries(sidecar.cases)) {
	const click = clickOf(key);
	if ("id" in entry && click) {
		const loaded = records.get(click.record)?.loaded;
		if (!loaded) throw Error(`No Spec Record for ${key}`);
		const golden = projectTargetCase(loaded, click.segment) as Golden;
		const unresolved = "decision" in golden.idealOutput;
		if (!priority.has(entry.id) && !unresolved) continue;
		const target = loaded.targets.find((candidate) =>
			candidate.memberSegmentIndices.includes(click.segment),
		);
		const earlier = drafts[entry.id];
		rows.set(entry.id, {
			id: entry.id,
			golden,
			draft: unresolved
				? "no Attestation: Unresolved"
				: earlier
					? "failure" in earlier
						? failed(earlier.failure)
						: "drafted"
					: "not drafted",
			...(target ? { attestation: target.attestation } : {}),
			placement: `in ${click.record} (${loaded.status})`,
		});
		continue;
	}
	const id = key;
	const golden = sourceData.cases[id];
	if (!golden)
		throw Error(`${id} is in neither a record nor source-data.json`);
	const unresolved = "decision" in golden.idealOutput;
	if (!priority.has(id) && !unresolved) continue;
	const row: Row = { id, golden, draft: "not drafted", placement: "" };
	rows.set(id, row);

	const sentence = sentenceOf(golden.input.segments);
	const serving = [...records.entries()].find(
		([, { file }]) =>
			file.sentence === sentence && servingSegment(file, golden),
	);
	if (serving) {
		serve(id, golden, serving[0]);
		counts.servedExisting++;
		row.placement = `served by ${serving[0]} (${serving[1].file.status}), which already holds the target`;
		const target = serving[1].file.targets.find((candidate) =>
			candidate.memberSegmentIndices.includes(
				golden.input.clickedSegmentIndex,
			),
		);
		if (target) row.attestation = target.attestation;
		const earlier = drafts[id];
		if (earlier)
			row.draft =
				"failure" in earlier ? failed(earlier.failure) : "drafted";
		continue;
	}

	if (unresolved) {
		row.draft = "no Attestation: Unresolved";
		const click = golden.input.clickedSegmentIndex;
		const place = draftRecordFor(golden, [click]);
		if ("heldBack" in place) {
			row.placement = `held back: ${place.heldBack}`;
			continue;
		}
		const record = records.get(place.recordId);
		if (!record) throw Error("Lost the record");
		record.file.noTarget.push({
			segment: click,
			reason: golden.explanation ?? "No defensible route.",
		});
		record.file.noTarget.sort(
			(left, right) => left.segment - right.segment,
		);
		record.changed = true;
		cite(
			record.file,
			golden,
			`No Target ${golden.input.segments[click]?.text}`,
		);
		serve(id, golden, place.recordId);
		counts.noTarget++;
		row.placement = `${place.created ? "new" : "added to"} ${place.recordId} (Draft), No Target`;
		continue;
	}

	const expected = golden.idealOutput as {
		family: string;
		kind: string;
		memberSegmentIndices: number[];
	};
	const draft = drafts[id];
	if (draft && "attestation" in draft) {
		counts.drafted++;
		row.draft = "drafted";
		row.attestation = draft.attestation;
		row.disagreement = disagreement(draft.attestation, golden);
		if (row.disagreement) counts.disagreements++;
	} else if (draft) {
		counts.failed++;
		row.draft = failed(draft.failure);
	} else counts.notDrafted++;

	const place = draftRecordFor(golden, expected.memberSegmentIndices);
	if ("heldBack" in place) {
		if (place.heldBack.startsWith("Reviewed")) counts.heldBackReviewed++;
		else counts.heldBackDraft++;
		row.placement = `held back: ${place.heldBack}`;
		continue;
	}
	const record = records.get(place.recordId);
	if (!record) throw Error("Lost the record");
	if (!row.attestation || row.disagreement) {
		row.placement = row.disagreement
			? "stays in source-data.json: the draft disagrees with the case"
			: "stays in source-data.json: no draft";
		if (
			place.created &&
			record.file.targets.length + record.file.noTarget.length === 0
		) {
			records.delete(place.recordId);
			takenIds.delete(place.recordId);
		}
		continue;
	}
	record.file.targets.push({
		memberSegmentIndices: [...expected.memberSegmentIndices],
		...(golden.explanation
			? { notes: { rationale: golden.explanation } }
			: {}),
		attestation: row.attestation,
	});
	record.changed = true;
	cite(
		record.file,
		golden,
		`Target ${row.attestation.members.map((member) => member.attested).join(" ")}`,
	);
	serve(id, golden, place.recordId);
	if (place.created) counts.created++;
	else counts.added++;
	row.placement = `${place.created ? "new" : "added to"} ${place.recordId} (Draft)`;
}

/** JSON with each object of plain values on one line, for Biome to settle. */
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

/** A file in its layout: Biome keeps the lines JSON.stringify breaks. */
const stringify = (value: unknown) => `${JSON.stringify(value, null, "\t")}\n`;
const written: string[] = [];
for (const [recordId, record] of records) {
	if (!record.changed) continue;
	const file = record.file;
	if (file.status === "Reviewed")
		throw Error(`${recordId} is Reviewed and must not change`);
	file.sources.adrs.sort();
	if (!record.loaded)
		file.targets.sort(
			(left, right) =>
				(left.memberSegmentIndices[0] ?? 0) -
				(right.memberSegmentIndices[0] ?? 0),
		);
	const path = fileURLToPath(new URL(`${recordId}.json`, recordsDirectory));
	writeFileSync(path, record.expanded ? stringify(file) : serialize(file));
	written.push(path);
}

const cases: Record<string, SidecarEntry> = {};
for (const [key, entry] of Object.entries(sidecar.cases)) {
	const move = moved.get(key);
	if (!move) {
		cases[key] = entry;
		continue;
	}
	const {
		demonstration,
		evaluation,
		slices,
	}: { demonstration?: true; evaluation?: true; slices?: string[] } = entry;
	cases[move.key] = {
		id: move.entry.id,
		...(demonstration ? { demonstration } : {}),
		...(evaluation ? { evaluation } : {}),
		...(slices ? { slices } : {}),
		...Object.fromEntries(
			Object.entries(move.entry).filter(([name]) => name !== "id"),
		),
	};
	delete sourceData.cases[key];
}
const sidecarPath = fileURLToPath(new URL("sidecar.json", stage));
writeFileSync(sidecarPath, stringify({ slices: sidecar.slices, cases }));
writeFileSync(fileURLToPath(sourceDataPath), stringify(sourceData));

const cell = (text: string) =>
	text.replaceAll("|", "\\|").replaceAll(/\s*\n\s*/gu, " ");
const features = (value: unknown) =>
	value && typeof value === "object"
		? Object.entries(value)
				.filter(([, feature]) => feature !== null)
				.map(([name, feature]) => `${name}=${feature}`)
				.join(",")
		: "";
function compact(attestation: Dumling.Attestation): string {
	const surface = attestation.surface as Record<string, unknown> & {
		normalizedSurface: string;
		lemma: Record<string, unknown> & { canonicalForm: string };
	};
	const core = features(surface.lemma.coreFeatures);
	const inflection = features(surface.inflectionalFeatures);
	const evidence: string[] = [];
	const extra = attestation as Record<string, unknown>;
	const article = extra.articleEvidence as
		| { kind: string }
		| null
		| undefined;
	if (article) evidence.push(`article ${article.kind}`);
	if (extra.expletiveEvidence) evidence.push("expletive");
	for (const slot of (extra.valencyEvidence ?? []) as {
		member: number | null;
		complement: {
			kind: string;
			case?: string;
			preposition?: { canonicalForm: string };
		};
	}[])
		evidence.push(
			`${slot.complement.preposition ? `${slot.complement.preposition.canonicalForm}+` : ""}${slot.complement.case ?? slot.complement.kind}${slot.member === null ? "" : `@${slot.member}`}`,
		);
	return [
		`${surface.lemma.canonicalForm}${core ? ` {${core}}` : ""}`,
		`"${surface.normalizedSurface}"${surface.spelling === "Canonical" ? "" : ` ${surface.spelling}`}${inflection ? ` {${inflection}}` : ""}`,
		attestation.members
			.map((member) => `${member.attested}/${member.orthography}`)
			.join(" "),
		attestation.realizationCoverage,
		...(evidence.length ? [evidence.join(", ")] : []),
	].join(" · ");
}
const ordered = priorityCaseIds
	.concat([...rows.keys()].filter((id) => !priorityCaseIds.includes(id)))
	.map((id) => rows.get(id))
	.filter((row): row is Row => row !== undefined);
const lines = ordered.map((row) => {
	const { input, idealOutput } = row.golden;
	const members =
		"decision" in idealOutput ? [] : idealOutput.memberSegmentIndices;
	const sentence = input.segments
		.map((segment, index) =>
			index === input.clickedSegmentIndex
				? `[[${segment.text}]]`
				: segment.text,
		)
		.join("");
	const expected =
		"decision" in idealOutput
			? "Unresolved"
			: `${idealOutput.family}/${idealOutput.kind}: ${members.map((index) => input.segments[index]?.text).join(" + ")}`;
	return `| ${[
		row.id,
		sentence,
		expected,
		row.golden.explanation ?? "",
		row.attestation ? compact(row.attestation) : "",
		row.disagreement
			? `${row.draft}; disagrees: ${row.disagreement}`
			: row.draft,
		row.placement,
	]
		.map((text) => cell(text))
		.join(" | ")} |`;
});
const rowCount = (predicate: (row: Row) => boolean) =>
	ordered.filter(predicate).length;
writeFileSync(
	sheetPath,
	`# Target-classification Attestation drafts

Written by \`codegen/migrate-target-cases.ts\` from the drafts
\`cli/draft-target-attestations.ts\` produced by running Grammatical
Resolution on each case's expected target (#632). Review them in #633.
\`[[...]]\` marks the clicked Segment. An Attestation reads: Lemma {Core
Features} · "Surface" {Inflectional Features} · members/orthography ·
Realization Coverage · evidence. A case already in a record shows that
record's Attestation.

Drafting configuration: \`${JSON.stringify(configuration ?? null)}\`

- Priority cases: ${priorityCaseIds.length}, and ${ordered.length - priorityCaseIds.length} Unresolved cases outside them
- Drafted: ${rowCount((row) => row.draft === "drafted")}
- Drafting failed: ${rowCount((row) => row.draft.startsWith("failed"))}
- Draft disagrees with the case's members or route: ${rowCount((row) => row.disagreement !== undefined)}
- Held back by a Reviewed record: ${rowCount((row) => row.placement.startsWith("held back: Reviewed"))}
- Held back by a conflicting Draft record: ${rowCount((row) => row.placement.startsWith("held back: conflicts"))}
- Served by a record: ${rowCount((row) => /^(in|served by|new|added to) /u.test(row.placement))}

| Case | Sentence | Expected | Explanation | Attestation | Draft | Placement |
| --- | --- | --- | --- | --- | --- | --- |
${lines.join("\n")}
`,
);

const biome = fileURLToPath(new URL("node_modules/.bin/biome", repository));
Bun.spawnSync([
	biome,
	"format",
	"--write",
	sidecarPath,
	fileURLToPath(sourceDataPath),
	...written,
]);
console.log(counts);
console.log(`${written.length} records written`);
