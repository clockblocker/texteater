import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { completions } from "prinfer";

import type { LemmaFamilyForSurfaceKind } from "../../src/types";

export type asda = LemmaFamilyForSurfaceKind<"">;

describe("Dumling language autocomplete", () => {
	it("suggests supported languages for an empty language argument", () => {
		const file = fileURLToPath(import.meta.url);
		const source = readFileSync(file, "utf8");
		const marker = 'LemmaFamilyForSurfaceKind<"">';
		const markerOffset = source.indexOf(marker);
		const cursorOffset = markerOffset + marker.indexOf('""') + 1;
		const sourceBeforeCursor = source.slice(0, cursorOffset);
		const line = sourceBeforeCursor.split("\n").length;
		const column = cursorOffset - sourceBeforeCursor.lastIndexOf("\n");

		const suggestions = completions(file, line, column).entries.map(
			({ name }) => name,
		);

		expect(suggestions).toEqual(["de", "en", "he"]);
	});
});
