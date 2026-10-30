/**
 * The Surfaces the demo heads, as tf-demo stores them (#1293): the
 * base-order form, the Lemmas it is a form of, and each Lemma's Readings
 * with the slotted line its Valency Frame gives the Surface. A Surface
 * Note opened with no Reading in context has every one of them and no
 * frame of its own.
 */

/** One piece of a slotted line, in reading order. */
type LineToken =
	/** A word of the stored form. */
	| { readonly kind: "word"; readonly text: string; readonly prefix?: string }
	/** A stored word a slot follows, printed in the preposition style. */
	| { readonly kind: "prep"; readonly text: string }
	/** A slot, or `sich`: not in the stored form. */
	| {
			readonly kind: "slot";
			readonly text: string;
			readonly preposition?: string;
			readonly optional?: boolean;
	  };

type Reading = {
	readonly emoji: string;
	readonly gloss: string;
	/** How many Attestations the Reading has; the most common leads. */
	readonly attestations: number;
	/** The Surface's line under this Reading's frame, or null without one. */
	readonly line: readonly LineToken[] | null;
};

type Analysis = {
	readonly canonicalForm: string;
	/** `Locution · VERB · past · 3rd sg`, as the Analyses aside has it. */
	readonly aside: string;
	readonly tone?: "neuter";
	readonly readings: readonly Reading[];
};

export type SurfaceCase = {
	readonly id: string;
	readonly stored: string;
	readonly hint: string;
	/** What the form is of its Lemma, when the Surface has one Lemma. */
	readonly caption: string | null;
	readonly analyses: readonly Analysis[];
};

const word = (text: string, prefix?: string): LineToken =>
	prefix ? { kind: "word", text, prefix } : { kind: "word", text };
const prep = (text: string): LineToken => ({ kind: "prep", text });
const slot = (
	text: string,
	options: { preposition?: string; optional?: boolean } = {},
): LineToken => ({ kind: "slot", text, ...options });

export const cases: readonly SurfaceCase[] = [
	{
		id: "hatte",
		stored: "mit zu tun hatte",
		hint: "A Locution with one Reading",
		caption: "past of mit zu tun haben",
		analyses: [
			{
				canonicalForm: "mit zu tun haben",
				aside: "Locution · VERB · past · 3rd sg",
				readings: [
					{
						emoji: "🔗",
						gloss: "to have to do with",
						attestations: 9,
						line: [
							slot("jD"),
							prep("mit"),
							slot("jM"),
							word("zu"),
							word("tun"),
							word("hatte"),
						],
					},
				],
			},
		],
	},
	{
		id: "erinnert",
		stored: "erinnert",
		hint: "One Lemma, two Readings with two frames",
		caption: "present of erinnern",
		analyses: [
			{
				canonicalForm: "erinnern",
				aside: "Lexeme · VERB · present · 3rd sg",
				readings: [
					{
						emoji: "🪞🧠",
						gloss: "to remember",
						attestations: 14,
						line: [
							slot("jD"),
							slot("sich"),
							slot("jN", { preposition: "an", optional: true }),
							word("erinnert"),
						],
					},
					{
						emoji: "🔔",
						gloss: "to remind",
						attestations: 4,
						line: [
							slot("jD"),
							slot("jN"),
							slot("jN", { preposition: "an" }),
							word("erinnert"),
						],
					},
				],
			},
		],
	},
	{
		id: "anfaengt",
		stored: "anfängt",
		hint: "A separable verb, stored joined",
		caption: "present of anfangen",
		analyses: [
			{
				canonicalForm: "anfangen",
				aside: "Lexeme · VERB · present · 3rd sg",
				readings: [
					{
						emoji: "🏁",
						gloss: "to begin",
						attestations: 6,
						line: [
							slot("jD"),
							slot("jM", { preposition: "mit", optional: true }),
							word("anfängt", "an"),
						],
					},
				],
			},
		],
	},
	{
		id: "kindern",
		stored: "Kindern",
		hint: "A noun with no frame",
		caption: "dative plural of das Kind",
		analyses: [
			{
				canonicalForm: "Kind",
				aside: "Lexeme · NOUN · dative · plural",
				tone: "neuter",
				readings: [
					{
						emoji: "🧒",
						gloss: "child",
						attestations: 11,
						line: null,
					},
				],
			},
		],
	},
];

/** The three headings the demo compares. */
export type HeadingOption = "stored" | "gaps" | "common";

export const headingOptions: readonly {
	readonly value: HeadingOption;
	readonly label: string;
	readonly hint: string;
}[] = [
	{
		value: "stored",
		label: "Stored form",
		hint: "mit zu tun hatte",
	},
	{
		value: "gaps",
		label: "Stored form, gaps marked",
		hint: "… mit … zu tun hatte: a gap wherever some Reading puts a slot",
	},
	{
		value: "common",
		label: "Most common Reading's line",
		hint: "jD mit jM zu tun hatte, the line of the Reading with the most Attestations",
	},
];

/** A heading as printed: stored words, slot tokens, and muted gap marks. */
export type HeadingToken = LineToken | { readonly kind: "gap" };

const storedWords = (stored: string) =>
	stored.split(" ").map((text) => word(text));

/** The heading a Surface Note shows under `option` when no Reading is in context. */
export function headingOf(
	surface: SurfaceCase,
	option: HeadingOption,
): readonly HeadingToken[] {
	const readings = surface.analyses.flatMap(({ readings }) => readings);
	const lines = readings.flatMap(({ line }) => (line ? [line] : []));
	if (option === "stored" || lines.length === 0)
		return storedWords(surface.stored);
	if (option === "common") {
		const [common] = [...readings]
			.filter(({ line }) => line !== null)
			.sort((left, right) => right.attestations - left.attestations);
		return common?.line ?? storedWords(surface.stored);
	}
	const gaps = new Set(lines.flatMap(gapsOf));
	const words = storedWords(surface.stored);
	return [
		...words.flatMap((token, index): HeadingToken[] =>
			gaps.has(index) ? [{ kind: "gap" }, token] : [token],
		),
		...(gaps.has(words.length) ? [{ kind: "gap" } as const] : []),
	];
}

/**
 * Where a line puts something the stored form lacks: the index of the
 * stored word it stands before, or the word count when it ends the line.
 */
function gapsOf(line: readonly LineToken[]): number[] {
	const gaps: number[] = [];
	let stored = 0;
	for (const token of line) {
		if (token.kind === "slot") gaps.push(stored);
		else stored++;
	}
	return gaps;
}
