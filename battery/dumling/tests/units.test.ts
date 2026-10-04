import { describe, expect, test } from "bun:test";
import { compileZodValidationArtifacts } from "common-utils/validation-compiler";
import { z } from "zod";
import { registrations } from "../codegen/operations.js";
import { loadRoutes } from "../codegen/routes.js";
import { parseUnit, syncretismView, syncretize } from "../src/index.js";
import { UnitKindSchema } from "../src/schemas/units.js";
import {
	operationTable,
	validationOperations,
} from "../src/validation/operations.js";
import { unitFixtures } from "./unit-fixtures.js";

const routes = await loadRoutes();
const nounRoute = routes.find((route) => route.key === "de/Lexeme/NOUN");
if (!nounRoute) throw Error("Missing German noun route");
const noun = unitFixtures(nounRoute, z);
const nounReading = {
	unitKind: "Reading",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
} as const;
const hebrewNounRoute = routes.find((route) => route.key === "he/Lexeme/NOUN");
if (!hebrewNounRoute) throw Error("Missing Hebrew noun route");
const hebrewNoun = unitFixtures(hebrewNounRoute, z);
function replaced(
	input: unknown,
	path: (string | number)[],
	replacement: unknown,
): unknown {
	if (!path.length) return replacement;
	const root = structuredClone(input) as Record<string | number, unknown>;
	let cursor = root;
	for (const key of path.slice(0, -1))
		cursor = cursor[key] as Record<string | number, unknown>;
	const last = path.at(-1);
	if (last === undefined) return replacement;
	cursor[last] = replacement;
	return root;
}
function* corruptions(
	value: unknown,
	path: (string | number)[] = [],
): Generator<{ path: (string | number)[]; replacement: unknown }> {
	for (const replacement of [undefined, null, "INVALID"])
		yield { path, replacement };
	if (Array.isArray(value)) {
		yield { path, replacement: [] };
		for (let i = 0; i < value.length; i++)
			yield* corruptions(value[i], [...path, i]);
	} else if (value !== null && typeof value === "object") {
		yield { path, replacement: { ...value, unexpected: true } };
		for (const [key, child] of Object.entries(value))
			yield* corruptions(child, [...path, key]);
	}
}
describe("compiled unit interface", () => {
	test("all unit routes preserve canonical outputs and malformed nested acceptance", () => {
		expect(routes).toHaveLength(102);
		for (const route of routes) {
			const fixtures = unitFixtures(route, z);
			for (const kind of UnitKindSchema.options) {
				const schema = route.schemas[kind];
				const fixture = fixtures[kind];
				const valid = schema.safeParse(fixture);
				expect(valid.success, `${kind}/${route.key}`).toBe(true);
				const inputs = [
					fixture,
					...Array.from(corruptions(fixture), (change) =>
						replaced(fixture, change.path, change.replacement),
					),
				];
				for (const input of inputs) {
					const canonical = schema.safeParse(input),
						actual = parseUnit(input);
					expect(
						actual.success,
						`${kind}/${route.key}: ${JSON.stringify(input)}`,
					).toBe(canonical.success);
					if (actual.success && canonical.success)
						expect<unknown>(actual.chain.value).toEqual(
							canonical.data,
						);
				}
			}
		}
	}, 30_000);
	// A Syncretism and its view are German PRON Lemmas too (system ADR 0046).
	test("Syncretisms and their views preserve canonical outputs and malformed nested acceptance", () => {
		const route = routes.find((route) => route.key === "de/Lexeme/PRON");
		if (!route) throw Error("Missing German pronoun route");
		const { Lemma, Surface, Reading, Attestation } = unitFixtures(route, z);
		const cell = (
			canonicalForm: string,
			features: Record<string, string>,
		) => ({
			...Lemma,
			canonicalForm,
			coreFeatures: {
				...(Lemma.coreFeatures as object),
				pronType: "Prs",
				person: "3",
				case: "Acc",
				number: "Plur",
				...features,
			},
		});
		const syncretism = syncretize([
			cell("sie", { number: "Sing", gender: "Fem" }),
			cell("sie", {}),
			cell("Sie", { polite: "Form" }),
		] as never[]) as object;
		const view = syncretismView(syncretism);
		// A pillar cell marks its case in Core, so its Surface marks none.
		const surface = {
			...Surface,
			lemma: syncretism,
			inflectionalFeatures: null,
		};
		const units = {
			Lemma: [syncretism, view],
			Surface: [surface],
			Reading: [{ ...Reading, lemma: view }],
			Attestation: [{ ...Attestation, surface }],
		};
		for (const kind of UnitKindSchema.options)
			for (const fixture of units[kind]) {
				const schema = route.schemas[kind];
				expect(schema.safeParse(fixture).success, kind).toBe(true);
				for (const input of [
					fixture,
					...Array.from(corruptions(fixture), (change) =>
						replaced(fixture, change.path, change.replacement),
					),
				]) {
					const canonical = schema.safeParse(input),
						actual = parseUnit(input);
					expect(
						actual.success,
						`${kind}: ${JSON.stringify(input)}`,
					).toBe(canonical.success);
					if (actual.success && canonical.success)
						expect<unknown>(actual.chain.value).toEqual(
							canonical.data,
						);
				}
			}
	});
	test("returns the selected chain and rejects contradictory expected coordinates", () => {
		const parsed = parseUnit(noun.Lemma, {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(parsed.success).toBe(true);
		if (parsed.success)
			expect<unknown>(parsed.chain).toEqual({
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				value: noun.Lemma,
			});
		expect(
			parseUnit(noun.Lemma, {
				unitKind: "Lemma",
				language: "en",
				family: "Lexeme",
				kind: "NOUN",
			}).success,
		).toBe(false);
		expect(
			parseUnit(noun.Lemma, {
				unitKind: "Reading",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			}).success,
		).toBe(false);
		expect(parseUnit({ ...noun.Surface, language: "en" }).success).toBe(
			false,
		);
		for (const input of [
			null,
			[],
			42,
			{ unitKind: "Unknown" },
			{ ...noun.Lemma, language: Symbol("bad") },
			{ ...noun.Lemma, family: "__proto__" },
			{
				...noun.Lemma,
				family: "Morpheme",
				kind: "ToneMarking",
				coreFeatures: {},
			},
		])
			expect(parseUnit(input).success).toBe(false);
	});
	test("normalizes forms without changing input and validates Emoji Description", () => {
		const input = {
			...noun.Reading,
			emojiDescription: " 🏠 ",
			lemma: { ...noun.Lemma, canonicalForm: " Cafe\u0301 " },
		};
		const parsed = parseUnit(input, nounReading);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.chain.value.lemma.canonicalForm).toBe("Café");
			expect(parsed.chain.value.emojiDescription).toBe("🏠");
		}
		expect(input.lemma.canonicalForm).toBe(" Cafe\u0301 ");
		for (const emojiDescription of ["word", "", "🏠🏠🏠🏠🏠", "🏻"])
			expect(
				parseUnit({ ...noun.Reading, emojiDescription }).success,
			).toBe(false);
		expect(parseUnit({ ...noun.Lemma, canonicalForm: "  " }).success).toBe(
			false,
		);
	});
	test("writes a discontinuous form's open slot as …", () => {
		const adpRoute = routes.find(
			(route) => route.key === "de/Locution/ADP",
		);
		if (!adpRoute) throw Error("Missing German Locution ADP route");
		const lemma = (canonicalForm: string) =>
			({
				unitKind: "Lemma",
				language: "de",
				family: "Locution",
				kind: "ADP",
				canonicalForm,
				coreFeatures: {},
			}) as const;
		const parsed = (canonicalForm: string) => {
			const result = parseUnit(lemma(canonicalForm));
			if (!result.success) throw Error(`Rejected ${canonicalForm}`);
			return result.chain.value;
		};
		expect(parsed("um ... willen")).toEqual(parsed("um … willen"));
		expect(parsed("um ... willen")).toEqual(lemma("um … willen"));
		expect(adpRoute.schemas.Lemma.parse(lemma("um ... willen"))).toEqual(
			lemma("um … willen"),
		);
	});
	test("compares Emoji Descriptions without variation selectors or skin-tone modifiers", () => {
		const description = (emojiDescription: string) => {
			const parsed = parseUnit(
				{ ...noun.Reading, emojiDescription },
				nounReading,
			);
			if (!parsed.success) throw Error(`Rejected ${emojiDescription}`);
			return parsed.chain.value.emojiDescription;
		};
		const schema = nounRoute.schemas.Reading;
		for (const [left, right] of [
			["🖱️", "🖱"],
			["❤", "❤️"],
			["🫳🏽⏸️", "🫳⏸️"],
		] as const) {
			expect(description(left)).toBe(description(right));
			expect(
				schema.parse({ ...noun.Reading, emojiDescription: left }),
			).toEqual(
				schema.parse({ ...noun.Reading, emojiDescription: right }),
			);
		}
		expect(description("🖱️")).toBe("🖱");
		expect(description("🫳🏽⏸️")).toBe("🫳⏸");
		expect(description("👨‍👩‍👧")).toBe("👨‍👩‍👧");
		expect(description("🏠➡️")).not.toBe(description("➡️🏠"));
		for (const emojiDescription of ["🏽", "️", "🏽️"]) {
			expect(
				parseUnit({ ...noun.Reading, emojiDescription }).success,
			).toBe(false);
			expect(
				schema.safeParse({ ...noun.Reading, emojiDescription }).success,
			).toBe(false);
		}
	});
	test("preserves feature refinements and nonempty occurrence members", () => {
		const result = parseUnit({
			...hebrewNoun.Surface,
			inflectionalFeatures: { definite: null, number: null },
		});
		expect(result.success).toBe(false);
		if (!result.success)
			expect(
				result.error.issues.some(
					(issue) =>
						issue.code === "custom" &&
						issue.path.join(".") === "inflectionalFeatures",
				),
			).toBe(true);
		expect(
			parseUnit({ ...noun.Surface, inflectionalFeatures: null }).success,
		).toBe(true);
		expect(
			parseUnit({
				...noun.Surface,
				surfaceFeatures: { historicalStatus: null },
			}).success,
		).toBe(false);
		expect(parseUnit({ ...noun.Attestation, members: [] }).success).toBe(
			false,
		);
	});
	test("routes without inflectional bags omit the Surface field and reject supplied values", () => {
		for (const route of routes.filter(
			(route) => !Object.hasOwn(route.bag.shape, "inflectional"),
		)) {
			const fixtures = unitFixtures(route, z);
			const parsed = parseUnit(fixtures.Surface);
			expect(parsed.success, route.key).toBe(true);
			if (!parsed.success || parsed.chain.unitKind !== "Surface")
				throw Error(route.key);
			expect(
				Object.hasOwn(parsed.chain.value, "inflectionalFeatures"),
			).toBe(false);

			for (const inflectionalFeatures of [
				undefined,
				null,
				{},
				{ case: "Nom" },
			]) {
				const surface = { ...fixtures.Surface, inflectionalFeatures };
				expect(route.schemas.Surface.safeParse(surface).success).toBe(
					false,
				);
				expect(parseUnit(surface).success).toBe(false);
				expect(
					parseUnit({ ...fixtures.Attestation, surface }).success,
				).toBe(false);
			}
		}
	});
	test("a Kind repeats across Families, so the Family is part of the route", () => {
		const lexemeRoute = routes.find(
			(route) => route.key === "de/Lexeme/VERB",
		);
		const locutionRoute = routes.find(
			(route) => route.key === "de/Locution/VERB",
		);
		if (!lexemeRoute || !locutionRoute) throw Error("Missing VERB routes");
		const locution = unitFixtures(locutionRoute, z).Lemma;
		const parsed = parseUnit(locution);
		expect(parsed.success && parsed.chain.family).toBe("Locution");
		expect(
			parseUnit(locution, {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
			}).success,
		).toBe(false);
		// A Lexeme VERB's Core Features do not fit the Locution VERB route.
		expect(
			parseUnit({
				...locution,
				coreFeatures: unitFixtures(lexemeRoute, z).Lemma.coreFeatures,
			}).success,
		).toBe(false);
		expect(parseUnit({ ...locution, family: "Phraseme" }).success).toBe(
			false,
		);
	});
	test("a Saying's Canonical Form keeps internal punctuation and has no final punctuation", () => {
		const sayingRoute = routes.find(
			(route) => route.key === "de/Saying/Saying",
		);
		if (!sayingRoute) throw Error("Missing Saying route");
		const { Lemma, Reading } = unitFixtures(sayingRoute, z);
		for (const canonicalForm of [
			"Wer rastet, der rostet",
			"Sein oder Nichtsein, das ist hier die Frage",
		]) {
			expect(parseUnit({ ...Lemma, canonicalForm }).success).toBe(true);
			expect(
				sayingRoute.schemas.Lemma.safeParse({ ...Lemma, canonicalForm })
					.success,
			).toBe(true);
		}
		for (const canonicalForm of [
			"Wer rastet, der rostet.",
			"Wer rastet, der rostet!",
			"Sein oder Nichtsein?",
		]) {
			expect(parseUnit({ ...Lemma, canonicalForm }).success).toBe(false);
			expect(
				parseUnit({ ...Reading, lemma: { ...Lemma, canonicalForm } })
					.success,
			).toBe(false);
			expect(
				sayingRoute.schemas.Lemma.safeParse({ ...Lemma, canonicalForm })
					.success,
			).toBe(false);
		}
		expect(
			parseUnit({ ...noun.Lemma, canonicalForm: "z.B." }).success,
		).toBe(true);
	});
	test("a Foreign unit has a source language, one Surface and a Reading without an Emoji Description", () => {
		for (const language of ["de", "en", "he"]) {
			const route = routes.find(
				(candidate) => candidate.key === `${language}/Foreign/Foreign`,
			);
			if (!route) throw Error(`Missing ${language} Foreign route`);
			const { Lemma, Surface, Reading, Attestation } = unitFixtures(
				route,
				z,
			);
			const lemma = { ...Lemma, canonicalForm: "whatever" };
			const surface = {
				...Surface,
				lemma,
				normalizedSurface: "whatever",
			};
			for (const sourceLang of ["en", "fr", "grc", "und"])
				expect(
					parseUnit({ ...lemma, coreFeatures: { sourceLang } })
						.success,
				).toBe(true);
			for (const sourceLang of ["EN", "english", "e", "en-GB", null])
				expect(
					parseUnit({ ...lemma, coreFeatures: { sourceLang } })
						.success,
				).toBe(false);
			expect(parseUnit({ ...lemma, coreFeatures: {} }).success).toBe(
				false,
			);
			expect(parseUnit({ ...Reading, lemma }).success).toBe(true);
			expect(
				parseUnit({ ...Reading, lemma, emojiDescription: "🤷" })
					.success,
			).toBe(false);
			expect(parseUnit(surface).success).toBe(true);
			expect(
				parseUnit({
					...Attestation,
					surface,
					members: [{ attested: "watevr", orthography: "Typo" }],
				}).success,
			).toBe(true);
			for (const other of [
				{ ...surface, normalizedSurface: "whatevers" },
				{
					...surface,
					spelling: { kind: "Variant", variantTags: ["Expressive"] },
				},
				{
					...surface,
					surfaceFeatures: { historicalStatus: "Archaic" },
				},
				{ ...surface, inflectionalFeatures: null },
			])
				expect(parseUnit(other).success).toBe(false);
			expect(
				parseUnit({ ...lemma, family: "Lexeme", kind: "X" }).success,
			).toBe(false);
		}
	});
	test("compilation rejects unregistered custom behavior", () => {
		expect(() =>
			compileZodValidationArtifacts({
				schemas: { unit: nounRoute.schemas.Surface },
				operations: [],
			}),
		).toThrow();
		expect(() =>
			compileZodValidationArtifacts({
				schemas: {
					custom: z.string().refine((value) => value.length === 7),
				},
				operations: registrations,
			}),
		).toThrow();
	});
	test("the runtime runs exactly the operations codegen registers", () => {
		expect(Object.keys(validationOperations).sort()).toEqual(
			operationTable.map(({ name }) => name).sort(),
		);
		expect(registrations).toBe(operationTable);
	});
});
