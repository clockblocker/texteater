import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import {
	authoredMembers,
	auxiliarySurfaceFeatures,
} from "../src/inventories.js";

test("every AUX Surface-feature entry is an authored AUX member, each once", () => {
	for (const { member } of auxiliarySurfaceFeatures) {
		expect(authoredMembers).toContain(member);
		expect(member.lemma.kind).toBe("AUX");
	}
	expect(
		new Set(auxiliarySurfaceFeatures.map(({ member }) => member)).size,
	).toBe(auxiliarySurfaceFeatures.length);
});

test("each AUX use's features make a German VERB Surface Dumling accepts", () => {
	for (const { member, features } of auxiliarySurfaceFeatures) {
		const surface = {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "wird gemacht",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "machen",
				coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
			},
			inflectionalFeatures: {
				verbForm: "Fin",
				tense: "Pres",
				mood: "Ind",
				person: "3",
				number: "Sing",
				expletive: null,
				perfect: null,
				future: null,
				passive: null,
				voice: null,
				...features,
			},
		};
		expect(
			`${member.lemma.canonicalForm} ${member.reading.emojiDescription}: ${parseUnit(surface).success}`,
		).toBe(
			`${member.lemma.canonicalForm} ${member.reading.emojiDescription}: true`,
		);
	}
});
