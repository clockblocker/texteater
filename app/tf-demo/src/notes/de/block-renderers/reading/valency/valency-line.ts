import {
	type ReflexiveSlot,
	reflexiveSlotOf,
} from "../../../../../../shared/reflexive-slot";

/**
 * A Valency Frame Slot as the line reads it (ADR 0034): a Reading Note's
 * Knowledge, or a frame another Note carries beside the Reading it names.
 */
export type FrameSlot = {
	readonly status: "Required" | "Optional";
	readonly complements: readonly {
		readonly kind: string;
		readonly governedCase?: string;
		readonly preposition?: { readonly canonicalForm: string };
		readonly standIn?: string;
		readonly marker?: string;
		readonly form?: string;
	}[];
};
/** The German complements the line shows by case. */
type SlotCase = "Nom" | "Acc" | "Dat" | "Gen";
type RenderedCase = Exclude<SlotCase, "Nom">;

/** One alternative rendered inside a Valency Line Slot. */
export type SlotAlternative =
	| {
			readonly kind: "Case";
			/**
			 * The preposition printed before the token. It is `null` for a bare
			 * case object, and for a slot whose preposition is the Fixed word
			 * right before it (`mit jM zu tun haben`).
			 */
			readonly preposition: string | null;
			/** Nom only on a Surface's line, as its subject `jD` (#1293). */
			readonly case: SlotCase;
			/** The person form of the case: `jD`, `jN`, `jM` or `jS`. */
			readonly token: string;
	  }
	| {
			readonly kind: "Placeholder";
			/** A Predicative's free marker (`als`, `für`), if it has one. */
			readonly marker: string | null;
			/** The dictionary stand-in (`irgendwo`, `dass …`, `etw zu tun`, `…`). */
			readonly text: string;
	  };

/** One piece of a German Valency Line, in reading order. */
export type ValencyLinePart =
	| {
			readonly part: "Head";
			readonly text: string;
			/** A separable verb's prefix, which the heading splits off: `auf|passen`. */
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
	/** A Fixed word a slot or the reflexive follows: `mit` in `mit jM zu tun haben`. */
	| { readonly part: "Preposition"; readonly text: string }
	| {
			readonly part: "Slot";
			readonly optional: boolean;
			/** The Slot's alternatives in frame order, one for an ordinary Slot. */
			readonly alternatives: readonly SlotAlternative[];
	  };

/**
 * Which case the line names beside a lexical reflexive (#1285, a
 * presentation choice). The default follows Duden, which names a dative
 * reflexive and leaves the accusative unmarked (`sich (Dativ) etwas
 * vorstellen`).
 */
export type ValencyLineStyle = {
	readonly reflexiveCase: "DativeOnly" | "Always" | "Never";
};

export const DEFAULT_VALENCY_LINE_STYLE: ValencyLineStyle = {
	reflexiveCase: "DativeOnly",
};

export type ValencyLemma = {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
};

/** jemanden, jemandem, jemandes: `j` plus the ending the case gives it. */
export const CASE_TOKEN = {
	Nom: "jD",
	Acc: "jN",
	Dat: "jM",
	Gen: "jS",
} as const satisfies Record<SlotCase, string>;

/** Bare case objects in German citation order: `jemandem etwas`. */
const CASE_SLOT_ORDER = [
	"Dat",
	"Acc",
	"Gen",
] as const satisfies readonly RenderedCase[];

/**
 * The German Valency Line of a Lemma and its Reading's Valency Frame, or
 * `null` when the frame has nothing to show. A Reading Note's heading prints
 * it; it is computed each render and never stored.
 *
 * The line reads as a citation. A verb's line reads: the frame's lexical
 * reflexive `sich`, the bare case slots (Dat before Acc before Gen), the
 * preposition slots, the markerless slots (Adverbial, Predicative, Clause),
 * a Locution's other Fixed words, and last the head with any separable
 * prefix on it: `sich (Dat) jN vorstellen`, `jM auf den Keks gehen`,
 * `jN irgendwohin legen`, `irgendwie aus|sehen`. Any other head comes first,
 * its slots after it: `stolz (auf jN | dass …)`.
 *
 * Optional slots are parenthesised (`(auf jN)`, `(über jN | von jM)`). A
 * Slot's alternatives are separated by `|`; Required alternatives are
 * grouped in square brackets (`[jN | etw zu tun] versuchen`). The subject
 * Slot (any Slot holding Nom) is not shown.
 *
 * A slot whose preposition is one of the Locution's Fixed words goes right
 * after that word and drops that preposition from its alternative:
 * `mit jM zu tun haben`. A reflexive with a preposition does the same
 * (`außer sich sein`), and a leading `es` stays before the reflexive (`es
 * sich gemütlich machen`), as the Citation places `sich`. Keep the whole
 * ordering rule here; a Surface's line (`../../../surface-line.ts`) runs it
 * around its inflected head.
 */
export function germanValencyLine(
	lemma: ValencyLemma,
	frame: readonly FrameSlot[] | undefined,
	style: ValencyLineStyle = DEFAULT_VALENCY_LINE_STYLE,
): readonly ValencyLinePart[] | null {
	const { head, fixed } = splitCanonicalForm(lemma);
	return valencyLineAround(
		{
			text: head,
			fixed,
			prefix: separablePrefix(lemma.coreFeatures, head),
			first: lemma.kind !== "VERB",
		},
		frame,
		style,
	);
}

/** What a Valency Line is printed around. */
export type LineHead = {
	/** The head's words: `haben`, or a Surface's inflected `hatte`. */
	readonly text: string;
	/** A Locution's other words, in order: `mit` `zu` `tun`. */
	readonly fixed: readonly string[];
	/** A separable verb's prefix, when it begins the head. */
	readonly prefix: string | null;
	/** Whether the head comes before its complements, or after them. */
	readonly first: boolean;
};

/** {@link germanValencyLine}'s ordering, around any head. */
export function valencyLineAround(
	{ text, fixed, prefix, first }: LineHead,
	frame: readonly FrameSlot[] | undefined,
	style: ValencyLineStyle,
): readonly ValencyLinePart[] | null {
	const slots = (frame ?? []).flatMap(slotPart);
	const reflexive = reflexiveSlotOf(frame);
	if (slots.length === 0 && !reflexive) return null;

	const inFixed = (preposition: string | null): preposition is string =>
		preposition !== null && fixed.includes(preposition);
	const fixedPrepositionOf = (slot: SlotPart): string | null => {
		for (const alt of slot.alternatives)
			if (alt.kind === "Case" && inFixed(alt.preposition))
				return alt.preposition;
		return null;
	};
	const remaining: SlotPart[] = [];
	const fixedInserts: {
		readonly after: string;
		readonly part: ValencyLinePart;
	}[] = [];
	for (const slot of slots) {
		const fixedPreposition = fixedPrepositionOf(slot);
		if (fixedPreposition !== null) {
			fixedInserts.push({
				after: fixedPreposition,
				part: {
					...slot,
					alternatives: slot.alternatives.map((alt) =>
						alt.kind === "Case" &&
						alt.preposition === fixedPreposition
							? { ...alt, preposition: null }
							: alt,
					),
				},
			});
		} else {
			remaining.push(slot);
		}
	}

	const caseSlots = CASE_SLOT_ORDER.flatMap((grammaticalCase) =>
		remaining.filter((slot) => {
			const primary = slot.alternatives[0];
			return (
				primary?.kind === "Case" &&
				primary.preposition === null &&
				primary.case === grammaticalCase
			);
		}),
	);
	const prepositionSlots = remaining.filter((slot) => {
		const primary = slot.alternatives[0];
		return primary?.kind === "Case" && primary.preposition !== null;
	});
	const markerlessSlots = remaining.filter(
		(slot) => slot.alternatives[0]?.kind === "Placeholder",
	);

	const sich = reflexive ? reflexivePart(reflexive, style) : null;
	const governor = reflexive?.preposition ?? null;
	const governed = inFixed(governor);
	const lead = !governed && fixed[0] === "es" ? fixed.slice(0, 1) : [];
	const phrase = fixedPhrase(fixed.slice(lead.length), [
		...(sich && governed ? [{ after: governor, part: sich }] : []),
		...fixedInserts,
	]);
	const complements = [
		...fixedPart(lead),
		...(sich && !governed ? [sich] : []),
		...caseSlots,
		...prepositionSlots,
		...markerlessSlots,
		...phrase,
	];
	const headPart: ValencyLinePart = { part: "Head", text, prefix };
	return first ? [headPart, ...complements] : [...complements, headPart];
}

/**
 * A line as one run of text, for a caption: `jD mit jM zu tun hatte`,
 * `sich (Dat) jN vorstellen`, `[jN | etw zu tun] versuchen`. A separable
 * prefix loses its bar.
 */
export function valencyLineText(parts: readonly ValencyLinePart[]): string {
	return parts.map(partText).join(" ");
}

function alternativeText(alternative: SlotAlternative): string {
	switch (alternative.kind) {
		case "Case":
			return alternative.preposition
				? `${alternative.preposition} ${alternative.token}`
				: alternative.token;
		case "Placeholder":
			return alternative.marker
				? `${alternative.marker} ${alternative.text}`
				: alternative.text;
	}
}

function partText(part: ValencyLinePart): string {
	switch (part.part) {
		case "Head":
		case "Fixed":
		case "Preposition":
			return part.text;
		case "Reflexive": {
			const text = part.case ? `${part.text} (${part.case})` : part.text;
			return part.optional ? `(${text})` : text;
		}
		case "Slot": {
			const text = part.alternatives.map(alternativeText).join(" | ");
			if (part.optional) return `(${text})`;
			return part.alternatives.length > 1 ? `[${text}]` : text;
		}
	}
}

function fixedPart(words: readonly string[]): ValencyLinePart[] {
	return words.length > 0 ? [{ part: "Fixed", text: words.join(" ") }] : [];
}

/**
 * A Locution's Fixed words, with each insert right after the first
 * occurrence of the word it follows, which is its preposition: `mit` `jM`
 * `zu tun`.
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
		parts.push(
			...fixedPart(run.slice(0, -1)),
			{ part: "Preposition", text: word },
			...following.map(({ part }) => part),
		);
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
export function splitCanonicalForm(lemma: ValencyLemma): {
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
export function separablePrefix(
	coreFeatures: unknown,
	head: string,
): string | null {
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
type FrameComplement = FrameSlot["complements"][number];

const ADVERBIAL_STAND_IN: Readonly<Record<string, string>> = {
	Irgendwo: "irgendwo",
	Irgendwohin: "irgendwohin",
	Irgendwie: "irgendwie",
	IrgendwieLange: "irgendwie lange",
	IrgendwieViel: "irgendwie viel",
};

const PREDICATIVE_MARKER: Readonly<Record<string, string | null>> = {
	None: null,
	Als: "als",
	Für: "für",
};

const CLAUSE_FORM_TEXT: Readonly<Record<string, string>> = {
	ZuInfinitive: "etw zu tun",
	BareInfinitive: "etw tun",
	Dass: "dass …",
	Ob: "ob …",
	W: "w- …",
};

/**
 * The part a Slot shows: every renderable complement in frame order, as
 * alternatives when there are several (#676). A subject Slot (any Slot
 * holding Nom, including subject clauses) is omitted; a Reflexive is placed
 * by {@link germanValencyLine} itself.
 */
function slotPart(slot: FrameSlot): SlotPart[] {
	if (
		slot.complements.some(
			(complement) =>
				complement.kind === "Case" && complement.governedCase === "Nom",
		)
	)
		return [];

	const alternatives: SlotAlternative[] = [];
	const seen = new Set<string>();
	for (const complement of slot.complements) {
		const rendered = complementAlternative(complement);
		if (rendered === null) continue;
		const key = alternativeText(rendered);
		if (seen.has(key)) continue;
		seen.add(key);
		alternatives.push(rendered);
	}
	if (alternatives.length === 0) return [];
	return [
		{
			part: "Slot",
			optional: slot.status === "Optional",
			alternatives,
		},
	];
}

function complementAlternative(
	complement: FrameComplement,
): SlotAlternative | null {
	switch (complement.kind) {
		case "Case":
		case "Preposition": {
			const grammaticalCase = CASE_SLOT_ORDER.find(
				(rendered) => rendered === complement.governedCase,
			);
			if (grammaticalCase === undefined) return null;
			return {
				kind: "Case",
				preposition:
					complement.kind === "Preposition"
						? (complement.preposition?.canonicalForm ?? null)
						: null,
				case: grammaticalCase,
				token: CASE_TOKEN[grammaticalCase],
			};
		}
		case "Adverbial": {
			const text =
				complement.standIn !== undefined
					? ADVERBIAL_STAND_IN[complement.standIn]
					: undefined;
			return text !== undefined
				? { kind: "Placeholder", marker: null, text }
				: null;
		}
		case "Predicative": {
			const marker =
				complement.marker !== undefined
					? PREDICATIVE_MARKER[complement.marker]
					: undefined;
			if (marker === undefined) return null;
			return marker === null
				? { kind: "Placeholder", marker: null, text: "irgendwie" }
				: { kind: "Placeholder", marker, text: "…" };
		}
		case "Clause": {
			const text =
				complement.form !== undefined
					? CLAUSE_FORM_TEXT[complement.form]
					: undefined;
			return text !== undefined
				? { kind: "Placeholder", marker: null, text }
				: null;
		}
		default:
			return null;
	}
}
