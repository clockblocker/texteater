/**
 * The number a chapter heading counts with (#1190): digits, a Roman
 * numeral, a German, English or Hebrew number word or ordinal, or a Hebrew
 * letter numeral (`פרק י״א`). Headings use it to tell a run of chapters
 * from chance lines and to see the count start again at a new book.
 */

const englishCardinals = [
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"eleven",
	"twelve",
	"thirteen",
	"fourteen",
	"fifteen",
	"sixteen",
	"seventeen",
	"eighteen",
	"nineteen",
	"twenty",
];
const englishOrdinals = [
	"first",
	"second",
	"third",
	"fourth",
	"fifth",
	"sixth",
	"seventh",
	"eighth",
	"ninth",
	"tenth",
	"eleventh",
	"twelfth",
	"thirteenth",
	"fourteenth",
	"fifteenth",
	"sixteenth",
	"seventeenth",
	"eighteenth",
	"nineteenth",
	"twentieth",
];
const germanCardinals = [
	"eins",
	"zwei",
	"drei",
	"vier",
	"fünf",
	"sechs",
	"sieben",
	"acht",
	"neun",
	"zehn",
	"elf",
	"zwölf",
	"dreizehn",
	"vierzehn",
	"fünfzehn",
	"sechzehn",
	"siebzehn",
	"achtzehn",
	"neunzehn",
	"zwanzig",
];
/** German ordinal stems, before the ending `-e`, `-es`, `-er`, `-en`. */
const germanOrdinals = [
	"erst",
	"zweit",
	"dritt",
	"viert",
	"fünft",
	"sechst",
	"siebent",
	"acht",
	"neunt",
	"zehnt",
	"elft",
	"zwölft",
	"dreizehnt",
	"vierzehnt",
	"fünfzehnt",
	"sechzehnt",
	"siebzehnt",
	"achtzehnt",
	"neunzehnt",
];
const germanUnits = ["ein", ...germanCardinals.slice(1, 9)];
const germanTens = [
	"zwanzig",
	"dreißig",
	"vierzig",
	"fünfzig",
	"sechzig",
	"siebzig",
	"achtzig",
	"neunzig",
];
const hebrewOrdinals = [
	"ראשון",
	"שני",
	"שלישי",
	"רביעי",
	"חמישי",
	"שישי",
	"שביעי",
	"שמיני",
	"תשיעי",
	"עשירי",
];
const hebrewFeminineOrdinals = [
	"ראשונה",
	"שנייה",
	"שלישית",
	"רביעית",
	"חמישית",
	"שישית",
	"שביעית",
	"שמינית",
	"תשיעית",
	"עשירית",
];

const hebrewLetterValues: Readonly<Record<string, number>> = {
	...Object.fromEntries(
		Array.from("אבגדהוזחט", (letter, index) => [letter, index + 1]),
	),
	...Object.fromEntries(
		Array.from("יכלמנסעפצ", (letter, index) => [letter, (index + 1) * 10]),
	),
	...Object.fromEntries(
		Array.from("קרשת", (letter, index) => [letter, (index + 1) * 100]),
	),
	ך: 20,
	ם: 40,
	ן: 50,
	ף: 80,
	ץ: 90,
};

const romanValues: Readonly<Record<string, number>> = {
	i: 1,
	v: 5,
	x: 10,
	l: 50,
	c: 100,
	d: 500,
	m: 1000,
};

function romanNumber(token: string): number | undefined {
	if (!/^[ivxlcdm]+$/u.test(token)) return undefined;
	const values = Array.from(token, (char) => romanValues[char] ?? 0);
	let total = 0;
	for (const [index, value] of values.entries()) {
		const next = values[index + 1] ?? 0;
		total += value < next ? -value : value;
	}
	return total > 0 ? total : undefined;
}

/** `zweiundzwanzigste`, `dreißigstes`: German ordinals from 20 up. */
function germanTensOrdinal(token: string): number | undefined {
	const match =
		/^(?:(\p{L}+?)und)?(zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)ste[snrm]?$/u.exec(
			token,
		);
	if (match === null) return undefined;
	const tens = (germanTens.indexOf(match[2] ?? "") + 2) * 10;
	if (match[1] === undefined) return tens;
	const unit = germanUnits.indexOf(match[1]);
	return unit < 0 ? undefined : tens + unit + 1;
}

/**
 * A Hebrew letter numeral: letters worth less and less, as in `קכ״ג` or
 * `ט״ו`. A word such as `אחד` does not read as one.
 */
function hebrewNumber(token: string): number | undefined {
	const letters = token.replace(/[׳״'"]/gu, "");
	if (!/^[א-ת]{1,4}$/u.test(letters)) return undefined;
	const values = Array.from(
		letters,
		(letter) => hebrewLetterValues[letter] ?? 0,
	);
	const ordered = values.every(
		(value, index) => index === 0 || value <= (values[index - 1] ?? 0),
	);
	if (!ordered) return undefined;
	return values.reduce((total, value) => total + value, 0);
}

const indexIn = (list: readonly string[], token: string) => {
	const index = list.indexOf(token);
	return index < 0 ? undefined : index + 1;
};

/** The number a heading's numbering word stands for, if it is one. */
export function numberOf(word: string): number | undefined {
	const token = word.toLowerCase().replace(/[.:]$/u, "");
	if (/^\d{1,4}$/u.test(token)) return Number(token);
	const germanOrdinal = /^(\p{L}+?)(?:e|es|er|en|em)$/u.exec(token)?.[1];
	return (
		romanNumber(token) ??
		indexIn(englishCardinals, token) ??
		indexIn(englishOrdinals, token) ??
		indexIn(germanCardinals, token) ??
		(germanOrdinal === "siebt" ? 7 : undefined) ??
		indexIn(germanOrdinals, germanOrdinal ?? "") ??
		germanTensOrdinal(token) ??
		indexIn(hebrewOrdinals, token) ??
		indexIn(hebrewFeminineOrdinals, token) ??
		hebrewNumber(token)
	);
}
