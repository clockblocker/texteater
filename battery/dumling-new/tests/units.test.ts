import { describe, expect, test } from "bun:test";
import { compileZodValidationArtifacts } from "codegen";
import { z } from "zod";
import { registrations } from "../codegen/operations.js";
import { loadRoutes } from "../codegen/routes.js";
import { parseUnit, UnitKind } from "../src/index.js";
import { unitFixtures } from "./unit-fixtures.js";

const routes = await loadRoutes();
const nounRoute = routes.find((route) => route.key === "de/Lexeme/NOUN");
if (!nounRoute) throw Error("Missing German noun route");
const noun = unitFixtures(nounRoute, z);
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
		expect(routes).toHaveLength(99);
		for (const route of routes) {
			const fixtures = unitFixtures(route, z);
			for (const kind of Object.values(UnitKind)) {
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
		const parsed = parseUnit(input);
		expect(parsed.success).toBe(true);
		if (parsed.success && parsed.chain.unitKind === "Reading") {
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
	test("preserves feature refinements and nonempty occurrence members", () => {
		const result = parseUnit({
			...noun.Surface,
			inflectionalFeatures: { case: null, number: null },
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
});
