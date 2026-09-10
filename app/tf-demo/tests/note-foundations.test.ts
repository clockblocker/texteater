import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { renderNote } from "../src/notes";

test("the root dispatch covers stable kinds and visibly rejects unknown kinds", () => {
	const unavailableTitleFor = {
		Reading: "Reading Note unavailable",
		Lemma: "Lemma Note unavailable",
		Surface: "Surface Note unavailable",
		Attestation: "Attestation Note unavailable",
		Shadow: "Shadow Note unavailable",
	} as const;
	for (const kind of [
		"Reading",
		"Lemma",
		"Surface",
		"Attestation",
		"Shadow",
	] as const) {
		const markup = renderToStaticMarkup(
			renderNote({ noteData: { kind } as never }),
		);
		expect(markup).toContain('role="alert"');
		expect(markup).toContain(unavailableTitleFor[kind]);
	}

	const unknownMarkup = renderToStaticMarkup(
		renderNote({ noteData: { kind: "Resolution" } as never }),
	);
	expect(unknownMarkup).toContain("Unknown Note");
	expect(unknownMarkup).toContain("Unknown Note kind: Resolution.");
});
