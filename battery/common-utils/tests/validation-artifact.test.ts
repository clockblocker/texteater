import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	type Constraint,
	ParsingError,
	type ParsingIssue,
	parseValidationArtifact,
	type ValidationArtifact,
	type ValidationOperations,
} from "../src";

const canonicalProfileSchema = z
	.object({
		name: z.string().min(2),
		active: z.boolean(),
		nickname: z.string().optional(),
	})
	.strict();

type Profile = z.output<typeof canonicalProfileSchema>;

const profileArtifact: ValidationArtifact<Profile> = {
	version: 1,
	root: [
		"object",
		{
			name: ["string", [["min", 2]]],
			active: ["boolean"],
			nickname: ["optional", ["string"]],
		},
		"strict",
	],
};

const canonicalSettingsSchema = z.object({
	mode: z.enum(["auto", "manual"]),
	threshold: z.union([z.null(), z.number().int().min(1).max(5)]),
	tags: z.array(z.string()).min(1).max(2),
});

type Settings = z.output<typeof canonicalSettingsSchema>;

const settingsArtifact: ValidationArtifact<Settings> = {
	version: 1,
	root: [
		"object",
		{
			mode: ["enum", ["auto", "manual"]],
			threshold: [
				"union",
				[
					["null"],
					["number", [["int"], ["min", 1, true], ["max", 5, true]]],
				],
			],
			tags: [
				"array",
				["string"],
				[
					["min", 1],
					["max", 2],
				],
			],
		},
		"strip",
	],
};

interface TreeNode {
	value: string;
	children: TreeNode[];
}

const canonicalTreeSchema: z.ZodType<TreeNode> = z.lazy(() =>
	z
		.object({
			value: z.string(),
			children: z.array(canonicalTreeSchema),
		})
		.strict(),
);

const treeArtifact: ValidationArtifact<TreeNode> = {
	version: 1,
	root: ["ref", "tree-node"],
	definitions: {
		"tree-node": [
			"object",
			{
				value: ["string"],
				children: ["array", ["ref", "tree-node"], []],
			},
			"strict",
		],
	},
};

describe("parseValidationArtifact", () => {
	test("matches Zod safe-integer boundaries and non-finite diagnostics", () => {
		const canonical = z.number().int();
		const artifact: ValidationArtifact<number> = {
			version: 1,
			root: ["number", [["int"]]],
		};
		for (const input of [
			Number.MIN_SAFE_INTEGER,
			Number.MAX_SAFE_INTEGER,
			Number.MIN_SAFE_INTEGER - 1,
			Number.MAX_SAFE_INTEGER + 1,
			1.5,
			Number.NEGATIVE_INFINITY,
			Number.POSITIVE_INFINITY,
			Number.NaN,
		]) {
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
	});

	test("matches Zod tuple rest-first paths, fixed bounds, references, and output", () => {
		const index = z.number().int().nonnegative();
		const canonical = z.tuple([index], index).readonly();
		const artifact: ValidationArtifact<readonly [number, ...number[]]> = {
			version: 1,
			definitions: {
				index: ["number", [["int"], ["min", 0, true]]],
			},
			root: [
				"pipe",
				["tuple", [["ref", "index"]], ["ref", "index"]],
				[["operation", "test.readonly"]],
			],
		};
		const operations: ValidationOperations = {
			"test.readonly": (value) => ({ value: Object.freeze(value) }),
		};
		for (const input of [[0], [0, 1, 2], [], [-1, -2], [0, -2], null]) {
			const expected = canonical.safeParse(input);
			const actual = parseValidationArtifact(artifact, input, operations);
			if (expected.success) {
				expect(actual).toEqual(expected.data);
				expect(Object.isFrozen(actual)).toBe(true);
			} else {
				expect(actual).toBeInstanceOf(ParsingError);
				if (!(actual instanceof ParsingError))
					throw new Error("expected failure");
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}
		expect(() =>
			parseValidationArtifact(
				{ version: 1, root: ["tuple", [["ref", "missing"]]] },
				[0],
			),
		).toThrow(/Unknown validation artifact reference/u);
	});

	test("retains exact cross-type string length issues after invalid_type", () => {
		for (const { canonical, check } of [
			{ canonical: z.string().min(2), check: ["min", 2] as const },
			{ canonical: z.string().max(2), check: ["max", 2] as const },
			{ canonical: z.string().length(2), check: ["length", 2] as const },
		]) {
			const artifact: ValidationArtifact<string> = {
				version: 1,
				root: ["string", [check]],
			};
			for (const input of [
				[],
				[1],
				[1, 2, 3],
				{ length: 0 },
				{ length: 3 },
				{ length: "0" },
				{},
				null,
			]) {
				const expected = canonical.safeParse(input);
				if (expected.success)
					throw new Error("invalid fixture was accepted");
				const actual = parseValidationArtifact(artifact, input);
				expect(actual).toBeInstanceOf(ParsingError);
				if (!(actual instanceof ParsingError))
					throw new Error("expected failure");
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}
		const exactStringArtifact: ValidationArtifact<string> = {
			version: 1,
			root: ["string", [["length", 2]]],
		};
		expect(parseValidationArtifact(exactStringArtifact, "ok")).toBe("ok");
	});

	test("runs named package operations and built-in checks in canonical order", () => {
		const canonical = z
			.string()
			.trim()
			.min(2)
			.overwrite((value) => value.normalize("NFC"))
			.refine((value) => value !== "NO");
		const artifact: ValidationArtifact<string> = {
			version: 1,
			root: [
				"pipe",
				["string"],
				[
					["operation", "test.trim"],
					["string", ["min", 2]],
					["operation", "test.nfc"],
					["operation", "test.not-no"],
				],
			],
		};
		const operations: ValidationOperations = {
			"test.nfc": (value) => ({
				value: (value as string).normalize("NFC"),
			}),
			"test.not-no": (value) => ({
				issues:
					value === "NO"
						? [
								{
									code: "custom",
									path: [],
									message: "Invalid input",
								},
							]
						: [],
				value,
			}),
			"test.trim": (value) => ({ value: (value as string).trim() }),
		};

		expect(
			parseValidationArtifact(artifact, "  e\u0301  ", operations),
		).toBe(canonical.parse("  e\u0301  "));

		for (const input of [" x ", " NO "]) {
			const expected = canonical.safeParse(input);
			if (expected.success)
				throw new Error("invalid fixture was accepted");
			const actual = parseValidationArtifact(artifact, input, operations);
			if (!(actual instanceof ParsingError))
				throw new Error("expected failure");
			expect(actual.issues).toEqual(expected.error.issues);
		}
	});

	test("nullable delegates non-null diagnostics directly to its inner constraint", () => {
		const canonical = z.literal("Marked").nullable();
		const artifact: ValidationArtifact<"Marked" | null> = {
			version: 1,
			root: ["nullable", ["literal", "Marked"]],
		};

		expect(parseValidationArtifact(artifact, null)).toBe(null);
		const expected = canonical.safeParse("Other");
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, "Other");
		if (!(actual instanceof ParsingError))
			throw new Error("expected failure");
		expect(actual.issues).toEqual(expected.error.issues);
	});

	test("rejects an artifact version the interpreter does not understand", () => {
		const futureArtifact = {
			version: 2,
			root: ["string"],
		} as unknown as ValidationArtifact<string>;

		expect(() => parseValidationArtifact(futureArtifact, "value")).toThrow(
			"Unsupported validation artifact version: 2",
		);
	});

	test("matches canonical Zod structural output and issue diagnostics", () => {
		const validInput = { name: "Ada", active: true };
		expect(parseValidationArtifact(profileArtifact, validInput)).toEqual(
			canonicalProfileSchema.parse(validInput),
		);

		const invalidInput = { name: "A", active: 1, surprise: true };
		const canonical = canonicalProfileSchema.safeParse(invalidInput);
		if (canonical.success) throw new Error("invalid fixture was accepted");

		const parsed = parseValidationArtifact(profileArtifact, invalidInput);
		expect(parsed).toBeInstanceOf(ParsingError);
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");
		expect(parsed.issues).toEqual(canonical.error.issues);
	});

	test("matches keyed record output and invalid-key diagnostics", () => {
		const canonicalSchema = z.record(
			z.enum(["definition", "translation"]),
			z.array(z.string()).min(1),
		);
		const artifact: ValidationArtifact<z.output<typeof canonicalSchema>> = {
			version: 1,
			root: [
				"record",
				["enum", ["definition", "translation"]],
				["array", ["string"], [["min", 1]]],
			],
		};

		expect(
			parseValidationArtifact(artifact, {
				definition: ["sense"],
				translation: ["meaning"],
			}),
		).toEqual(
			canonicalSchema.parse({
				definition: ["sense"],
				translation: ["meaning"],
			}),
		);

		const invalid = { unknown: [], definition: [], translation: ["value"] };
		const expected = canonicalSchema.safeParse(invalid);
		if (expected.success) throw new Error("invalid fixture was accepted");
		const actual = parseValidationArtifact(artifact, invalid);
		if (!(actual instanceof ParsingError)) {
			throw new Error("expected ParsingError");
		}
		expect(actual.issues).toEqual(expected.error.issues);
	});

	test("accepts omitted fixed keys in an explicit partial record", () => {
		const canonical = z.partialRecord(
			z.enum(["synonym", "antonym"]),
			z.array(z.string()),
		);
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			root: [
				"partial-record",
				["enum", ["synonym", "antonym"]],
				["array", ["string"], []],
			],
			version: 1,
		};
		for (const input of [{}, { synonym: ["same"] }, { other: [] }]) {
			const expected = canonical.safeParse(input);
			const actual = parseValidationArtifact(artifact, input);
			if (expected.success) expect(actual).toEqual(expected.data);
			else {
				if (!(actual instanceof ParsingError)) {
					throw new Error("expected failure");
				}
				expect(actual.issues).toEqual(expected.error.issues);
			}
		}
	});

	test("selects the one correctly typed union branch when its bound fails", () => {
		const canonicalSchema = z.union([z.null(), z.number().min(1).max(5)]);
		const artifact: ValidationArtifact<number | null> = {
			version: 1,
			root: [
				"union",
				[
					["null"],
					[
						"number",
						[
							["min", 1, true],
							["max", 5, true],
						],
					],
				],
			],
		};
		const canonical = canonicalSchema.safeParse(0);
		if (canonical.success) throw new Error("invalid fixture was accepted");

		const parsed = parseValidationArtifact(
			artifact,
			0,
			new Proxy(
				{},
				{
					get: () => {
						throw new Error(
							"ordinary union touched selector machinery",
						);
					},
				},
			),
		);
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");

		expect(parsed.issues).toEqual(canonical.error.issues);
	});

	test("selects discriminated unions and preserves exact discriminator and nested issue order", () => {
		const canonicalSchema = z.strictObject({
			outer: z.discriminatedUnion("kind", [
				z.strictObject({
					enabled: z.boolean(),
					kind: z.literal("left"),
					value: z.string().min(2),
				}),
				z.strictObject({
					kind: z.literal("right"),
					label: z.string().min(1),
				}),
			]),
		});
		const branches: readonly Constraint[] = [
			[
				"object",
				{
					enabled: ["boolean"],
					kind: ["literal", "left"],
					value: ["string", [["min", 2]]],
				},
				"strict",
			],
			[
				"object",
				{
					kind: ["literal", "right"],
					label: ["string", [["min", 1]]],
				},
				"strict",
			],
		];
		const artifact: ValidationArtifact<z.output<typeof canonicalSchema>> = {
			root: [
				"object",
				{
					outer: [
						"preprocess",
						"test.kind-discriminator",
						["unknown"],
					],
				},
				"strict",
			],
			version: 1,
		};
		function discriminatorOperation(value: unknown) {
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
							code: "invalid_type",
							expected: "object",
							message: `Invalid input: expected object, received ${received}`,
							path: [],
						} satisfies ParsingIssue,
					],
					value,
				};
			}
			const kind = Reflect.get(value, "kind");
			const index = kind === "left" ? 0 : kind === "right" ? 1 : -1;
			if (index >= 0) {
				const parsed = parseValidationArtifact(
					{ root: branches[index] as Constraint, version: 1 },
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
						code: "invalid_union",
						discriminator: "kind",
						errors: [],
						message:
							"Invalid discriminator value. Expected 'left' | 'right'",
						note: "No matching discriminator",
						options: ["left", "right"],
						path: ["kind"],
					} satisfies ParsingIssue,
				],
				value,
			};
		}
		const operations: ValidationOperations = {
			"test.kind-discriminator": discriminatorOperation,
		};

		const valid = { outer: { kind: "right", label: "ready" } };
		expect(parseValidationArtifact(artifact, valid, operations)).toEqual(
			canonicalSchema.parse(valid),
		);
		for (const input of [
			{ outer: { enabled: "no", kind: "left", value: "x" } },
			{ outer: { kind: "unknown" } },
			{ outer: {} },
			{ outer: null },
		]) {
			const expected = canonicalSchema.safeParse(input);
			const actual = parseValidationArtifact(artifact, input, operations);
			if (expected.success || !(actual instanceof ParsingError))
				throw new Error("invalid fixture was not rejected");
			expect(actual.issues).toEqual(expected.error.issues);
		}
		expect(() => parseValidationArtifact(artifact, valid)).toThrow(
			"Unknown validation artifact operation",
		);
	});

	test("unknown constraints preserve every value without touching operations", () => {
		const artifact: ValidationArtifact<unknown> = {
			root: ["unknown"],
			version: 1,
		};
		for (const value of [undefined, null, false, 0, "", [], {}]) {
			expect(
				parseValidationArtifact(
					artifact,
					value,
					new Proxy(
						{},
						{
							get: () => {
								throw new Error("unknown touched operations");
							},
						},
					),
				),
			).toBe(value);
		}
	});

	test("preserves nested paths and issue order from the selected typed branch", () => {
		const canonicalSchema = z.object({
			choice: z.union([
				z.object({
					kind: z.literal("text"),
					nested: z.object({
						label: z.string().min(2),
						count: z.number().min(1),
					}),
				}),
				z.object({
					kind: z.literal("count"),
					nested: z.object({
						label: z.number(),
						count: z.string(),
					}),
				}),
			]),
		});
		type Canonical = z.output<typeof canonicalSchema>;
		const artifact: ValidationArtifact<Canonical> = {
			version: 1,
			root: [
				"object",
				{
					choice: [
						"union",
						[
							[
								"object",
								{
									kind: ["literal", "text"],
									nested: [
										"object",
										{
											label: ["string", [["min", 2]]],
											count: [
												"number",
												[["min", 1, true]],
											],
										},
										"strip",
									],
								},
								"strip",
							],
							[
								"object",
								{
									kind: ["literal", "count"],
									nested: [
										"object",
										{
											label: ["number"],
											count: ["string"],
										},
										"strip",
									],
								},
								"strip",
							],
						],
					],
				},
				"strip",
			],
		};
		const input = {
			choice: { kind: "text", nested: { label: "", count: 0 } },
		};
		const canonical = canonicalSchema.safeParse(input);
		if (canonical.success) throw new Error("invalid fixture was accepted");

		const parsed = parseValidationArtifact(artifact, input);
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");

		expect(parsed.issues).toEqual(canonical.error.issues);
	});

	test("keeps invalid_union when multiple continuable branches are ambiguous", () => {
		const canonicalSchema = z.union([z.string().min(2), z.string().max(0)]);
		const artifact: ValidationArtifact<string> = {
			version: 1,
			root: [
				"union",
				[
					["string", [["min", 2]]],
					["string", [["max", 0]]],
				],
			],
		};
		const canonical = canonicalSchema.safeParse("x");
		if (canonical.success) throw new Error("invalid fixture was accepted");

		const parsed = parseValidationArtifact(artifact, "x");
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");

		expect(parsed.issues).toEqual(canonical.error.issues);
	});

	test("treats strict-object unknown keys as aborted inside a union", () => {
		const canonicalSchema = z.union([
			z.strictObject({ kind: z.literal("text"), value: z.string() }),
			z.strictObject({ kind: z.literal("count"), value: z.number() }),
		]);
		const artifact: ValidationArtifact<unknown> = {
			root: [
				"union",
				[
					[
						"object",
						{ kind: ["literal", "text"], value: ["string"] },
						"strict",
					],
					[
						"object",
						{ kind: ["literal", "count"], value: ["number"] },
						"strict",
					],
				],
			],
			version: 1,
		};
		const input = { kind: "text", value: "kept", unexpected: true };
		const canonical = canonicalSchema.safeParse(input);
		if (canonical.success) throw new Error("invalid fixture was accepted");
		const parsed = parseValidationArtifact(artifact, input);
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");
		expect(parsed.issues).toEqual(canonical.error.issues);
	});

	test("returns the normalized output from the first successful union branch", () => {
		const canonicalSchema = z.union([
			z.object({ kind: z.literal("text"), value: z.string() }),
			z.object({ kind: z.literal("count"), value: z.number() }),
		]);
		type Canonical = z.output<typeof canonicalSchema>;
		const artifact: ValidationArtifact<Canonical> = {
			version: 1,
			root: [
				"union",
				[
					[
						"object",
						{ kind: ["literal", "text"], value: ["string"] },
						"strip",
					],
					[
						"object",
						{ kind: ["literal", "count"], value: ["number"] },
						"strip",
					],
				],
			],
		};
		const input = { kind: "text", value: "kept", stripped: true };

		expect(parseValidationArtifact(artifact, input)).toEqual(
			canonicalSchema.parse(input),
		);
	});

	test("matches Zod for nested arrays, unions, enums, and number checks", () => {
		const validInput = {
			mode: "auto",
			threshold: 3,
			tags: ["one"],
			stripped: true,
		};
		expect(parseValidationArtifact(settingsArtifact, validInput)).toEqual(
			canonicalSettingsSchema.parse(validInput),
		);

		const invalidInput = { mode: "other", threshold: true, tags: [] };
		const canonical = canonicalSettingsSchema.safeParse(invalidInput);
		if (canonical.success) throw new Error("invalid fixture was accepted");
		const parsed = parseValidationArtifact(settingsArtifact, invalidInput);
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");
		expect(parsed.issues).toEqual(canonical.error.issues);
	});

	test("resolves package-owned references for recursive schemas", () => {
		const validInput = {
			value: "root",
			children: [{ value: "leaf", children: [] }],
		};
		expect(parseValidationArtifact(treeArtifact, validInput)).toEqual(
			canonicalTreeSchema.parse(validInput),
		);

		const invalidInput = {
			value: "root",
			children: [{ value: 1, children: [] }],
		};
		const canonical = canonicalTreeSchema.safeParse(invalidInput);
		if (canonical.success) throw new Error("invalid fixture was accepted");
		const parsed = parseValidationArtifact(treeArtifact, invalidInput);
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");
		expect(parsed.issues).toEqual(canonical.error.issues);
	});

	test("allows repeated non-cyclic aliases across structural siblings", () => {
		const artifact: ValidationArtifact<{
			left: { value: string };
			right: { value: string };
		}> = {
			root: [
				"object",
				{
					left: ["object", { value: ["string"] }, "strict"],
					right: ["object", { value: ["string"] }, "strict"],
				},
				"strict",
			],
			version: 1,
		};
		const shared = { value: "same" };
		expect(
			parseValidationArtifact(artifact, { left: shared, right: shared }),
		).toEqual({ left: { value: "same" }, right: { value: "same" } });
	});
});

describe("parser path and issue-retention contract", () => {
	test("prefixes the selected nested union branch once in exact issue order", () => {
		const canonical = z.object({
			outer: z.union([
				z.object({
					kind: z.literal("selected"),
					nested: z.object({
						label: z.string().min(2),
						count: z.number().min(1),
					}),
				}),
				z.object({ kind: z.literal("other"), nested: z.null() }),
			]),
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			root: [
				"object",
				{
					outer: [
						"union",
						[
							[
								"object",
								{
									kind: ["literal", "selected"],
									nested: [
										"object",
										{
											label: ["string", [["min", 2]]],
											count: [
												"number",
												[["min", 1, true]],
											],
										},
										"strip",
									],
								},
								"strip",
							],
							[
								"object",
								{
									kind: ["literal", "other"],
									nested: ["null"],
								},
								"strip",
							],
						],
					],
				},
				"strip",
			],
			version: 1,
		};
		const input = {
			outer: { kind: "selected", nested: { label: "", count: 0 } },
		};
		const expected = canonical.safeParse(input);
		const actual = parseValidationArtifact(artifact, input);
		if (expected.success || !(actual instanceof ParsingError))
			throw new Error("expected matching failures");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(actual.issues.map(({ path }) => path)).toEqual([
			["outer", "nested", "label"],
			["outer", "nested", "count"],
		]);
	});

	test("keeps ambiguous nested-union branch paths relative", () => {
		const artifact: ValidationArtifact<unknown> = {
			root: [
				"object",
				{
					outer: [
						"union",
						[
							["string", [["min", 2]]],
							["string", [["max", 0]]],
						],
					],
				},
				"strip",
			],
			version: 1,
		};
		const parsed = parseValidationArtifact(artifact, { outer: "x" });
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");
		const issue = parsed.issues[0];
		if (issue?.code !== "invalid_union")
			throw new Error("expected invalid_union");
		expect(issue.path).toEqual(["outer"]);
		expect(
			issue.errors.map((branch) => branch.map(({ path }) => path)),
		).toEqual([[[]], [[]]]);
	});

	test("keeps strict-object union abort and branch order parity", () => {
		const canonical = z.object({
			outer: z.union([
				z.strictObject({ kind: z.literal("text"), value: z.string() }),
				z.strictObject({ kind: z.literal("count"), value: z.number() }),
			]),
		});
		const artifact: ValidationArtifact<unknown> = {
			root: [
				"object",
				{
					outer: [
						"union",
						[
							[
								"object",
								{
									kind: ["literal", "text"],
									value: ["string"],
								},
								"strict",
							],
							[
								"object",
								{
									kind: ["literal", "count"],
									value: ["number"],
								},
								"strict",
							],
						],
					],
				},
				"strip",
			],
			version: 1,
		};
		const input = { outer: { kind: "text", value: "ok", extra: true } };
		const expected = canonical.safeParse(input);
		const actual = parseValidationArtifact(artifact, input);
		if (expected.success || !(actual instanceof ParsingError))
			throw new Error("expected matching failures");
		expect(actual.issues).toEqual(expected.error.issues);
	});

	test("orders object-record-array sibling and bound paths like Zod", () => {
		const canonical = z.object({
			buckets: z.record(
				z.enum(["first", "second"]),
				z.array(z.string()).min(3),
			),
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			root: [
				"object",
				{
					buckets: [
						"record",
						["enum", ["first", "second"]],
						["array", ["string"], [["min", 3]]],
					],
				},
				"strip",
			],
			version: 1,
		};
		const input = { buckets: { first: [1], second: [2] } };
		const expected = canonical.safeParse(input);
		const actual = parseValidationArtifact(artifact, input);
		if (expected.success || !(actual instanceof ParsingError))
			throw new Error("expected matching failures");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(actual.issues.map(({ path }) => path)).toEqual([
			["buckets", "first", 0],
			["buckets", "first"],
			["buckets", "second", 0],
			["buckets", "second"],
		]);
	});

	test("prefixes contextual issues without mutating operation-owned paths", () => {
		const sourcePaths: [ParsingIssue["path"], ParsingIssue["path"]] = [
			[],
			["leaf"],
		];
		const artifact: ValidationArtifact<unknown> = {
			root: [
				"object",
				{
					items: [
						"array",
						[
							"pipe",
							["string"],
							[["operation", "test.contextual"]],
						],
						[],
					],
				},
				"strip",
			],
			version: 1,
		};
		const parsed = parseValidationArtifact(
			artifact,
			{ items: ["value"] },
			{
				"test.contextual": (value) => ({
					issues: sourcePaths.map((path) => ({
						code: "custom",
						message: "contextual",
						path,
					})),
					value,
				}),
			},
		);
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");
		expect(parsed.issues.map(({ path }) => path)).toEqual([
			["items", 0],
			["items", 0, "leaf"],
		]);
		expect(sourcePaths).toEqual([[], ["leaf"]]);
	});

	test("retains first-parse paths and never aliases sibling paths", () => {
		const artifact: ValidationArtifact<unknown> = {
			root: ["object", { left: ["string"], right: ["number"] }, "strip"],
			version: 1,
		};
		const first = parseValidationArtifact(artifact, {
			left: 1,
			right: "x",
		});
		if (!(first instanceof ParsingError))
			throw new Error("expected failure");
		const retained = structuredClone(first.issues);
		expect(first.issues[0]?.path).not.toBe(first.issues[1]?.path);
		const second = parseValidationArtifact(artifact, {
			left: 2,
			right: "y",
		});
		expect(second).toBeInstanceOf(ParsingError);
		expect(first.issues).toEqual(retained);
	});

	test("preserves normalized definition output across repeated parses", () => {
		const artifact: ValidationArtifact<{ value: string }> = {
			definitions: {
				normalized: ["pipe", ["string"], [["operation", "test.trim"]]],
			},
			root: ["object", { value: ["ref", "normalized"] }, "strip"],
			version: 1,
		};
		const operations: ValidationOperations = {
			"test.trim": (value) => ({ value: (value as string).trim() }),
		};
		const input = { value: "  retained  " };
		expect(parseValidationArtifact(artifact, input, operations)).toEqual({
			value: "retained",
		});
		expect(parseValidationArtifact(artifact, input, operations)).toEqual({
			value: "retained",
		});
	});

	test("keeps numeric indices numeric and missing optional/object paths exact", () => {
		const canonical = z.object({
			items: z.array(
				z.object({
					required: z.string(),
					optional: z.string().optional(),
				}),
			),
		});
		const artifact: ValidationArtifact<z.output<typeof canonical>> = {
			root: [
				"object",
				{
					items: [
						"array",
						[
							"object",
							{
								required: ["string"],
								optional: ["optional", ["string"]],
							},
							"strip",
						],
						[],
					],
				},
				"strip",
			],
			version: 1,
		};
		const input = { items: [{}] };
		const expected = canonical.safeParse(input);
		const actual = parseValidationArtifact(artifact, input);
		if (expected.success || !(actual instanceof ParsingError))
			throw new Error("expected matching failures");
		expect(actual.issues).toEqual(expected.error.issues);
		expect(actual.issues[0]?.path).toEqual(["items", 0, "required"]);
		expect(typeof actual.issues[0]?.path[1]).toBe("number");
	});
});
