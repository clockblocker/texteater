import { reflexiveMarker } from "dumcorpus/inventories";
import type { ReflexiveSlot } from "../../../shared/reflexive-slot";
import {
	fixedPart,
	fixedPhrase,
	separablePrefix,
	splitCanonicalForm,
	type ValencyLemma,
	type ValencyLinePart,
} from "./block-renderers/reading/valency/valency-line";

/** What a Surface's line is printed from: the stored Surface and its Lemma. */
export type LinedSurface = {
	/** The base-order form: the Lemma's words inflected, the verb last (#1293). */
	readonly normalizedSurface: string;
	readonly inflectionalFeatures: Readonly<Record<string, unknown>>;
	readonly lemma: ValencyLemma;
};

/**
 * The Reading context a German Surface line reads: only whether the active
 * Reading is lexically reflexive (`sich` in `sich erinnert`, `außer sich
 * war`, `es sich gemütlich machte`). Variable valency complements live in
 * the Reading's dedicated Valency Block (ADR 0034), never on the Surface
 * tail or Attestation caption.
 */
export type SurfaceReadingContext = {
	readonly emojiDescription?: string;
	readonly reflexive?: ReflexiveSlot | null;
};

/**
 * The display line of a German Surface (ADR 0056, ADR 0034): its stored
 * base-order form with any separable prefix split by a bar (`an|fängt`),
 * plus `sich` when the active Reading has a Required lexical reflexive
 * (`🪞`). Never projects `jD` or open valency slots onto the Surface tail.
 */
export function germanSurfaceLine(
	surface: LinedSurface,
	reading?: SurfaceReadingContext | null,
): readonly ValencyLinePart[] {
	const { lemma, normalizedSurface } = surface;
	const isVerb = lemma.kind === "VERB" || lemma.kind === "AUX";
	const bare: ValencyLinePart[] = [
		{ part: "Head", text: normalizedSurface, prefix: null },
	];
	if (!isVerb) return bare;

	const words = normalizedSurface.trim().split(/\s+/u);
	const { fixed } = splitCanonicalForm(lemma);
	if (words.length <= fixed.length) return bare;

	const imperative = surface.inflectionalFeatures.mood === "Imp";
	const verbWords = imperative
		? words.slice(0, words.length - fixed.length)
		: words.slice(fixed.length);
	const last = verbWords.at(-1);
	const separated =
		imperative &&
		verbWords.length > 1 &&
		last !== undefined &&
		last === sepPrefixOf(lemma.coreFeatures)
			? last
			: null;
	const headText = (separated ? verbWords.slice(0, -1) : verbWords).join(" ");
	const prefix = separablePrefix(lemma.coreFeatures, headText);
	const fixedWords = imperative
		? words.slice(words.length - fixed.length)
		: words.slice(0, fixed.length);

	const requiredReflexive = requiredReflexiveOf(reading);
	const headPart: ValencyLinePart = {
		part: "Head",
		text: headText,
		prefix,
	};

	if (!requiredReflexive) {
		const parts: ValencyLinePart[] = imperative
			? [
					headPart,
					...fixedPart(fixedWords),
					...(separated
						? [{ part: "Fixed" as const, text: separated }]
						: []),
				]
			: [...fixedPart(fixedWords), headPart];
		return parts;
	}

	const sichPart: ValencyLinePart = {
		part: "Reflexive",
		text: "sich",
		case: null,
	};
	const governor = requiredReflexive.preposition;
	const governed = governor !== null && fixedWords.includes(governor);
	const lead =
		!governed && fixedWords[0] === "es" ? fixedWords.slice(0, 1) : [];
	const phrase = fixedPhrase(fixedWords.slice(lead.length), [
		...(governed ? [{ after: governor, part: sichPart }] : []),
	]);

	if (imperative) {
		return [
			headPart,
			...fixedPart(lead),
			...(governed ? [] : [sichPart]),
			...phrase,
			...(separated ? [{ part: "Fixed" as const, text: separated }] : []),
		];
	}
	return [
		...fixedPart(lead),
		...(governed ? [] : [sichPart]),
		...phrase,
		headPart,
	];
}

function requiredReflexiveOf(
	reading: SurfaceReadingContext | null | undefined,
): ReflexiveSlot | null {
	if (!reading) return null;
	if (reading.reflexive?.status === "Required") return reading.reflexive;
	if (reading.reflexive === undefined || reading.reflexive === null) {
		if (reading.emojiDescription?.startsWith(reflexiveMarker))
			return {
				status: "Required",
				governedCase: null,
				preposition: null,
			};
	}
	return null;
}

function sepPrefixOf(coreFeatures: unknown): string | null {
	return typeof coreFeatures === "object" &&
		coreFeatures !== null &&
		"hasSepPrefix" in coreFeatures &&
		typeof coreFeatures.hasSepPrefix === "string"
		? coreFeatures.hasSepPrefix
		: null;
}
