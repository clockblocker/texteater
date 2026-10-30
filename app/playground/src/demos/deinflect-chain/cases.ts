import { type FixtureText, textFromParagraphs } from "@/fixtures";

/**
 * The two cases this demo explains, authored by hand: a Locution whose
 * clicked words differ from its lemma in form, in what is left out and in
 * order, and a Lexeme whose one word takes two endings.
 *
 * A step's `about` is plain text where `_word_` is a run in the target
 * language, set in italics; the same text, unmarked, is the step's
 * tooltip, as Yomitan puts a rule's description in its `title`.
 */

/** One change between the clicked words and the lemma, named. */
export type Step = {
	readonly id: string;
	/** The clicked words the change is about, as they stand there. */
	readonly words: readonly string[];
	/**
	 * The word the chain line puts before the step's name, as 10ten puts
	 * the form before its reasons; `null` for a step about no one word.
	 * Unset, it is `from`.
	 */
	readonly cue?: string | null;
	/** What the step starts from, in the reading direction (words first). */
	readonly from: string;
	/** What it leaves; `null` when the part is left out of the lemma. */
	readonly to: string | null;
	/** Yomitan's register: a grammar label, a word or two. */
	readonly terse: string;
	/** The same change in plain words, for a learner without the labels. */
	readonly plain: string;
	/** What the change means here, two or three short sentences. */
	readonly about: string;
};

/** A run of the lemma's headword, or a slot a learner fills: `jM`. */
export type HeadPart =
	| { readonly text: string }
	| { readonly slot: string; readonly means: string };

export type DemoCase = {
	readonly id: "locution" | "noun";
	readonly label: string;
	readonly text: FixtureText;
	/** The word the case's "open" knob clicks. */
	readonly clicked: string;
	/** The clicked unit as it stands in the sentence. */
	readonly surface: string;
	readonly surfaceIpa: string;
	readonly lemma: {
		readonly head: readonly HeadPart[];
		/** The headword as one string, for crumbs and labels. */
		readonly title: string;
		readonly ipa: string;
		readonly emoji: string;
		/** tf-demo's route aside: `Locution · verb`. */
		readonly kind: string;
		readonly tone?: "neuter";
		readonly gloss: string;
		readonly definition: string;
		readonly tags: readonly string[];
	};
	/** The steps from the clicked words to the lemma, in reading order. */
	readonly steps: readonly Step[];
};

const locution: DemoCase = {
	id: "locution",
	label: "hatte es damit zu tun",
	text: textFromParagraphs("dc-harry", "de", "Harry", [
		"Vielleicht {hatte|zu-tun} {es|zu-tun} {damit|zu-tun} {zu|zu-tun} {tun|zu-tun}, dass er in einem dunklen Schrank lebte, jedenfalls war Harry für sein Alter immer recht klein und dürr gewesen.",
	]),
	clicked: "damit",
	surface: "hatte es damit zu tun",
	surfaceIpa: "ˈhatə ɛs daˈmɪt tsuː ˈtuːn",
	lemma: {
		head: [
			{ text: "mit " },
			{
				slot: "jM",
				means: "jemandem: someone or something, in the dative",
			},
			{ text: " zu tun haben" },
		],
		title: "mit jM zu tun haben",
		ipa: "mɪt … tsuː ˈtuːn ˈhaːbn̩",
		emoji: "🔗",
		kind: "Locution · verb",
		gloss: "to have to do with",
		definition: "mit etwas zusammenhängen",
		tags: ["Locution", "verb"],
	},
	steps: [
		{
			id: "order",
			words: ["hatte"],
			cue: null,
			from: "Vielleicht hatte …",
			to: "… haben",
			terse: "verb second",
			plain: "the verb goes back to the end",
			about: "In a main clause the conjugated verb stands second, here right after _Vielleicht_. The dictionary lists the verb last, as an infinitive.",
		},
		{
			id: "tense",
			words: ["hatte"],
			from: "hatte",
			to: "haben",
			terse: "past · 3rd sg.",
			plain: "past tense, for er, sie or es",
			about: "_hatte_ is _haben_ in the past tense (Präteritum), the form for er, sie or es. It states a fact (indicative); the 'would' form is _hätte_.",
		},
		{
			id: "subject",
			words: ["es"],
			from: "es",
			to: null,
			terse: "subject",
			plain: "'it', left out",
			about: "_es_, 'it', is the subject: the situation from the sentence before, pointing ahead to the _dass_-clause. The dictionary form leaves the subject out.",
		},
		{
			id: "da",
			words: ["damit"],
			from: "damit",
			to: "mit jM",
			terse: "da- + mit",
			plain: "da- means 'that'",
			about: "_damit_ is _da(r)_ + _mit_, 'with that'. _da-_ stands in for what _mit_ governs; here it points ahead to the _dass_-clause, '…, that he lived in a dark cupboard'. The lemma keeps _mit_ and puts the slot _jM_ where _da-_ was.",
		},
		{
			id: "zu",
			words: ["zu", "tun"],
			from: "zu tun",
			to: "zu tun",
			terse: "zu-infinitive",
			plain: "stays as it is",
			about: "_zu tun_, 'to do', is the infinitive with _zu_. It stays as it is.",
		},
	],
};

const noun: DemoCase = {
	id: "noun",
	label: "Kindern",
	text: textFromParagraphs("dc-kinder", "de", "Im Garten", [
		"Er spielte mit den Kindern.",
	]),
	clicked: "Kindern",
	surface: "Kindern",
	surfaceIpa: "ˈkɪndɐn",
	lemma: {
		head: [{ text: "das Kind" }],
		title: "das Kind",
		ipa: "kɪnt",
		emoji: "🧒",
		kind: "Lexeme · noun",
		tone: "neuter",
		gloss: "child",
		definition: "ein junger Mensch; der Sohn oder die Tochter",
		tags: ["noun", "neuter"],
	},
	steps: [
		{
			id: "dative",
			words: ["Kindern"],
			from: "Kindern",
			to: "Kinder",
			terse: "dative +n",
			plain: "-n because of mit",
			about: "After _mit_ a noun is in the dative, and a plural that doesn't end in -n or -s takes one: _den Kindern_.",
		},
		{
			id: "plural",
			words: ["Kindern"],
			from: "Kinder",
			to: "Kind",
			terse: "plural -er",
			plain: "-er makes it more than one",
			about: "_Kind_ makes its plural with -er: _das Kind_, _die Kinder_.",
		},
	],
};

export const cases: readonly DemoCase[] = [locution, noun];
