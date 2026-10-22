import { describe, expect, test } from "bun:test";
import { parseTableSchemaFor, syncretismView } from "dumling";
import type * as Dumling from "dumling/types";

import { placeSurface, surfaceAxes } from "../../../src/inflection";
import {
	jedem,
	lemmaOf,
	nounSurface,
	verbSurface,
} from "../../support/inflection-fixtures";
import {
	imperativeFirstSingular,
	nounSchema,
	pronounSchema,
	verbSchema,
} from "../../support/toy-inflection-pack";

const bank = lemmaOf("NOUN", "Bank");
const senden = lemmaOf("VERB", "senden");

describe("the toy schemas", () => {
	test("are Table Schemas of their routes", () => {
		for (const [schema, kind] of [
			[nounSchema, "NOUN"],
			[verbSchema, "VERB"],
			[pronounSchema, "PRON"],
		] as const)
			expect(
				parseTableSchemaFor(schema, {
					language: "de",
					family: "Lexeme",
					kind,
				}).success,
			).toBe(true);
	});
});

describe("placeSurface", () => {
	test("a Surface Covers the cell equal to it on every key feature", () => {
		expect(
			placeSurface(
				nounSchema,
				nounSurface(bank, "Bänken", "Dat", "Plur"),
			),
		).toEqual({ kind: "Covers", cells: ["case=Dat|number=Plur"] });
	});

	test("a form that realizes several values Covers each of their cells", () => {
		const twoCases = {
			...nounSurface(bank, "Bänke", "Nom", "Plur"),
			inflectionalFeatures: {
				case: ["Acc", "Nom"],
				gender: null,
				number: "Plur",
			},
		} as unknown as Dumling.Surface;
		expect(placeSurface(nounSchema, twoCases)).toEqual({
			kind: "Covers",
			cells: ["case=Nom|number=Plur", "case=Acc|number=Plur"],
		});
	});

	test("a Surface Syncretism is OneOf its units' cells, and its view OneOf every open cell", () => {
		expect(placeSurface(pronounSchema, jedem)).toEqual({
			kind: "OneOf",
			cells: [
				"case=Dat|gender=Masc|number=Sing",
				"case=Dat|gender=Neut|number=Sing",
			],
		});
		expect(placeSurface(pronounSchema, syncretismView(jedem))).toEqual({
			kind: "OneOf",
			cells: [
				"case=Dat|gender=Masc|number=Sing",
				"case=Dat|gender=Neut|number=Sing",
				"case=Dat|gender=Fem|number=Sing",
			],
		});
	});

	test("a literal null on a key feature is never a wildcard", () => {
		expect(
			placeSurface(nounSchema, nounSurface(bank, "Bank", null, "Sing")),
		).toEqual({ kind: "Unplaced" });
	});

	test("a passive fits no active cell, since passive is a key feature", () => {
		const passive = verbSurface(senden, "wurde gesendet", {
			person: "3",
			number: "Sing",
			passive: true,
		});
		expect(placeSurface(verbSchema, passive)).toEqual({ kind: "Unplaced" });
		expect(
			placeSurface(
				verbSchema,
				verbSurface(senden, "sendete", { person: "3", number: "Sing" }),
			),
		).toEqual({
			kind: "Covers",
			cells: ["mood=Ind|number=Sing|person=3|tense=Past|verbForm=Fin"],
		});
	});

	test("a structural hole is never a place", () => {
		const first = {
			...verbSurface(senden, "sende", { person: "1", number: "Sing" }),
		} as { inflectionalFeatures: Record<string, unknown> };
		first.inflectionalFeatures = {
			...first.inflectionalFeatures,
			mood: "Imp",
			tense: null,
		};
		expect(imperativeFirstSingular).toBe(
			"mood=Imp|number=Sing|person=1|verbForm=Fin",
		);
		expect(
			placeSurface(verbSchema, first as unknown as Dumling.Surface),
		).toEqual({ kind: "Unplaced" });
	});

	test("without a schema every Surface is Unplaced", () => {
		expect(
			placeSurface(undefined, nounSurface(bank, "Bank", "Nom", "Sing")),
		).toEqual({ kind: "Unplaced" });
	});
});

describe("surfaceAxes", () => {
	test("lists the bundle of each cell a Surface fills, in schema order", () => {
		expect(
			surfaceAxes(nounSchema, nounSurface(bank, "Bänken", "Dat", "Plur")),
		).toEqual({
			placement: { kind: "Covers", cells: ["case=Dat|number=Plur"] },
			bundles: [{ case: "Dat", number: "Plur" }],
		});
		expect(surfaceAxes(pronounSchema, jedem).bundles).toEqual([
			{ number: "Sing", case: "Dat", gender: "Masc" },
			{ number: "Sing", case: "Dat", gender: "Neut" },
		]);
	});

	test("an Unplaced Surface keeps its own non-null features", () => {
		const passive = verbSurface(senden, "wurde gesendet", {
			person: "3",
			number: "Sing",
			passive: true,
		});
		expect(surfaceAxes(verbSchema, passive)).toEqual({
			placement: { kind: "Unplaced" },
			bundles: [
				{
					mood: "Ind",
					number: "Sing",
					passive: "Process",
					person: "3",
					tense: "Past",
					verbForm: "Fin",
					voice: "Pass",
				},
			],
		});
		expect(
			surfaceAxes(undefined, nounSurface(bank, "Bank", "Nom", "Sing")),
		).toEqual({
			placement: { kind: "Unplaced" },
			bundles: [{ case: "Nom", number: "Sing" }],
		});
	});
});
