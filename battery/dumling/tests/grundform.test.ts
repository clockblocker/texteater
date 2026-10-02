import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { loadRoutes } from "../codegen/routes.js";
import {
	checkIfGrundform,
	GrundformAssessmentError,
	parseUnit,
} from "../src/index.js";
import type { Surface } from "../src/types.js";
import { unitFixtures } from "./unit-fixtures.js";

const routes = await loadRoutes();
function surface(
	key: string,
	options: {
		form?: string;
		canonical?: string;
		spelling?: Surface["spelling"];
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
		spelling: options.spelling ?? { kind: "Canonical" },
		lemma: {
			...fixture.lemma,
			canonicalForm: options.canonical ?? "example",
			coreFeatures: { ...core, ...options.core },
		},
		...("features" in options
			? {
					inflectionalFeatures:
						(key === "de/Lexeme/NOUN" ||
							key === "de/Lexeme/PROPN") &&
						options.features
							? { gender: null, ...options.features }
							: options.features,
				}
			: {}),
	});
	if (!result.success) throw result.error;
	if (result.chain.unitKind !== "Surface") throw Error("Expected Surface");
	return result.chain.value;
}
/** Whether Dumling accepts the Surface `surface` would build. */
function validates(...args: Parameters<typeof surface>): boolean {
	try {
		surface(...args);
		return true;
	} catch {
		return false;
	}
}
type VariantTags = Extract<
	Surface["spelling"],
	{ kind: "Variant" }
>["variantTags"];
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
		const germanInfinitive = {
			...infinitive,
			expletive: null,
			perfect: null,
			future: null,
			passive: null,
		};
		const value = surface("de/Lexeme/VERB", {
			canonical: "laufen",
			features: germanInfinitive,
		});
		const before = structuredClone(value);
		expect(checkIfGrundform(value)).toEqual({ success: true, value: true });
		expect(value).toEqual(before);
		expect(
			checkIfGrundform(
				surface("de/Lexeme/VERB", {
					canonical: "laufen",
					features: {
						...germanInfinitive,
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
					spelling: { kind: "Variant", variantTags: ["Licensed"] },
					features: { number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("en/Lexeme/NOUN", {
					canonical: "armour",
					form: "armors",
					spelling: { kind: "Variant", variantTags: ["Licensed"] },
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
	test("every Variant is eligible, whatever its tags", () => {
		for (const variantTags of [
			["Licensed"],
			["Historical"],
			["Regional"],
			["Expressive"],
			["Licensed", "Regional"],
			["Historical", "Regional"],
			["Regional", "Expressive"],
		] as const satisfies readonly VariantTags[])
			expect(
				checkIfGrundform(
					surface("de/Lexeme/SCONJ", {
						canonical: "dass",
						form: "daß",
						spelling: { kind: "Variant", variantTags },
					}),
				),
			).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("de/Lexeme/SCONJ", { canonical: "dass", form: "daß" }),
			),
		).toEqual({ success: true, value: false });
	});
	test("Variant tags are distinct, in canonical order, and never Licensed with Historical", () => {
		const variant = (variantTags: readonly string[]) =>
			validates("de/Lexeme/SCONJ", {
				canonical: "dass",
				form: "daß",
				spelling: {
					kind: "Variant",
					variantTags,
				} as Surface["spelling"],
			});
		expect(variant(["Licensed", "Regional", "Expressive"])).toBe(true);
		expect(variant(["Historical", "Regional", "Expressive"])).toBe(true);
		expect(variant([])).toBe(false);
		expect(variant(["Regional", "Regional"])).toBe(false);
		expect(variant(["Regional", "Licensed"])).toBe(false);
		expect(variant(["Expressive", "Regional"])).toBe(false);
		expect(variant(["Licensed", "Historical"])).toBe(false);
		expect(variant(["Licensed", "Historical", "Regional"])).toBe(false);
		expect(variant(["Dialectal"])).toBe(false);
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
	test("a noun's Grundform is its singular nominative, whatever article it takes", () => {
		expect(
			checkIfGrundform(
				surface("de/Lexeme/NOUN", {
					canonical: "Tisch",
					core: { gender: "Masc" },
					features: { case: "Nom", number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("de/Lexeme/NOUN", {
					canonical: "Tisch",
					form: "Tische",
					core: { gender: "Masc" },
					features: { case: "Nom", number: "Plur" },
				}),
			),
		).toEqual({ success: true, value: false });
		expect(
			checkIfGrundform(
				surface("en/Lexeme/NOUN", {
					canonical: "house",
					features: { number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: true });
	});
	test("a proper noun's Core article does not decide its Grundform", () => {
		for (const article of ["Definite", null])
			expect(
				checkIfGrundform(
					surface("de/Lexeme/PROPN", {
						canonical: "Schweiz",
						core: { article, gender: "Fem" },
						features: { case: "Nom", number: "Sing" },
					}),
				),
				String(article),
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
		).toEqual({ success: true, value: true });
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
			errorOf(surface("de/Lexeme/NUM", { features: null })).issues[0]
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
	test("a VERB Locution cites its infinitive", () => {
		const germanInfinitive = {
			...infinitive,
			expletive: null,
			perfect: null,
			future: null,
			passive: null,
		};
		expect(
			checkIfGrundform(
				surface("de/Locution/VERB", {
					canonical: "den Faden verlieren",
					features: germanInfinitive,
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("de/Locution/VERB", {
					canonical: "den Faden verlieren",
					form: "hat den Faden verloren",
					features: {
						...germanInfinitive,
						verbForm: "Fin",
						mood: "Ind",
						number: "Sing",
						person: "3",
						tense: "Pres",
						perfect: "Yes",
					},
				}),
			),
		).toEqual({ success: true, value: false });
		const { voice: _voice, ...english } = infinitive;
		expect(
			checkIfGrundform(
				surface("en/Locution/VERB", {
					canonical: "kick the bucket",
					features: { ...english, voice: null },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("en/Locution/VERB", {
					canonical: "kick the bucket",
					form: "kicked the bucket",
					features: {
						...english,
						verbForm: "Fin",
						mood: "Ind",
						tense: "Past",
						voice: null,
					},
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("a NOUN Locution cites its nominative singular", () => {
		expect(
			checkIfGrundform(
				surface("de/Locution/NOUN", {
					canonical: "weißer Rabe",
					core: { gender: "Masc" },
					features: { case: "Nom", number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("de/Locution/NOUN", {
					canonical: "weißer Rabe",
					form: "weißen Raben",
					core: { gender: "Masc" },
					features: { case: "Dat", number: "Plur" },
				}),
			),
		).toEqual({ success: true, value: false });
		expect(
			checkIfGrundform(
				surface("en/Locution/NOUN", {
					canonical: "walk in the park",
					features: { number: "Sing" },
				}),
			),
		).toEqual({ success: true, value: true });
	});
	test("an ADJ Locution cites its undeclined positive, not an attributive form", () => {
		expect(
			checkIfGrundform(
				surface("de/Locution/ADJ", {
					canonical: "fix und fertig",
					features: {
						degree: "Pos",
						case: null,
						gender: null,
						number: null,
					},
				}),
			),
		).toEqual({ success: true, value: true });
		// die fix und fertigen Läufer
		expect(
			checkIfGrundform(
				surface("de/Locution/ADJ", {
					canonical: "fix und fertig",
					form: "fix und fertigen",
					features: {
						degree: "Pos",
						case: "Nom",
						gender: null,
						number: "Plur",
					},
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("an invariant Locution is Grundform by its spelling", () => {
		const value = surface("de/Locution/INTJ", {
			canonical: "Herzlichen Dank",
		});
		expect("inflectionalFeatures" in value).toBe(false);
		expect(checkIfGrundform(value)).toEqual({ success: true, value: true });
		// A non-comparable ADV Locution marks no Degree (ADR 0042).
		const adverb = { core: { comparable: null }, features: null };
		expect(
			checkIfGrundform(
				surface("de/Locution/ADV", {
					canonical: "ganz und gar",
					...adverb,
				}),
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				surface("de/Locution/ADV", {
					canonical: "ganz und gar",
					form: "ganz und",
					...adverb,
				}),
			),
		).toEqual({ success: true, value: false });
	});
	test("a Saying compares its words only", () => {
		for (const form of [
			"Wer rastet, der rostet",
			"Wer rastet, der rostet!",
			"Wer rastet der rostet.",
			// Case is never grammar (system ADR 0002).
			"wer rastet, der rostet",
		])
			expect(
				checkIfGrundform(
					surface("de/Saying/Saying", {
						canonical: "Wer rastet, der rostet",
						form,
					}),
				),
				form,
			).toEqual({ success: true, value: true });
		for (const form of ["Wer rastet, rostet", "Wer rostet, der rastet"])
			expect(
				checkIfGrundform(
					surface("de/Saying/Saying", {
						canonical: "Wer rastet, der rostet",
						form,
					}),
				),
				form,
			).toEqual({ success: true, value: false });
	});
	describe("comparability decides Degree and Grundform (ADR 0042)", () => {
		const yes = { comparable: "Yes" };
		const no = { comparable: null };
		const agreement = { case: null, gender: null, number: null };
		test("a non-comparable ADV is Grundform by its spelling and marks no Degree", () => {
			for (const [key, canonical] of [
				["de/Lexeme/ADV", "hier"],
				["en/Lexeme/ADV", "here"],
			] as const) {
				expect(
					checkIfGrundform(
						surface(key, { canonical, core: no, features: null }),
					),
				).toEqual({ success: true, value: true });
				expect(
					validates(key, {
						canonical,
						core: no,
						features: { degree: "Pos" },
					}),
				).toBe(false);
			}
		});
		test("a comparable ADV marks Degree and cites its positive", () => {
			for (const [key, canonical, comparative] of [
				["de/Lexeme/ADV", "oft", "öfter"],
				["en/Lexeme/ADV", "fast", "faster"],
			] as const) {
				expect(
					validates(key, { canonical, core: yes, features: null }),
				).toBe(false);
				expect(
					checkIfGrundform(
						surface(key, {
							canonical,
							core: yes,
							features: { degree: "Pos" },
						}),
					),
				).toEqual({ success: true, value: true });
				expect(
					checkIfGrundform(
						surface(key, {
							canonical,
							form: comparative,
							core: yes,
							features: { degree: "Cmp" },
						}),
					),
				).toEqual({ success: true, value: false });
			}
		});
		test("a comparable ADJ cites its positive; without Degree it is rejected", () => {
			expect(
				checkIfGrundform(
					surface("de/Lexeme/ADJ", {
						canonical: "mild",
						core: yes,
						features: { degree: "Pos", ...agreement },
					}),
				),
			).toEqual({ success: true, value: true });
			expect(
				validates("de/Lexeme/ADJ", {
					canonical: "mild",
					core: yes,
					features: null,
				}),
			).toBe(false);
			expect(
				checkIfGrundform(
					surface("en/Lexeme/ADJ", {
						canonical: "fast",
						core: yes,
						features: { degree: "Pos" },
					}),
				),
			).toEqual({ success: true, value: true });
			expect(
				checkIfGrundform(
					surface("en/Lexeme/ADJ", {
						canonical: "fast",
						form: "faster",
						core: yes,
						features: { degree: "Cmp" },
					}),
				),
			).toEqual({ success: true, value: false });
			expect(
				validates("en/Lexeme/ADJ", {
					canonical: "fast",
					core: yes,
					features: null,
				}),
			).toBe(false);
		});
		test("a non-comparable ADJ is Grundform uninflected; an attributive form is not", () => {
			expect(
				checkIfGrundform(
					surface("de/Lexeme/ADJ", {
						canonical: "tot",
						core: no,
						features: null,
					}),
				),
			).toEqual({ success: true, value: true });
			// der tote Mann, den toten Mann
			const attributive = {
				case: "Acc",
				degree: null,
				gender: "Masc",
				number: "Sing",
			};
			expect(
				checkIfGrundform(
					surface("de/Lexeme/ADJ", {
						canonical: "tot",
						form: "toten",
						core: no,
						features: attributive,
					}),
				),
			).toEqual({ success: true, value: false });
			for (const degree of ["Pos", "Cmp"])
				expect(
					validates("de/Lexeme/ADJ", {
						canonical: "tot",
						core: no,
						features: { ...attributive, degree },
					}),
				).toBe(false);
			expect(
				checkIfGrundform(
					surface("en/Lexeme/ADJ", {
						canonical: "dead",
						core: no,
						features: null,
					}),
				),
			).toEqual({ success: true, value: true });
		});
		test("ADV and ADJ Locutions take the same Core Feature and rule", () => {
			expect(
				validates("de/Locution/ADJ", {
					canonical: "fix und fertig",
					core: yes,
					features: null,
				}),
			).toBe(false);
			expect(
				checkIfGrundform(
					surface("de/Locution/ADJ", {
						canonical: "fix und fertig",
						core: no,
						features: null,
					}),
				),
			).toEqual({ success: true, value: true });
			expect(
				checkIfGrundform(
					surface("en/Locution/ADV", {
						canonical: "by and large",
						core: no,
						features: null,
					}),
				),
			).toEqual({ success: true, value: true });
			expect(
				validates("en/Locution/ADV", {
					canonical: "by and large",
					core: no,
					features: { degree: "Pos" },
				}),
			).toBe(false);
		});
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
