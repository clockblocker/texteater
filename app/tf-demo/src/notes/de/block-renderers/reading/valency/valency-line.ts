import {
	type ReflexiveSlot,
	reflexiveSlotOf,
} from "../../../../../../shared/reflexive-slot";

/**
 * One concrete Valency Pattern as the Valency Block reads it (ADR 0034): a
 * flat list of concrete complements realized by an occurrence, with no
 * optionality statuses and no inline alternatives.
 */
type PatternComplement = {
	readonly kind: string;
	readonly governedCase?: string;
	readonly preposition?: { readonly canonicalForm: string };
	readonly standIn?: string;
	readonly marker?: string;
	readonly form?: string;
};

export type ValencyPatternLike = readonly PatternComplement[];

/** The German complements the line shows by case. */
type SlotCase = "Nom" | "Acc" | "Dat" | "Gen";
type RenderedCase = Exclude<SlotCase, "Nom">;

/** One concrete complement rendered inside a German Valency Pattern line. */
export type PatternComplementView =
	| {
			readonly kind: "Case";
			/**
			 * The preposition printed before the token. It is `null` for a bare
			 * case object, and for a complement whose preposition is the Fixed
			 * word right before it (`mit jM zu tun haben`).
			 */
			readonly preposition: string | null;
			readonly case: RenderedCase;
			/** The person form of the case: `jN`, `jM` or `jS`. */
			readonly token: string;
	  }
	| {
			readonly kind: "Placeholder";
			/** A Predicative marker (`als`, `für`) or `da(r)-` clause correlate (`darauf,`). */
			readonly marker: string | null;
			/** The dictionary stand-in (`irgendwo`, `dass …`, `etw zu tun`, `…`). */
			readonly text: string;
	  };

/** One piece of a German Valency Pattern line or Surface line, in reading order. */
export type ValencyLinePart =
	| {
			readonly part: "Head";
			readonly text: string;
			/** A separable verb's prefix, which the line splits off: `auf|passen`. */
			readonly prefix: string | null;
	  }
	| {
			readonly part: "Reflexive";
			readonly text: string;
			/** The case the line names beside `sich`, if its style names one. */
			readonly case: "Acc" | "Dat" | null;
	  }
	| { readonly part: "Fixed"; readonly text: string }
	/** A Fixed word a complement or the reflexive follows: `mit` in `mit jM zu tun haben`. */
	| { readonly part: "Preposition"; readonly text: string }
	| {
			readonly part: "Complement";
			readonly complement: PatternComplementView;
	  };

/**
 * Which case the line names beside a lexical reflexive (#1285, a
 * presentation choice). The default follows Duden, which names a dative
 * reflexive and leaves the accusative unmarked (`sich (Dat) jN vorstellen`).
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
const CASE_TOKEN = {
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
 * Formats one concrete German Valency Pattern around its Lemma (ADR 0034),
 * or `null` when the pattern carries no non-subject complement and no
 * reflexive (e.g. a bare intransitive `[Nom]`).
 *
 * A verb pattern reads: reflexive `sich`, bare case objects (Dat, Acc, Gen),
 * prepositional complements, adverbial/predicative/clause complements, any
 * Locution fixed words, and last the head with separable prefix bar:
 * `jN nach jM fragen`, `sich an jN erinnern`, `darauf, dass … achten`,
 * `mit jM zu tun haben`. A non-verb head comes first: `stolz auf jN`,
 * `Angst vor jM`.
 */
export function germanValencyPatternLine(
	lemma: ValencyLemma,
	pattern: ValencyPatternLike,
	style: ValencyLineStyle = DEFAULT_VALENCY_LINE_STYLE,
	emojiDescription?: string,
): readonly ValencyLinePart[] | null {
	const { head, fixed } = splitCanonicalForm(lemma);
	const first = lemma.kind !== "VERB";
	const prefix = separablePrefix(lemma.coreFeatures, head);
	const reflexive = reflexiveSlotOf([pattern], emojiDescription);
	const complementViews = pattern.flatMap((item) => {
		const view = complementViewOf(item);
		return view === null ? [] : [view];
	});
	if (complementViews.length === 0 && !reflexive) return null;

	const inFixed = (preposition: string | null): preposition is string =>
		preposition !== null && fixed.includes(preposition);

	const remaining: ComplementPart[] = [];
	const fixedInserts: {
		readonly after: string;
		readonly part: ValencyLinePart;
	}[] = [];
	for (const view of complementViews) {
		if (view.kind === "Case" && inFixed(view.preposition)) {
			fixedInserts.push({
				after: view.preposition,
				part: {
					part: "Complement",
					complement: { ...view, preposition: null },
				},
			});
		} else {
			remaining.push({ part: "Complement", complement: view });
		}
	}

	const caseComplements = CASE_SLOT_ORDER.flatMap((grammaticalCase) =>
		remaining.filter(
			({ complement }) =>
				complement.kind === "Case" &&
				complement.preposition === null &&
				complement.case === grammaticalCase,
		),
	);
	const prepositionComplements = remaining.filter(
		({ complement }) =>
			complement.kind === "Case" && complement.preposition !== null,
	);
	const markerlessComplements = remaining.filter(
		({ complement }) => complement.kind === "Placeholder",
	);

	const sich = reflexive ? reflexivePart(reflexive, style) : null;
	const governor = reflexive?.preposition ?? null;
	const governed = inFixed(governor);
	const lead = !governed && fixed[0] === "es" ? fixed.slice(0, 1) : [];
	const phrase = fixedPhrase(fixed.slice(lead.length), [
		...(sich && governed ? [{ after: governor, part: sich }] : []),
		...fixedInserts,
	]);
	const complements: ValencyLinePart[] = [
		...fixedPart(lead),
		...(sich && !governed ? [sich] : []),
		...caseComplements,
		...prepositionComplements,
		...markerlessComplements,
		...phrase,
	];
	const headPart: ValencyLinePart = { part: "Head", text: head, prefix };
	return first ? [headPart, ...complements] : [...complements, headPart];
}

/**
 * Formats a line as one run of plain text: `jN nach jM fragen`,
 * `sich (Dat) Sorgen machen`, `darauf, dass … achten`. A separable prefix
 * loses its bar.
 */
export function valencyLineText(parts: readonly ValencyLinePart[]): string {
	return parts.map(partText).join(" ");
}

function complementText(complement: PatternComplementView): string {
	switch (complement.kind) {
		case "Case":
			return complement.preposition
				? `${complement.preposition} ${complement.token}`
				: complement.token;
		case "Placeholder":
			return complement.marker
				? `${complement.marker} ${complement.text}`
				: complement.text;
	}
}

function partText(part: ValencyLinePart): string {
	switch (part.part) {
		case "Head":
		case "Fixed":
		case "Preposition":
			return part.text;
		case "Reflexive":
			return part.case ? `${part.text} (${part.case})` : part.text;
		case "Complement":
			return complementText(part.complement);
	}
}

export function fixedPart(words: readonly string[]): ValencyLinePart[] {
	return words.length > 0 ? [{ part: "Fixed", text: words.join(" ") }] : [];
}

/**
 * A Locution's Fixed words, with each insert right after the first
 * occurrence of the word it follows, which is its preposition: `mit` `jM`
 * `zu tun`.
 */
export function fixedPhrase(
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

type ComplementPart = Extract<ValencyLinePart, { part: "Complement" }>;

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

/** Forms the German `da(r)-` pronominal adverb for a correlate preposition. */
function daCorrelate(preposition: string): string {
	return /^[aeiouäöü]/iu.test(preposition)
		? `dar${preposition}`
		: `da${preposition}`;
}

function complementViewOf(
	complement: PatternComplement,
): PatternComplementView | null {
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
			if (text === undefined) return null;
			const preposition = complement.preposition?.canonicalForm;
			return {
				kind: "Placeholder",
				marker: preposition ? `${daCorrelate(preposition)},` : null,
				text,
			};
		}
		default:
			return null;
	}
}
