import { expect, test } from "bun:test";
import { numeralWord } from "../../src/resolve/de/numeral.js";

test("digits spell their German numeral word, a year from 1100 to 1999 in hundreds", () => {
	expect(numeralWord("7")).toBe("sieben");
	expect(numeralWord("1")).toBe("eins");
	expect(numeralWord("12")).toBe("zwölf");
	expect(numeralWord("21")).toBe("einundzwanzig");
	expect(numeralWord("73")).toBe("dreiundsiebzig");
	expect(numeralWord("101")).toBe("einhunderteins");
	expect(numeralWord("1987")).toBe("neunzehnhundertsiebenundachtzig");
	expect(numeralWord("1900")).toBe("neunzehnhundert");
	expect(numeralWord("1050")).toBe("eintausendfünfzig");
	expect(numeralWord("2024")).toBe("zweitausendvierundzwanzig");
	expect(numeralWord("31000")).toBe("einunddreißigtausend");
	expect(numeralWord("007")).toBeUndefined();
	expect(numeralWord("3,5")).toBeUndefined();
});
