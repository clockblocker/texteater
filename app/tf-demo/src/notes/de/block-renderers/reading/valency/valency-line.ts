import type { NoteDataFor } from "../../../../universal/note/data";

type ValencySlot = NonNullable<
	NoteDataFor<"Reading">["knowledge"]["valency"]
>[number];
type Complement = ValencySlot["complement"];
type RenderedCase = Exclude<Complement["case"], "Nom">;

/** One piece of a German Valency Line, in reading order. */
export type ValencyLinePart =
	| {
			readonly part: "Head";
			readonly text: string;
			/** A separable verb's base, which its prefix attaches to on the left. */
			readonly separable: boolean;
	  }
	| { readonly part: "Reflexive"; readonly text: string }
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
 * The line reads: the head (a separable verb's base, marked `>`), a lexical
 * reflexive `sich`, the bare case slots (Dat before Acc before Gen), a
 * Phraseme's other Fixed words, the preposition slots, and last the separated
 * prefix (marked `<`). Optional slots are parenthesised. A Nom slot is the
 * subject and is not shown.
 *
 * Provisional: where slots go relative to a Phraseme's Fixed words is not
 * decided yet (#595, area 5). This order matches ADR 0034's six examples, and
 * placing `sich` before the case slots follows German word order
 * (`nimmt sich etwas zu Herzen`). Keep the whole ordering rule here.
 */
export function germanValencyLine(
	lemma: ValencyLemma,
	frame: readonly ValencySlot[] | undefined,
): readonly ValencyLinePart[] | null {
	const slots = (frame ?? []).filter(
		(slot): slot is ValencySlot & { complement: { case: RenderedCase } } =>
			slot.complement.case !== "Nom",
	);
	if (slots.length === 0) return null;

	const { head, reflexive, fixed } = splitCanonicalForm(lemma);
	const prefix = separablePrefix(lemma.coreFeatures, head);
	const caseSlots = CASE_SLOT_ORDER.flatMap((grammaticalCase) =>
		slots.filter(
			({ complement }) =>
				complement.kind === "Case" &&
				complement.case === grammaticalCase,
		),
	);
	const prepositionSlots = slots.filter(
		({ complement }) => complement.kind === "Preposition",
	);

	return [
		{
			part: "Head",
			text: prefix ? head.slice(prefix.length) : head,
			separable: prefix !== null,
		},
		...(reflexive ? [{ part: "Reflexive" as const, text: reflexive }] : []),
		...caseSlots.map(slotPart),
		...(fixed ? [{ part: "Fixed" as const, text: fixed }] : []),
		...prepositionSlots.map(slotPart),
		...(prefix ? [{ part: "SeparatedPrefix" as const, text: prefix }] : []),
	];
}

/**
 * A verbal Phraseme's head is its final infinitive (`auf den Keks gehen`), and
 * so is a reflexive verb's (`sich freuen`). Any other Canonical Form is its
 * own head.
 */
function splitCanonicalForm(lemma: ValencyLemma): {
	readonly head: string;
	readonly reflexive: string | null;
	readonly fixed: string | null;
} {
	const words = lemma.canonicalForm.trim().split(/\s+/u);
	const last = words.at(-1) ?? "";
	if (words.length < 2 || !/^[a-zäöüß]+n$/u.test(last)) {
		return { head: lemma.canonicalForm, reflexive: null, fixed: null };
	}
	const rest = words.slice(0, -1);
	const reflexive = rest[0] === "sich" ? "sich" : null;
	const fixed = (reflexive ? rest.slice(1) : rest).join(" ");
	return { head: last, reflexive, fixed: fixed === "" ? null : fixed };
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

function slotPart(
	slot: ValencySlot & { complement: { case: RenderedCase } },
): ValencyLinePart {
	const { complement } = slot;
	return {
		part: "Slot",
		optional: slot.status === "Optional",
		preposition:
			complement.kind === "Preposition"
				? complement.preposition.canonicalForm
				: null,
		case: complement.case,
		token: referentToken(complement.case, complement.referent),
	};
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
