import { describe, expect, test } from "bun:test";
import { cellBundleOf, cellKeyOf, parseTableSchemaFor } from "dumling";
import type { TablePanel, TableSchema } from "dumling/types";

const noun = { language: "de", family: "Lexeme", kind: "NOUN" } as const;
const verb = { language: "de", family: "Lexeme", kind: "VERB" } as const;

const cases = ["Nom", "Acc", "Dat", "Gen"].map((value) => ({
	bundle: { case: value },
}));
const numbers = ["Sing", "Plur"].map((value) => ({
	bundle: { number: value },
}));
const declension: TableSchema = {
	id: "de/Lexeme/NOUN",
	version: 1,
	keyFeatures: ["case", "number"],
	panels: [
		{
			id: "declension",
			core: true,
			fixed: {},
			rows: cases,
			columns: numbers,
		},
	],
};

const persons = ["1", "2", "3"].map((value) => ({
	bundle: { person: value },
}));
const finite = (
	id: string,
	tense: "Pres" | "Past",
	core: boolean,
): TablePanel => ({
	id,
	core,
	fixed: { verbForm: "Fin", mood: "Ind", tense },
	rows: persons,
	columns: numbers,
});
const conjugation: TableSchema = {
	id: "de/Lexeme/VERB",
	version: 1,
	keyFeatures: [
		"verbForm",
		"mood",
		"tense",
		"person",
		"number",
		"voice",
		"passive",
		"perfect",
		"future",
	],
	panels: [
		finite("present", "Pres", true),
		finite("preterite", "Past", true),
		{
			id: "imperative",
			core: true,
			fixed: { verbForm: "Fin", mood: "Imp" },
			rows: persons,
			columns: numbers,
			absent: [
				"mood=Imp|number=Sing|person=1|verbForm=Fin",
				"mood=Imp|number=Sing|person=3|verbForm=Fin",
			],
		},
	],
};

const failure = (input: unknown, route: typeof noun | typeof verb = noun) => {
	const parsed = parseTableSchemaFor(input, route);
	if (parsed.success) throw Error("Expected the schema to fail");
	return parsed.error.issues[0];
};

describe("cellKeyOf", () => {
	test("keeps the key features in code-point order and leaves the rest out", () => {
		expect(
			cellKeyOf({ number: "Plur", gender: "Fem", case: "Dat" }, [
				"number",
				"case",
			]),
		).toBe("case=Dat|number=Plur");
	});

	test("leaves out a key feature the bundle lacks", () => {
		expect(cellKeyOf({ case: "Nom" }, ["number", "case"])).toBe("case=Nom");
		expect(cellKeyOf({}, ["case"])).toBe("");
	});

	test("gives one key whatever the bundle's or the key features' order", () => {
		const keys = [
			cellKeyOf({ case: "Dat", number: "Plur" }, ["case", "number"]),
			cellKeyOf({ number: "Plur", case: "Dat" }, ["number", "case"]),
		];
		expect(new Set(keys).size).toBe(1);
	});

	test("keeps feature names with a layer, such as number[psor]", () => {
		expect(
			cellKeyOf({ "number[psor]": "Sing", number: "Plur" }, [
				"number[psor]",
				"number",
			]),
		).toBe("number=Plur|number[psor]=Sing");
	});

	test("a passive Surface fits no active cell, because its key keeps passive", () => {
		const preterite = conjugation.panels[1];
		if (!preterite) throw Error("Missing panel");
		const cells = new Set(
			preterite.rows.flatMap((row) =>
				preterite.columns.map((column) =>
					cellKeyOf(
						cellBundleOf(preterite, row, column),
						conjugation.keyFeatures,
					),
				),
			),
		);
		// `schrieb` and `wurde geschrieben`, third person singular.
		const active = {
			verbForm: "Fin",
			mood: "Ind",
			tense: "Past",
			person: "3",
			number: "Sing",
		};
		const passive = { ...active, voice: "Pass", passive: "Process" };
		expect(cells.has(cellKeyOf(active, conjugation.keyFeatures))).toBe(
			true,
		);
		expect(cells.has(cellKeyOf(passive, conjugation.keyFeatures))).toBe(
			false,
		);
	});
});

describe("cellBundleOf", () => {
	test("joins the panel's fixed bundle with its row and column", () => {
		const [present] = conjugation.panels;
		if (!present) throw Error("Missing panel");
		expect(
			cellBundleOf(
				present,
				{ bundle: { person: "2" } },
				{ bundle: { number: "Plur" } },
			),
		).toEqual({
			verbForm: "Fin",
			mood: "Ind",
			tense: "Pres",
			person: "2",
			number: "Plur",
		});
	});
});

describe("parseTableSchemaFor", () => {
	test("accepts a noun declension and a verb conjugation, fresh", () => {
		const parsed = parseTableSchemaFor(declension, noun);
		expect(parsed).toEqual({ success: true, value: declension });
		if (parsed.success) expect(parsed.value).not.toBe(declension);
		expect(parseTableSchemaFor(conjugation, verb).success).toBe(true);
	});

	describe("disjointness", () => {
		test("rejects a row that repeats a fixed feature", () => {
			expect(
				failure({
					...declension,
					panels: [
						{
							id: "plural",
							core: true,
							fixed: { number: "Plur" },
							rows: [{ bundle: { case: "Nom", number: "Plur" } }],
							columns: [{ bundle: {} }],
						},
					],
				})?.message,
			).toContain("disjoint");
		});

		test("rejects a column that repeats a row feature", () => {
			expect(
				failure({
					...declension,
					panels: [
						{
							id: "declension",
							core: true,
							fixed: {},
							rows: cases,
							columns: [{ bundle: { case: "Nom" } }],
						},
					],
				})?.message,
			).toContain("shares case");
		});

		test("rejects a column that repeats a fixed feature", () => {
			expect(
				failure(
					{
						...conjugation,
						panels: [
							{
								...finite("present", "Pres", true),
								columns: [{ bundle: { tense: "Pres" } }],
							},
						],
					},
					verb,
				)?.message,
			).toContain("shares tense");
		});
	});

	describe("bag membership", () => {
		test("rejects a feature outside the route's inflectional bag", () => {
			expect(
				failure({
					...declension,
					panels: [
						{
							id: "declension",
							core: true,
							fixed: { tense: "Pres" },
							rows: cases,
							columns: numbers,
						},
					],
				}),
			).toMatchObject({
				path: ["panels", 0, "fixed", "tense"],
				message:
					"tense is not a feature of the de/Lexeme/NOUN inflectional bag",
			});
		});

		test("rejects a value the route's bag doesn't allow", () => {
			expect(
				failure({
					...declension,
					panels: [
						{
							id: "declension",
							core: true,
							fixed: {},
							rows: [{ bundle: { case: "Loc" } }],
							columns: numbers,
						},
					],
				}),
			).toMatchObject({
				path: ["panels", 0, "rows", 0, "bundle", "case"],
			});
		});

		test("rejects a key feature outside the bag", () => {
			expect(
				failure({ ...declension, keyFeatures: ["case", "person"] }),
			).toMatchObject({ path: ["keyFeatures", 1] });
		});

		test("rejects a key feature listed twice", () => {
			expect(
				failure({ ...declension, keyFeatures: ["case", "case"] })
					?.message,
			).toBe("case is listed twice");
		});

		test("takes the bag of every branch: a participle cell is a verb cell", () => {
			expect(
				parseTableSchemaFor(
					{
						...conjugation,
						panels: [
							{
								id: "participle",
								core: true,
								fixed: { verbForm: "Part" },
								rows: [{ bundle: { participleForm: "Past" } }],
								columns: [{ bundle: {} }],
							},
						],
					},
					verb,
				).success,
			).toBe(true);
		});

		test("rejects every schema for a route whose Surfaces don't inflect", () => {
			expect(
				failure({ ...declension, keyFeatures: [], panels: [] }, {
					language: "de",
					family: "Lexeme",
					kind: "CCONJ",
				} as never)?.message,
			).toBe(
				"The route de/Lexeme/CCONJ has no inflectional bag to tabulate",
			);
		});
	});

	describe("cells", () => {
		test("rejects two cells with one Cell Key", () => {
			expect(
				failure({
					...declension,
					panels: [
						declension.panels[0],
						{ ...declension.panels[0], id: "again" },
					],
				})?.message,
			).toContain("already belongs to the panel declension");
		});

		test("rejects cells that differ only on a feature the key drops", () => {
			expect(
				failure({ ...declension, keyFeatures: ["case"] })?.message,
			).toContain('The cell "case=Nom"');
		});

		test("rejects an absent key that names no cell of its panel", () => {
			expect(
				failure(
					{
						...conjugation,
						panels: [
							finite("present", "Pres", true),
							{
								...finite("preterite", "Past", true),
								absent: [
									"mood=Ind|number=Sing|person=1|tense=Pres|verbForm=Fin",
								],
							},
						],
					},
					verb,
				),
			).toMatchObject({ path: ["panels", 1, "absent", 0] });
		});

		test("rejects a panel id used twice and a panel with no rows", () => {
			expect(
				failure(
					{
						...conjugation,
						panels: [
							finite("present", "Pres", true),
							finite("present", "Past", true),
						],
					},
					verb,
				)?.message,
			).toBe("The panel id present is taken");
			expect(
				failure({
					...declension,
					panels: [{ ...declension.panels[0], rows: [] }],
				})?.message,
			).toBe("A panel has at least one of its rows");
		});
	});

	describe("shape", () => {
		test("rejects a label or other non-string feature value", () => {
			expect(
				failure({
					...declension,
					panels: [
						{
							...declension.panels[0],
							rows: [
								{
									bundle: {
										case: { value: "Nom", label: "N" },
									},
								},
							],
						},
					],
				}),
			).toMatchObject({
				path: ["panels", 0, "rows", 0, "bundle", "case"],
			});
		});

		test("rejects the characters a Cell Key spells with", () => {
			expect(
				failure({ ...declension, keyFeatures: ["case|number"] }),
			).toMatchObject({ path: ["keyFeatures"] });
		});

		test("rejects a missing version and a non-boolean core", () => {
			expect(failure({ ...declension, version: 0 })).toMatchObject({
				path: ["version"],
			});
			expect(
				failure({
					...declension,
					panels: [{ ...declension.panels[0], core: "yes" }],
				}),
			).toMatchObject({ path: ["panels", 0, "core"] });
		});
	});
});
