import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "dumling";
import {
	lemmaSchema,
	surfaceSchema,
} from "dumling/schema/de/lexeme/determiner";

const core = {
	case: null,
	definite: null,
	extPos: null,
	foreign: null,
	gender: null,
	number: null,
	numType: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};
function lemma(
	canonicalForm: string,
	features: Partial<Record<keyof typeof core, string | null>>,
) {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm,
		coreFeatures: { ...core, ...features },
	};
}
const article = { pronType: "Art", definite: "Def" };

test("each definite article cell is its own Lemma", () => {
	const nominative = lemma("der", {
		...article,
		case: "Nom",
		number: "Sing",
		gender: "Masc",
	});
	const dative = lemma("der", {
		...article,
		case: "Dat",
		number: "Sing",
		gender: "Fem",
	});
	for (const value of [nominative, dative]) {
		expect(lemmaSchema.safeParse(value).success).toBe(true);
		expect(parseUnit(value).success).toBe(true);
	}
	expect(nominative).not.toEqual(dative);
});

test("plural agreement has no marked gender", () => {
	const plural = { ...article, case: "Nom", number: "Plur" };
	expect(lemmaSchema.safeParse(lemma("die", plural)).success).toBe(true);
	expect(
		lemmaSchema.safeParse(lemma("die", { ...plural, gender: "Fem" }))
			.success,
	).toBe(false);
});

test("a cell Surface spelled as its Lemma is Grundform without inflection", () => {
	const den = lemma("den", {
		...article,
		case: "Acc",
		number: "Sing",
		gender: "Masc",
	});
	const surface = {
		unitKind: "Surface",
		language: "de",
		lemma: den,
		normalizedSurface: "den",
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: null,
	};
	expect(surfaceSchema.safeParse(surface).success).toBe(true);
	const parsed = surfaceSchema.parse(surface);
	expect(checkIfGrundform(parsed)).toEqual({ success: true, value: true });
});
