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
	"gender[psor]": null,
	referenceNumber: null,
};
function lemma(
	canonicalForm: string,
	features: Partial<Record<keyof typeof core, string | null>>,
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
test("personal and possessive genders stay independent", () => {
	accepts(
		lemma("sie", {
			pronType: "Prs",
			person: "3",
			referenceNumber: "Sing",
			number: "Sing",
			gender: "Fem",
			case: "Nom",
		}),
		true,
	);
	for (const gender of ["Masc", "Neut"])
		accepts(
			lemma(gender === "Masc" ? "seiner" : "seines", {
				pronType: "Prs",
				person: "3",
				referenceNumber: "Sing",
				number: "Sing",
				poss: "Yes",
				gender,
				"gender[psor]": "Masc",
				case: "Nom",
			}),
			true,
		);
	accepts(
		lemma("ihres", {
			pronType: "Prs",
			person: "3",
			referenceNumber: "Sing",
			number: "Sing",
			poss: "Yes",
			gender: "Neut",
			"gender[psor]": "Fem",
			case: "Nom",
		}),
		true,
	);
});
test("unmarked and inapplicable features have explicit behavior", () => {
	accepts(
		lemma("ich", {
			pronType: "Prs",
			person: "1",
			referenceNumber: "Sing",
			case: "Nom",
		}),
		true,
	);
	accepts(
		lemma("ich", {
			pronType: "Prs",
			person: "1",
			referenceNumber: "Sing",
			gender: "Fem",
		}),
		false,
	);
	accepts(lemma("wer", { pronType: "Int", "gender[psor]": "Fem" }), false);
	accepts(
		lemma("unsere", {
			pronType: "Prs",
			poss: "Yes",
			person: "1",
			referenceNumber: "Plur",
			"gender[psor]": "Masc",
		}),
		false,
	);
	accepts(
		lemma("die", { pronType: "Dem", number: "Plur", gender: "Fem" }),
		false,
	);
	accepts(lemma("jemand", { pronType: "Ind", case: "Nom" }), true);
});
test("same spelling preserves Case and subtype identity", () => {
	const acc = lemma("uns", {
		pronType: "Prs",
		person: "1",
		referenceNumber: "Plur",
		case: "Acc",
	});
	const dat = lemma("uns", {
		pronType: "Prs",
		person: "1",
		referenceNumber: "Plur",
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
	accepts(
		{
			...lemma("sie", {}),
			coreFeatures: { ...core, referenceGender: "Fem" },
		},
		false,
	);
	const value = {
		unitKind: "Surface",
		language: "de",
		lemma: lemmaSchema.parse(lemma("mir", { case: "Dat" })),
		normalizedSurface: "mir",
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: { reflex: null, gender: "Fem" },
	};
	expect(surfaceSchema.safeParse(value).success).toBe(false);
	expect(parseUnit(value).success).toBe(false);
});
