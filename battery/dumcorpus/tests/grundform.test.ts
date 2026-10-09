import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { dumlingRoutes } from "dumling/codegen";
import { surfaceSchema as determinerSurfaceSchema } from "dumling/schema/de/lexeme/determiner";
import type * as Dumling from "dumling/types";
import { z } from "zod";
import { GrundformAssessmentError } from "../src/grundform/result.js";
import { checkIfGrundform } from "../src/inventories.js";

type Surface = Dumling.Surface;
type Bag = Record<string, unknown>;
interface Shape {
	anyOf?: Shape[];
	const?: unknown;
	enum?: unknown[];
	items?: Shape;
	properties?: Record<string, Shape>;
	type?: string;
}
/** The first value a JSON Schema allows, preferring a non-null one. */
function example(shape: Shape): unknown {
	if (shape.anyOf)
		return example(
			shape.anyOf.find((option) => option.type !== "null") ??
				shape.anyOf[0] ??
				{},
		);
	if ("const" in shape) return shape.const;
	if (shape.enum) return shape.enum[0];
	if (shape.type === "object")
		return Object.fromEntries(
			Object.entries(shape.properties ?? {}).map(([key, value]) => [
				key,
				example(value),
			]),
		);
	if (shape.type === "array") return [example(shape.items ?? {})];
	if (shape.type === "null") return null;
	if (shape.type === "boolean") return true;
	if (shape.type === "number" || shape.type === "integer") return 1;
	return "example";
}
/**
 * A route's Core and inflection as its Surface schema first allows them,
 * adjusted where the first values break a cross-feature check.
 */
function exampleBags(key: string, surfaceSchema: z.ZodType) {
	const shape = z.toJSONSchema(surfaceSchema, {
		io: "input",
		unrepresentable: "any",
	}) as Shape;
	const core = example(
		shape.properties?.lemma?.properties?.coreFeatures ?? {},
	) as Bag;
	const inflection = shape.properties?.inflectionalFeatures;
	const inflectional = inflection
		? (example(inflection) as Bag | null)
		: undefined;
	if (key === "de/Lexeme/PRON")
		for (const feature of Object.keys(core)) core[feature] = null;
	// A Foreign unit's source language is an ISO 639 code (ADR 0045).
	if (key.endsWith("/Foreign/Foreign")) core.sourceLang = "en";
	// The first German number value is plural, whose agreement has no gender.
	if (key === "de/Lexeme/DET") core.gender = null;
	// A German PART names exactly one type (partType Inf here).
	if (key === "de/Lexeme/PART") core.polarity = null;
	if (inflectional) {
		// A DET or PRON Locution's first number value is plural too.
		if (key === "de/Locution/DET" || key === "de/Locution/PRON")
			inflectional.gender = null;
		// A Paradigm Cell coordinate is marked in Core or on the Surface,
		// never both. The PRON sample Core is unmarked, so it is no
		// possessive and its Surface marks the case.
		if (key === "de/Lexeme/DET" || key === "de/Lexeme/PRON")
			Object.assign(inflectional, {
				...(key === "de/Lexeme/DET" ? { case: null } : {}),
				gender: null,
				number: null,
			});
		if (key === "de/Lexeme/PRON")
			Object.assign(inflectional, {
				"gender[psor]": null,
				"number[psor]": null,
			});
		// Only a singular whose Lemma has no gender marks gender on the Surface.
		if (key === "de/Lexeme/NOUN" || key === "de/Lexeme/PROPN")
			inflectional.gender = null;
		if (
			["de/Lexeme/VERB", "de/Lexeme/AUX", "de/Locution/VERB"].includes(
				key,
			)
		)
			inflectional.expletive = null;
	}
	return { core, inflectional };
}
const routes = await Promise.all(
	dumlingRoutes.map(async ({ language, family, kind, schemaPath }) => {
		const key = `${language}/${family}/${kind}`;
		const { surfaceSchema } = (await import(
			`dumling/schema/${schemaPath}`
		)) as { surfaceSchema: z.ZodType };
		return {
			key,
			language,
			family,
			kind,
			...exampleBags(key, surfaceSchema),
		};
	}),
);
function surface(
	key: string,
	options: {
		form?: string;
		canonical?: string;
		spelling?: Surface["spelling"];
		core?: Bag;
		features?: Bag | null;
	} = {},
): Surface {
	const route = routes.find((candidate) => candidate.key === key);
	if (!route) throw Error(key);
	const { language, family, kind, core, inflectional } = route;
	const features = "features" in options ? options.features : inflectional;
	const result = parseUnit({
		unitKind: "Surface",
		language,
		normalizedSurface: options.form ?? options.canonical ?? "example",
		spelling: options.spelling ?? { kind: "Canonical" },
		surfaceFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language,
			family,
			kind,
			canonicalForm: options.canonical ?? "example",
			coreFeatures: { ...core, ...options.core },
		},
		...(inflectional === undefined
			? {}
			: {
					inflectionalFeatures:
						(key === "de/Lexeme/NOUN" ||
							key === "de/Lexeme/PROPN") &&
						features
							? { gender: null, ...features }
							: features,
				}),
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
					features: { ...features, gender: "Masc" },
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
					features: { number: ["Plur", "Sing"], definite: "Ind" },
				}),
			).issues[0]?._tag,
		).toBe("AmbiguousFeatures");
		expect(
			errorOf(
				surface("he/Lexeme/NOUN", {
					features: { number: ["Dual", "Plur"], definite: "Ind" },
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

// German determiners: each article cell is its own Lemma, and a stem Lemma
// marks its cell on the Surface (system ADR 0044).
const determinerCore = {
	case: null,
	gender: null,
	number: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};
function determiner(
	canonicalForm: string,
	features: Partial<Record<keyof typeof determinerCore, string | null>>,
) {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm,
		coreFeatures: { ...determinerCore, ...features },
	};
}
const article = { pronType: "Art" };
const dieser = determiner("dieser", { pronType: "Dem" });
function stemSurface(
	normalizedSurface: string,
	inflectionalFeatures: Record<string, string | null> | null,
	source: ReturnType<typeof determiner> = dieser,
) {
	return {
		unitKind: "Surface",
		language: "de",
		lemma: source,
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: inflectionalFeatures && {
			case: null,
			degree: null,
			gender: null,
			"gender[psor]": null,
			number: null,
			"number[psor]": null,
			...inflectionalFeatures,
		},
	};
}

test("a cell Surface spelled as its Lemma is Grundform without inflection", () => {
	const den = determiner("den", {
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
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: null,
	};
	expect(determinerSurfaceSchema.safeParse(surface).success).toBe(true);
	const parsed = determinerSurfaceSchema.parse(surface);
	expect(checkIfGrundform(parsed)).toEqual({ success: true, value: true });
});

test("a stem Lemma's Grundform is its Nom.Masc.Sg or plural-cited Surface", () => {
	const grundform = (value: unknown) =>
		checkIfGrundform(determinerSurfaceSchema.parse(value));
	expect(
		grundform(
			stemSurface("dieser", {
				case: "Nom",
				number: "Sing",
				gender: "Masc",
			}),
		),
	).toEqual({ success: true, value: true });
	// dieser is also the Gen.Plur and Dat/Gen.Fem.Sg spelling.
	expect(
		grundform(stemSurface("dieser", { case: "Gen", number: "Plur" })),
	).toEqual({ success: true, value: false });
	expect(
		grundform(
			stemSurface("diesem", {
				case: "Dat",
				number: "Sing",
				gender: "Masc",
			}),
		),
	).toEqual({ success: true, value: false });
	const beide = determiner("beide", { pronType: "Tot" });
	expect(
		grundform(stemSurface("beide", { case: "Nom", number: "Plur" }, beide)),
	).toEqual({ success: true, value: true });
	const viel = determiner("viel", { pronType: "Ind" });
	expect(grundform(stemSurface("viel", null, viel))).toEqual({
		success: true,
		value: true,
	});
});

describe("Grundform spelling", () => {
	test("compares the Surface with its Canonical Form without case", () => {
		const surface = (normalizedSurface: string) =>
			({
				unitKind: "Surface",
				language: "de",
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "INTJ",
					canonicalForm: "LOL",
					coreFeatures: { partType: null },
				},
				normalizedSurface,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
			}) satisfies Dumling.Surface<"de", "Lexeme", "INTJ">;
		expect(checkIfGrundform(surface("lol"))).toEqual({
			success: true,
			value: true,
		});
		expect(checkIfGrundform(surface("lool"))).toEqual({
			success: true,
			value: false,
		});
	});
});
