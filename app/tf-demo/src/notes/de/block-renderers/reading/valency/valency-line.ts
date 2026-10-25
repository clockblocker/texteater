import {
	type ReflexiveSlot,
	reflexiveSlotOf,
} from "../../../../../../shared/reflexive-slot";
import type { NoteDataFor } from "../../../../universal/note/data";

type FrameSlot = NonNullable<
	NoteDataFor<"Reading">["knowledge"]["valency"]
>[number];
/** The German complements the line shows are the ones marked by case. */
type Complement = Extract<
	FrameSlot["complements"][number],
	{ governedCase: string; referent: string }
>;
type RenderedCase = Exclude<Complement["governedCase"], "Nom">;

/** One piece of a German Valency Line, in reading order. */
export type ValencyLinePart =
	| {
			readonly part: "Head";
			readonly text: string;
			/** A separable verb's base, which its prefix attaches to on the left. */
			readonly separable: boolean;
	  }
	| {
			readonly part: "Reflexive";
			readonly text: string;
			/** The case the line names beside `sich`, if its style names one. */
			readonly case: "Acc" | "Dat" | null;
			readonly optional: boolean;
	  }
	| { readonly part: "Fixed"; readonly text: string }
	| {
			readonly part: "Slot";
			readonly optional: boolean;
			readonly preposition: string | null;
			readonly case: RenderedCase;
			/** `jN`, `jM`, `jS`, `etw`, or a person and `etw` joined by `/`. */
			readonly token: string;
	  }
	| { readonly part: "SeparatedPrefix"; readonly text: string };

/**
 * Where the line puts a lexical reflexive and which case it names (#1285, a
 * presentation choice). The default follows DWDS's WDG lines, which read in
 * main-clause order with the reflexive right after the verb (`/jmd. stellt
 * sich <Dat.> etw. vor/`), and Duden, which names a dative reflexive and
 * leaves the accusative unmarked (`sich (Dativ) etwas vorstellen`).
 */
export type ValencyLineStyle = {
	readonly reflexivePlacement: "AfterHead" | "BeforeHead";
	readonly reflexiveCase: "DativeOnly" | "Always" | "Never";
};

export const DEFAULT_VALENCY_LINE_STYLE: ValencyLineStyle = {
	reflexivePlacement: "AfterHead",
	reflexiveCase: "DativeOnly",
};

type ValencyLemma = {
	readonly family: string;
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
};

/** jemanden, jemandem, jemandes: `j` plus the ending the case gives it. */
const PERSON_TOKEN = {
	Acc: "jN",
	Dat: "jM",
	Gen: "jS",
} as const satisfies Record<RenderedCase, string>;
const THING_TOKEN = "etw";

/** Bare case objects in German citation order: `jemandem etwas`. */
const CASE_SLOT_ORDER = [
	"Dat",
	"Acc",
	"Gen",
] as const satisfies readonly RenderedCase[];

/**
 * The German Valency Line of a Lemma and its Reading's Valency Frame, or
 * `null` when the frame has nothing to show. It is computed each render and
 * never stored.
 *
 * The line reads: the head (a separable verb's base, marked `>`), the
 * frame's lexical reflexive `sich`, the bare case slots (Dat before Acc
 * before Gen), a Locution's other Fixed words, the preposition slots, and
 * last the separated prefix (marked `<`). Optional slots are parenthesised.
 * A Nom slot is the subject and is not shown. A leading `es` stays before
 * the reflexive (`machen es sich gemütlich`), and a reflexive with a
 * preposition follows it among the Fixed words (`sein außer sich`), as in a
 * German main clause.
 *
 * Provisional: where slots go relative to a Locution's Fixed words is not
 * decided yet (#711). This order matches ADR 0034's six examples. Keep the
 * whole ordering rule here.
 */
export function germanValencyLine(
	lemma: ValencyLemma,
	frame: readonly FrameSlot[] | undefined,
	style: ValencyLineStyle = DEFAULT_VALENCY_LINE_STYLE,
): readonly ValencyLinePart[] | null {
	const slots = (frame ?? []).flatMap(slotPart);
	const reflexive = reflexiveSlotOf(frame);
	if (slots.length === 0 && !reflexive) return null;

	const { head, fixed } = splitCanonicalForm(lemma);
	const prefix = separablePrefix(lemma.coreFeatures, head);
	const caseSlots = CASE_SLOT_ORDER.flatMap((grammaticalCase) =>
		slots.filter(
			(slot) =>
				slot.preposition === null && slot.case === grammaticalCase,
		),
	);
	const prepositionSlots = slots.filter((slot) => slot.preposition !== null);
	const headPart: ValencyLinePart = {
		part: "Head",
		text: prefix ? head.slice(prefix.length) : head,
		separable: prefix !== null,
	};
	const sich = reflexive ? reflexivePart(reflexive, style) : null;
	const preposition = reflexive?.preposition ?? null;
	const governor = preposition === null ? -1 : fixed.indexOf(preposition);
	const leadingEs = governor < 0 && fixed[0] === "es" ? 1 : 0;
	const [beforeSich, afterSich] =
		governor >= 0
			? [fixed.slice(0, governor + 1), fixed.slice(governor + 1)]
			: [fixed.slice(0, leadingEs), fixed.slice(leadingEs)];
	const fixedPart = (words: readonly string[]): ValencyLinePart[] =>
		words.length > 0 ? [{ part: "Fixed", text: words.join(" ") }] : [];
	const around = [...fixedPart(beforeSich), ...(sich ? [sich] : [])];

	return [
		...(governor < 0 && style.reflexivePlacement === "BeforeHead"
			? [...around, headPart, ...caseSlots]
			: governor < 0
				? [headPart, ...around, ...caseSlots]
				: [headPart, ...caseSlots, ...around]),
		...fixedPart(afterSich),
		...prepositionSlots,
		...(prefix ? [{ part: "SeparatedPrefix" as const, text: prefix }] : []),
	];
}

/** The reflexive as the line shows it, with the case its style names. */
function reflexivePart(
	reflexive: ReflexiveSlot,
	style: ValencyLineStyle,
): ValencyLinePart {
	const shown =
		style.reflexiveCase === "Always" ||
		(style.reflexiveCase === "DativeOnly" &&
			reflexive.governedCase === "Dat");
	return {
		part: "Reflexive",
		text: "sich",
		case: shown ? reflexive.governedCase : null,
		optional: reflexive.status === "Optional",
	};
}

/**
 * A verbal Locution's head is its final infinitive (`auf den Keks gehen`),
 * and its other words are Fixed. Any other Canonical Form is its own head.
 */
function splitCanonicalForm(lemma: ValencyLemma): {
	readonly head: string;
	readonly fixed: readonly string[];
} {
	const words = lemma.canonicalForm.trim().split(/\s+/u);
	const last = words.at(-1) ?? "";
	if (words.length < 2 || !/^[a-zäöüß]+n$/u.test(last)) {
		return { head: lemma.canonicalForm, fixed: [] };
	}
	return { head: last, fixed: words.slice(0, -1) };
}

/** The `hasSepPrefix` Core Feature, when it really begins the head. */
function separablePrefix(coreFeatures: unknown, head: string): string | null {
	if (
		typeof coreFeatures !== "object" ||
		coreFeatures === null ||
		!("hasSepPrefix" in coreFeatures)
	) {
		return null;
	}
	const prefix = coreFeatures.hasSepPrefix;
	return typeof prefix === "string" &&
		prefix !== "" &&
		head.startsWith(prefix) &&
		head.length > prefix.length
		? prefix
		: null;
}

type SlotPart = Extract<ValencyLinePart, { part: "Slot" }>;

/**
 * The part a Slot shows: its one complement marked by case, unless that is
 * the subject's Nom. A Slot with alternatives, or with an Adverbial,
 * Predicative or Clause, shows nothing until #676 decides how the line
 * renders them. A Reflexive is placed by {@link germanValencyLine} itself.
 */
function slotPart(slot: FrameSlot): SlotPart[] {
	const [complement, ...alternatives] = slot.complements;
	if (
		complement === undefined ||
		alternatives.length > 0 ||
		complement.kind === "Reflexive" ||
		!("governedCase" in complement)
	)
		return [];
	const grammaticalCase = complement.governedCase;
	if (grammaticalCase === "Nom") return [];
	return [
		{
			part: "Slot",
			optional: slot.status === "Optional",
			preposition:
				complement.kind === "Preposition"
					? complement.preposition.canonicalForm
					: null,
			case: grammaticalCase,
			token: referentToken(grammaticalCase, complement.referent),
		},
	];
}

function referentToken(
	grammaticalCase: RenderedCase,
	referent: Complement["referent"],
): string {
	switch (referent) {
		case "Someone":
			return PERSON_TOKEN[grammaticalCase];
		case "Something":
			return THING_TOKEN;
		case "Either":
			return `${PERSON_TOKEN[grammaticalCase]}/${THING_TOKEN}`;
	}
}
