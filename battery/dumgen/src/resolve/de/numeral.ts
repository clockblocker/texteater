/**
 * The German numeral word a number written in digits spells (Rule
 * de/digits-spell-the-numeral): 12 is zwölf, 73 dreiundsiebzig, a year
 * from 1100 to 1999 is spoken in hundreds (neunzehnhundertsiebenundachtzig),
 * from 2000 on as the cardinal (zweitausendvierundzwanzig). Pure code; it
 * spells whole numbers below a million and leaves anything else to Luna.
 */
const ones = [
	"null",
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
];
const tens = [
	"",
	"",
	"zwanzig",
	"dreißig",
	"vierzig",
	"fünfzig",
	"sechzig",
	"siebzig",
	"achtzig",
	"neunzig",
];

/**
 * Every word the speller builds a numeral from: the ones and tens, ein
 * (einundzwanzig, einhundert), hundert and tausend.
 */
export const numeralWords: readonly string[] = [
	...ones,
	...tens.filter((ten) => ten !== ""),
	"ein",
	"hundert",
	"tausend",
];

/** Below 100; `ein` before und and as a prefix of hundert or tausend. */
function belowHundred(value: number, bare: boolean): string {
	if (value < 20) return value === 1 && !bare ? "ein" : (ones[value] ?? "");
	const unit = value % 10;
	const ten = tens[Math.floor(value / 10)] ?? "";
	return unit === 0 ? ten : `${unit === 1 ? "ein" : ones[unit]}und${ten}`;
}

function belowThousand(value: number, bare: boolean): string {
	const hundreds = Math.floor(value / 100);
	const rest = value % 100;
	return `${hundreds > 0 ? `${belowHundred(hundreds, false)}hundert` : ""}${
		rest > 0 ? belowHundred(rest, bare) : ""
	}`;
}

/** The numeral word `digits` spells, or undefined when it is no whole number below a million. */
export function numeralWord(digits: string): string | undefined {
	if (
		!/^\d{1,6}$/u.test(digits) ||
		(digits.length > 1 && digits.startsWith("0"))
	)
		return undefined;
	const value = Number(digits);
	if (value === 0) return "null";
	if (value >= 1100 && value <= 1999 && digits.length === 4)
		return `${belowHundred(Math.floor(value / 100), false)}hundert${
			value % 100 > 0 ? belowHundred(value % 100, true) : ""
		}`;
	const thousands = Math.floor(value / 1000);
	const rest = value % 1000;
	return `${thousands > 0 ? `${belowThousand(thousands, false)}tausend` : ""}${
		rest > 0 ? belowThousand(rest, true) : ""
	}`;
}
