/**
 * German nouns with no singular (Pluraletantum), as Duden gives them: each
 * entry's page reads "Grammatik: nur im Plural" (checked 2026-10-03, #876).
 * Rule de/plural-only-noun-has-no-gender gives them gender null. The list
 * is not every Pluraletantum, only the ones checked; a noun Duden gives a
 * singular stays off it even when it is mostly plural (Lebensmittel,
 * Gliedmaße, Hosenträger), and so does a plural-only form that also spells
 * another noun's plural (Daten, plural of Datum).
 */
const pluralOnlyNouns: readonly (readonly [noun: string, duden: string])[] = [
	["Alimente", "Alimente"],
	["Allüren", "Allueren"],
	["Annalen", "Annalen"],
	["Bauchschmerzen", "Bauchschmerzen"],
	["Betriebskosten", "Betriebskosten"],
	["Blattern", "Blattern"],
	["Einkünfte", "Einkuenfte"],
	["Eltern", "Eltern"],
	["Exequien", "Exequien"],
	["Ferien", "Ferien"],
	["Flitterwochen", "Flitterwochen"],
	["Gebrüder", "Gebrueder"],
	["Kinkerlitzchen", "Kinkerlitzchen"],
	["Kosten", "Kosten"],
	["Kurzwaren", "Kurzwaren"],
	["Lebenshaltungskosten", "Lebenshaltungskosten"],
	["Leggings", "Leggings"],
	["Leute", "Leute"],
	["Masern", "Masern"],
	["Memoiren", "Memoiren"],
	["Molesten", "Molesten"],
	["Mores", "Mores"],
	["Naturalien", "Naturalien"],
	["Pocken", "Pocken"],
	["Pommes", "Pommes"],
	["Rauchwaren", "Rauchwaren"],
	["Realien", "Realien"],
	["Röteln", "Roeteln"],
	["Shorts", "Shorts"],
	["Sperenzchen", "Sperenzchen"],
	["Spesen", "Spesen"],
	["Textilien", "Textilien"],
	["Unkosten", "Unkosten"],
	["Viktualien", "Viktualien"],
	["Wirren", "Wirren"],
];

const fold = (form: string) => form.toLocaleLowerCase("de");
const folded = new Set(pluralOnlyNouns.map(([noun]) => fold(noun)));

/** The Duden page each listed Pluraletantum was checked on. */
export const germanPluralOnlyNouns: readonly {
	readonly noun: string;
	readonly source: string;
}[] = pluralOnlyNouns.map(([noun, duden]) => ({
	noun,
	source: `https://www.duden.de/rechtschreibung/${duden}`,
}));

/**
 * Whether a NOUN Canonical Form is a listed Pluraletantum, compared without
 * letter case.
 */
export function isGermanPluralOnlyNoun(canonicalForm: string): boolean {
	return folded.has(fold(canonicalForm));
}
