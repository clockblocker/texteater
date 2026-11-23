import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderNote } from "../src/notes";
import { hebrewReadingNote } from "./support/hebrew-note";

test("failed segmentation keeps the Hebrew definition's language and automatic text direction", () => {
	const note = hebrewReadingNote();
	const plain = renderToStaticMarkup(renderNote({ noteData: note }));
	const failed = renderToStaticMarkup(
		renderNote({
			noteData: {
				...note,
				definitionText: {
					state: "Failed",
					failureMessage: "Definition segmentation failed.",
				},
			},
		}),
	);
	const definition =
		/<div[^>]*lang="he"[^>]*dir="auto"[^>]*>מבנה המשמש למגורים\.<\/div>/;
	expect(plain).toMatch(definition);
	expect(failed).toMatch(definition);
	expect(failed).toContain('role="alert"');
	expect(failed).toContain("Definition segmentation failed.");
});
