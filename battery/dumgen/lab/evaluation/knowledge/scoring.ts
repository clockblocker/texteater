/**
 * How a `knowledge.produce` run is scored (#887, #873's method).
 *
 * - Structural aspects (plural, valency, participle source, conjugation
 *   class, locution, saying and formula types) are right when the produced
 *   value equals gold's, an aspect gold reviewed empty being right only
 *   when nothing was produced. A failed aspect is wrong. Only an aspect
 *   gold covers is scored.
 * - Semantic relations are scored on recall: each gold claim is found when
 *   the run claims the same relation to the same Unit Shadow (Family, Kind
 *   and case-folded Canonical Form). Extra claims are not counted wrong; a
 *   seeded sample goes to a human spot-check.
 * - The frame also reports its complements' recall and precision, and the
 *   participle whether a source was found at all.
 * - Text aspects are never scored automatically: every value has passed
 *   Dumrel already, and a sample goes to a human (#883 point 10). The
 *   spot-check report names each of #545's slips and whether it recurred.
 *
 * Every line reports its count and a 95% Wilson interval; the case-aspects
 * whose verdict flips between repetitions are named.
 */
import { createHash } from "node:crypto";
import { canonicalJson, isRecord } from "common-utils";
import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChange } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { z } from "zod";
import { type Line, lineOf, wilson } from "../resolve-grammar/scoring.js";
import type { KnowledgeCase, TranslationSlip } from "./cases.js";

/** What one attempt returned, as a run stores it. */
export const knowledgeOutputSchema = z.object({
	changes: z.array(z.unknown()),
	pendingRelations: z.array(
		z.object({
			relation: z.string(),
			target: z.object({
				language: z.string(),
				family: z.string(),
				kind: z.string(),
				canonicalForm: z.string(),
			}),
		}),
	),
	failures: z.array(
		z.object({
			aspect: z.string(),
			leaf: z.string().optional(),
			code: z.string(),
			message: z.string(),
		}),
	),
	/** The operation's events: dropped Slots, skipped aspects, rejected candidates. */
	events: z
		.array(z.object({ name: z.string(), data: z.unknown() }))
		.optional(),
});
export type KnowledgeOutput = z.infer<typeof knowledgeOutputSchema>;

/** One requested aspect or leaf's verdict in one attempt. */
export type AspectVerdict = {
	/** `plural`, `valency`, `semanticRelations.synonym`, `translations.en`, … */
	readonly aspect: string;
	/** The failure's code, when the aspect failed. */
	readonly failed?: string;
	/** Whether the run produced a value (a claim, for a relation). */
	readonly produced: boolean;
	/** What gold's coverage says, when it covers the aspect. */
	readonly gold?: "Authored" | "ReviewedEmpty";
	/** The exact verdict of a structural aspect gold covers. */
	readonly correct?: boolean;
	/** A relation's gold targets, those the run found, and its extra claims. */
	readonly goldClaims?: readonly string[];
	readonly found?: readonly string[];
	readonly extra?: readonly string[];
	/** The frame's complements: gold's, the run's, and those both hold. */
	readonly complements?: {
		readonly gold: number;
		readonly produced: number;
		readonly matched: number;
	};
	/** The participle: whether gold and the run agree a source exists. */
	readonly sourceAgrees?: boolean;
	/** A text aspect's value, for the spot-check. */
	readonly text?: string;
};

export type KnowledgeEvaluation = {
	readonly verdicts: readonly AspectVerdict[];
};

/** An attempt's evaluation as a run stores it. */
export const knowledgeEvaluationSchema = z.object({
	verdicts: z.array(
		z.object({
			aspect: z.string(),
			failed: z.string().optional(),
			produced: z.boolean(),
			gold: z.enum(["Authored", "ReviewedEmpty"]).optional(),
			correct: z.boolean().optional(),
			goldClaims: z.array(z.string()).optional(),
			found: z.array(z.string()).optional(),
			extra: z.array(z.string()).optional(),
			complements: z
				.object({
					gold: z.number(),
					produced: z.number(),
					matched: z.number(),
				})
				.optional(),
			sourceAgrees: z.boolean().optional(),
			text: z.string().optional(),
		}),
	),
}) satisfies z.ZodType<KnowledgeEvaluation>;

type Shadow = {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
};

/** A Unit Shadow's identity, as relations are matched (#884 ruling 3). */
export const shadowKey = ({ family, kind, canonicalForm }: Shadow) =>
	`${family}/${kind}/${foldCase(canonicalForm, "de")}`;

/**
 * Gold's targets of each Semantic Relation, by relation, in gold's order. A
 * Reading target stands for its Lemma's Unit Shadow.
 */
export function goldRelationTargets(
	knowledge: Dumrel.ReadingKnowledge | undefined,
): ReadonlyMap<string, readonly Shadow[]> {
	const targets = new Map<string, readonly Shadow[]>();
	for (const [relation, value] of Object.entries(
		knowledge?.semanticRelations ?? {},
	))
		if (Array.isArray(value))
			targets.set(
				relation,
				value.map((target: Dumling.Lemma | Dumling.Reading) =>
					target.unitKind === "Reading" ? target.lemma : target,
				),
			);
	return targets;
}

/** The Knowledge an attempt's changes add up to, each change Dumrel takes applied in order. */
function producedKnowledge(
	reading: Dumling.Reading<"de">,
	changes: readonly unknown[],
): Dumrel.ReadingKnowledge<Dumling.Reading<"de">> {
	let knowledge: Dumrel.ReadingKnowledge<Dumling.Reading<"de">> = {};
	for (const change of changes) {
		const applied = applyKnowledgeChange({
			source: reading,
			knowledge,
			change,
		});
		if (applied.success) knowledge = applied.value;
	}
	return knowledge;
}

type Values = Readonly<Record<string, unknown>>;

/** A complement's identity: everything but the preposition Lemma's features. */
function complementKey(complement: Values): string {
	const { preposition, ...rest } = complement;
	return canonicalJson({
		...rest,
		...(preposition
			? {
					preposition: (preposition as { canonicalForm?: string })
						.canonicalForm,
				}
			: {}),
	});
}

type Slot = {
	readonly status: string;
	readonly complements: readonly Values[];
};

const slotKey = (slot: Slot) =>
	canonicalJson({
		status: slot.status,
		complements: slot.complements.map(complementKey).sort(),
	});

/** Whether two frames hold the same Slots, in any order. */
const sameFrame = (left: readonly Slot[], right: readonly Slot[]) =>
	canonicalJson(left.map(slotKey).sort()) ===
	canonicalJson(right.map(slotKey).sort());

const pluralKey = (value: unknown) =>
	Array.isArray(value)
		? canonicalJson(
				value.map((form) => foldCase(String(form), "de")).sort(),
			)
		: canonicalJson(value ?? null);

const verbKey = (source: unknown) => {
	if (!source) return null;
	// A produced source has passed Dumrel and gold's is Dumrel-checked, so
	// both are Participle Sources; the reads only keep the unknown typed.
	const { verb, meaning } = isRecord(source) ? source : {};
	const lemma = isRecord(verb) ? verb : {};
	const core = isRecord(lemma.coreFeatures) ? lemma.coreFeatures : {};
	return canonicalJson({
		verb: foldCase(String(lemma.canonicalForm), "de"),
		hasSepPrefix: core.hasSepPrefix ?? null,
		lexicallyReflexive: core.lexicallyReflexive ?? null,
		meaning,
	});
};

/** How each single-valued structural aspect compares. */
const sameValue: Readonly<
	Record<string, (gold: unknown, produced: unknown) => boolean>
> = {
	plural: (gold, produced) => pluralKey(gold) === pluralKey(produced),
	conjugationClass: (gold, produced) =>
		canonicalJson([...((gold as string[]) ?? [])].sort()) ===
		canonicalJson([...((produced as string[]) ?? [])].sort()),
	participleSource: (gold, produced) => verbKey(gold) === verbKey(produced),
	locutionType: (gold, produced) => gold === produced,
	formulaRole: (gold, produced) => gold === produced,
	sayingType: (gold, produced) =>
		(gold as { type?: string } | undefined)?.type ===
		(produced as { type?: string } | undefined)?.type,
	valency: (gold, produced) =>
		sameFrame((gold as Slot[]) ?? [], (produced as Slot[]) ?? []),
};

const coverageOf = (
	goldCase: KnowledgeCase,
	aspect: string,
	leaf?: string,
): "Authored" | "ReviewedEmpty" | undefined => {
	const coverage = goldCase.gold?.coverage as
		| Readonly<Record<string, unknown>>
		| undefined;
	const value = coverage?.[aspect];
	const status =
		leaf === undefined
			? value
			: (value as Readonly<Record<string, unknown>> | undefined)?.[leaf];
	return status === "Authored" || status === "ReviewedEmpty"
		? status
		: undefined;
};

const textOf = (value: unknown): string | undefined =>
	typeof value === "string"
		? value
		: Array.isArray(value)
			? value.join("; ")
			: undefined;

/** Scores one attempt against its case's gold Knowledge, aspect by aspect. */
export function evaluateKnowledge(
	goldCase: KnowledgeCase,
	request: Dumrel.KnowledgeRequestMask,
	output: KnowledgeOutput,
): KnowledgeEvaluation {
	const produced: Readonly<Record<string, unknown>> = producedKnowledge(
		goldCase.reading,
		output.changes,
	);
	const goldKnowledge: Dumrel.ReadingKnowledge =
		goldCase.gold?.knowledge ?? {};
	const gold: Readonly<Record<string, unknown>> = goldKnowledge;
	const failure = (aspect: string, leaf?: string) =>
		output.failures.find(
			(entry) =>
				entry.aspect === aspect &&
				(leaf === undefined ||
					entry.leaf === undefined ||
					entry.leaf === leaf),
		)?.code;
	const verdicts: AspectVerdict[] = [];
	for (const [aspect, selection] of Object.entries(request)) {
		if (aspect === "semanticRelations") {
			const goldRelations = goldRelationTargets(goldKnowledge);
			for (const relation of Object.keys(selection ?? {})) {
				const claims = output.pendingRelations
					.filter((pending) => pending.relation === relation)
					.map(({ target }) => shadowKey(target));
				const goldClaims = (goldRelations.get(relation) ?? []).map(
					shadowKey,
				);
				const status = coverageOf(goldCase, aspect, relation);
				const failed = failure(aspect, relation);
				verdicts.push({
					aspect: `${aspect}.${relation}`,
					...(failed ? { failed } : {}),
					produced: claims.length > 0,
					...(status
						? {
								gold: status,
								goldClaims,
								found: goldClaims.filter((claim) =>
									claims.includes(claim),
								),
								extra: claims.filter(
									(claim) => !goldClaims.includes(claim),
								),
							}
						: {}),
				});
			}
			continue;
		}
		if (aspect === "translations") {
			for (const language of Object.keys(selection ?? {})) {
				const value = (
					produced.translations as
						| Readonly<Record<string, unknown>>
						| undefined
				)?.[language];
				const failed = failure(aspect, language);
				const text = textOf(value);
				verdicts.push({
					aspect: `${aspect}.${language}`,
					...(failed ? { failed } : {}),
					produced: value !== undefined,
					...(text === undefined ? {} : { text }),
				});
			}
			continue;
		}
		const value = produced[aspect];
		const failed = failure(aspect);
		const status = coverageOf(goldCase, aspect);
		const compare = sameValue[aspect];
		const text = textOf(value);
		const base = {
			aspect,
			...(failed ? { failed } : {}),
			produced: value !== undefined,
			...(aspect === "transcription" || aspect === "definition"
				? text === undefined
					? {}
					: { text }
				: {}),
		};
		if (!status || !compare) {
			verdicts.push(base);
			continue;
		}
		const goldValue = status === "Authored" ? gold[aspect] : undefined;
		const correct = failed === undefined && compare(goldValue, value);
		verdicts.push({
			...base,
			gold: status,
			correct,
			...(aspect === "valency"
				? { complements: complementCounts(goldValue, value) }
				: {}),
			...(aspect === "participleSource" && failed === undefined
				? {
						sourceAgrees:
							(goldValue === undefined) === (value === undefined),
					}
				: {}),
		});
	}
	return { verdicts };
}

/** How many complements gold's frame and the run's hold, and share. */
function complementCounts(gold: unknown, produced: unknown) {
	const keys = (frame: unknown) =>
		((frame as Slot[] | undefined) ?? []).flatMap((slot) =>
			slot.complements.map(complementKey),
		);
	const goldKeys = keys(gold);
	const producedKeys = keys(produced);
	const remaining = [...producedKeys];
	let matched = 0;
	for (const key of goldKeys) {
		const at = remaining.indexOf(key);
		if (at < 0) continue;
		matched++;
		remaining.splice(at, 1);
	}
	return {
		gold: goldKeys.length,
		produced: producedKeys.length,
		matched,
	};
}

/** One attempt as the metrics read it. */
export type ScoredKnowledge = {
	readonly caseId: string;
	readonly repetition: number;
	readonly route: string;
	readonly lemma: string;
	readonly emojiDescription: string;
	readonly sentence: string;
	readonly evaluation: KnowledgeEvaluation | undefined;
};

/** The structural aspects scored exactly. */
const exactAspects = [
	"plural",
	"valency",
	"participleSource",
	"conjugationClass",
	"locutionType",
	"sayingType",
	"formulaRole",
] as const;

type Entry = {
	readonly attempt: ScoredKnowledge;
	readonly verdict: AspectVerdict;
};

const entriesOf = (attempts: readonly ScoredKnowledge[]): Entry[] =>
	attempts.flatMap((attempt) =>
		(attempt.evaluation?.verdicts ?? []).map((verdict) => ({
			attempt,
			verdict,
		})),
	);

const hash = (value: string) =>
	createHash("sha256").update(value).digest("hex");

/** A recall line: gold claims found out of gold claims. */
function recallLine(entries: readonly Entry[]): Line {
	return lineOf(
		entries.flatMap(({ verdict }) =>
			(verdict.goldClaims ?? []).map((claim) =>
				(verdict.found ?? []).includes(claim),
			),
		),
	);
}

/** The case-aspects whose verdict differs between repetitions, `<case>:<aspect>`. */
function knowledgeFlips(attempts: readonly ScoredKnowledge[]): string[] {
	const seen = new Map<string, Set<string>>();
	for (const { attempt, verdict } of entriesOf(attempts)) {
		const verdictOf =
			verdict.correct !== undefined
				? String(verdict.correct)
				: verdict.goldClaims !== undefined
					? canonicalJson(verdict.found)
					: undefined;
		if (verdictOf === undefined) continue;
		const id = `${attempt.caseId}:${verdict.aspect}`;
		const verdicts = seen.get(id) ?? new Set<string>();
		verdicts.add(verdictOf);
		seen.set(id, verdicts);
	}
	return [...seen]
		.filter(([, verdicts]) => verdicts.size > 1)
		.map(([id]) => id)
		.sort();
}

/** How many extra relation claims the spot-check sample holds. */
const extraClaimSampleSize = 40;

/** Extra relation claims for a human spot-check: the first repetition's, a seeded sample. */
function extraClaimsSample(attempts: readonly ScoredKnowledge[]) {
	return entriesOf(attempts)
		.filter(({ attempt }) => attempt.repetition === 0)
		.flatMap(({ attempt, verdict }) =>
			(verdict.extra ?? []).map((claim) => ({
				caseId: attempt.caseId,
				lemma: attempt.lemma,
				emojiDescription: attempt.emojiDescription,
				relation: verdict.aspect.replace("semanticRelations.", ""),
				claim,
				gold: verdict.goldClaims ?? [],
			})),
		)
		.sort((left, right) =>
			hash(`${left.caseId}:${left.relation}:${left.claim}`) <
			hash(`${right.caseId}:${right.relation}:${right.claim}`)
				? -1
				: 1,
		)
		.slice(0, extraClaimSampleSize);
}

const byAspect = (entries: readonly Entry[]) => {
	const groups = new Map<string, Entry[]>();
	for (const entry of entries) {
		const group = groups.get(entry.verdict.aspect) ?? [];
		group.push(entry);
		groups.set(entry.verdict.aspect, group);
	}
	return [...groups].sort(([left], [right]) => left.localeCompare(right));
};

/** The structural report: exact lines, relation recall, failures, flips and the extras sample. */
export function knowledgeReport(attempts: readonly ScoredKnowledge[]) {
	const entries = entriesOf(attempts);
	const scored = (aspect: string) =>
		entries.filter(
			({ verdict }) =>
				verdict.aspect === aspect && verdict.correct !== undefined,
		);
	const relations = entries.filter(({ verdict }) =>
		verdict.aspect.startsWith("semanticRelations."),
	);
	const repetitions = [
		...new Set(attempts.map(({ repetition }) => repetition)),
	].sort();
	const valency = scored("valency");
	const participle = entries.filter(
		({ verdict }) =>
			verdict.aspect === "participleSource" &&
			verdict.sourceAgrees !== undefined,
	);
	const sum = (
		pick: (counts: NonNullable<AspectVerdict["complements"]>) => number,
	) =>
		valency.reduce(
			(total, { verdict }) =>
				total + (verdict.complements ? pick(verdict.complements) : 0),
			0,
		);
	return {
		attempts: attempts.length,
		cases: new Set(attempts.map(({ caseId }) => caseId)).size,
		lines: {
			...Object.fromEntries(
				exactAspects.map((aspect) => [
					aspect,
					lineOf(
						scored(aspect).map(
							({ verdict }) => verdict.correct === true,
						),
					),
				]),
			),
			/** Gold relation claims the run found under the same relation. */
			relationRecall: recallLine(relations),
			...Object.fromEntries(
				byAspect(relations).map(([aspect, group]) => [
					`${aspect.replace("semanticRelations.", "")}Recall`,
					recallLine(group),
				]),
			),
			/** Gold complements the run's frame holds, and its complements gold holds. */
			valencyComplementRecall: countLine(
				sum(({ matched }) => matched),
				sum(({ gold }) => gold),
			),
			valencyComplementPrecision: countLine(
				sum(({ matched }) => matched),
				sum(({ produced }) => produced),
			),
			/** Whether a participle source exists at all. */
			participleDetected: lineOf(
				participle.map(({ verdict }) => verdict.sourceAgrees === true),
			),
		},
		/** Per requested aspect: how often it failed, and how often it produced a value. */
		aspects: Object.fromEntries(
			byAspect(entries).map(([aspect, group]) => [
				aspect,
				{
					failed: lineOf(
						group.map(
							({ verdict }) => verdict.failed !== undefined,
						),
					),
					produced: lineOf(
						group.map(({ verdict }) => verdict.produced),
					),
					failures: tally(
						group.flatMap(({ verdict }) =>
							verdict.failed ? [verdict.failed] : [],
						),
					),
				},
			]),
		),
		byRepetition: Object.fromEntries(
			repetitions.map((repetition) => {
				const own = attempts.filter(
					(attempt) => attempt.repetition === repetition,
				);
				const ownEntries = entriesOf(own);
				return [
					repetition,
					{
						exact: lineOf(
							ownEntries
								.filter(
									({ verdict }) =>
										verdict.correct !== undefined,
								)
								.map(({ verdict }) => verdict.correct === true),
						),
						relationRecall: recallLine(
							ownEntries.filter(({ verdict }) =>
								verdict.aspect.startsWith("semanticRelations."),
							),
						),
					},
				];
			}),
		),
		wrong: exactAspects.flatMap((aspect) =>
			scored(aspect)
				.filter(
					({ attempt, verdict }) =>
						verdict.correct === false && attempt.repetition === 0,
				)
				.map(({ attempt, verdict }) => ({
					caseId: attempt.caseId,
					aspect,
					lemma: attempt.lemma,
					...(verdict.failed ? { failed: verdict.failed } : {}),
				})),
		),
		flips: knowledgeFlips(attempts),
		extraClaims: extraClaimsSample(attempts),
	};
}

/** A line from counts, for totals that are not one verdict each. */
function countLine(correct: number, count: number): Line {
	return {
		correct,
		count,
		rate: count === 0 ? 0 : correct / count,
		interval: wilson(correct, count),
	};
}

function tally(values: readonly string[]): Record<string, number> {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return Object.fromEntries(
		[...counts].sort((left, right) => right[1] - left[1]),
	);
}

/** How many text values per aspect the spot-check sample lists. */
const textSampleSize = 30;

/**
 * The text spot-check (#883 point 10): each text aspect's values at the
 * first repetition, a seeded sample by case with every slip case first,
 * and each of #545's slips with what every repetition answered and
 * whether a rejected answer came back.
 */
export function spotCheckReport(
	attempts: readonly ScoredKnowledge[],
	slips: readonly TranslationSlip[],
) {
	const entries = entriesOf(attempts);
	const slipCases = new Set(slips.map(({ caseId }) => caseId));
	const rank = (caseId: string) =>
		slipCases.has(caseId) ? `0${caseId}` : `1${hash(caseId)}`;
	const samples = Object.fromEntries(
		byAspect(entries.filter(({ attempt }) => attempt.repetition === 0)).map(
			([aspect, group]) => [
				aspect,
				group
					.sort((left, right) =>
						rank(left.attempt.caseId) < rank(right.attempt.caseId)
							? -1
							: 1,
					)
					.slice(0, textSampleSize + slipCases.size)
					.map(({ attempt, verdict }) => ({
						caseId: attempt.caseId,
						lemma: attempt.lemma,
						emojiDescription: attempt.emojiDescription,
						sentence: attempt.sentence,
						value: verdict.text ?? null,
						...(verdict.failed ? { failed: verdict.failed } : {}),
					})),
			],
		),
	);
	const normalize = (text: string) =>
		foldCase(text, "de")
			.replace(/[^\p{L}\p{N}' ]/gu, "")
			.trim();
	const slipReport = slips.map((slip) => {
		const answers = entries
			.filter(
				({ attempt, verdict }) =>
					attempt.caseId === slip.caseId &&
					verdict.aspect === `translations.${slip.language}`,
			)
			.map(({ attempt, verdict }) => ({
				repetition: attempt.repetition,
				value: verdict.text ?? null,
				...(verdict.failed ? { failed: verdict.failed } : {}),
			}));
		const rejected = new Set(slip.rejected.map(normalize));
		const replicated = answers.filter(({ value }) =>
			(value ?? "")
				.split(";")
				.some((part) => rejected.has(normalize(part))),
		).length;
		return { ...slip, answers, replicated };
	});
	return {
		attempts: attempts.length,
		aspects: Object.fromEntries(
			byAspect(entries).map(([aspect, group]) => [
				aspect,
				{
					produced: lineOf(
						group.map(({ verdict }) => verdict.produced),
					),
					failed: lineOf(
						group.map(
							({ verdict }) => verdict.failed !== undefined,
						),
					),
				},
			]),
		),
		slips: slipReport,
		slipsReplicated: slipReport.filter(({ replicated }) => replicated > 0)
			.length,
		samples,
	};
}
