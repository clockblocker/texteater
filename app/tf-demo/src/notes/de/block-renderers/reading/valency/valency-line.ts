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
			/** A separable prefix still on the verb, as a citation writes it: `auf|passen`. */
			readonly prefix: string | null;
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
			/**
			 * The preposition printed before the token. It is `null` for a bare
			 * case object, and for a slot whose preposition is the Fixed word
			 * right before it (`mit jM zu tun haben`).
			 */
			readonly preposition: string | null;
			readonly case: RenderedCase;
			/** The person form of the case, whatever the referent: `jN`, `jM` or `jS`. */
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

/**
 * The line's word order. The Valency Block reads as a main clause, the verb
 * first and a separable prefix split off to the end (`>passen (auf jN)
 * auf<`). A Reading Note's heading reads as a citation, the verb last with
 * its prefix on (`(auf jN) aufpassen`, `mit jM zu tun haben`).
 */
export type ValencyLineOrder = "MainClause" | "Citation";

type ValencyLemma = {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
};

/** jemanden, jemandem, jemandes: `j` plus the ending the case gives it. */
const CASE_TOKEN = {
	Acc: "jN",
	Dat: "jM",
	Gen: "jS",
} as const satisfies Record<RenderedCase, string>;

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
 * In main-clause order the line reads: the head (a separable verb's base,
 * marked `>`), the frame's lexical reflexive `sich`, the bare case slots
 * (Dat before Acc before Gen), a Locution's other Fixed words, the
 * preposition slots, and last the separated prefix (marked `<`). In
 * citation order a verb's head moves to the end with its prefix on, and the
 * slots come before the Fixed words: `jM auf den Keks gehen`. Any other
 * head stays first in both orders. Optional slots are parenthesised. A Nom
 * slot is the subject and is not shown.
 *
 * A slot whose preposition is one of the Locution's Fixed words goes right
 * after that word and prints only its token: `haben mit jM zu tun`, `mit jM
 * zu tun haben`. A reflexive with a preposition does the same (`sein außer
 * sich`), and a leading `es` stays before the reflexive (`machen es sich
 * gemütlich`), as in a German main clause and as the Citation places `sich`.
 * Keep the whole ordering rule here.
 */
export function germanValencyLine(
	lemma: ValencyLemma,
	frame: readonly FrameSlot[] | undefined,
	style: ValencyLineStyle = DEFAULT_VALENCY_LINE_STYLE,
	order: ValencyLineOrder = "MainClause",
): readonly ValencyLinePart[] | null {
	const slots = (frame ?? []).flatMap(slotPart);
	const reflexive = reflexiveSlotOf(frame);
	if (slots.length === 0 && !reflexive) return null;

	const { head, fixed } = splitCanonicalForm(lemma);
	const prefix = separablePrefix(lemma.coreFeatures, head);
	const inFixed = (preposition: string | null): preposition is string =>
		preposition !== null && fixed.includes(preposition);
	const caseSlots = CASE_SLOT_ORDER.flatMap((grammaticalCase) =>
		slots.filter(
			(slot) =>
				slot.preposition === null && slot.case === grammaticalCase,
		),
	);
	const freeSlots = slots.filter(
		(slot) => slot.preposition !== null && !inFixed(slot.preposition),
	);
	const sich = reflexive ? reflexivePart(reflexive, style) : null;
	const governor = reflexive?.preposition ?? null;
	const governed = inFixed(governor);
	const lead = !governed && fixed[0] === "es" ? fixed.slice(0, 1) : [];
	const opening = [...fixedPart(lead), ...(sich && !governed ? [sich] : [])];
	const phrase = fixedPhrase(fixed.slice(lead.length), [
		...(sich && governed ? [{ after: governor, part: sich }] : []),
		...slots.flatMap((slot) =>
			inFixed(slot.preposition)
				? [
						{
							after: slot.preposition,
							part: { ...slot, preposition: null },
						},
					]
				: [],
		),
	]);

	if (order === "Citation" && lemma.kind === "VERB")
		return [
			...opening,
			...caseSlots,
			...freeSlots,
			...phrase,
			{ part: "Head", text: head, separable: false, prefix },
		];
	const headPart: ValencyLinePart = {
		part: "Head",
		text: prefix ? head.slice(prefix.length) : head,
		separable: prefix !== null,
		prefix: null,
	};
	return [
		...(style.reflexivePlacement === "BeforeHead"
			? [...opening, headPart]
			: [headPart, ...opening]),
		...caseSlots,
		...phrase,
		...freeSlots,
		...(prefix ? [{ part: "SeparatedPrefix" as const, text: prefix }] : []),
	];
}

function fixedPart(words: readonly string[]): ValencyLinePart[] {
	return words.length > 0 ? [{ part: "Fixed", text: words.join(" ") }] : [];
}

/**
 * A Locution's Fixed words, with each insert right after the first
 * occurrence of the word it follows: `mit` `jM` `zu tun`.
 */
function fixedPhrase(
	words: readonly string[],
	inserts: readonly {
		readonly after: string;
		readonly part: ValencyLinePart;
	}[],
): ValencyLinePart[] {
	const parts: ValencyLinePart[] = [];
	let run: string[] = [];
	const placed = new Set<string>();
	for (const word of words) {
		run.push(word);
		if (placed.has(word)) continue;
		const following = inserts.filter(({ after }) => after === word);
		if (following.length === 0) continue;
		placed.add(word);
		parts.push(...fixedPart(run), ...following.map(({ part }) => part));
		run = [];
	}
	return [...parts, ...fixedPart(run)];
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
	if (
		lemma.kind !== "VERB" ||
		words.length < 2 ||
		!/^[a-zäöüß]+n$/u.test(last)
	) {
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
			token: CASE_TOKEN[grammaticalCase],
		},
	];
}
