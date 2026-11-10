/**
 * The short German text the Resolution entry reads, and what a click on each
 * of its words resolves to. Together the words cover the click stories of
 * tf-demo ADR 0011: a Reading alone (`Hund`), with a Surface (`ging`), with
 * an Attestation (`zum Bahnhof`, `fängt … an`), with a Lemma of several
 * Readings (`Bank`), and all four (`zur Bank`). The fake db holds none of
 * them, so they are authored here; `story-notes.ts` builds their Notes.
 */

export type StorySegment = {
	readonly kind: "ResolvableText" | "Whitespace" | "Punctuation";
	readonly text: string;
};

/** A fused word's spelling and the words it stands for (ADR 0035). */
type Fusion = {
	readonly spelling: string;
	readonly components: readonly {
		readonly span: string;
		readonly surface: string;
	}[];
};

type StoryMember =
	| { readonly attested: string; readonly orthography: "Standard" }
	| {
			readonly attested: string;
			readonly orthography: "Fused";
			readonly fusion: Fusion;
			readonly component: number;
	  };

type StoryReading = {
	readonly emoji: string;
	readonly definition: string;
	readonly en: string;
	readonly ru: string;
};

type StoryLemma = {
	readonly canonicalForm: string;
	readonly kind: string;
	readonly coreFeatures: Readonly<Record<string, unknown>>;
	/** Every stored Reading of the Lemma; more than one deals the Lemma Card. */
	readonly readings: readonly StoryReading[];
};

export type Story = {
	/** Names the story in the URL, the inspector and the tests. */
	readonly key: string;
	readonly sentence: number;
	/** The unit's member Segments, by index in their Sentence. */
	readonly members: readonly number[];
	readonly lemma: StoryLemma;
	/** Which of the Lemma's Readings the click leads to. */
	readonly reading: number;
	readonly surface: {
		readonly normalizedSurface: string;
		readonly grundform: boolean | null;
		readonly inflectionalFeatures: Readonly<Record<string, unknown>>;
	};
	/** How Grammar reads each member, in `members` order. */
	readonly grammarMembers: readonly StoryMember[];
};

const WORD = /[\p{L}\p{M}\p{N}]+/gu;

/** A sentence as stored Segments; `|` splits a fused word into its pieces. */
function segmentsOf(text: string): StorySegment[] {
	const segments: StorySegment[] = [];
	for (const chunk of text.split(/(\s+)/)) {
		if (!chunk) continue;
		if (/^\s+$/.test(chunk)) {
			segments.push({ kind: "Whitespace", text: " " });
			continue;
		}
		let last = 0;
		for (const match of chunk.matchAll(WORD)) {
			if (match.index > last)
				segments.push(piece(chunk.slice(last, match.index)));
			segments.push({ kind: "ResolvableText", text: match[0] });
			last = match.index + match[0].length;
		}
		if (last < chunk.length) segments.push(piece(chunk.slice(last)));
	}
	return segments.filter(({ text }) => text !== "|");
}

function piece(text: string): StorySegment {
	return { kind: "Punctuation", text };
}

export const STORY_SENTENCES: readonly (readonly StorySegment[])[] = [
	"Annas Hund ging zu|m Bahnhof.",
	"Dort fängt der Tag früh an.",
	"Die Bank war noch frei.",
	"Später brachte sie Geld zu|r Bank.",
].map(segmentsOf);

export function sentenceText(sentence: number): string {
	return (STORY_SENTENCES[sentence] ?? []).map(({ text }) => text).join("");
}

const NOUN = (gender: "Masc" | "Fem" | "Neut") => ({ gender });
const VERB = { hasSepPrefix: null };
const COMPARABLE = { comparable: null };
const PRONOMINAL = {
	case: null,
	gender: null,
	number: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};

const ZUM: Fusion = {
	spelling: "zum",
	components: [
		{ span: "zu", surface: "zu" },
		{ span: "m", surface: "dem" },
	],
};
const ZUR: Fusion = {
	spelling: "zur",
	components: [
		{ span: "zu", surface: "zu" },
		{ span: "r", surface: "der" },
	],
};

const BANK: StoryLemma = {
	canonicalForm: "Bank",
	kind: "NOUN",
	coreFeatures: NOUN("Fem"),
	readings: [
		{
			emoji: "🏦",
			definition: "Ein Unternehmen, das Geld verwahrt und verleiht.",
			en: "bank",
			ru: "банк",
		},
		{
			emoji: "🪑",
			definition: "Ein langer Sitz für mehrere Personen.",
			en: "bench",
			ru: "скамейка",
		},
	],
};

const ZU: StoryLemma = {
	canonicalForm: "zu",
	kind: "ADP",
	coreFeatures: {},
	readings: [
		{
			emoji: "➡️",
			definition: "Gibt das Ziel einer Bewegung an.",
			en: "to",
			ru: "к",
		},
	],
};

const standard = (attested: string): StoryMember => ({
	attested,
	orthography: "Standard",
});

/** A word that is its Lemma's Grundform: its click deals the Reading alone. */
function plain(
	key: string,
	sentence: number,
	member: number,
	lemma: Omit<StoryLemma, "readings">,
	reading: StoryReading,
): Story {
	return {
		key,
		sentence,
		members: [member],
		lemma: { ...lemma, readings: [reading] },
		reading: 0,
		surface: {
			normalizedSurface: lemma.canonicalForm,
			grundform: true,
			inflectionalFeatures: {},
		},
		grammarMembers: [
			standard(STORY_SENTENCES[sentence]?.[member]?.text ?? ""),
		],
	};
}

/** An inflected word: its click deals the Surface behind the Reading. */
function inflected(
	story: Story,
	normalizedSurface: string,
	inflectionalFeatures: Readonly<Record<string, unknown>>,
): Story {
	return {
		...story,
		surface: { normalizedSurface, grundform: false, inflectionalFeatures },
	};
}

const PAST = { tense: "Past", mood: "Ind", verbForm: "Fin" };
const THIRD_SINGULAR = { person: "3", number: "Sing" };

export const STORIES: readonly Story[] = [
	inflected(
		plain(
			"annas",
			0,
			0,
			{
				canonicalForm: "Anna",
				kind: "PROPN",
				coreFeatures: { article: null, gender: "Fem" },
			},
			{
				emoji: "👩",
				definition: "Ein weiblicher Vorname.",
				en: "Anna",
				ru: "Анна",
			},
		),
		"Annas",
		{ case: "Gen", number: "Sing" },
	),
	plain(
		"hund",
		0,
		2,
		{ canonicalForm: "Hund", kind: "NOUN", coreFeatures: NOUN("Masc") },
		{
			emoji: "🐕",
			definition: "Ein Haustier, das bellt und gern spazieren geht.",
			en: "dog",
			ru: "собака",
		},
	),
	inflected(
		plain(
			"ging",
			0,
			4,
			{ canonicalForm: "gehen", kind: "VERB", coreFeatures: VERB },
			{
				emoji: "🚶",
				definition: "Sich zu Fuß fortbewegen.",
				en: "to go, to walk",
				ru: "идти",
			},
		),
		"ging",
		{ ...PAST, ...THIRD_SINGULAR },
	),
	{
		key: "zu-bahnhof",
		sentence: 0,
		members: [6],
		lemma: ZU,
		reading: 0,
		surface: {
			normalizedSurface: "zu",
			grundform: true,
			inflectionalFeatures: {},
		},
		grammarMembers: [
			{
				attested: "zu",
				orthography: "Fused",
				fusion: ZUM,
				component: 0,
			},
		],
	},
	{
		key: "bahnhof",
		sentence: 0,
		members: [7, 9],
		lemma: {
			canonicalForm: "Bahnhof",
			kind: "NOUN",
			coreFeatures: NOUN("Masc"),
			readings: [
				{
					emoji: "🚉",
					definition:
						"Ein Ort, an dem Züge halten und Reisende ein- und aussteigen.",
					en: "train station",
					ru: "вокзал",
				},
			],
		},
		reading: 0,
		surface: {
			normalizedSurface: "Bahnhof",
			grundform: false,
			inflectionalFeatures: {
				case: "Dat",
				gender: "Masc",
				number: "Sing",
			},
		},
		grammarMembers: [
			{
				attested: "m",
				orthography: "Fused",
				fusion: ZUM,
				component: 1,
			},
			standard("Bahnhof"),
		],
	},
	plain(
		"dort",
		1,
		0,
		{ canonicalForm: "dort", kind: "ADV", coreFeatures: COMPARABLE },
		{
			emoji: "📍",
			definition: "An jenem Ort, nicht hier.",
			en: "there",
			ru: "там",
		},
	),
	{
		key: "faengt-an",
		sentence: 1,
		members: [2, 10],
		lemma: {
			canonicalForm: "anfangen",
			kind: "VERB",
			coreFeatures: { hasSepPrefix: "Yes" },
			readings: [
				{
					emoji: "▶️",
					definition: "Mit etwas beginnen; seinen Anfang nehmen.",
					en: "to begin, to start",
					ru: "начинать",
				},
			],
		},
		reading: 0,
		surface: {
			normalizedSurface: "fängt an",
			grundform: false,
			inflectionalFeatures: {
				tense: "Pres",
				mood: "Ind",
				verbForm: "Fin",
				...THIRD_SINGULAR,
			},
		},
		grammarMembers: [standard("fängt"), standard("an")],
	},
	plain(
		"der",
		1,
		4,
		{ canonicalForm: "der", kind: "DET", coreFeatures: PRONOMINAL },
		{
			emoji: "👉",
			definition: "Der bestimmte Artikel.",
			en: "the",
			ru: "определённый артикль",
		},
	),
	plain(
		"tag",
		1,
		6,
		{ canonicalForm: "Tag", kind: "NOUN", coreFeatures: NOUN("Masc") },
		{
			emoji: "☀️",
			definition: "Die Zeit zwischen Sonnenaufgang und Sonnenuntergang.",
			en: "day",
			ru: "день",
		},
	),
	plain(
		"frueh",
		1,
		8,
		{ canonicalForm: "früh", kind: "ADV", coreFeatures: COMPARABLE },
		{
			emoji: "🌅",
			definition: "Am Anfang eines Zeitraums; zeitig.",
			en: "early",
			ru: "рано",
		},
	),
	inflected(
		plain(
			"die",
			2,
			0,
			{ canonicalForm: "der", kind: "DET", coreFeatures: PRONOMINAL },
			{
				emoji: "👉",
				definition: "Der bestimmte Artikel.",
				en: "the",
				ru: "определённый артикль",
			},
		),
		"die",
		{ case: "Nom", gender: "Fem", number: "Sing" },
	),
	{
		key: "bank",
		sentence: 2,
		members: [2],
		lemma: BANK,
		reading: 1,
		surface: {
			normalizedSurface: "Bank",
			grundform: true,
			inflectionalFeatures: {},
		},
		grammarMembers: [standard("Bank")],
	},
	inflected(
		plain(
			"war",
			2,
			4,
			{ canonicalForm: "sein", kind: "AUX", coreFeatures: {} },
			{
				emoji: "🔗",
				definition: "Verbindet das Subjekt mit einer Eigenschaft.",
				en: "to be",
				ru: "быть",
			},
		),
		"war",
		{ ...PAST, ...THIRD_SINGULAR },
	),
	plain(
		"noch",
		2,
		6,
		{ canonicalForm: "noch", kind: "ADV", coreFeatures: COMPARABLE },
		{
			emoji: "⏳",
			definition: "Bis jetzt andauernd; weiterhin.",
			en: "still",
			ru: "ещё",
		},
	),
	plain(
		"frei",
		2,
		8,
		{ canonicalForm: "frei", kind: "ADJ", coreFeatures: COMPARABLE },
		{
			emoji: "🆓",
			definition: "Nicht besetzt; verfügbar.",
			en: "free, vacant",
			ru: "свободный",
		},
	),
	inflected(
		plain(
			"spaeter",
			3,
			0,
			{ canonicalForm: "spät", kind: "ADV", coreFeatures: COMPARABLE },
			{
				emoji: "🌙",
				definition: "Nach der üblichen oder erwarteten Zeit.",
				en: "late",
				ru: "поздно",
			},
		),
		"später",
		{ degree: "Cmp" },
	),
	inflected(
		plain(
			"brachte",
			3,
			2,
			{ canonicalForm: "bringen", kind: "VERB", coreFeatures: VERB },
			{
				emoji: "📦",
				definition: "Etwas an einen Ort tragen oder schaffen.",
				en: "to bring",
				ru: "приносить",
			},
		),
		"brachte",
		{ ...PAST, ...THIRD_SINGULAR },
	),
	plain(
		"sie",
		3,
		4,
		{ canonicalForm: "sie", kind: "PRON", coreFeatures: PRONOMINAL },
		{
			emoji: "🙋‍♀️",
			definition: "Steht für eine weibliche Person oder Sache.",
			en: "she",
			ru: "она",
		},
	),
	plain(
		"geld",
		3,
		6,
		{ canonicalForm: "Geld", kind: "NOUN", coreFeatures: NOUN("Neut") },
		{
			emoji: "💶",
			definition: "Das Mittel, mit dem man bezahlt.",
			en: "money",
			ru: "деньги",
		},
	),
	{
		key: "zu-bank",
		sentence: 3,
		members: [8],
		lemma: ZU,
		reading: 0,
		surface: {
			normalizedSurface: "zu",
			grundform: true,
			inflectionalFeatures: {},
		},
		grammarMembers: [
			{
				attested: "zu",
				orthography: "Fused",
				fusion: ZUR,
				component: 0,
			},
		],
	},
	{
		key: "zur-bank",
		sentence: 3,
		members: [9, 11],
		lemma: BANK,
		reading: 0,
		surface: {
			normalizedSurface: "Bank",
			grundform: false,
			inflectionalFeatures: {
				case: "Dat",
				gender: "Fem",
				number: "Sing",
			},
		},
		grammarMembers: [
			{
				attested: "r",
				orthography: "Fused",
				fusion: ZUR,
				component: 1,
			},
			standard("Bank"),
		],
	},
];

/** The story a click on `segment` of `sentence` starts: its unit's. */
export function storyAt(sentence: number, segment: number): Story | null {
	return (
		STORIES.find(
			(story) =>
				story.sentence === sentence && story.members.includes(segment),
		) ?? null
	);
}

export function storyByKey(key: string): Story | null {
	return STORIES.find((story) => story.key === key) ?? null;
}

/** The words a story's click selects, as its Card's back carries them. */
export function storyWords(story: Story): string {
	const segments = STORY_SENTENCES[story.sentence] ?? [];
	const words: string[] = [];
	let previousEnd: number | null = null;
	for (const member of story.members) {
		let start = member;
		let end = member;
		while (start > 0 && segments[start - 1]?.kind === "ResolvableText")
			start--;
		while (segments[end + 1]?.kind === "ResolvableText") end++;
		if (previousEnd !== null && start <= previousEnd) continue;
		const between =
			previousEnd === null ? [] : segments.slice(previousEnd + 1, start);
		if (previousEnd !== null)
			words.push(
				between.every(({ kind }) => kind === "Whitespace")
					? " "
					: " … ",
			);
		words.push(
			segments
				.slice(start, end + 1)
				.map(({ text }) => text)
				.join(""),
		);
		previousEnd = end;
	}
	return words.join("");
}

/** The stories the inspector offers, one per click story of ADR 0011. */
export const FEATURED_STORIES: readonly {
	readonly key: string;
	readonly label: string;
	readonly hint: string;
}[] = [
	{ key: "hund", label: "Hund", hint: "A Reading alone." },
	{ key: "ging", label: "ging", hint: "A Surface behind the Reading." },
	{
		key: "bahnhof",
		label: "zum Bahnhof",
		hint: "An Attestation known at the click, a Surface and the Reading.",
	},
	{
		key: "faengt-an",
		label: "fängt … an",
		hint: "A split unit: Attestation, Surface and Reading.",
	},
	{
		key: "bank",
		label: "Bank",
		hint: "A Lemma of two Readings behind the Reading.",
	},
	{
		key: "zur-bank",
		label: "zur Bank",
		hint: "All four: Attestation, Surface, Lemma and Reading.",
	},
];
