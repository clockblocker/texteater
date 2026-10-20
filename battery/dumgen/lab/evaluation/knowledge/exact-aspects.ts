/**
 * How a structural aspect's produced value is compared with gold's: the
 * aspects scored exactly, the keys that make two values the same, and what
 * gold's coverage says of an aspect.
 */
import { canonicalJson, isRecord } from "common-utils";
import { foldCase } from "dumling";
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

/** The structural aspects scored exactly. */
export const exactAspects = [
	"plural",
	"valency",
	"participleSource",
	"conjugationClass",
	"preterite",
	"locutionType",
	"sayingType",
	"formulaRole",
] as const satisfies readonly (keyof Dumrel.ReadingKnowledge)[];

export type ExactAspect = (typeof exactAspects)[number];

/** How each single-valued structural aspect compares. */
const sameValue: {
	readonly [Aspect in ExactAspect]: (
		gold: Dumrel.ReadingKnowledge[Aspect],
		produced: Dumrel.ReadingKnowledge[Aspect],
	) => boolean;
} = {
	plural: (gold, produced) => pluralKey(gold) === pluralKey(produced),
	conjugationClass: (gold, produced) =>
		canonicalJson([...(gold ?? [])].sort()) ===
		canonicalJson([...(produced ?? [])].sort()),
	preterite: (gold, produced) => pluralKey(gold) === pluralKey(produced),
	participleSource: (gold, produced) => verbKey(gold) === verbKey(produced),
	locutionType: (gold, produced) => gold === produced,
	formulaRole: (gold, produced) => gold === produced,
	sayingType: (gold, produced) => gold?.type === produced?.type,
	valency: (gold, produced) => sameFrame(gold ?? [], produced ?? []),
};

/** Whether `produced` holds gold's value of `aspect`. */
export const sameAspect = <Aspect extends ExactAspect>(
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
