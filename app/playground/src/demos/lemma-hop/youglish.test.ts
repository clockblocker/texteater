import { describe, expect, test } from "bun:test";
import { youglishHref, youglishLabel } from "./youglish";

describe("youglishHref", () => {
	test("drops a German noun's article and names the language", () => {
		expect(youglishHref("das Komma", "de")).toBe(
			"https://youglish.com/pronounce/Komma/german",
		);
		expect(youglishLabel("das Komma", "de")).toBe("Hear Komma on YouGlish");
	});

	test("encodes umlauts, spaces and Hebrew", () => {
		expect(youglishHref("Dämmerung", "de")).toBe(
			"https://youglish.com/pronounce/D%C3%A4mmerung/german",
		);
		expect(youglishHref("zu Hause", "de")).toBe(
			"https://youglish.com/pronounce/zu%20Hause/german",
		);
		expect(youglishHref("ללכת", "he")).toBe(
			`https://youglish.com/pronounce/${encodeURIComponent("ללכת")}/hebrew`,
		);
	});
});
