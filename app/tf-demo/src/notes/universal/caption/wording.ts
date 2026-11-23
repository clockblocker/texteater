import type { VerbFormKey } from "../../../../shared/click-story";
import type { SupportedTargetLanguage } from "../../../../shared/supported-target-language";

/**
 * One run of a Heading's caption. A `Word` is in the UI language; a
 * `Target` is in the target language and is isolated for bidirectional text;
 * `Next` is the next Card's title, a target-language run drawn dimmer so that
 * Card's own title stays the strong one; an `Emoji` names one Reading.
 */
export type CaptionToken =
	| { readonly kind: "Word"; readonly text: string }
	| { readonly kind: "Target"; readonly text: string }
	| { readonly kind: "Next"; readonly text: string }
	| {
			readonly kind: "Emoji";
			readonly text: string;
			/** The Reading the Deck leads to. */
			readonly current: boolean;
	  };

/**
 * A caption in the two forms of its Card (tf-demo ADR 0006). As a Card in
 * the pile it ends at the relation (`past of`), since the next Card's tail
 * right below shows the word it leads to; as a Sheet, with no Card below,
 * it names that word itself (`past of gehen`).
 */
export type Caption = {
	readonly card: readonly CaptionToken[];
	readonly sheet: readonly CaptionToken[];
};

/** A relation in both forms; `{slot}` marks where tokens go. */
type RelationTemplate = { readonly card: string; readonly sheet: string };

/** The languages a caption's relation words can be written in. */
export type UiLanguage = "en";

/** The UI language captions are written in, until the UI offers another. */
export const UI_LANGUAGE: UiLanguage = "en";

/**
 * The relation words one UI language uses, as templates and word lists.
 * Code fills the slots and never glues words itself, so a language with
 * another word order only needs its own table.
 */
export type UiWording = {
	/** Between the title and its caption. */
	readonly captionSeparator: string;
	/** Between items of a list: `past, wir`. */
	readonly listSeparator: string;
	/** Between words of one phrase: `dative plural`. */
	readonly wordSeparator: string;
	/** Between the values of a feature that has several: `accusative or dative`. */
	readonly alternativeSeparator: string;
	/** Where other words stand between a unit's words: `fängt … an`. */
	readonly unitGap: string;
	readonly relations: {
		/** A Surface: `{form}` is its Variant tags and inflection. */
		readonly form: RelationTemplate;
		readonly typo: RelationTemplate;
		readonly shorthand: RelationTemplate;
		/** `{fused}` is the written word, `{words}` the words it stands for. */
		readonly fusion: RelationTemplate;
		readonly split: RelationTemplate;
		/** A Lemma's Readings, by plural category of `{count}`. */
		readonly readings: Readonly<
			Partial<Record<Intl.LDMLPluralRule, RelationTemplate>> & {
				readonly other: RelationTemplate;
			}
		>;
	};
	/** A verb form's tense, mood or non-finite form. */
	readonly verb: Readonly<Record<VerbFormKey, string>>;
	/** `{verb}` is the tense phrase a passive form takes. */
	readonly passive: string;
	readonly case: Readonly<Record<"Nom" | "Acc" | "Dat" | "Gen", string>>;
	readonly number: Readonly<Record<"Sing" | "Plur", string>>;
	readonly gender: Readonly<Record<"Masc" | "Fem" | "Neut", string>>;
	readonly degree: Readonly<Record<"Cmp" | "Sup", string>>;
	readonly variant: Readonly<
		Record<"Licensed" | "Historical" | "Regional" | "Expressive", string>
	>;
	/** A Surface quoting only some of its Lemma's words. */
	readonly part: string;
	/**
	 * A Surface spelled otherwise than its Lemma with nothing stored to say
	 * how (`welch` of `welcher`): the last resort.
	 */
	readonly form: string;
};

export const uiWordings = {
	en: {
		captionSeparator: "·",
		listSeparator: ", ",
		wordSeparator: " ",
		alternativeSeparator: " or ",
		unitGap: " … ",
		relations: {
			form: { card: "{form} of", sheet: "{form} of {next}" },
			typo: { card: "typo of", sheet: "typo of {next}" },
			shorthand: { card: "short for", sheet: "short for {next}" },
			fusion: { card: "{fused} = {words}", sheet: "{fused} = {words}" },
			split: { card: "split form of", sheet: "split form of {next}" },
			readings: {
				one: {
					card: "{count} reading: {emojis}",
					sheet: "{count} reading: {emojis}",
				},
				other: {
					card: "{count} readings: {emojis}",
					sheet: "{count} readings: {emojis}",
				},
			},
		},
		verb: {
			present: "present",
			past: "past",
			perfect: "perfect",
			pastPerfect: "past perfect",
			future: "future",
			futurePerfect: "future perfect",
			subjunctive: "subjunctive",
			perfectSubjunctive: "perfect subjunctive",
			futureSubjunctive: "future subjunctive",
			imperative: "imperative",
			infinitive: "infinitive",
			perfectInfinitive: "perfect infinitive",
			participle: "participle",
			presentParticiple: "present participle",
		},
		passive: "{verb} passive",
		case: {
			Nom: "nominative",
			Acc: "accusative",
			Dat: "dative",
			Gen: "genitive",
		},
		number: { Sing: "singular", Plur: "plural" },
		gender: { Masc: "masculine", Fem: "feminine", Neut: "neuter" },
		degree: { Cmp: "comparative", Sup: "superlative" },
		variant: {
			Licensed: "also correct",
			Historical: "older spelling",
			Regional: "regional",
			Expressive: "stretched for effect",
		},
		part: "part",
		form: "form",
	},
} as const satisfies Record<UiLanguage, UiWording>;

/** `1.Sing`: a finite verb's person and number. */
type PersonNumber = `${"1" | "2" | "3"}.${"Sing" | "Plur"}`;

/**
 * The target-language words a caption quotes: the pronoun that names a
 * finite form's person and number, and the article that names a noun's
 * gender once its title's gender tone is gone.
 *
 * A caption names a pronoun only where the form alone fixes it. A German
 * third-person singular is er, sie or es by its subject, and a third-person
 * plural sie or Sie, and no stored feature says which, so those cells have
 * none: `ging` is `past`, never `past, er/sie/es`.
 */
export type TargetWording = {
	readonly pronoun: Readonly<Partial<Record<PersonNumber, string>>>;
	/** An imperative addresses someone; a third-person plural one is polite. */
	readonly imperativePronoun: Readonly<Partial<Record<PersonNumber, string>>>;
	/** A form whose subject is an expletive (`es regnet`). */
	readonly expletivePronoun: string;
	readonly article: Readonly<Record<"Masc" | "Fem" | "Neut", string>>;
	/** Between the articles of a noun in free gender variation: `der/das`. */
	readonly articleSeparator: string;
	/** `{article}` and `{noun}`: `der Bahnhof`. */
	readonly nounWithArticle: string;
	/** Between the words a fused word stands for: `zu dem`. */
	readonly wordSeparator: string;
};

export const targetWordings = {
	de: {
		pronoun: {
			"1.Sing": "ich",
			"2.Sing": "du",
			"1.Plur": "wir",
			"2.Plur": "ihr",
		},
		imperativePronoun: { "3.Plur": "Sie" },
		expletivePronoun: "es",
		article: { Masc: "der", Fem: "die", Neut: "das" },
		articleSeparator: "/",
		nounWithArticle: "{article} {noun}",
		wordSeparator: " ",
	},
	he: {
		pronoun: {},
		imperativePronoun: {},
		expletivePronoun: "",
		article: { Masc: "ה", Fem: "ה", Neut: "ה" },
		articleSeparator: "/",
		nounWithArticle: "{article}{noun}",
		wordSeparator: " ",
	},
} as const satisfies Record<SupportedTargetLanguage, TargetWording>;

/**
 * Fills a template's `{slot}`s with tokens. The template's own text becomes
 * `Word` tokens, and neighbouring `Word`s merge.
 */
export function fillTemplate(
	template: string,
	slots: Readonly<Record<string, readonly CaptionToken[]>>,
): CaptionToken[] {
	const tokens: CaptionToken[] = [];
	for (const [index, part] of template.split(/\{(\w+)\}/).entries()) {
		if (index % 2 === 1) {
			const filled = slots[part];
			if (!filled) throw new Error(`No tokens for the {${part}} slot.`);
			for (const token of filled) pushToken(tokens, token);
		} else if (part) pushToken(tokens, { kind: "Word", text: part });
	}
	return tokens;
}

/** Fills a template whose slots all hold plain text, as one string. */
export function fillText(
	template: string,
	slots: Readonly<Record<string, string>>,
): string {
	return template.replace(/\{(\w+)\}/g, (_, slot: string) => {
		const value = slots[slot];
		if (value === undefined)
			throw new Error(`No text for the {${slot}} slot.`);
		return value;
	});
}

/** Joins token runs with a separator `Word`. */
export function joinTokens(
	runs: readonly (readonly CaptionToken[])[],
	separator: string,
): CaptionToken[] {
	const tokens: CaptionToken[] = [];
	for (const [index, run] of runs.entries()) {
		if (index > 0) pushToken(tokens, { kind: "Word", text: separator });
		for (const token of run) pushToken(tokens, token);
	}
	return tokens;
}

function pushToken(tokens: CaptionToken[], token: CaptionToken) {
	const last = tokens.at(-1);
	if (last?.kind === "Word" && token.kind === "Word")
		tokens[tokens.length - 1] = {
			kind: "Word",
			text: last.text + token.text,
		};
	else tokens.push(token);
}

/** A caption's words as plain text, for an accessible name or a test. */
export function captionText(tokens: readonly CaptionToken[]): string {
	return tokens.map(({ text }) => text).join("");
}
