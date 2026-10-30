import { type FixtureText, textFromParagraphs } from "@/fixtures";

/**
 * The two clicks this prototype explains, written as dictionary prose. A
 * line's wording is copied from en.wiktionary's form-of lines where one
 * fits (`third-person singular preterite of haben`, `pronominal adverb of
 * mit`, `dative plural of Kind`); the sentences after it say what the
 * form does in this sentence.
 */

/** A grammar term, as a learner meets it in a line. */
export type Term = {
	readonly en: string;
	/** DWDS's and German grammar's own word for it. */
	readonly de: string;
	/** What it means, for the term's definition on demand. */
	readonly hint: string;
};

export const terms = {
	thirdSingular: {
		en: "third-person singular",
		de: "3. Person Singular",
		hint: "The form for one person or thing being talked about: er, sie, es.",
	},
	preterite: {
		en: "preterite",
		de: "Präteritum",
		hint: "A tense showing an action at a determined moment in the past.",
	},
	indicative: {
		en: "indicative",
		de: "Indikativ",
		hint: "The mood of a verb used in ordinary factual or objective statements.",
	},
	infinitive: {
		en: "infinitive",
		de: "Infinitiv",
		hint: "The form a dictionary lists a verb under: haben, tun.",
	},
	zuInfinitive: {
		en: "zu-infinitive",
		de: "zu-Infinitiv",
		hint: "The infinitive with zu before it, like English 'to': zu tun, 'to do'.",
	},
	subject: {
		en: "subject",
		de: "Subjekt",
		hint: "In a clause: the word or word group (usually a noun phrase) that is dealt with.",
	},
	pronominalAdverb: {
		en: "pronominal adverb",
		de: "Pronominaladverb",
		hint: "An adverb which contains a pronominal element; generally such an adverb replaces a phrase of preposition + pronoun.",
	},
	dative: {
		en: "dative",
		de: "Dativ",
		hint: "A case that is usually used as the indirect object of a verb.",
	},
	plural: {
		en: "plural",
		de: "Plural",
		hint: "A grammatical number that indicates multiple items or individuals.",
	},
} as const satisfies Record<string, Term>;

export type TermId = keyof typeof terms;

/** The dictionary entries a line can link to. */
export type LemmaId = "mitZuTunHaben" | "haben" | "es" | "mit" | "tun" | "Kind";

/**
 * One run of a line: English prose, a German word, a grammar term, a link
 * to a lemma, an English gloss in quotes, or a valency slot such as `jM`.
 */
export type Run =
	| string
	| { readonly de: string }
	| { readonly term: TermId }
	| { readonly link: LemmaId; readonly text?: string }
	| { readonly gloss: string }
	| { readonly slot: string };

/** What one clicked word is, and what becomes of it in the lemma. */
export type WordLine = {
	/** As it stands in the text. */
	readonly word: string;
	/** False for a word the lemma keeps as it is (`zu tun`). */
	readonly changed: boolean;
	/** In running prose, what links the word to its line: `is the`. */
	readonly is: string;
	/** The form-of line, without a full stop: `preterite of haben`. */
	readonly formOf: readonly Run[];
	/** The sentences after it: what the form does here. */
	readonly note: readonly Run[];
};

export type ProseCase = {
	readonly id: "hard" | "simple";
	readonly label: string;
	readonly text: FixtureText;
	/** The word the learner clicks first; every unit member opens it too. */
	readonly clicked: string;
	readonly surface: {
		readonly title: string;
		/** tf-demo's Surface caption, as the Card shows it. */
		readonly caption: string;
		/** Its gender tone, where the lemma has one. */
		readonly tone?: "neuter";
	};
	readonly lemma: LemmaId;
	/** tf-demo's quiet aside on the route row. */
	readonly aside: string;
	readonly lines: readonly WordLine[];
	/** The unit put back together, when it has more than one word. */
	readonly together?: readonly Run[];
};

const hard: ProseCase = {
	id: "hard",
	label: "hatte es damit zu tun",
	text: textFromParagraphs("dp-hard", "de", "Harry Potter", [
		"Vielleicht {hatte|tun} {es|tun} {damit|tun} {zu|tun} {tun|tun}, dass er in einem dunklen Schrank lebte, jedenfalls war Harry für sein Alter immer recht klein und dürr gewesen.",
	]),
	clicked: "damit",
	surface: { title: "hatte es damit zu tun", caption: "past, es of" },
	lemma: "mitZuTunHaben",
	aside: "Locution · VERB",
	lines: [
		{
			word: "hatte",
			changed: true,
			is: "is the",
			formOf: [
				{ term: "thirdSingular" },
				" ",
				{ term: "preterite" },
				" of ",
				{ link: "haben" },
			],
			note: [
				"It states a fact, so it is ",
				{ term: "indicative" },
				", not the subjunctive ",
				{ de: "hätte" },
				". In the sentence it stands second, after ",
				{ de: "Vielleicht" },
				"; the dictionary puts it last, as the ",
				{ term: "infinitive" },
				" ",
				{ de: "haben" },
				".",
			],
		},
		{
			word: "es",
			changed: true,
			is: "is the",
			formOf: [
				{ term: "subject" },
				", impersonal ",
				{ link: "es" },
				", ",
				{ gloss: "it" },
			],
			note: [
				"Here it is the situation the text is talking about. The dictionary form leaves the subject out.",
			],
		},
		{
			word: "damit",
			changed: true,
			is: "is a",
			formOf: [{ term: "pronominalAdverb" }, " of ", { link: "mit" }],
			note: [
				{ de: "da" },
				" + ",
				{ de: "mit" },
				", ",
				{ gloss: "with that" },
				": ",
				{ de: "da-" },
				" stands in for what ",
				{ de: "mit" },
				" takes. Here it points ahead to the ",
				{ de: "dass" },
				" clause: ",
				{ gloss: "with that, that he lived in a dark cupboard" },
				". In the dictionary form ",
				{ de: "mit" },
				" stays, and ",
				{ de: "da-" },
				" becomes ",
				{ slot: "jM" },
				", someone or something in the ",
				{ term: "dative" },
				".",
			],
		},
		{
			word: "zu tun",
			changed: false,
			is: "is the",
			formOf: [{ term: "zuInfinitive" }, " of ", { link: "tun" }],
			note: ["The dictionary form keeps it as it is."],
		},
	],
	together: [
		"Put back in dictionary order, ",
		{ de: "hatte es damit zu tun" },
		" is ",
		{ link: "mitZuTunHaben" },
		": the verb last, as its infinitive, and no subject.",
	],
};

const simple: ProseCase = {
	id: "simple",
	label: "Kindern",
	text: textFromParagraphs("dp-simple", "de", "Im Garten", [
		"Er spielte mit den Kindern.",
	]),
	clicked: "Kindern",
	surface: { title: "Kindern", caption: "dative plural of", tone: "neuter" },
	lemma: "Kind",
	aside: "Lexeme · NOUN",
	lines: [
		{
			word: "Kindern",
			changed: true,
			is: "is the",
			formOf: [
				{ term: "dative" },
				" ",
				{ term: "plural" },
				" of ",
				{ link: "Kind" },
			],
			note: [
				{ de: "Kind" },
				" makes its plural with ",
				{ de: "-er" },
				", ",
				{ de: "Kinder" },
				"; the dative plural adds ",
				{ de: "-n" },
				". It is dative because ",
				{ de: "mit" },
				" always takes the dative.",
			],
		},
	],
};

export const proseCases: readonly ProseCase[] = [hard, simple];

/** A dictionary entry a line links to, as its Lemma Cover shows it. */
export type LemmaEntry = {
	readonly id: LemmaId;
	readonly emoji: string;
	/** The headword; `slots` name the words in it that are valency slots. */
	readonly title: string;
	readonly slots?: readonly string[];
	/** A noun's article, printed dim before it. */
	readonly article?: string;
	readonly tone?: "neuter";
	/** en.wiktionary's headword line, after the headword. */
	readonly head: string;
	readonly translations: string;
	readonly definition?: string;
	/** A DWDS example. */
	readonly example?: string;
	readonly tags: readonly string[];
};

export const lemmas: Readonly<Record<LemmaId, LemmaEntry>> = {
	mitZuTunHaben: {
		id: "mitZuTunHaben",
		emoji: "🔗",
		title: "mit jM zu tun haben",
		slots: ["jM"],
		head: "(irregular, third-person singular present hat zu tun, past tense hatte zu tun, past participle zu tun gehabt, auxiliary haben)",
		translations: "to have to do with",
		definition: "mit etwas zusammenhängen",
		example: "das hat damit nichts zu tun",
		tags: ["Locution", "VERB"],
	},
	haben: {
		id: "haben",
		emoji: "🤲",
		title: "haben",
		head: "(irregular, third-person singular present hat, past tense hatte, past participle gehabt, past subjunctive hätte, auxiliary haben)",
		translations: "to have",
		tags: ["Lexeme", "VERB"],
	},
	es: {
		id: "es",
		emoji: "👉",
		title: "es",
		head: "(neuter singular, accusative es, dative ihm)",
		translations:
			"it; (impersonal) it, that, there (used to refer to statements, activities, the environment etc., or as a placeholder/dummy pronoun)",
		tags: ["Lexeme", "PRON"],
	},
	mit: {
		id: "mit",
		emoji: "🤝",
		title: "mit",
		head: "(+ dative)",
		translations: "with",
		tags: ["Lexeme", "ADP"],
	},
	tun: {
		id: "tun",
		emoji: "🛠️",
		title: "tun",
		head: "(irregular, third-person singular present tut, past tense tat, past participle getan, auxiliary haben)",
		translations: "to do",
		tags: ["Lexeme", "VERB"],
	},
	Kind: {
		id: "Kind",
		emoji: "🧒",
		title: "Kind",
		article: "das",
		tone: "neuter",
		head: "n (strong, genitive Kindes or Kinds, plural Kinder)",
		translations: "kid; child (young person)",
		tags: ["Lexeme", "NOUN", "Neuter"],
	},
};
