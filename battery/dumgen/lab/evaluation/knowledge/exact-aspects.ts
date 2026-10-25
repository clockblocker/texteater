/**
 * How a structural aspect's produced value is compared with gold's: the
 * aspects and Variation Dimensions scored exactly, the keys that make two
 * values the same, and what gold's coverage says of one.
 */
import { canonicalJson, isRecord } from "common-utils";
import type * as Dumcorpus from "dumcorpus/types";
import { foldCase } from "dumling";
import { dimensionIdValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { KnowledgeCase } from "./cases.js";

type Values = Readonly<Record<string, unknown>>;

/** A complement's identity: everything but the preposition Lemma's features. */
export function complementKey(complement: Values): string {
	const { preposition, ...rest } = complement;
	return canonicalJson({
		...rest,
		...(preposition
			? {
					preposition: isRecord(preposition)
						? preposition.canonicalForm
						: undefined,
				}
			: {}),
	});
}

export type Slot = Dumrel.ValencyFrame[number];

const slotKey = (slot: Slot) =>
	canonicalJson({
		status: slot.status,
		complements: slot.complements.map(complementKey).sort(),
	});

/** Whether two frames hold the same Slots, in any order. */
const sameFrame = (left: readonly Slot[], right: readonly Slot[]) =>
	canonicalJson(left.map(slotKey).sort()) ===
	canonicalJson(right.map(slotKey).sort());

/** A dimension's forms or marker, in any order and letter case. */
const formsKey = (value: readonly string[] | undefined) =>
	canonicalJson((value ?? []).map((form) => foldCase(form, "de")).sort());

const verbKey = (source: unknown) => {
	if (!source) return null;
	// A produced source has passed Dumrel and gold's is Dumrel-checked, so
	// both are participles' Sources; the reads only keep the unknown typed.
	const { target: verb, meaning } = isRecord(source) ? source : {};
	const lemma = isRecord(verb) ? verb : {};
	const core = isRecord(lemma.coreFeatures) ? lemma.coreFeatures : {};
	return canonicalJson({
		verb: foldCase(String(lemma.canonicalForm), "de"),
		hasSepPrefix: core.hasSepPrefix ?? null,
		meaning,
	});
};

/** The structural Knowledge aspects scored exactly. */
const exactKnowledgeAspects = [
	"valency",
	"source",
	"locutionType",
	"sayingType",
	"formulaRole",
] as const satisfies readonly (keyof Dumrel.ReadingKnowledge)[];

type ExactKnowledgeAspect = (typeof exactKnowledgeAspects)[number];

/**
 * What is scored exactly: the structural Knowledge aspects, then the
 * Variation Dimensions of the Lemma's Paradigm (ADR 0048).
 */
export const exactAspects = [
	...exactKnowledgeAspects,
	...dimensionIdValues,
] as const;

export type ExactAspect = (typeof exactAspects)[number];

/** A Reading's Knowledge and what it licenses, as gold holds it or a run produced it. */
export type ScoredValues = {
	readonly knowledge: Dumrel.ReadingKnowledge;
	readonly paradigm: Dumcorpus.ReadingParadigm;
};

/** How each single-valued structural aspect compares. */
const sameValue: {
	readonly [Aspect in ExactKnowledgeAspect]: (
		gold: Dumrel.ReadingKnowledge[Aspect],
		produced: Dumrel.ReadingKnowledge[Aspect],
	) => boolean;
} = {
	source: (gold, produced) => verbKey(gold) === verbKey(produced),
	locutionType: (gold, produced) => gold === produced,
	formulaRole: (gold, produced) => gold === produced,
	sayingType: (gold, produced) => gold?.type === produced?.type,
	valency: (gold, produced) => sameFrame(gold ?? [], produced ?? []),
};

const isKnowledgeAspect = (
	aspect: ExactAspect,
): aspect is ExactKnowledgeAspect =>
	(exactKnowledgeAspects as readonly string[]).includes(aspect);

/**
 * Whether `produced` holds gold's value of `aspect`. A dimension compares the
 * forms the Reading licenses, in any order and letter case.
 */
export const sameAspect = (
	aspect: ExactAspect,
	gold: ScoredValues,
	produced: ScoredValues,
): boolean =>
	isKnowledgeAspect(aspect)
		? sameKnowledge(aspect, gold.knowledge, produced.knowledge)
		: formsKey(gold.paradigm[aspect]) ===
			formsKey(produced.paradigm[aspect]);

const sameKnowledge = <Aspect extends ExactKnowledgeAspect>(
	aspect: Aspect,
	gold: Dumrel.ReadingKnowledge,
	produced: Dumrel.ReadingKnowledge,
) => sameValue[aspect](gold[aspect], produced[aspect]);

/** What gold's coverage says of an aspect, or of one of its leaves. */
export const coverageOf = (
	goldCase: KnowledgeCase,
	aspect: string,
	leaf?: string,
): "Authored" | "ReviewedEmpty" | undefined => {
	const coverage: Readonly<Record<string, unknown>> | undefined =
		goldCase.gold?.coverage;
	const value = coverage?.[aspect];
	const status =
		leaf === undefined ? value : isRecord(value) ? value[leaf] : undefined;
	return status === "Authored" || status === "ReviewedEmpty"
		? status
		: undefined;
};
