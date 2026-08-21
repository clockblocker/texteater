import { describe, expect, test } from "bun:test";
import {
	type Constraint,
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
	type ValidationOperations,
} from "common-utils";
import { z } from "zod";
import {
	compileZodValidationArtifacts,
	ZodValidationCompilationError,
} from "../src";

function normalizeNfc(value: string): string {
	return value.normalize("NFC");
}

function trimText(value: string): string {
	return value.trim();
}

function appendZero(values: number[]): number[] {
	return [...values, 0];
}

function appendOne(values: number[]): number[] {
	return [...values, 1];
}

function twice(value: number): number {
	return value * 2;
}

function plusOne(value: number): number {
	return value + 1;
}

function trimNestedName(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const name = Reflect.get(value, "name");
	return typeof name === "string" ? { ...value, name: name.trim() } : value;
}

function retainNonEmpty(values: string[]): [string, ...string[]] {
	return values as [string, ...string[]];
}

function hasText(value: string): boolean {
	return value.length > 0;
}

function hasTextError(): string {
	return "Text is required";
}

function contextualTextError(issue?: { readonly input?: unknown }): string {
	return typeof issue?.input === "string"
		? "String text required"
		: "Text required";
}

function contextualCheckFor(schema: z.ZodType): (...args: never[]) => unknown {
	const check = schema._zod.def.checks?.[0] as unknown as
		| { readonly _zod: { readonly check?: unknown } }
		| undefined;
	if (typeof check?._zod.check !== "function") {
		throw new Error("Expected a contextual Zod check function.");
	}
	return check._zod.check as (...args: never[]) => unknown;
}

describe("compileZodValidationArtifacts", () => {
	test("lowers an exact registered readonly schema to an ordered operation", () => {
		const inner = z.strictObject({
			nested: z.strictObject({ value: z.string() }),
		});
		const canonical = inner.readonly();
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "readonly",
					name: "example.readonly",
					schema: canonical,
					version: 1,
				},
			],
			schemas: { value: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.value,
			version: 1,
		};
		const parsed = parseValidationArtifact(
			artifact,
			{ nested: { value: "kept" } },
			{
				"example.readonly": (value) => ({
					value: Object.freeze(value),
				}),
			},
		);
		if (parsed instanceof ParsingError) throw parsed;
		expect(parsed).toEqual(canonical.parse({ nested: { value: "kept" } }));
		expect(Object.isFrozen(parsed)).toBe(true);
		expect(Object.isFrozen(parsed.nested)).toBe(false);
		expect(compiled.requiredOperations).toEqual(["example.readonly"]);
		expect(compiled.operationSignatures).toEqual({
			"example.readonly": { version: 1 },
		});

		expect(() =>
			compileZodValidationArtifacts({
				operations: [],
				schemas: { value: canonical },
			}),
		).toThrow(/readonly.*explicitly named operation/u);
		expect(() =>
			compileZodValidationArtifacts({
				operations: [
					{
						construct: "readonly",
						name: "example.readonly",
						schema: inner.readonly(),
						version: 1,
					},
				],
				schemas: { value: canonical },
			}),
		).toThrow(/readonly.*explicitly named operation/u);
	});

	test("compiles safe nonnegative integers with exact diagnostics", () => {
		const canonical = z.number().int().nonnegative();
		const compiled = compileZodValidationArtifacts({
			operations: [],
			schemas: { value: canonical },
		});
		const artifact: ValidationArtifact<number> = {
			definitions: compiled.definitions,
			root: compiled.roots.value,
			version: 1,
		};
		for (const input of [0, 3, -1, 1.5, Number.MAX_VALUE, "1"]) {
			const expected = canonical.safeParse(input);
			const actual = parseValidationArtifact(artifact, input);
			if (expected.success) expect(actual).toEqual(expected.data);
			else {
				expect(actual).toBeInstanceOf(ParsingError);
				if (!(actual instanceof ParsingError))
					throw new Error("expected failure");
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}

		const customized = z.number().int({ error: "Whole only" });
		expect(() =>
			compileZodValidationArtifacts({
				operations: [],
				schemas: { value: customized },
			}),
		).toThrow(/error customization/u);
	});

	test("embeds string bounds so invalid inputs retain canonical check issues", () => {
		for (const canonical of [
			z.string().min(2),
			z.string().max(2),
			z.string().length(2),
		]) {
			const compiled = compileZodValidationArtifacts({
				operations: [],
				schemas: { value: canonical },
			});
			const root = compiled.roots.value;
			expect(root[0]).toBe("ref");
			if (root[0] !== "ref")
				throw new Error("expected compiled reference");
			expect(compiled.definitions[root[1]]?.[0]).toBe("string");
			const artifact: ValidationArtifact<string> = {
				definitions: compiled.definitions,
				root,
				version: 1,
			};
			for (const input of [[], [1], [1, 2, 3], { length: 0 }, "ok"]) {
				const expected = canonical.safeParse(input);
				const actual = parseValidationArtifact(artifact, input);
				if (expected.success) expect(actual).toEqual(expected.data);
				else {
					expect(actual).toBeInstanceOf(ParsingError);
					if (!(actual instanceof ParsingError))
						throw new Error("expected failure");
					expect(actual.issues).toEqual(expected.error.issues);
				}
			}
		}
	});

	test("lowers only an exact registered customized regex check to an operation", () => {
		const canonical = z.string().regex(/^\S+$/u, {
			message: "A value must contain no whitespace.",
		});
		const check = canonical._zod.def.checks?.[0];
		if (check === undefined)
			throw new Error("Expected a canonical regex check.");
		const registration = {
			check,
			construct: "regex" as const,
			flags: "u",
			message: "A value must contain no whitespace.",
			name: "example.regex.no-whitespace",
			schema: canonical,
			source: "^\\S+$",
			version: 1,
		};
		const compiled = compileZodValidationArtifacts({
			operations: [registration],
			schemas: { value: canonical },
		});
		expect(compiled.requiredOperations).toEqual([
			"example.regex.no-whitespace",
		]);
		expect(compiled.operationSignatures).toEqual({
			"example.regex.no-whitespace": {
				errorMessage: "A value must contain no whitespace.",
				regex: { flags: "u", source: "^\\S+$" },
				version: 1,
			},
		});
		const artifact: ValidationArtifact<string> = {
			definitions: compiled.definitions,
			root: compiled.roots.value,
			version: 1,
		};
		for (const input of ["kept", "has space"]) {
			const expected = canonical.safeParse(input);
			const actual = parseValidationArtifact(artifact, input, {
				"example.regex.no-whitespace": (value) => ({
					issues: /^\S+$/u.test(value as string)
						? []
						: [
								{
									code: "invalid_format",
									format: "regex",
									message: registration.message,
									origin: "string",
									path: [],
									pattern: "/^\\S+$/u",
								},
							],
					value,
				}),
			});
			if (expected.success) expect(actual).toEqual(expected.data);
			else {
				expect(actual).toBeInstanceOf(ParsingError);
				if (!(actual instanceof ParsingError))
					throw new Error("expected failure");
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}

		const differentCheck = z.string().regex(/^\S+$/u)._zod.def.checks?.[0];
		if (differentCheck === undefined)
			throw new Error("Expected a different regex check.");
		for (const operation of [
			{ ...registration, schema: z.string().regex(/^\S+$/u) },
			{ ...registration, check: differentCheck },
			{ ...registration, source: "^.+$" },
			{ ...registration, flags: "" },
			{ ...registration, message: "Different." },
		]) {
			expect(() =>
				compileZodValidationArtifacts({
					operations: [operation],
					schemas: { value: canonical },
				}),
			).toThrow(/regex.*registration|customization/u);
		}
	});

	test("compiles homogeneous variadic tuples with canonical issue order", () => {
		const index = z.number().int().nonnegative();
		const canonical = z.tuple([index], index);
		const compiled = compileZodValidationArtifacts({
			operations: [],
			schemas: { value: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.value,
			version: 1,
		};
		for (const input of [[0], [0, 1], [], [-1, -2], [0, -2], null]) {
			const expected = canonical.safeParse(input);
			const actual = parseValidationArtifact(artifact, input);
			if (expected.success) expect(actual).toEqual(expected.data);
			else {
				expect(actual).toBeInstanceOf(ParsingError);
				if (!(actual instanceof ParsingError))
					throw new Error("expected failure");
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}

		expect(() =>
			compileZodValidationArtifacts({
				operations: [],
				schemas: { value: z.tuple([z.string(), z.number()]) },
			}),
		).toThrow(/homogeneous tuple/u);
	});

	test("compiles registered semantics into a package-owned artifact", () => {
		const canonical = z.strictObject({
			name: z.string().min(1).overwrite(normalizeNfc),
			status: z.enum(["Ready", "Blocked"]).nullable(),
		});
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "overwrite",
					implementation: normalizeNfc,
					name: "example.normalize-nfc",
					version: 1,
				},
			],
			schemas: { profile: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			version: compiled.version,
			root: compiled.roots.profile,
			definitions: compiled.definitions,
		};
		const operations = {
			"example.normalize-nfc": (value: unknown) => ({
				value: (value as string).normalize("NFC"),
			}),
		};

		expect(compiled.requiredOperations).toEqual(["example.normalize-nfc"]);
		expect(
			parseValidationArtifact(
				artifact,
				{ name: "e\u0301", status: null },
				operations,
			),
		).toEqual(canonical.parse({ name: "e\u0301", status: null }));

		const invalid = { name: "", status: "Other", extra: true };
		const expected = canonical.safeParse(invalid);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, invalid, operations);
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
	});

	test("preserves string checks between overwrites in exact canonical issue order", () => {
		const canonical = z
			.string()
			.overwrite(trimText)
			.min(1)
			.overwrite(normalizeNfc)
			.regex(/^🏠$/u);
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "overwrite",
					implementation: trimText,
					name: "example.trim",
					version: 1,
				},
				{
					construct: "overwrite",
					implementation: normalizeNfc,
					name: "example.normalize-nfc",
					version: 1,
				},
			],
			schemas: { emojiDescription: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.emojiDescription,
			version: 1,
		};
		const operations: ValidationOperations = {
			"example.normalize-nfc": (value) => ({
				value: (value as string).normalize("NFC"),
			}),
			"example.trim": (value) => ({
				value: (value as string).trim(),
			}),
		};

		const expected = canonical.safeParse("   ");
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, "   ", operations);
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(actual.issues.map(({ code }) => code)).toEqual([
			"too_small",
			"invalid_format",
		]);
		expect(parseValidationArtifact(artifact, "  🏠  ", operations)).toBe(
			"🏠",
		);
		expect(() =>
			parseValidationArtifact(artifact, "   ", {
				"example.trim": (value) => ({
					value: (value as string).trim(),
				}),
			}),
		).toThrow(
			"Unknown validation artifact operation: example.normalize-nfc",
		);
	});

	test("preserves array checks between overwrites in exact canonical order", () => {
		const canonical = z
			.array(z.number())
			.overwrite(appendZero)
			.min(2)
			.overwrite(appendOne)
			.max(3);
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "overwrite",
					implementation: appendZero,
					name: "example.append-zero",
					version: 1,
				},
				{
					construct: "overwrite",
					implementation: appendOne,
					name: "example.append-one",
					version: 1,
				},
			],
			schemas: { values: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.values,
			version: 1,
		};
		const operations: ValidationOperations = {
			"example.append-one": (value) => ({
				value: appendOne(value as number[]),
			}),
			"example.append-zero": (value) => ({
				value: appendZero(value as number[]),
			}),
		};

		expect(parseValidationArtifact(artifact, [5], operations)).toEqual(
			canonical.parse([5]),
		);
		const expected = canonical.safeParse([]);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, [], operations);
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(actual.issues.map(({ code }) => code)).toEqual(["too_small"]);
		expect(() =>
			parseValidationArtifact(artifact, [], {
				"example.append-zero": (value) => ({
					value: appendZero(value as number[]),
				}),
			}),
		).toThrow("Unknown validation artifact operation: example.append-one");
	});

	test("preserves number checks between overwrites in exact canonical order", () => {
		const canonical = z
			.number()
			.overwrite(twice)
			.min(1.5)
			.overwrite(plusOne)
			.max(3);
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "overwrite",
					implementation: twice,
					name: "example.twice",
					version: 1,
				},
				{
					construct: "overwrite",
					implementation: plusOne,
					name: "example.plus-one",
					version: 1,
				},
			],
			schemas: { value: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.value,
			version: 1,
		};
		const operations: ValidationOperations = {
			"example.plus-one": (value) => ({
				value: plusOne(value as number),
			}),
			"example.twice": (value) => ({
				value: twice(value as number),
			}),
		};

		expect(parseValidationArtifact(artifact, 1, operations)).toBe(
			canonical.parse(1),
		);
		const expected = canonical.safeParse(0.5);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, 0.5, operations);
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(actual.issues.map(({ code }) => code)).toEqual(["too_small"]);
		expect(() =>
			parseValidationArtifact(artifact, 0.5, {
				"example.twice": (value) => ({
					value: twice(value as number),
				}),
			}),
		).toThrow("Unknown validation artifact operation: example.plus-one");
	});

	test("compiles a registered Zod preprocess before structural validation", () => {
		const canonical = z.preprocess(
			trimNestedName,
			z.strictObject({ name: z.string().min(1) }),
		);
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "transform",
					implementation: trimNestedName,
					name: "example.trim-nested-name",
					version: 1,
				},
			],
			schemas: { profile: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			version: 1,
			root: compiled.roots.profile,
			definitions: compiled.definitions,
		};

		expect(
			parseValidationArtifact(
				artifact,
				{ name: " Ada " },
				{
					"example.trim-nested-name": (value) => ({
						value: trimNestedName(value),
					}),
				},
			),
		).toEqual(canonical.parse({ name: " Ada " }));
	});

	test("compiles a registered post-transform after structural validation", () => {
		const canonical = z
			.array(z.string().overwrite(trimText))
			.min(1)
			.transform(retainNonEmpty);
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "overwrite",
					implementation: trimText,
					name: "example.trim-post-transform-input",
					version: 1,
				},
				{
					construct: "transform",
					implementation: retainNonEmpty,
					name: "example.retain-non-empty",
					version: 2,
				},
			],
			schemas: { values: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.values,
			version: 1,
		};
		const operations = {
			"example.retain-non-empty": (value: unknown) => ({ value }),
			"example.trim-post-transform-input": (value: unknown) => ({
				value: (value as string).trim(),
			}),
		};

		expect(
			parseValidationArtifact(artifact, [" value "], operations),
		).toEqual(canonical.parse([" value "]));
		const expected = canonical.safeParse([]);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, [], operations);
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(
			compiled.operationSignatures["example.retain-non-empty"],
		).toEqual({
			version: 2,
		});
	});

	test("preserves registered refinements attached to a transformed pipe", () => {
		function retain(value: string): string {
			return value;
		}
		function hasText(value: string): boolean {
			return value.length > 0;
		}
		const canonical = z.string().transform(retain).refine(hasText, {
			message: "Text required",
		});
		const custom = canonical._zod.def.checks?.[0] as unknown as {
			readonly _zod: {
				readonly def: {
					readonly error?: (...args: never[]) => unknown;
				};
			};
		};
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "transform",
					implementation: retain as (...args: never[]) => unknown,
					name: "example.retain",
					version: 1,
				},
				{
					construct: "custom",
					error: custom._zod.def.error,
					implementation: hasText as (...args: never[]) => unknown,
					name: "example.has-text-after-pipe",
					version: 1,
				},
			],
			schemas: { value: canonical },
		});
		const artifact: ValidationArtifact<string> = {
			definitions: compiled.definitions,
			root: compiled.roots.value,
			version: 1,
		};
		for (const input of ["kept", "", 1]) {
			const expected = canonical.safeParse(input);
			const actual = parseValidationArtifact(artifact, input, {
				"example.retain": (value) => ({ value }),
				"example.has-text-after-pipe": (value) => ({
					issues: hasText(value as string)
						? []
						: [
								{
									code: "custom",
									message: "Text required",
									path: [],
								},
							],
					value,
				}),
			});
			if (expected.success) expect(actual).toEqual(expected.data);
			else {
				expect(actual).toBeInstanceOf(ParsingError);
				if (!(actual instanceof ParsingError))
					throw new Error("expected failure");
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}
		expect(compiled.requiredOperations).toEqual([
			"example.has-text-after-pipe",
			"example.retain",
		]);
	});

	test("fails closed on unregistered, identity-mismatched, or contextual post-transforms", () => {
		const canonical = z.array(z.string()).min(1).transform(retainNonEmpty);
		for (const operations of [
			[],
			[
				{
					construct: "transform" as const,
					implementation: (value: string[]) => value,
					name: "example.wrong-post-transform",
					version: 1,
				},
			],
		]) {
			expect(() =>
				compileZodValidationArtifacts({
					operations,
					schemas: { values: canonical },
				}),
			).toThrow(/transform check.*explicitly named operation/u);
		}

		const contextual = z.string().transform((value, context) => {
			context.addIssue({ code: "custom", message: "Rejected" });
			return value;
		});
		const implementation = contextual.out._zod.def.transform;
		if (implementation === undefined) {
			throw new Error("Expected contextual transform.");
		}
		expect(() =>
			compileZodValidationArtifacts({
				operations: [
					{
						construct: "transform",
						implementation,
						name: "example.contextual-post-transform",
						version: 1,
					},
				],
				schemas: { value: contextual },
			}),
		).toThrow(/contextual post-transform/u);
	});

	test("compiles optional properties and keyed records without weakening their diagnostics", () => {
		const canonical = z.strictObject({
			nickname: z.string().optional(),
			translations: z.record(
				z.string().min(1),
				z.array(z.string().trim()).min(1),
			),
		});
		const trimCheck = (
			canonical.shape.translations._zod.def
				.valueType as z.ZodArray<z.ZodString>
		).element._zod.def.checks?.[0] as unknown as
			| { readonly _zod: { readonly def: { readonly tx?: unknown } } }
			| undefined;
		const trim = trimCheck?._zod.def.tx;
		if (typeof trim !== "function") {
			throw new Error("Expected the canonical trim operation.");
		}
		const trimOperation = trim as (...args: never[]) => unknown;
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "overwrite",
					implementation: trimOperation,
					name: "example.trim",
					version: 1,
				},
			],
			schemas: { profile: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			version: 1,
			root: compiled.roots.profile,
			definitions: compiled.definitions,
		};
		const operations = {
			"example.trim": (value: unknown) => ({
				value: (value as string).trim(),
			}),
		};

		expect(
			parseValidationArtifact(
				artifact,
				{ translations: { de: [" Haus "] } },
				operations,
			),
		).toEqual(canonical.parse({ translations: { de: [" Haus "] } }));

		const invalid = { translations: { "": [], de: [1] } };
		const expected = canonical.safeParse(invalid);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, invalid, operations);
		if (!(actual instanceof ParsingError)) {
			throw new Error("expected ParsingError");
		}
		expect(actual.issues).toEqual(expected.error.issues);
	});

	test("distinguishes partial enum records from required enum records", () => {
		const canonical = z.partialRecord(
			z.enum(["synonym", "antonym"]),
			z.array(z.string()),
		);
		const compiled = compileZodValidationArtifacts({
			operations: [],
			schemas: { relations: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.relations,
			version: 1,
		};

		expect(
			parseValidationArtifact(artifact, { synonym: ["same"] }),
		).toEqual(canonical.parse({ synonym: ["same"] }));
		const invalid = { related: ["same"] };
		const expected = canonical.safeParse(invalid);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, invalid);
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
	});

	test("preserves registered refinements attached directly to records", () => {
		function isNonEmpty(value: object): boolean {
			return Object.keys(value).length > 0;
		}
		const canonical = z
			.partialRecord(z.enum(["a", "b"]), z.null())
			.refine(isNonEmpty, { message: "Select one" });
		const check = canonical._zod.def.checks?.[0] as unknown as {
			readonly _zod: {
				readonly def: {
					readonly error?: (...args: never[]) => unknown;
				};
			};
		};
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "custom",
					error: check._zod.def.error,
					implementation: isNonEmpty as (...args: never[]) => unknown,
					name: "example.record-non-empty",
					version: 1,
				},
			],
			schemas: { value: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.value,
			version: 1,
		};
		for (const input of [{ a: null }, {}, { c: null }]) {
			const expected = canonical.safeParse(input);
			const actual = parseValidationArtifact(artifact, input, {
				"example.record-non-empty": (value) => ({
					issues: isNonEmpty(value as object)
						? []
						: [{ code: "custom", message: "Select one", path: [] }],
					value,
				}),
			});
			if (expected.success) expect(actual).toEqual(expected.data);
			else {
				expect(actual).toBeInstanceOf(ParsingError);
				if (!(actual instanceof ParsingError))
					throw new Error("expected failure");
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}
	});

	test("keeps array bounds when an element also aborts", () => {
		const canonical = z.array(z.string()).min(2);
		const compiled = compileZodValidationArtifacts({
			operations: [],
			schemas: { values: canonical },
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			definitions: compiled.definitions,
			root: compiled.roots.values,
			version: 1,
		};
		const expected = canonical.safeParse([1]);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, [1]);
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
	});

	test("fails closed when a semantic construct has no named registration", () => {
		const schema = z.string().refine((value) => value.length > 1);

		expect(() =>
			compileZodValidationArtifacts({
				operations: [],
				schemas: { profile: schema },
			}),
		).toThrow(ZodValidationCompilationError);
		expect(() =>
			compileZodValidationArtifacts({
				operations: [],
				schemas: { profile: schema },
			}),
		).toThrow(
			'Cannot compile schema "profile" at $: unsupported custom check; no explicitly named operation registration matched.',
		);
	});

	test("fails closed on node and structural-check error customization", () => {
		for (const schema of [
			z.string({ error: "node message" }),
			z.string().min(1, { error: "check message" }),
		]) {
			expect(() =>
				compileZodValidationArtifacts({
					operations: [],
					schemas: { profile: schema },
				}),
			).toThrow(/profile.*\$.*error customization/u);
		}
	});

	test("binds registered custom error behavior into artifact freshness", () => {
		const schema = z.string().refine(hasText, { error: hasTextError });
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "custom",
					error: hasTextError,
					implementation: hasText,
					name: "example.has-text",
					version: 1,
				},
			],
			schemas: { profile: schema },
		});

		expect(compiled.operationSignatures).toEqual({
			"example.has-text": {
				errorMessage: "Text is required",
				version: 1,
			},
		});
	});

	test("fails closed on contextual registered error behavior", () => {
		const schema = z.string().refine(hasText, {
			error: contextualTextError,
		});

		expect(() =>
			compileZodValidationArtifacts({
				operations: [
					{
						construct: "custom",
						error: contextualTextError,
						implementation: hasText,
						name: "example.contextual-text",
						version: 1,
					},
				],
				schemas: { profile: schema },
			}),
		).toThrow(/profile.*\$.*not a constant message/u);
	});

	test("compiles an explicitly named contextual issue emitter", () => {
		const schema = z
			.strictObject({ values: z.array(z.string()) })
			.superRefine((value, context) => {
				for (const [index, item] of value.values.entries()) {
					if (value.values.indexOf(item) !== index) {
						context.addIssue({
							code: "custom",
							message: "Values must be unique.",
							path: ["values", index],
						});
					}
				}
			});
		const implementation = contextualCheckFor(schema);
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "contextual",
					implementation,
					name: "example.unique-values",
					version: 1,
				},
			],
			schemas: { profile: schema },
		});
		const artifact: ValidationArtifact<z.output<typeof schema>> = {
			definitions: compiled.definitions,
			root: compiled.roots.profile,
			version: 1,
		};
		const invalid = { values: ["same", "same", "same"] };
		const expected = schema.safeParse(invalid);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, invalid, {
			"example.unique-values": (value) => ({
				issues: [1, 2].map((index) => ({
					code: "custom",
					message: "Values must be unique.",
					path: ["values", index],
				})),
				value,
			}),
		});
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(compiled.operationSignatures).toEqual({
			"example.unique-values": { version: 1 },
		});
	});

	test("preserves a named refinement attached to a lazy schema", () => {
		const isNamed = (value: { name: string }) => value.name.length > 0;
		const schema = z
			.lazy(() => z.strictObject({ name: z.string() }))
			.refine(isNamed, { message: "Name is required." });
		const check = schema._zod.def.checks?.[0] as unknown as {
			readonly _zod: {
				readonly def: {
					readonly error?: (...args: never[]) => unknown;
				};
			};
		};
		const compiled = compileZodValidationArtifacts({
			operations: [
				{
					construct: "custom",
					error: check._zod.def.error,
					implementation: isNamed as (...args: never[]) => unknown,
					name: "example.named",
					version: 1,
				},
			],
			schemas: { profile: schema },
		});
		expect(compiled.requiredOperations).toEqual(["example.named"]);
	});

	test("compiles registered union checks with exact nested issue order and fails closed", () => {
		const first = (value: { value: string }) => value.value !== "blocked";
		const second = (value: { value: string }) => value.value.length > 8;
		const firstError = () => "Value is blocked.";
		const secondError = () => "Value is too short.";
		const union = z
			.union([
				z.strictObject({ kind: z.literal("left"), value: z.string() }),
				z.strictObject({ kind: z.literal("right"), value: z.string() }),
			])
			.refine(first, { error: firstError })
			.refine(second, { error: secondError });
		const schema = z.strictObject({ nested: union });
		const operations = [
			{
				construct: "custom" as const,
				error: firstError,
				implementation: first as (...args: never[]) => unknown,
				name: "example.union.first",
				version: 1,
			},
			{
				construct: "custom" as const,
				error: secondError,
				implementation: second as (...args: never[]) => unknown,
				name: "example.union.second",
				version: 1,
			},
		] as const;
		const compiled = compileZodValidationArtifacts({
			operations,
			schemas: { profile: schema },
		});
		const artifact: ValidationArtifact<z.output<typeof schema>> = {
			definitions: compiled.definitions,
			root: compiled.roots.profile,
			version: 1,
		};
		const input = { nested: { kind: "left", value: "blocked" } };
		const expected = schema.safeParse(input);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, input, {
			"example.union.first": (value) => ({
				issues: first(value as { value: string })
					? []
					: [{ code: "custom", message: firstError(), path: [] }],
				value,
			}),
			"example.union.second": (value) => ({
				issues: second(value as { value: string })
					? []
					: [{ code: "custom", message: secondError(), path: [] }],
				value,
			}),
		});
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(actual.issues.map((issue) => issue.path)).toEqual([
			["nested"],
			["nested"],
		]);
		expect(() =>
			compileZodValidationArtifacts({
				operations: operations.slice(0, 1),
				schemas: { profile: schema },
			}),
		).toThrow(/unsupported custom check; no explicitly named operation/u);
		expect(() =>
			compileZodValidationArtifacts({
				operations: [
					{ ...operations[0], error: () => "Different." },
					operations[1],
				],
				schemas: { profile: schema },
			}),
		).toThrow(/error customization/u);
	});

	test("compiles discriminated unions with exact selection diagnostics and rejects customization", () => {
		const discriminated = z.discriminatedUnion("kind", [
			z.strictObject({
				kind: z.literal("left"),
				value: z.string().min(2),
			}),
			z.strictObject({
				kind: z.literal("right"),
				label: z.string().min(1),
			}),
		]);
		const schema = z.strictObject({
			nested: discriminated,
		});
		const registration = {
			construct: "discriminator" as const,
			discriminator: "kind",
			name: "example.kind-discriminator",
			options: ["left", "right"],
			schema: discriminated,
			version: 1,
		} as const;
		const compiled = compileZodValidationArtifacts({
			operations: [registration],
			schemas: { profile: schema },
		});
		const artifact: ValidationArtifact<z.output<typeof schema>> = {
			definitions: compiled.definitions,
			root: compiled.roots.profile,
			version: 1,
		};
		const discriminatorSignature =
			compiled.operationSignatures["example.kind-discriminator"]
				?.discriminator;
		if (discriminatorSignature === undefined)
			throw new Error("missing discriminator signature");
		const discriminatorOperation = (value: unknown) => {
			if (
				value === null ||
				typeof value !== "object" ||
				Array.isArray(value)
			) {
				const received =
					value === null
						? "null"
						: Array.isArray(value)
							? "array"
							: typeof value;
				return {
					issues: [
						{
							code: "invalid_type" as const,
							expected: "object" as const,
							message: `Invalid input: expected object, received ${received}`,
							path: [],
						},
					],
					value,
				};
			}
			const kind = Reflect.get(value, "kind");
			const index = kind === "left" ? 0 : kind === "right" ? 1 : -1;
			if (index >= 0) {
				const parsed = parseValidationArtifact(
					{
						definitions: compiled.definitions,
						root: discriminatorSignature.branches[
							index
						] as Constraint,
						version: 1,
					},
					value,
					operations,
				);
				return parsed instanceof ParsingError
					? { issues: parsed.issues, value }
					: { value: parsed };
			}
			return {
				issues: [
					{
						code: "invalid_union" as const,
						discriminator: "kind",
						errors: [],
						message:
							"Invalid discriminator value. Expected 'left' | 'right'",
						note: "No matching discriminator" as const,
						options: ["left", "right"],
						path: ["kind"],
					},
				],
				value,
			};
		};
		const operations: ValidationOperations = {
			"example.kind-discriminator": discriminatorOperation,
		};
		for (const input of [
			{ nested: { kind: "left", value: "x" } },
			{ nested: { kind: "unknown", value: "text" } },
			{ nested: {} },
			{ nested: null },
		]) {
			const expected = schema.safeParse(input);
			const actual = parseValidationArtifact(artifact, input, operations);
			if (expected.success || !(actual instanceof ParsingError))
				throw new Error("invalid fixture was not rejected");
			expect(actual.issues).toEqual(expected.error.issues);
		}
		expect(
			parseValidationArtifact(
				artifact,
				{
					nested: { kind: "right", label: "ok" },
				},
				operations,
			),
		).toEqual({ nested: { kind: "right", label: "ok" } });
		expect(compiled.requiredOperations).toEqual([
			"example.kind-discriminator",
		]);
		expect(compiled.operationSignatures).toEqual({
			"example.kind-discriminator": {
				discriminator: {
					branches: discriminatorSignature.branches,
					key: "kind",
					options: ["left", "right"],
				},
				version: 1,
			},
		});
		expect(discriminatorSignature.branches).toHaveLength(2);
		expect(
			discriminatorSignature.branches.every(
				(branch) => branch[0] === "ref",
			),
		).toBe(true);
		for (const operations of [
			[],
			[
				{
					...registration,
					schema: z.discriminatedUnion("kind", [
						z.strictObject({ kind: z.literal("left") }),
						z.strictObject({ kind: z.literal("right") }),
					]),
				},
			],
		]) {
			expect(() =>
				compileZodValidationArtifacts({
					operations,
					schemas: { profile: schema },
				}),
			).toThrow(/no exact schema-identity registration/u);
		}
		for (const registrationOverride of [
			{ ...registration, discriminator: "type" },
			{ ...registration, options: ["right", "left"] },
		]) {
			expect(() =>
				compileZodValidationArtifacts({
					operations: [registrationOverride],
					schemas: { profile: schema },
				}),
			).toThrow(/metadata does not match/u);
		}

		const customized = z.discriminatedUnion(
			"kind",
			[
				z.strictObject({ kind: z.literal("left") }),
				z.strictObject({ kind: z.literal("right") }),
			],
			{ error: "Choose a known kind." },
		);
		expect(() =>
			compileZodValidationArtifacts({
				operations: [
					{
						construct: "discriminator",
						discriminator: "kind",
						name: "example.customized",
						options: ["left", "right"],
						schema: customized,
						version: 1,
					},
				],
				schemas: { customized },
			}),
		).toThrow(/Zod node error customization/u);
		expect(() => {
			const unsupported = z.discriminatedUnion("kind", [
				z.strictObject({ kind: z.literal(1) }),
				z.strictObject({ kind: z.literal(2) }),
			]);
			return compileZodValidationArtifacts({
				operations: [
					{
						construct: "discriminator",
						discriminator: "kind",
						name: "example.numeric",
						options: ["1", "2"],
						schema: unsupported,
						version: 1,
					},
				],
				schemas: { unsupported },
			});
		}).toThrow(/without one string literal value/u);
	});

	test("fails closed on an unregistered or identity-mismatched contextual emitter", () => {
		const schema = z.string().superRefine((_value, context) => {
			context.addIssue({ code: "custom", message: "Rejected" });
		});
		for (const operations of [
			[],
			[
				{
					construct: "contextual" as const,
					implementation: () => undefined,
					name: "example.wrong-identity",
					version: 1,
				},
			],
		]) {
			expect(() =>
				compileZodValidationArtifacts({
					operations,
					schemas: { profile: schema },
				}),
			).toThrow(
				/unsupported contextual check; no explicitly named operation/u,
			);
		}
	});

	test("fails closed on an unsupported Zod node with its exact path", () => {
		expect(() =>
			compileZodValidationArtifacts({
				operations: [],
				schemas: {
					profile: z.strictObject({ createdAt: z.date() }),
				},
			}),
		).toThrow(
			'Cannot compile schema "profile" at $.createdAt: unsupported Zod node "date".',
		);
	});
});
