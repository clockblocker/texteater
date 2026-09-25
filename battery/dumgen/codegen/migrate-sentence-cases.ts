/**
 * Moves sentence-analysis cases from `source-data.json` into Full Spec
 * Records (ADR 0037, #634) and writes the review sheet.
 *
 * A case moves when a Full record reproduces its Lexeme layer exactly: the
 * same targets, members and roles, and an empty Phraseme layer. That record
 * is one that already exists, or a Draft record completed with the drafted
 * Attestations of `cli/draft-sentence-attestations.ts`: a new one for a
 * Sentence with no record, or the Draft record of the Sentence whose targets
 * are all the case's. A Sentence with a Reviewed record takes no drafted
 * target, and a draft whose route, members or preposition slots disagree
 * with the case moves nothing. The case keeps its explanation, headword
 * groups and slots in the sidecar, so it projects as it did. Nothing becomes
 * Reviewed. Rerunning is safe: a case a record already serves stays put.
 *
 *   bun codegen/migrate-sentence-cases.ts && bun run generate
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type * as Dumling from "dumling/types";
import { loadSpecRecords } from "dumspec";
import type * as Dumspec from "dumspec/types";
import { stableJson } from "promptsmith";
import {
	type ExpectedSentenceTarget,
	fullRecordTargets,
	holds,
	recordsOfSentence,
	type SentenceDrafts,
	type SentenceGolden,
	sentenceDraftsPath,
} from "../cli/draft-sentence-attestations.js";
import {
	isRecordKey,
	projectSentenceCase,
	readSentenceSidecar,
	segmentOffsets,
} from "./project-sentence-cases.js";
import {
	cell,
	cite,
	compact,
	formatWritten,
	type RecordFile,
	recordSegments,
	recordsDirectory,
	serialize,
	slugOf,
	stringify,
} from "./record-files.js";

const stage = new URL(
	"../src/concrete-lang/de/sentence-analysis/",
	import.meta.url,
);
const sheetPath = new URL("review-sheet.md", sentenceDraftsPath);
const sourceDataPath = new URL("source-data.json", stage);
const sourceData: {
	route: string;
	cases: Record<string, SentenceGolden>;
} = JSON.parse(readFileSync(sourceDataPath, "utf8"));
const sidecar = readSentenceSidecar(stage);
const draftFile: SentenceDrafts | undefined = existsSync(sentenceDraftsPath)
	? JSON.parse(readFileSync(sentenceDraftsPath, "utf8"))
	: undefined;
const drafts = draftFile?.drafts ?? {};

const loaded = loadSpecRecords().filter(({ language }) => language === "de");
/** Each German record's file as written and whether it spreads its objects. */
const files = new Map(
	loaded.map((record) => {
		const text = readFileSync(
			new URL(`${record.id}.json`, recordsDirectory),
			"utf8",
		);
		return [
			record.id,
			{
				file: JSON.parse(text) as RecordFile,
				expanded: /\{\n\t*"kind": /u.test(text),
			},
		];
	}),
);
const takenIds = new Set(files.keys());

/** The record a file would load as; the file has passed dumspec's checks. */
const asRecord = (id: string, file: RecordFile): Dumspec.SpecRecord => ({
	id,
	language: "de",
	sentence: file.sentence,
	segments: file.segments,
	targets: file.targets,
	noTarget: file.noTarget,
	coverage: file.coverage,
	status: file.status,
	sources: file.sources,
	provenance: file.provenance,
});

/** The case's Lexeme layer without the headword groups Dumgen owns. */
const lexemeLayer = (golden: SentenceGolden) =>
	(golden.idealOutput.targets ?? []).map(({ kind, members }) => ({
		kind,
		members,
	}));

/** Why the record's projection is not the case's gold, if it is not. */
function reproduction(
	record: Dumspec.SpecRecord,
	golden: SentenceGolden,
): string | undefined {
	const projected = projectSentenceCase(record).idealOutput;
	if (!projected.phrasemes) return "the record holds a Phraseme";
	const expected = lexemeLayer(golden);
	const differing = (projected.targets ?? []).filter(
		(target, index) => stableJson(target) !== stableJson(expected[index]),
	);
	if (differing.length === 0 && projected.targets?.length === expected.length)
		return slotDisagreement(record, golden);
	const texts = segmentOffsets(record.segments);
	const label = (target: (typeof differing)[number]) =>
		`${target.kind} ${target.members
			.map(
				({ offset, role }) =>
					`${record.segments[texts.indexOf(offset)]?.text}${role ? `/${role}` : ""}`,
			)
			.join(" ")}`;
	return `the record projects ${differing.map(label).join("; ") || "another number of targets"}`;
}

/**
 * Whether the case's preposition slots are the record's: each slot is a
 * Preposition complement of a target holding one of its governors, on the
 * same Segment, preposition and case, and there are no others.
 */
function slotDisagreement(
	record: Dumspec.SpecRecord,
	golden: SentenceGolden,
): string | undefined {
	const slots = golden.idealOutput.slots as
		| {
				governors: number[];
				offset: number;
				preposition: string;
				case: string;
		  }[]
		| undefined;
	if (!slots) return undefined;
	const offsets = segmentOffsets(record.segments);
	const complements = record.targets.flatMap((target) =>
		(
			(target.attestation as { valencyEvidence?: readonly unknown[] })
				.valencyEvidence ?? []
		).flatMap((evidence) => {
			const { member, complement } = evidence as {
				member: number | null;
				complement: {
					kind: string;
					case?: string;
					preposition?: { canonicalForm: string };
				};
			};
			const index =
				member === null
					? undefined
					: target.memberSegmentIndices[member];
			return complement.kind === "Preposition" && index !== undefined
				? [
						{
							offset: offsets[index],
							preposition: complement.preposition?.canonicalForm,
							case: complement.case,
							governors: target.memberSegmentIndices.map(
								(segment) => offsets[segment],
							),
						},
					]
				: [];
		}),
	);
	const matched = slots.filter((slot) =>
		complements.some(
			(complement) =>
				complement.offset === slot.offset &&
				complement.preposition === slot.preposition &&
				complement.case === slot.case &&
				slot.governors.some((governor) =>
					complement.governors.includes(governor),
				),
		),
	);
	return matched.length === slots.length &&
		complements.length === slots.length
		? undefined
		: `its preposition slots are ${complements.map((slot) => `${slot.preposition} ${slot.case}`).join(", ") || "none"}`;
}

/** Why a drafted Attestation cannot stand for the expected target. */
function disagreement(
	attestation: Dumling.Attestation,
	expected: ExpectedSentenceTarget,
	golden: SentenceGolden,
): string | undefined {
	const lemma = attestation.surface.lemma;
	if (
		lemma.family !== expected.target.family ||
		lemma.kind !== expected.target.kind
	)
		return `route ${lemma.family}/${lemma.kind}`;
	const attested = attestation.members.map((member) => member.attested);
	const segments = expected.target.memberSegmentIndices.map(
		(index) => golden.input.segments[index]?.text,
	);
	return stableJson(attested) === stableJson(segments)
		? undefined
		: `members ${attested.join(" + ")}`;
}

type TargetRow = {
	expected: ExpectedSentenceTarget;
	role: string;
	attestation?: Dumling.Attestation;
	draft: string;
};
type Row = {
	id: string;
	golden: SentenceGolden;
	targets: TargetRow[];
	placement: string;
};
const rows: Row[] = [];
const moved = new Map<string, string>();
const written = new Set<string>();
const failed = (failure: string) => `failed: ${failure.split(". ")[0]}`;

/** The sidecar entry of a case a record serves: what the record does not carry. */
function servedEntry(id: string, golden: SentenceGolden) {
	const identities = Object.fromEntries(
		(golden.idealOutput.targets ?? []).flatMap((target) =>
			target.identity
				? [[String(target.members[0]?.offset), target.identity]]
				: [],
		),
	);
	return {
		id,
		...(golden.explanation ? { explanation: golden.explanation } : {}),
		...(Object.keys(identities).length ? { identities } : {}),
		...(golden.idealOutput.slots
			? { slots: golden.idealOutput.slots }
			: {}),
	};
}

for (const [key, flags] of Object.entries(sidecar.cases)) {
	if (isRecordKey(key)) {
		const record = loaded.find((candidate) => candidate.id === key);
		if (!record || !("id" in flags))
			throw Error(`No Spec Record for ${key}`);
		const projected = projectSentenceCase(record);
		const golden: SentenceGolden = {
			input: projected.input,
			idealOutput: projected.idealOutput,
			...(flags.explanation ? { explanation: flags.explanation } : {}),
		};
		const full = fullRecordTargets(golden);
		rows.push({
			id: flags.id,
			golden,
			targets:
				"reason" in full
					? []
					: full.targets.map((expected) => ({
							expected,
							role: "",
							attestation: record.targets.find((target) =>
								holds(target, expected.target),
							)?.attestation,
							draft: "",
						})),
			placement: `in ${record.id} (${record.status})`,
		});
		continue;
	}
	const id = key;
	const golden = sourceData.cases[id];
	if (!golden)
		throw Error(`${id} is in neither a record nor source-data.json`);
	const row: Row = { id, golden, targets: [], placement: "" };
	rows.push(row);
	const full = fullRecordTargets(golden);
	if ("reason" in full) {
		row.placement = `stays in source-data.json: the case ${full.reason}`;
		continue;
	}
	const roles = (golden.idealOutput.targets ?? []).map((target) =>
		target.members.map(({ role }) => role ?? "-").join(" "),
	);
	row.targets = full.targets.map((expected, index) => ({
		expected,
		role: roles[index] ?? "",
		draft: "not drafted",
	}));

	const sameSentence = recordsOfSentence(loaded, golden);
	const serving = sameSentence.find(
		(record) =>
			record.coverage === "Full" &&
			reproduction(record, golden) === undefined,
	);
	if (serving) {
		moved.set(id, serving.id);
		row.placement = `served by ${serving.id} (${serving.status})`;
		for (const target of row.targets)
			target.attestation = serving.targets.find((candidate) =>
				holds(candidate, target.expected.target),
			)?.attestation;
		continue;
	}
	const reviewed = sameSentence.find(
		(record) => record.status === "Reviewed",
	);
	if (reviewed) {
		row.placement = `held back: Reviewed record ${reviewed.id}`;
		continue;
	}
	const draftRecords = sameSentence.filter(
		(record) => record.status === "Draft",
	);
	const joinable = draftRecords.find((record) =>
		record.targets.every((target) =>
			full.targets.some((expected) => holds(target, expected.target)),
		),
	);
	if (draftRecords.length > 0 && !joinable) {
		row.placement = `held back: conflicts with Draft record ${draftRecords.map((record) => record.id).join(", ")}`;
		continue;
	}

	let missing = 0;
	const added: RecordFile["targets"] = [];
	for (const target of row.targets) {
		const held = joinable?.targets.find((candidate) =>
			holds(candidate, target.expected.target),
		);
		if (held) {
			target.attestation = held.attestation;
			target.draft = `held by ${joinable?.id}`;
			continue;
		}
		const draft = drafts[id]?.[target.expected.offset];
		if (!draft || "failure" in draft) {
			if (draft) target.draft = failed(draft.failure);
			missing++;
			continue;
		}
		target.attestation = draft.attestation;
		const disagrees = disagreement(
			draft.attestation,
			target.expected,
			golden,
		);
		target.draft = disagrees
			? `drafted; disagrees: ${disagrees}`
			: "drafted";
		if (disagrees) missing++;
		else
			added.push({
				memberSegmentIndices: [
					...target.expected.target.memberSegmentIndices,
				],
				attestation: draft.attestation,
			});
	}
	if (missing > 0) {
		row.placement = `stays in source-data.json: ${missing} of ${row.targets.length} targets have no agreeing draft`;
		continue;
	}

	const sentence = golden.input.segments.map(({ text }) => text).join("");
	let recordId = joinable?.id;
	if (!recordId) {
		recordId = `de/${slugOf(sentence)}`;
		for (let suffix = 2; takenIds.has(recordId); suffix++)
			recordId = `de/${slugOf(sentence)}-${suffix}`;
	}
	const existing = joinable ? files.get(joinable.id)?.file : undefined;
	const file: RecordFile = existing
		? {
				...existing,
				coverage: "Full",
				sources: structuredClone(existing.sources),
				targets: [...existing.targets, ...added],
			}
		: {
				$schema: "../../schema/spec-record.de.json",
				sentence,
				segments: recordSegments(golden.input.segments),
				coverage: "Full",
				status: "Draft",
				provenance: { kind: "Authored" },
				sources: { adrs: [], rules: [], references: [] },
				targets: added.toSorted(
					(left, right) =>
						(left.memberSegmentIndices[0] ?? 0) -
						(right.memberSegmentIndices[0] ?? 0),
				),
				noTarget: [],
			};
	const differs = reproduction(asRecord(recordId, file), golden);
	if (differs) {
		row.placement = `stays in source-data.json: ${differs}`;
		continue;
	}
	cite(file, golden, "Sentence analysis");
	file.sources.adrs.sort();
	takenIds.add(recordId);
	files.set(recordId, {
		file,
		expanded: files.get(recordId)?.expanded ?? false,
	});
	written.add(recordId);
	moved.set(id, recordId);
	row.placement = `${joinable ? "completes" : "new"} ${recordId} (Draft, Full)`;
}

const writtenPaths = [...written].map((recordId) => {
	const entry = files.get(recordId);
	if (!entry) throw Error(`Lost ${recordId}`);
	if (entry.file.status === "Reviewed")
		throw Error(`${recordId} is Reviewed and must not change`);
	const path = fileURLToPath(new URL(`${recordId}.json`, recordsDirectory));
	writeFileSync(
		path,
		entry.expanded ? stringify(entry.file) : serialize(entry.file),
	);
	return path;
});

const cases: Record<string, unknown> = {};
for (const [key, entry] of Object.entries(sidecar.cases)) {
	const recordId = moved.get(key);
	const golden = sourceData.cases[key];
	if (!recordId || !golden) {
		cases[key] = entry;
		continue;
	}
	if (cases[recordId]) throw Error(`${recordId} would serve two cases`);
	const { demonstration, evaluation, slices } = entry;
	const { id, ...owned } = servedEntry(key, golden);
	cases[recordId] = {
		id,
		...(demonstration ? { demonstration } : {}),
		...(evaluation ? { evaluation } : {}),
		...(slices ? { slices } : {}),
		...owned,
	};
	delete sourceData.cases[key];
}
const sidecarPath = fileURLToPath(new URL("sidecar.json", stage));
writeFileSync(sidecarPath, stringify({ slices: sidecar.slices, cases }));
writeFileSync(fileURLToPath(sourceDataPath), stringify(sourceData));

const marked = (golden: SentenceGolden, members: readonly number[]) =>
	golden.input.segments
		.map((segment, index) =>
			members.includes(index) ? `[[${segment.text}]]` : segment.text,
		)
		.join("");
const lines = rows.flatMap((row) => {
	const explanation = row.golden.explanation ?? "";
	if (row.targets.length === 0)
		return [
			`| ${[row.id, marked(row.golden, []), "", explanation, "", "", row.placement].map(cell).join(" | ")} |`,
		];
	return row.targets.map(
		(target, index) =>
			`| ${[
				row.id,
				marked(row.golden, target.expected.target.memberSegmentIndices),
				`${target.expected.target.kind} ${target.role}`,
				index === 0 ? explanation : "",
				target.attestation ? compact(target.attestation) : "",
				target.draft,
				index === 0 ? row.placement : "",
			]
				.map(cell)
				.join(" | ")} |`,
	);
});
const targetRows = rows.flatMap((row) => row.targets);
const count = (predicate: (row: Row) => boolean) =>
	rows.filter(predicate).length;
const served = (row: Row) =>
	/^(in|served by|new|completes) /u.test(row.placement);
writeFileSync(
	sheetPath,
	`# Sentence-analysis Attestation drafts

Written by \`codegen/migrate-sentence-cases.ts\` from the drafts
\`cli/draft-sentence-attestations.ts\` produced by running Grammatical
Resolution on each expected target of the sentence-analysis cases a Full
Spec Record could serve (#634). \`[[...]]\` marks the target's members, and
Expected gives its Kind and each member's role (\`-\` where the case scores
none). An Attestation reads: Lemma {Core Features} · "Surface" {Inflectional
Features} · members/orthography · Realization Coverage · evidence.

Drafting configuration: \`${JSON.stringify(draftFile?.configuration ?? null)}\`

- Cases: ${rows.length}; a Full record could serve ${count((row) => row.targets.length > 0)}, with ${targetRows.length} targets
- Targets drafted: ${targetRows.filter((target) => target.draft.startsWith("drafted")).length}
- Targets whose drafting failed: ${targetRows.filter((target) => target.draft.startsWith("failed")).length}
- Targets not drafted yet: ${targetRows.filter((target) => target.draft === "not drafted").length}
- Drafts that disagree with the case: ${targetRows.filter((target) => target.draft.includes("disagrees")).length}
- Held back by a Reviewed record: ${count((row) => row.placement.startsWith("held back: Reviewed"))}
- Held back by a conflicting Draft record: ${count((row) => row.placement.startsWith("held back: conflicts"))}
- Served by a record: ${count(served)}

Drafting stops at the first answer that the provider wants payment (HTTP
402). To draft the rest and move what agrees, from \`battery/dumgen\`:

\`\`\`sh
bun --env-file=../../.env.local cli/draft-sentence-attestations.ts
bun codegen/migrate-sentence-cases.ts && bun run generate
bun run --cwd ../../app/tf-demo compile:relation-policy
\`\`\`

| Case | Sentence | Expected | Explanation | Attestation | Draft | Placement |
| --- | --- | --- | --- | --- | --- | --- |
${lines.join("\n")}
`,
);

formatWritten([sidecarPath, fileURLToPath(sourceDataPath), ...writtenPaths]);
console.log(
	`${count(served)} of ${rows.length} cases served by records; ${writtenPaths.length} records written`,
);
