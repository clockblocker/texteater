import { expect, test } from "bun:test";
import { parseUnit } from "dumling";

// he19-elderly-adjective-raw-luna-4.json. Its grammatical indefinite
// analysis is sound, but Ind is not an ADJ enum in the current contract.
const frozenAdjective = {
	unitKind: "Surface",
	language: "he",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm: "זקן",
		coreFeatures: { abbr: null },
	},
	normalizedSurface: "זקן",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: { definite: "Ind", gender: "Masc", number: "Sing" },
};

test("frozen he19 adjective Ind is invalid in the actual supplied schema", () => {
	const parsed = parseUnit(frozenAdjective);
	expect(parsed.success).toBe(false);
	if (parsed.success) throw Error("Ind is not an ADJ definiteness value");
	expect(parsed.error.message).toContain("Cons");
	expect(parsed.error.message).toContain("Def");
});

test("unmarked ADJ definiteness uses null while preserving masculine singular features", () => {
	const parsed = parseUnit({
		...frozenAdjective,
		inflectionalFeatures: {
			...frozenAdjective.inflectionalFeatures,
			definite: null,
		},
	});
	expect(parsed.success).toBe(true);
	if (!parsed.success || parsed.chain.unitKind !== "Surface")
		throw Error("Expected valid adjective Surface");
	expect(parsed.chain.value).toMatchObject({
		inflectionalFeatures: {
			definite: null,
			gender: "Masc",
			number: "Sing",
		},
	});
});
