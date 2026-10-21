import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderNote } from "../src/notes";
import { ReaderSentence } from "../src/views/reader-sentence";
import { hebrewReadingNote } from "./support/hebrew-note";

test("clickable target-language sentences keep their language and automatic text direction", () => {
	for (const language of ["he", "de"]) {
		const markup = renderToStaticMarkup(
			<ReaderSentence
				sentence={{
					sentenceId: "sentence",
					language,
					stitchedText: language === "he" ? "בַּיִת." : "Haus.",
					segments: [],
				}}
				selectedSegmentKey={null}
				onSegmentClick={() => {}}
			/>,
		);
		expect(markup).toContain(`lang="${language}"`);
		expect(markup).toContain('dir="auto"');
	}
});

test("a Hebrew definition and real source quote set direction without reversing UI labels", () => {
	const markup = renderToStaticMarkup(
		renderNote({ noteData: hebrewReadingNote() }),
	);
	expect(markup).toMatch(/data-slot="quote"[^>]*dir="auto"/);
	expect(markup).toMatch(
		/<p[^>]*lang="he"[^>]*dir="auto"[^>]*>מבנה המשמש למגורים\.<\/p>/,
	);
});
