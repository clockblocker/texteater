/**
 * Reading texts for the demos: paragraphs of sentences of tokens, where a
 * word token is clickable and a gap token (spaces, punctuation) is not.
 *
 * Source strings mark a multi-word unit by wrapping each member as
 * `{word|unit-id}`, so `{fängt|anfangen} … {an|anfangen}` makes both words
 * members of one discontinuous unit.
 */

type FixtureLanguage = "de" | "he";

export type FixtureWord = {
	readonly kind: "word";
	/** Unique within its text, such as `de-p2-s1-w3`. */
	readonly id: string;
	readonly text: string;
	readonly sentenceId: string;
	/** The whole sentence the word stands in, for a Card's quote. */
	readonly sentence: string;
	/** Shared by every member of a multi-word unit, such as `anfangen`. */
	readonly unitId?: string;
};

type FixtureGap = { readonly kind: "gap"; readonly text: string };

type FixtureToken = FixtureWord | FixtureGap;

type FixtureSentence = {
	readonly id: string;
	readonly text: string;
	readonly tokens: readonly FixtureToken[];
};

type FixtureParagraph = {
	readonly id: string;
	readonly sentences: readonly FixtureSentence[];
};

export type FixtureText = {
	readonly id: string;
	readonly lang: FixtureLanguage;
	readonly title: string;
	readonly paragraphs: readonly FixtureParagraph[];
};

const unitMark = /\{([^|}]+)\|([^}]+)\}/gu;
const wordOrMark = /\{[^|}]+\|[^}]+\}|\p{L}+(?:[-'’]\p{L}+)*/gu;

function sentenceTokens(
	source: string,
	sentenceId: string,
	sentence: string,
): FixtureToken[] {
	const tokens: FixtureToken[] = [];
	let cursor = 0;
	let index = 0;
	for (const match of source.matchAll(wordOrMark)) {
		if (match.index > cursor)
			tokens.push({
				kind: "gap",
				text: source.slice(cursor, match.index),
			});
		const marked = /^\{([^|}]+)\|([^}]+)\}$/u.exec(match[0]);
		index += 1;
		tokens.push({
			kind: "word",
			id: `${sentenceId}-w${index}`,
			text: marked?.[1] ?? match[0],
			sentenceId,
			sentence,
			...(marked?.[2] ? { unitId: marked[2] } : {}),
		});
		cursor = match.index + match[0].length;
	}
	if (cursor < source.length)
		tokens.push({ kind: "gap", text: source.slice(cursor) });
	return tokens;
}

/**
 * Builds a text from paragraph strings. Sentences split after `.`, `!`,
 * `?` or `…` followed by whitespace. Use it for any extra text a demo
 * needs, such as a Card's definition made clickable for nested lookups.
 */
export function textFromParagraphs(
	id: string,
	lang: FixtureLanguage,
	title: string,
	paragraphs: readonly string[],
): FixtureText {
	return {
		id,
		lang,
		title,
		paragraphs: paragraphs.map((paragraph, p) => {
			const paragraphId = `${id}-p${p + 1}`;
			return {
				id: paragraphId,
				sentences: paragraph
					.split(/(?<=[.!?…])\s+/u)
					.map((source, s) => {
						const sentenceId = `${paragraphId}-s${s + 1}`;
						const text = source.replace(unitMark, "$1");
						return {
							id: sentenceId,
							text,
							tokens: sentenceTokens(source, sentenceId, text),
						};
					}),
			};
		}),
	};
}

/**
 * A German reading text of four paragraphs. It holds `auf der Bank`,
 * `ging`, the separable `fängt … an`, `zum Bahnhof` and `detaillierte`,
 * the words `resolveWord` has authored Cards for.
 */
export const germanText: FixtureText = textFromParagraphs(
	"de",
	"de",
	"Am Bahnhof",
	[
		"Am Morgen ging Lena zum Bahnhof. Der Zug hatte Verspätung, also setzte sie sich auf der Bank neben dem Kiosk. Dort las sie eine detaillierte Karte der Stadt.",
		"Neben ihr saß ein alter Mann mit einem kleinen Hund. „Wann {fängt|anfangen} das Konzert heute Abend {an|anfangen}?“, fragte er. Lena wusste es nicht, aber sie suchte die Antwort auf ihrem Handy.",
		"Endlich kam der Zug, und die beiden {stiegen|einsteigen} zusammen {ein|einsteigen}. Der Mann erzählte von seiner Jugend in Leipzig. Damals ging er jeden Tag zum Bahnhof, um Zeitungen zu verkaufen.",
		"In der Altstadt {stiegen|aussteigen} sie wieder {aus|aussteigen}. Lena dankte ihm für die Geschichte, und der Hund wedelte mit dem Schwanz. Dann ging sie langsam über den Marktplatz.",
	],
);

/** One simple Hebrew sentence: "The boy walked to school in the morning." */
export const hebrewText: FixtureText = textFromParagraphs("he", "he", "בבוקר", [
	"הילד הלך לבית הספר בבוקר.",
]);

/** Every word of a text, in reading order. */
export function wordsOf(text: FixtureText): FixtureWord[] {
	return text.paragraphs.flatMap((paragraph) =>
		paragraph.sentences.flatMap((sentence) =>
			sentence.tokens.filter(
				(token): token is FixtureWord => token.kind === "word",
			),
		),
	);
}
