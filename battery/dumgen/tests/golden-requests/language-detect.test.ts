import { test } from "bun:test";
import type { DetectLanguagesInput } from "../../src/language/detect.js";
import { expectGolden, type JevAnswerer, recorded } from "./support.js";

/** jev's pick per Sentence, by its text; a Sentence not here is Unknown. */
const languages: Readonly<Record<string, string>> = {
	"Lies den Text.": "German",
	"Read the text.": "English",
	"Je ne sais pas.": "Other",
	"Er sagte שלום.": "German",
	"Er kam.": "German",
	"He came.": "English",
};

const byText: JevAnswerer = ({ state, question }) => {
	const sentences = state.sentences as readonly string[];
	const index = Number(
		/`sentences\[(\d+)\]`/u.exec(String(question.instructions))?.[1],
	);
	return languages[sentences[index] ?? ""] ?? "Unknown";
};

const detect = (paragraphs: readonly (readonly string[])[]) => {
	const input: DetectLanguagesInput = {
		paragraphs: paragraphs.map((sentences) => ({ sentences })),
	};
	return recorded((dumgen) => dumgen.language.detect(input), {
		jev: byText,
	});
};

test("language.detect sends the golden requests", async () => {
	await expectGolden("language-detect", {
		// Code settles Hebrew and letterless Sentences; jev judges the rest,
		// and surroundings fill what neither placed, across paragraphs.
		mixed: await detect([
			["Lies den Text.", "Read the text.", "Hm."],
			["אני גר ב-Tel Aviv.", "1984.", "Er sagte שלום."],
			["Je ne sais pas.", "»Hm.«"],
			["Er kam.", "—", "He came."],
		]),
		// 31 Sentences go out in two even windows.
		windows: await detect([
			Array.from({ length: 31 }, (_, index) =>
				index % 2 === 0 ? `Satz ${index}.` : "Er kam.",
			),
		]),
	});
});
