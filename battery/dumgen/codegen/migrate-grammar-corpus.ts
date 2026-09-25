/**
 * One-time migration of the grammatical-resolution corpora into Spec Records
 * (ADR 0037, #631). Each retained answer runs through the public grammar
 * operation with the answer as its fixture, and the Attestation it produces
 * becomes a target of the Spec Record for its Sentence. Cases sharing a
 * Sentence share a record unless their members overlap. Answers that are not
 * Dumling values stay in the route's sidecar as Dumgen-owned cases: the
 * Unresolved and MoreContextRequired decisions, and the answers that only
 * the neighbouring Sentences decide.
 */
import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import { germanFusionTable } from "../src/concrete-lang/de/fusion-entries.js";
import { grammarOutputOf } from "../src/evaluation/grammar-operation.js";
import { grammarPromptRoutes } from "../src/generated/prompts.js";
import { grammarFixture } from "../src/testing.js";
import type { Segment } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import {
	fusedWordPieces,
	fusedWordSegments,
	fusionEntry,
} from "../src/universal/fusion-table.js";
import { validateEncounter } from "../src/universal/validation.js";

type OldCase = {
	input: {
		markedContext: string;
		members: string[];
		context?: { before?: string; after?: string };
		contextAvailable?: boolean;
	};
	idealOutput: Record<string, unknown>;
	explanation?: string;
	contaminationKeys?: string[];
};
type SliceSource = {
	name: string;
	description: string;
	ids: readonly string[];
};

const repository = new URL("../../../", import.meta.url);
const stage = new URL(
	"../src/concrete-lang/de/grammatical-resolution/",
	import.meta.url,
);
const recordsDirectory = new URL("battery/dumspec/records/de/", repository);

const adrStatuses = new Map<string, string>();
for (const file of readdirSync(new URL("docs/adr/", repository))) {
	const number = /^(\d{4})-/u.exec(file)?.[1];
	if (!number) continue;
	const text = readFileSync(new URL(`docs/adr/${file}`, repository), "utf8");
	adrStatuses.set(
		`ADR-${number}`,
		/^status: (.+)$/mu.exec(text)?.[1]?.trim() ?? "accepted",
	);
}
const staleAdr = (adr: string) =>
	/^(?:superseded|deprecated)\b/u.test(adrStatuses.get(adr) ?? "");

const sliceSources: Record<
	string,
	(ids: Record<string, readonly string[]>) => SliceSource[]
> = {
	"lexeme/adjective": (ids) => [
		{
			name: "participles",
			description:
				"Adjectival participles are ADJ with the uninflected participle as Canonical Form (ADR 0036).",
			ids: ids.participleCaseIds ?? [],
		},
		{
			name: "governed",
			description:
				"An adjective takes in its governed preposition as a member (ADR 0034).",
			ids: ids.governedCaseIds ?? [],
		},
	],
	"lexeme/noun": (ids) => [
		{
			name: "governed",
			description:
				"A noun takes in its governed preposition as a member (ADR 0034).",
			ids: ids.governedCaseIds ?? [],
		},
	],
	"phraseme/collocation": (ids) => [
		{
			name: "governed",
			description:
				"A Collocation takes in the preposition only it governs (ADR 0034).",
			ids: ids.governedCaseIds ?? [],
		},
	],
	"lexeme/pronoun": (ids) => [
		{
			name: "referent-context",
			description:
				"Pronoun forms whose cell only the referent decides (ADR 0018, #606): given the neighbouring Sentences, alone in a one-Sentence Text, and alone while more exists, where resolution may ask for the neighbours.",
			ids: ids.referentContextCaseIds ?? [],
		},
	],
};

const wordPattern =
	/\s+|[\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;

/** The Segments the evaluation builds from a marked context. */
function evaluationSegments(markedContext: string) {
	const segments: Segment[] = [];
	const members: number[] = [];
	for (const chunk of markedContext.split(/(<TARGET>.*?<\/TARGET>)/gu)) {
		if (!chunk) continue;
		if (chunk.startsWith("<TARGET>")) {
			members.push(segments.length);
			segments.push({ kind: "ResolvableText", text: chunk.slice(8, -9) });
			continue;
		}
		for (const text of chunk.match(wordPattern) ?? []) {
			const fusion = fusionEntry(germanFusionTable, text);
			for (const piece of fusion ? fusedWordPieces(fusion, text) : [text])
				segments.push({
					kind: /^\s+$/u.test(piece)
						? "Whitespace"
						: /^[\p{L}\p{N}]/u.test(piece)
							? "ResolvableText"
							: "Punctuation",
					text: piece,
				});
		}
	}
	return { segments, members };
}

/** The Sentence and the character span of each marked member. */
function spansOf(markedContext: string) {
	let sentence = "";
	const spans: [number, number][] = [];
	for (const chunk of markedContext.split(/(<TARGET>.*?<\/TARGET>)/gu)) {
		if (chunk.startsWith("<TARGET>")) {
			const text = chunk.slice(8, -9);
			spans.push([sentence.length, sentence.length + text.length]);
			sentence += text;
		} else sentence += chunk;
	}
	return { sentence, spans };
}

async function attestationOf(
	route: string,
	oldCase: OldCase,
): Promise<Dumling.Attestation> {
	const [language, family, kind] = route.split("/");
	const { segments, members } = evaluationSegments(
		oldCase.input.markedContext,
	);
	const encounter = validateEncounter({
		sentence: { id: "migration", language, segments },
		target: { family, kind, memberSegmentIndices: members },
	});
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen(grammarFixture(oldCase.idealOutput)).resolveGrammar(
				encounter,
			),
		),
	);
	if (result._tag === "Left") throw result.left;
	if ("decision" in result.right) throw Error("Unexpected decision");
	return result.right;
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

type Migrated = {
	route: string;
	directory: string;
	id: string;
	oldCase: OldCase;
	sentence: string;
	spans: [number, number][];
	attestation: Dumling.Attestation;
};
type Draft = { sentence: string; cases: Migrated[] };

/** The records that predate the migration; a rerun removes everything else. */
const seedIds = [
	"das-wetter-ist-xqzt",
	"es-zog-der-wilde-jaegersmann",
	"ich-bin-im-wald",
	"pass-auf-dich-auf",
];
for (const file of readdirSync(recordsDirectory))
	if (!seedIds.includes(file.replace(/\.json$/u, "")))
		rmSync(new URL(file, recordsDirectory));
type SeedRecord = {
	sentence: string;
	segments: { text: string }[];
	targets: { memberSegmentIndices: number[]; attestation: unknown }[];
};
const seeds = new Map<string, { id: string; record: SeedRecord }>(
	seedIds.map((name) => {
		const record: SeedRecord = JSON.parse(
			readFileSync(new URL(`${name}.json`, recordsDirectory), "utf8"),
		);
		return [record.sentence, { id: `de/${name}`, record }];
	}),
);
const takenIds = new Set(seedIds.map((name) => `de/${name}`));
const targetIds = new Map<string, string>();
const seeded: string[] = [];

/** A seed target that already holds this answer on the same members. */
function seedTargetOf(
	sentence: string,
	spans: [number, number][],
	attestation: unknown,
): string | undefined {
	const seed = seeds.get(sentence);
	if (!seed) return undefined;
	const starts: number[] = [];
	let offset = 0;
	for (const segment of seed.record.segments) {
		starts.push(offset);
		offset += segment.text.length;
	}
	const index = seed.record.targets.findIndex(
		(target) =>
			Bun.deepEquals(target.attestation, attestation, true) &&
			Bun.deepEquals(
				target.memberSegmentIndices.map((member) => [
					starts[member],
					(starts[member] ?? 0) +
						(seed.record.segments[member]?.text.length ?? 0),
				]),
				spans,
			),
	);
	return index < 0 ? undefined : `${seed.id}#${index}`;
}
const sidecars = new Map<
	string,
	{
		slices: Record<string, string>;
		order: string[];
		flags: Map<
			string,
			{ demonstration?: true; evaluation?: true; slices?: string[] }
		>;
		owned: Map<string, OldCase>;
		cases: Record<string, OldCase>;
	}
>();
const bySentence = new Map<string, Migrated[]>();
const unmigrated: { id: string; reason: string }[] = [];
const coverageOverrides: string[] = [];

for (const [route, experiment] of Object.entries(grammarPromptRoutes)) {
	const directory = experiment.replace("grammatical-resolution/de/", "");
	const url = new URL(`${directory}/`, stage);
	if (!existsSync(new URL("corpus.json", url))) continue;
	const cases: Record<string, OldCase> = JSON.parse(
		readFileSync(new URL("corpus.json", url), "utf8"),
	);
	const { corpusSource } = await import(
		fileURLToPath(new URL("corpus.ts", url))
	);
	const idLists: Record<string, readonly string[]> = await import(
		fileURLToPath(new URL("evaluation-ids.ts", url))
	);
	const demonstrations: readonly string[] = corpusSource.demonstrations.ids;
	const evaluation = idLists.evaluationCaseIds ?? [];
	const slices = sliceSources[directory]?.(idLists) ?? [];

	const flags = new Map<
		string,
		{ demonstration?: true; evaluation?: true; slices?: string[] }
	>();
	const flag = (id: string) => {
		const entry = flags.get(id) ?? {};
		flags.set(id, entry);
		return entry;
	};
	for (const id of demonstrations) flag(id).demonstration = true;
	for (const id of evaluation) flag(id).evaluation = true;
	for (const slice of slices)
		for (const id of slice.ids) {
			const entry = flag(id);
			entry.slices = [...(entry.slices ?? []), slice.name];
		}

	const order = mergeOrders(Object.keys(cases), [
		demonstrations,
		evaluation,
		...slices.map((slice) => slice.ids),
	]);
	if (!order) throw Error(`No case order keeps every list of ${directory}`);
	const owned = new Map<string, OldCase>();
	sidecars.set(directory, {
		slices: Object.fromEntries(
			slices.map((slice) => [slice.name, slice.description]),
		),
		order,
		flags,
		owned,
		cases,
	});

	for (const [id, oldCase] of Object.entries(cases)) {
		if ("decision" in oldCase.idealOutput) {
			owned.set(id, oldCase);
			unmigrated.push({
				id,
				reason: `answer ${String(oldCase.idealOutput.decision)} is a Dumgen decision, not a Dumling value`,
			});
			continue;
		}
		if (
			oldCase.input.context ||
			oldCase.input.contextAvailable !== undefined
		) {
			owned.set(id, oldCase);
			unmigrated.push({
				id,
				reason: "only the neighbouring Sentences decide the answer, and a Spec Record holds one Sentence",
			});
			continue;
		}
		const attestation = await attestationOf(route, oldCase);
		const coverage = oldCase.idealOutput.realizationCoverage;
		if (attestation.realizationCoverage !== coverage) {
			coverageOverrides.push(
				`${id}: ${attestation.realizationCoverage} -> ${String(coverage)}`,
			);
			(
				attestation as { realizationCoverage: unknown }
			).realizationCoverage = coverage;
		}
		const parsed = parseUnit(attestation);
		if (
			!parsed.success ||
			!Bun.deepEquals(parsed.chain.value, attestation, true)
		)
			throw Error(`${id}: the Attestation is not strict`);
		if (!Bun.deepEquals(grammarOutputOf(attestation), oldCase.idealOutput))
			throw Error(
				`${id}: the Attestation does not project back to its answer`,
			);
		const { sentence, spans } = spansOf(oldCase.input.markedContext);
		const seedTarget = seedTargetOf(sentence, spans, parsed.chain.value);
		if (seedTarget) {
			targetIds.set(id, seedTarget);
			seeded.push(`${id} -> ${seedTarget}`);
			continue;
		}
		const group = bySentence.get(sentence) ?? [];
		group.push({
			route,
			directory,
			id,
			oldCase,
			sentence,
			spans,
			attestation: parsed.chain.value as Dumling.Attestation,
		});
		bySentence.set(sentence, group);
	}
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

/** One order of all ids that keeps each list's order, preferring `base`. */
function mergeOrders(
	base: readonly string[],
	lists: readonly (readonly string[])[],
): string[] | undefined {
	const rank = new Map(base.map((id, index) => [id, index]));
	const after = new Map<string, Set<string>>(
		base.map((id) => [id, new Set()]),
	);
	const blockers = new Map<string, number>(base.map((id) => [id, 0]));
	for (const list of lists)
		for (let index = 1; index < list.length; index++) {
			const from = list[index - 1] as string;
			const to = list[index] as string;
			const next = after.get(from);
			if (!next || next.has(to)) continue;
			next.add(to);
			blockers.set(to, (blockers.get(to) ?? 0) + 1);
		}
	const order: string[] = [];
	const ready = base.filter((id) => blockers.get(id) === 0);
	while (ready.length) {
		ready.sort(
			(left, right) => (rank.get(left) ?? 0) - (rank.get(right) ?? 0),
		);
		const id = ready.shift() as string;
		order.push(id);
		for (const to of after.get(id) ?? []) {
			const left = (blockers.get(to) ?? 0) - 1;
			blockers.set(to, left);
			if (left === 0) ready.push(to);
		}
	}
	return order.length === base.length ? order : undefined;
}

const overlaps = (left: [number, number][], right: [number, number][]) =>
	left.some(([start, end]) =>
		right.some(
			([otherStart, otherEnd]) => start < otherEnd && otherStart < end,
		),
	);

const drafts: Draft[] = [];
for (const [sentence, group] of bySentence) {
	const records: Draft[] = [];
	for (const migrated of group) {
		const record = records.find((candidate) =>
			candidate.cases.every(
				(other) => !overlaps(other.spans, migrated.spans),
			),
		);
		if (record) record.cases.push(migrated);
		else records.push({ sentence, cases: [migrated] });
	}
	drafts.push(...records);
}

const splitSentences: string[] = [];
const triage: string[] = [];
let written = 0;
for (const draft of drafts) {
	const base = `de/${slugOf(draft.sentence)}`;
	let id = base;
	for (let suffix = 2; takenIds.has(id); suffix++) id = `${base}-${suffix}`;
	takenIds.add(id);
	if (id !== base) splitSentences.push(`${id}: ${draft.sentence}`);

	const boundaries = new Set<number>([0, draft.sentence.length]);
	const surfaces = new Map<string, string>();
	for (const match of draft.sentence.matchAll(wordPattern)) {
		let start = match.index;
		boundaries.add(start);
		boundaries.add(start + match[0].length);
		for (const piece of fusedWordSegments(germanFusionTable, match[0]) ??
			[]) {
			if (!piece.text) continue;
			const end = start + piece.text.length;
			boundaries.add(start);
			boundaries.add(end);
			if (piece.surface) surfaces.set(`${start}:${end}`, piece.surface);
			start = end;
		}
	}
	const spans = draft.cases.flatMap((migrated) => migrated.spans);
	for (const [start, end] of spans) {
		for (const boundary of boundaries)
			if (boundary > start && boundary < end) boundaries.delete(boundary);
		boundaries.add(start);
		boundaries.add(end);
	}
	const cuts = [...boundaries].sort((left, right) => left - right);
	const memberStarts = new Set(spans.map(([start]) => start));
	const segments = cuts.slice(0, -1).map((start, index) => {
		const end = cuts[index + 1] as number;
		const text = draft.sentence.slice(start, end);
		const surface = surfaces.get(`${start}:${end}`);
		return {
			kind: memberStarts.has(start)
				? "ResolvableText"
				: /^\s+$/u.test(text)
					? "Whitespace"
					: /^[\p{L}\p{N}]/u.test(text)
						? "ResolvableText"
						: "Punctuation",
			text,
			...(surface ? { surface } : {}),
		};
	});
	const segmentAt = new Map(
		cuts.slice(0, -1).map((start, index) => [start, index]),
	);

	const cases = draft.cases.toSorted(
		(left, right) => (left.spans[0]?.[0] ?? 0) - (right.spans[0]?.[0] ?? 0),
	);
	const adrs = new Set<string>();
	const references: { title: string; url: string; supports: string }[] = [];
	const targets = cases.map((migrated, index) => {
		const explanation = migrated.oldCase.explanation?.trim();
		for (const match of explanation?.matchAll(/\bADR[ -]?(\d{4})\b/gu) ??
			[])
			adrs.add(`ADR-${match[1]}`);
		const issues = new Set<string>();
		for (const match of explanation?.matchAll(
			/(?:#|\bissue |\bticket |\bmap )(\d+)\b/gu,
		) ?? [])
			issues.add(match[1] as string);
		for (const issue of [...issues].sort())
			references.push({
				title: `clockblocker/texteater#${issue}`,
				url: `https://github.com/clockblocker/texteater/issues/${issue}`,
				supports: `Target ${index}, ${migrated.attestation.members.map((member) => member.attested).join(" ")}`,
			});
		targetIds.set(migrated.id, `${id}#${index}`);
		return {
			memberSegmentIndices: migrated.spans.map(([start]) =>
				segmentAt.get(start),
			),
			...(explanation ? { notes: { rationale: explanation } } : {}),
			attestation: migrated.attestation,
		};
	});
	const sources = [...adrs].sort();
	const stale = sources.filter(staleAdr);
	if (stale.length)
		triage.push(
			`${id} (${stale.join(", ")}): ${cases.map((migrated) => migrated.id).join(", ")}`,
		);
	const record = {
		$schema: "../../schema/spec-record.de.json",
		sentence: draft.sentence,
		segments,
		coverage: "Partial",
		status: stale.length ? "Draft" : "Reviewed",
		provenance: { kind: "Authored" },
		sources: { adrs: sources, rules: [], references },
		targets,
		noTarget: [],
	};
	writeFileSync(
		new URL(`${id.slice(3)}.json`, recordsDirectory),
		serialize(record),
	);
	written++;
}

for (const [directory, sidecar] of sidecars) {
	const cases: Record<string, unknown> = {};
	for (const id of sidecar.order) {
		const flags = sidecar.flags.get(id) ?? {};
		const owned = sidecar.owned.get(id);
		if (owned) {
			cases[id] = { ...owned, ...flags };
			continue;
		}
		const target = targetIds.get(id);
		if (!target) throw Error(`${id} has no target`);
		const keys = sidecar.cases[id]?.contaminationKeys;
		cases[target] = {
			id,
			...flags,
			...(keys ? { contaminationKeys: keys } : {}),
		};
	}
	writeFileSync(
		new URL(`${directory}/sidecar.json`, stage),
		serialize({ slices: sidecar.slices, cases }),
	);
}

console.log(`${written} records`);
console.log(`\nKept in Dumgen (${unmigrated.length}):`);
for (const { id, reason } of unmigrated) console.log(`- ${id}: ${reason}`);
console.log(
	`\nCoverage taken from the answer, not the operation (${coverageOverrides.length}):`,
);
for (const line of coverageOverrides) console.log(`- ${line}`);
console.log(
	`\nSentences split over several records (${splitSentences.length}):`,
);
for (const line of splitSentences) console.log(`- ${line}`);
console.log(`\nAlready a seed target (${seeded.length}):`);
for (const line of seeded) console.log(`- ${line}`);
console.log(`\nDraft: cites a superseded ADR (${triage.length}):`);
for (const line of triage) console.log(`- ${line}`);
