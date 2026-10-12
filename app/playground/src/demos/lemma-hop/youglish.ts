import type { FixtureLanguage } from "@/fixtures";

/**
 * YouGlish's pronunciation page for a lemma, in the URL shape tf-demo's
 * notes-study fixtures use: `https://youglish.com/pronounce/<word>/<language>`,
 * the word URI-encoded (`D%C3%A4mmerung`) and the language YouGlish's
 * lower-case English name.
 */

const languageNames: Readonly<Record<FixtureLanguage, string>> = {
	de: "german",
	he: "hebrew",
};

const germanArticles = new Set(["der", "die", "das"]);

/** The lemma as YouGlish searches it: a German noun's without its article. */
function bare(lemma: string, lang: FixtureLanguage): string {
	const [first, ...rest] = lemma.split(" ");
	return lang === "de" && first && germanArticles.has(first) && rest.length
		? rest.join(" ")
		: lemma;
}

export function youglishHref(lemma: string, lang: FixtureLanguage): string {
	return `https://youglish.com/pronounce/${encodeURIComponent(bare(lemma, lang))}/${languageNames[lang]}`;
}

/** The link's accessible name: `Hear Komma on YouGlish`. */
export function youglishLabel(lemma: string, lang: FixtureLanguage): string {
	return `Hear ${bare(lemma, lang)} on YouGlish`;
}
