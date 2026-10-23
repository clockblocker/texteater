import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { attestationPluralOnlyIssues } from "../src/de/check-plural-only.js";
import { loadSpecRecords } from "../src/index.js";
import { germanFreeGenderNouns } from "../src/inventories/de/free-gender-nouns.js";
import { germanPluralOnlyNouns } from "../src/inventories/de/plural-only-nouns.js";
import {
	germanFreeGenderNoun,
	isGermanPluralOnlyNoun,
} from "../src/inventories.js";

describe("plural-only nouns", () => {
	const noun = (
		canonicalForm: string,
		gender: string | null,
		surfaceGender: string | null,
	) => {
		const parsed = parseUnit({
			unitKind: "Attestation",
			members: [{ attested: canonicalForm, orthography: "Standard" }],
			realizationCoverage: "Full",
			articleEvidence: null,
			valencyEvidence: [],
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: canonicalForm,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: "Nom",
					gender: surfaceGender,
					number: "Plur",
				},
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm,
					coreFeatures: { gender },
				},
			},
		});
		if (
			!parsed.success ||
			parsed.chain.unitKind !== "Attestation" ||
			parsed.chain.language !== "de"
		)
			throw Error(`Expected a NOUN Attestation of ${canonicalForm}`);
		return parsed.chain.value;
	};

	test("each listed Pluraletantum cites its Duden page, once", () => {
		const nouns = germanPluralOnlyNouns.map(({ noun }) => noun);
		expect(new Set(nouns).size).toBe(nouns.length);
		for (const { source } of germanPluralOnlyNouns)
			expect(source).toStartWith("https://www.duden.de/rechtschreibung/");
		expect(isGermanPluralOnlyNoun("leute")).toBe(true);
		expect(isGermanPluralOnlyNoun("Lebensmittel")).toBe(false);
	});

	test("a plural-only noun has gender null in its Core and on its Surface", () => {
		expect(attestationPluralOnlyIssues(noun("Kosten", null, null))).toEqual(
			[],
		);
		expect(
			attestationPluralOnlyIssues(noun("Kosten", "Fem", null)).map(
				({ path }) => path,
			),
		).toEqual(["surface.lemma.coreFeatures.gender"]);
		// A noun with a singular keeps its gender.
		expect(
			attestationPluralOnlyIssues(noun("Lebensmittel", "Neut", null)),
		).toEqual([]);
	});
});

describe("German nouns in free gender variation (Rule de/noun-gender-in-free-variation)", () => {
	/** Every German NOUN Lexeme a record names whose gender is mixed, anywhere in it. */
	const mixedNouns = () => {
		const found = new Map<string, string>();
		const walk = (value: unknown): void => {
			if (Array.isArray(value)) {
				for (const item of value) walk(item);
				return;
			}
			if (typeof value !== "object" || value === null) return;
			const record: Readonly<Record<string, unknown>> =
				Object.fromEntries(Object.entries(value));
			const core = record.coreFeatures;
			const gender =
				typeof core === "object" && core !== null && "gender" in core
					? core.gender
					: undefined;
			if (
				record.unitKind === "Lemma" &&
				record.language === "de" &&
				record.family === "Lexeme" &&
				record.kind === "NOUN" &&
				typeof gender === "object" &&
				gender !== null
			)
				found.set(String(record.canonicalForm), JSON.stringify(gender));
			for (const child of Object.values(record)) walk(child);
		};
		walk(loadSpecRecords());
		return found;
	};

	test("each listed noun cites its Duden page, once, with its genders in catalog order", () => {
		const nouns = germanFreeGenderNouns.map(({ noun }) => noun);
		expect(new Set(nouns).size).toBe(nouns.length);
		for (const { source, gender } of germanFreeGenderNouns) {
			expect(source).toStartWith("https://www.duden.de/rechtschreibung/");
			const members: readonly string[] = gender.mixed;
			expect(members).toEqual([...new Set(members)].sort());
			expect(members.length).toBeGreaterThan(1);
		}
		expect(germanFreeGenderNoun("cola")?.gender).toEqual({
			mixed: ["Fem", "Neut"],
		});
		expect(germanFreeGenderNoun("See")).toBeUndefined();
	});

	test("every mixed noun in the records is listed with the same genders", () => {
		const recorded = mixedNouns();
		expect([...recorded.keys()].sort()).toEqual([
			"Balg",
			"Coca-Cola",
			"Cola",
		]);
		for (const [noun, gender] of recorded)
			expect(JSON.stringify(germanFreeGenderNoun(noun)?.gender)).toBe(
				gender,
			);
	});
});
