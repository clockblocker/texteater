/**
 * Sentence views of the grammar corpora, for the identity and role axes.
 *
 * The click corpus in `corpus.ts` carries route gold. The lemma gold
 * (pronoun, determiner, auxiliary) carries the authored identity a closed-class
 * word realizes, and the verb and noun gold carry the lexical shape a unit
 * projects (separable prefix, governed preposition, reflexive, expletive,
 * article). Both are `markedContext` cases, so they are segmented here with the
 * production German segmenter and the `<TARGET>` spans become probes into the
 * sentence analysis, exactly as the click cases do.
 */

import auxiliaryCases from "../../src/concrete-lang/de/grammatical-resolution/lexeme/auxiliary/corpus.json";
import { evaluationCaseIds as auxiliaryIds } from "../../src/concrete-lang/de/grammatical-resolution/lexeme/auxiliary/evaluation-ids.js";
import determinerCases from "../../src/concrete-lang/de/grammatical-resolution/lexeme/determiner/corpus.json";
import { evaluationCaseIds as determinerIds } from "../../src/concrete-lang/de/grammatical-resolution/lexeme/determiner/evaluation-ids.js";
import nounCases from "../../src/concrete-lang/de/grammatical-resolution/lexeme/noun/corpus.json";
import { evaluationCaseIds as nounIds } from "../../src/concrete-lang/de/grammatical-resolution/lexeme/noun/evaluation-ids.js";
import pronounCases from "../../src/concrete-lang/de/grammatical-resolution/lexeme/pronoun/corpus.json";
import { evaluationCaseIds as pronounIds } from "../../src/concrete-lang/de/grammatical-resolution/lexeme/pronoun/evaluation-ids.js";
import verbCases from "../../src/concrete-lang/de/grammatical-resolution/lexeme/verb/corpus.json";
import { evaluationCaseIds as verbIds } from "../../src/concrete-lang/de/grammatical-resolution/lexeme/verb/evaluation-ids.js";
import { segmentGerman } from "../../src/concrete-lang/de/segmentation/segment.js";
import type { ClickCase, Segment, Sentence } from "./corpus.js";

type GrammarCase = {
	input: { markedContext: string; members: string[] };
	idealOutput: Record<string, unknown>;
};

export type ClosedKind = "DET" | "PRON" | "AUX";

/** The authored identity gold expects for one occurrence, or a ruled miss. */
export type IdentityProbe = {
	readonly id: string;
	readonly index: number;
	readonly kind: ClosedKind;
	readonly gold:
		| {
				readonly canonicalForm: string;
				readonly coreFeatures: Record<string, unknown>;
		  }
		| "Unresolved";
};

export type ShapeFeatures = {
	readonly hasSepPrefix: string | null;
	readonly hasGovPrep: string | null;
	readonly lexicallyReflexive: string | null;
	readonly expletive: string | null;
	readonly article: string | null;
};

/** The lexical shape gold expects the unit around `head` to project. */
export type ShapeProbe = {
	readonly id: string;
	readonly kind: "VERB" | "NOUN";
	readonly members: readonly number[];
	readonly head: number;
	readonly expected: ShapeFeatures;
	/** Where the article evidence comes from, for the noun report. */
	readonly articleSource: "Owned" | "Shared" | "Fusion" | "None";
};

export type GoldSentence = Sentence & {
	readonly identity: readonly IdentityProbe[];
	readonly shape: readonly ShapeProbe[];
};

function parseMarked(marked: string): {
	plain: string;
	spans: { start: number; end: number }[];
} {
	let plain = "";
	const spans: { start: number; end: number }[] = [];
	let last = 0;
	for (const match of marked.matchAll(/<TARGET>(.*?)<\/TARGET>/g)) {
		plain += marked.slice(last, match.index);
		const text = match[1] ?? "";
		spans.push({ start: plain.length, end: plain.length + text.length });
		plain += text;
		last = match.index + match[0].length;
	}
	plain += marked.slice(last);
	return { plain, spans };
}

/** Segments plus the segment index of every `<TARGET>` span, or null when a span is not one segment. */
function segmented(
	marked: string,
): { segments: Segment[]; targets: number[] } | null {
	const { plain, spans } = parseMarked(marked);
	const segments = segmentGerman(plain).segments.map((segment) => ({
		kind: segment.kind,
		text: segment.text,
	}));
	const offsets: number[] = [];
	let offset = 0;
	for (const segment of segments) {
		offsets.push(offset);
		offset += segment.text.length;
	}
	const targets: number[] = [];
	for (const span of spans) {
		const index = segments.findIndex(
			(segment, position) =>
				offsets[position] === span.start &&
				span.start + segment.text.length === span.end,
		);
		if (index < 0) return null;
		targets.push(index);
	}
	return { segments, targets };
}

type Builder = {
	add(
		id: string,
		segments: Segment[],
		probe: {
			cases?: ClickCase[];
			identity?: IdentityProbe[];
			shape?: ShapeProbe[];
		},
	): void;
	sentences(): GoldSentence[];
};

/** Cases sharing one sentence text share one analysis, as in `corpus.ts`. */
function builder(): Builder {
	const grouped = new Map<
		string,
		{
			id: string;
			segments: Segment[];
			cases: ClickCase[];
			identity: IdentityProbe[];
			shape: ShapeProbe[];
		}
	>();
	return {
		add(id, segments, probe) {
			const key = segments.map((segment) => segment.text).join("");
			const entry = grouped.get(key) ?? {
				id,
				segments,
				cases: [],
				identity: [],
				shape: [],
			};
			entry.cases.push(...(probe.cases ?? []));
			entry.identity.push(...(probe.identity ?? []));
			entry.shape.push(...(probe.shape ?? []));
			grouped.set(key, entry);
		},
		sentences() {
			return [...grouped.entries()].map(([key, entry]) => ({
				key,
				id: entry.id,
				segments: entry.segments,
				resolvable: entry.segments.flatMap((segment, index) =>
					segment.kind === "ResolvableText" ? [index] : [],
				),
				cases: entry.cases,
				identity: entry.identity,
				shape: entry.shape,
			}));
		},
	};
}

export const skipped: string[] = [];

/**
 * Pronoun, determiner and auxiliary gold as identity probes. DET and PRON
 * cases also become click probes (the gold unit is the marked singleton with
 * the corpus Kind), so route accuracy on closed-class clicks is measured on
 * the same run. AUX cases carry no click probe: the auxiliary's unit is the
 * verb it serves, which the lemma gold does not delimit.
 */
export function loadLemmaSentences(scope: string): GoldSentence[] {
	const build = builder();
	const sources: [
		ClosedKind,
		Record<string, GrammarCase>,
		readonly string[],
	][] = [
		["PRON", pronounCases as Record<string, GrammarCase>, pronounIds],
		["DET", determinerCases as Record<string, GrammarCase>, determinerIds],
		["AUX", auxiliaryCases as Record<string, GrammarCase>, auxiliaryIds],
	];
	for (const [kind, cases, evaluationIds] of sources) {
		const ids = scope === "all" ? Object.keys(cases) : evaluationIds;
		for (const id of ids) {
			const entry = cases[id];
			if (!entry) continue;
			const parsed = segmented(entry.input.markedContext);
			if (!parsed || parsed.targets.length !== 1) {
				skipped.push(id);
				continue;
			}
			const index = parsed.targets[0]!;
			const ideal = entry.idealOutput as {
				decision?: string;
				lemma?: {
					canonicalForm: string;
					coreFeatures: Record<string, unknown>;
				};
			};
			const gold =
				ideal.decision === "Unresolved" || !ideal.lemma
					? ("Unresolved" as const)
					: {
							canonicalForm: ideal.lemma.canonicalForm,
							coreFeatures: ideal.lemma.coreFeatures,
						};
			build.add(id, parsed.segments, {
				identity: [{ id, index, kind, gold }],
				cases:
					kind !== "AUX" && gold !== "Unresolved"
						? [
								{
									id,
									clickedSegmentIndex: index,
									idealOutput: {
										family: "Lexeme",
										kind,
										memberSegmentIndices: [index],
									},
								},
							]
						: [],
			});
		}
	}
	return build.sentences();
}

const auxiliarySpellings = new Set([
	"sein",
	"bin",
	"bist",
	"ist",
	"sind",
	"seid",
	"war",
	"warst",
	"waren",
	"wart",
	"sei",
	"seist",
	"seiest",
	"seien",
	"seiet",
	"wäre",
	"wärst",
	"wärest",
	"wären",
	"wärt",
	"wäret",
	"gewesen",
	"haben",
	"habe",
	"hab",
	"hast",
	"hat",
	"habt",
	"hatte",
	"hattest",
	"hatten",
	"hattet",
	"habest",
	"habet",
	"hätte",
	"hätt",
	"hättest",
	"hätten",
	"hättet",
	"gehabt",
	"werden",
	"werde",
	"wirst",
	"wird",
	"werdet",
	"wurde",
	"wurdest",
	"wurden",
	"wurdet",
	"ward",
	"wardst",
	"werdest",
	"würde",
	"würdest",
	"würden",
	"würdet",
	"geworden",
	"worden",
	"bekommt",
	"bekommen",
	"bekam",
	"kriegt",
	"kriegen",
	"erhält",
	"erhielt",
	"erhalten",
]);
const prepositions = new Set([
	"an",
	"auf",
	"aus",
	"bei",
	"durch",
	"für",
	"gegen",
	"in",
	"mit",
	"nach",
	"über",
	"um",
	"unter",
	"von",
	"vor",
	"zu",
	"zwischen",
]);

/**
 * The lexical head a click would name the unit by: the noun (last member)
 * of a noun target; for a verbal target, the member that is neither an
 * auxiliary form, a reflexive, an expletive, nor a preposition. Ties go to the
 * last such member, which is the participle or infinitive in verb-final order.
 */
function headOf(
	kind: "VERB" | "NOUN",
	members: readonly number[],
	segments: readonly Segment[],
): number {
	if (kind === "NOUN") return members.at(-1)!;
	const lexical = members.filter((index) => {
		const text = segments[index]!.text.normalize("NFC").toLowerCase();
		return (
			!auxiliarySpellings.has(text) &&
			!prepositions.has(text) &&
			text !== "sich" &&
			text !== "es"
		);
	});
	return lexical.at(-1) ?? members.at(-1)!;
}

/** Verb and noun evaluation cases as shape probes plus click probes on the head. */
export function loadGrammarSentences(scope: string): GoldSentence[] {
	const build = builder();
	const sources: [
		"VERB" | "NOUN",
		Record<string, GrammarCase>,
		readonly string[],
	][] = [
		["VERB", verbCases as Record<string, GrammarCase>, verbIds],
		["NOUN", nounCases as Record<string, GrammarCase>, nounIds],
	];
	for (const [kind, cases, evaluationIds] of sources) {
		const ids = scope === "all" ? Object.keys(cases) : evaluationIds;
		for (const id of ids) {
			const entry = cases[id];
			if (!entry) continue;
			const ideal = entry.idealOutput as {
				decision?: string;
				lemma?: { coreFeatures: Record<string, unknown> };
				surface?: {
					inflectionalFeatures: Record<string, unknown> | null;
				};
				articleEvidence?:
					| { kind: "Owned"; member: number }
					| {
							kind: "Shared";
							article: { attested: string; orthography: string };
					  }
					| null;
				expletiveEvidence?: { attested: string } | null;
			};
			if (ideal.decision === "Unresolved") continue;
			const parsed = segmented(entry.input.markedContext);
			if (!parsed || parsed.targets.length === 0) {
				skipped.push(id);
				continue;
			}
			const members = [...parsed.targets].sort((a, b) => a - b);
			const head = headOf(kind, members, parsed.segments);
			const core = ideal.lemma?.coreFeatures ?? {};
			const inflection = ideal.surface?.inflectionalFeatures ?? {};
			// ADR 0035: an owned article (standalone, fused piece or shortened)
			// is a member; a shared one stays outside.
			const evidence = ideal.articleEvidence ?? null;
			const attested =
				evidence?.kind === "Owned"
					? (entry.input.members[evidence.member] ?? null)
					: evidence?.kind === "Shared"
						? evidence.article.attested
						: null;
			const articleSource: ShapeProbe["articleSource"] = !evidence
				? "None"
				: evidence.kind === "Owned"
					? "Owned"
					: evidence.article.orthography === "Fused"
						? "Fusion"
						: "Shared";
			build.add(id, parsed.segments, {
				shape: [
					{
						id,
						kind,
						members,
						head,
						articleSource,
						expected: {
							hasSepPrefix: (core.hasSepPrefix as string) ?? null,
							hasGovPrep: (core.hasGovPrep as string) ?? null,
							lexicallyReflexive:
								(core.lexicallyReflexive as string) ?? null,
							expletive: (inflection.expletive as string) ?? null,
							article: attested,
						},
					},
				],
				cases: [
					{
						id,
						clickedSegmentIndex: head,
						idealOutput: {
							family: "Lexeme",
							kind,
							memberSegmentIndices: members,
						},
					},
				],
			});
		}
	}
	return build.sentences();
}
