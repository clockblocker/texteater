import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { loadRoutes } from "../codegen/routes.js";
import {
	checkIfGrundform,
	GrundformAssessmentError,
	parseUnit,
	type Surface,
} from "../src/index.js";
import { unitFixtures } from "./unit-fixtures.js";

const routes = await loadRoutes();
function surface(
	key: string,
	options: {
		form?: string;
		canonical?: string;
		spelling?: "Canonical" | "Variant";
		core?: Record<string, unknown>;
		features?: Record<string, unknown> | null;
	} = {},
): Surface {
	const route = routes.find((candidate) => candidate.key === key);
	if (!route) throw Error(key);
	const fixture = unitFixtures(route, z).Surface;
	const core = fixture.lemma.coreFeatures;
	if (core === null || typeof core !== "object")
		throw Error("Expected Core Features object");
	const result = parseUnit({
		...fixture,
		normalizedSurface: options.form ?? options.canonical ?? "example",
		spelling: options.spelling ?? "Canonical",
		lemma: {
			...fixture.lemma,
			canonicalForm: options.canonical ?? "example",
			coreFeatures: { ...core, ...options.core },
		},
		...("features" in options
			? { inflectionalFeatures: options.features }
			: {}),
	});
	if (!result.success) throw result.error;
	if (result.chain.unitKind !== "Surface") throw Error("Expected Surface");
	return result.chain.value;
}
function errorOf(value: Surface) {
	const result = checkIfGrundform(value);
	if (result.success)
		throw Error(`Expected uncertainty, got ${result.value}`);
	expect(result.error).toBeInstanceOf(GrundformAssessmentError);
	return result.error;
}
const infinitive = {
	verbForm: "Inf",
	mood: null,
	number: null,
	person: null,
	tense: null,
	voice: null,
};

describe("Grundform assessment", () => {
	test("uses infinitive features and rejects finite grammar even with identical spelling", () => {
		const value = surface("de/Lexeme/VERB", {
			canonical: "laufen",
			features: infinitive,
		});
		const before = structuredClone(value);
		expect(checkIfGrundform(value)).toEqual({ success: true, value: true });
		expect(value).toEqual(before);
		expect(
			checkIfGrundform(
				surface("de/Lexeme/VERB", {
					canonical: "laufen",
					features: {
						...infinitive,
						verbForm: "Fin",
						mood: "Ind",
						number: "Plur",
						person: "1",
						tense: "Pres",
					},
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("German adjective Grundform is positive and undeclined", () => {
		expect(
			checkIfGrundform(
				surface("de/Lexeme/ADJ", {
					canonical: "schön",
					features: {
						degree: "Pos",
						case: null,
						gender: null,
						number: null,
					},
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("de/Lexeme/ADJ", {
					canonical: "schön",
					features: {
						degree: "Pos",
						case: "Nom",
						gender: "Masc",
						number: "Sing",
					},
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("separates false from missing evidence and reports the exact coordinate", () => {
		const error = errorOf(
			surface("de/Lexeme/NOUN", {
				canonical: "Haus",
				features: { case: null, number: "Sing" },
			}),
		);
		expect(error.route).toEqual({
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(error.canonicalForm).toBe("Haus");
		expect(error.issues).toEqual([
			{
				_tag: "InsufficientFeatures",
				path: ["inflectionalFeatures", "case"],
				expected: ["Nom"],
				received: null,
				message: "Grundform requires evidence for case",
			},
		]);
		expect(
			checkIfGrundform(
				surface("de/Lexeme/NOUN", {
					features: { case: "Nom", number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("de/Lexeme/NOUN", {
					features: { case: "Acc", number: null },
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("a null feature bag does not mean Grundform", () => {
		const error = errorOf(surface("de/Lexeme/VERB", { features: null }));
		expect(
			error.issues.some(
				(issue) =>
					issue.path.join(".") === "inflectionalFeatures.verbForm",
			),
		).toBe(true);
		expect(
			error.issues.every(
				(issue) => issue._tag === "InsufficientFeatures",
			),
		).toBe(true);
	});
	test("accepted spelling variants remain eligible; spelling cannot erase inflection", () => {
		expect(
			checkIfGrundform(
				surface("en/Lexeme/NOUN", {
					canonical: "armour",
					form: "armor",
					spelling: "Variant",
					features: { number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("en/Lexeme/NOUN", {
					canonical: "armour",
					form: "armors",
					spelling: "Variant",
					features: { number: "Plur" },
				}),
			),
		).toEqual({ success: true, value: false });
		expect(
			checkIfGrundform(
				surface("en/Lexeme/NOUN", {
					canonical: "armour",
					form: "armors",
					features: { number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("plural-only English nouns have explicit evidence; German needs a Lemma convention", () => {
		expect(
			checkIfGrundform(
				surface("en/Lexeme/NOUN", {
					canonical: "scissors",
					features: { number: "Ptan" },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			errorOf(
				surface("de/Lexeme/NOUN", {
					canonical: "Eltern",
					features: { case: "Nom", number: "Plur" },
				}),
			).issues[0]?._tag,
		).toBe("LemmaRuleRequired");
		expect(
			checkIfGrundform(
				surface("de/Lexeme/NOUN", {
					canonical: "Eltern",
					features: { case: "Dat", number: "Plur" },
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("German personal case forms use Core identity", () => {
		for (const [canonical, grammaticalCase] of [
			["mir", "Dat"],
			["ich", "Nom"],
			["uns", "Acc"],
			["uns", "Dat"],
		]) {
			expect(
				checkIfGrundform(
					surface("de/Lexeme/PRON", {
						canonical,
						core: { pronType: "Prs", case: grammaticalCase },
						features: null,
					}),
				),
			).toEqual({ success: true, value: true });
		}
	});
	test("Hebrew adjective gender alternatives preserve uncertainty", () => {
		const features = {
			definite: null,
			gender: ["Fem", "Masc"],
			number: "Sing",
		};
		expect(
			errorOf(surface("he/Lexeme/ADJ", { features })).issues[0],
		).toMatchObject({
			_tag: "AmbiguousFeatures",
			path: ["inflectionalFeatures", "gender"],
			expected: ["Masc"],
			received: ["Fem", "Masc"],
		});
		expect(
			checkIfGrundform(
				surface("he/Lexeme/ADJ", {
					features: { ...features, gender: ["Masc"] },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("he/Lexeme/ADJ", {
					features: { ...features, number: "Plur" },
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("Hebrew regular verb citation uses past third-person masculine singular, not Inf", () => {
		const core = { hebBinyan: "PAAL", hebExistential: null };
		const features = {
			definite: null,
			gender: "Masc",
			mood: null,
			number: "Sing",
			person: "3",
			polarity: null,
			tense: "Past",
			verbForm: null,
			voice: "Act",
		};
		expect(
			checkIfGrundform(surface("he/Lexeme/VERB", { core, features })),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("he/Lexeme/VERB", {
					core,
					features: { ...features, tense: "Fut" },
				}),
			),
		).toEqual({ success: true, value: false });
		expect(
			checkIfGrundform(
				surface("he/Lexeme/VERB", {
					core,
					features: { ...features, verbForm: "Inf" },
				}),
			),
		).toEqual({ success: true, value: false });
		expect(
			checkIfGrundform(
				surface("he/Lexeme/VERB", {
					canonical: "יש",
					core: { hebBinyan: null, hebExistential: "Yes" },
					features: null,
				}),
			),
		).toEqual({ success: true, value: true });
	});
	test("Hebrew nouns have their own singular indefinite Grundform features", () => {
		expect(
			checkIfGrundform(
				surface("he/Lexeme/NOUN", {
					features: { number: "Sing", definite: "Ind" },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("he/Lexeme/NOUN", {
					features: { number: "Sing", definite: "Cons" },
				}),
			),
		).toEqual({ success: true, value: false });
		expect(
			checkIfGrundform(
				surface("he/Lexeme/NOUN", {
					features: { number: "Sing", definite: "Def" },
				}),
			),
		).toEqual({ success: true, value: false });
		expect(
			errorOf(
				surface("he/Lexeme/NOUN", {
					features: { number: ["Sing", "Plur"], definite: "Ind" },
				}),
			).issues[0]?._tag,
		).toBe("AmbiguousFeatures");
		expect(
			errorOf(
				surface("he/Lexeme/NOUN", {
					features: { number: ["Plur"], definite: "Ind" },
				}),
			).issues[0]?._tag,
		).toBe("LemmaRuleRequired");
	});
	test("missing features and missing Lemma conventions have different causes", () => {
		expect(
			errorOf(surface("he/Lexeme/NOUN", { features: null })).issues[0]
				?._tag,
		).toBe("InsufficientFeatures");
		expect(
			errorOf(surface("de/Lexeme/DET", { features: null })).issues[0]
				?._tag,
		).toBe("LemmaRuleRequired");
	});
	test("English auxiliaries distinguish ordinary verbs from finite modal citation", () => {
		const { voice: _voice, ...features } = infinitive;
		expect(
			checkIfGrundform(
				surface("en/Lexeme/AUX", { canonical: "be", features }),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("en/Lexeme/AUX", {
					canonical: "can",
					features: { ...features, verbForm: "Fin", tense: "Pres" },
				}),
			),
		).toEqual({ success: true, value: true });
	});
	test("all routes assess without throwing; routes without inflection use form evidence", () => {
		for (const route of routes) {
			const value = surface(route.key);
			expect(() => checkIfGrundform(value), route.key).not.toThrow();
			if (!("inflectionalFeatures" in value)) {
				expect(checkIfGrundform(value), route.key).toEqual({
					success: true,
					value: true,
				});
				expect(
					checkIfGrundform({
						...value,
						normalizedSurface: "different",
					}),
					route.key,
				).toEqual({ success: true, value: false });
			}
		}
	});
});
