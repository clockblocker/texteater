import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { lemmaSchema, surfaceSchema } from "dumling/schema/de/lexeme/pronoun";

const core = {
	case: null,
	number: null,
	extPos: null,
	foreign: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
	gender: null,
};
function lemma(
	canonicalForm: string,
	features: Partial<Record<keyof typeof core, unknown>>,
) {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm,
		coreFeatures: { ...core, ...features },
	};
}
function accepts(value: unknown, expected: boolean) {
	expect(lemmaSchema.safeParse(value).success).toBe(expected);
	expect(parseUnit(value).success).toBe(expected);
}
const bag = {
	case: null,
	gender: null,
	number: null,
	"gender[psor]": null,
	"number[psor]": null,
	reflex: null,
};
function surface(
	lemmaValue: ReturnType<typeof lemma>,
	features: Partial<Record<keyof typeof bag, unknown>>,
) {
	return {
		unitKind: "Surface",
		language: "de",
		lemma: lemmaValue,
		normalizedSurface: lemmaValue.canonicalForm,
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: { ...bag, ...features },
	};
}
function acceptsSurface(value: unknown, expected: boolean) {
	expect(surfaceSchema.safeParse(value).success).toBe(expected);
	expect(parseUnit(value).success).toBe(expected);
}
const thirdSingular = {
	pronType: "Prs",
	person: "3",
	number: "Sing",
} as const;

test("ihm and seiner keep er's and es's gender apart, never a set", () => {
	accepts(
		lemma("sie", { ...thirdSingular, gender: "Fem", case: "Nom" }),
		true,
	);
	for (const [form, grammaticalCase] of [
		["ihm", "Dat"],
		["seiner", "Gen"],
	] as const) {
		for (const gender of ["Masc", "Neut"])
			accepts(
				lemma(form, { ...thirdSingular, gender, case: grammaticalCase }),
				true,
			);
		accepts(
			lemma(form, {
				...thirdSingular,
				gender: ["Masc", "Neut"],
				case: grammaticalCase,
			}),
			false,
		);
	}
	accepts(
		lemma("dem", {
			pronType: "Dem",
			number: "Sing",
			gender: ["Masc", "Neut"],
			case: "Dat",
		}),
		false,
	);
});
test("possessor features describe a possessive's Surface, not its Lemma", () => {
	const seiner = lemma("seiner", {
		pronType: "Prs",
		poss: "Yes",
		person: "3",
	});
	accepts(seiner, true);
	acceptsSurface(
		surface(seiner, {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
			"gender[psor]": ["Masc", "Neut"],
			"number[psor]": "Sing",
		}),
		true,
	);
	acceptsSurface(
		surface(lemma("mir", { ...thirdSingular, person: "1", case: "Dat" }), {
			"number[psor]": "Sing",
		}),
		false,
	);
	accepts(
		{
			...seiner,
			coreFeatures: { ...seiner.coreFeatures, "gender[psor]": "Masc" },
		},
		false,
	);
});
test("unmarked and inapplicable features have explicit behavior", () => {
	accepts(
		lemma("ich", {
			pronType: "Prs",
			person: "1",
			number: "Sing",
			case: "Nom",
		}),
		true,
	);
	accepts(
		lemma("ich", {
			pronType: "Prs",
			person: "1",
			number: "Sing",
			gender: "Fem",
		}),
		false,
	);
	accepts(
		lemma("die", { pronType: "Dem", number: "Plur", gender: "Fem" }),
		false,
	);
	accepts(lemma("jemand", { pronType: "Ind", case: "Nom" }), true);
});
test("wer and was mark the gender they agree with (ADR 0018, 0032)", () => {
	for (const pronType of ["Int", "Rel"]) {
		accepts(lemma("wer", { pronType, case: "Nom", gender: "Masc" }), true);
		accepts(lemma("was", { pronType, case: "Nom", gender: "Neut" }), true);
		accepts(
			lemma("wessen", {
				pronType,
				extPos: "DET",
				case: "Gen",
				gender: "Masc",
			}),
			true,
		);
	}
	accepts(
		lemma("wer", { pronType: "Int", number: "Plur", gender: "Masc" }),
		false,
	);
});
test("same spelling preserves Case and subtype identity", () => {
	const acc = lemma("uns", {
		pronType: "Prs",
		person: "1",
		number: "Plur",
		case: "Acc",
	});
	const dat = lemma("uns", {
		pronType: "Prs",
		person: "1",
		number: "Plur",
		case: "Dat",
	});
	accepts(acc, true);
	accepts(dat, true);
	expect(lemmaSchema.parse(acc)).not.toEqual(lemmaSchema.parse(dat));
	expect(
		lemmaSchema.parse(
			lemma("der", { pronType: "Dem", case: "Nom", gender: "Masc" }),
		),
	).not.toEqual(
		lemmaSchema.parse(
			lemma("der", { pronType: "Rel", case: "Nom", gender: "Masc" }),
		),
	);
});
test("retired fields are rejected", () => {
	for (const retired of ["referenceGender", "referenceNumber"])
		accepts(
			{
				...lemma("sie", {}),
				coreFeatures: { ...core, [retired]: "Sing" },
			},
			false,
		);
	acceptsSurface(
		{
			...surface(lemma("mir", { case: "Dat" }), { reflex: "Yes" }),
			inflectionalFeatures: {
				...bag,
				reflex: "Yes",
				referenceNumber: "Sing",
			},
		},
		false,
	);
});
