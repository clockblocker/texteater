import { describe, expect, it } from "bun:test";
import {
	dumling,
	readingFingerprint as rootReadingFingerprint,
} from "../../../src";
import {
	buildIdOperations,
	readingFingerprint as idReadingFingerprint,
} from "../../../src/id";
import { readingFingerprint as readingEntrypointFingerprint } from "../../../src/reading";
import {
	englishWalkInflectionSurface,
	englishWalkLemma,
	germanMasculineSeeLemma,
} from "../../helpers";

describe("lean identity codec entrypoint", () => {
	it("preserves root CSV, base64url, decode, and error behavior", () => {
		const lean = buildIdOperations("en", dumling.en.parse);
		for (const entity of [englishWalkLemma, englishWalkInflectionSurface]) {
			const rootCsv = dumling.en.id.encode.asCsv(entity);
			const leanCsv = lean.encode.asCsv(entity);
			expect(leanCsv).toBe(rootCsv);
			expect(lean.encode.asBase64Url(entity)).toBe(
				dumling.en.id.encode.asBase64Url(entity),
			);
			expect(lean.decode.any(leanCsv)).toEqual(
				dumling.en.id.decode.any(rootCsv),
			);
		}

		const germanId = dumling.de.id.encode.asBase64Url(
			germanMasculineSeeLemma,
		);
		expect(lean.decode.any(germanId)).toEqual(
			dumling.en.id.decode.any(germanId),
		);
		expect(lean.decode.any("not,a,canonical,id")).toEqual(
			dumling.en.id.decode.any("not,a,canonical,id"),
		);
	});

	it("re-exports the exact canonical Reading fingerprint implementation", () => {
		const reading = {
			emojiDescription: "  🚶  ",
			lemma: englishWalkLemma,
		};
		expect(idReadingFingerprint).toBe(readingEntrypointFingerprint);
		expect(idReadingFingerprint(reading)).toBe(
			rootReadingFingerprint(reading),
		);
	});
});
