import { describe, expect, test } from "bun:test";
import { staleAdrStatus } from "../src/check-citations.js";
import { loadSpecRecords, rules } from "../src/index.js";
import { germanKeptValues } from "../src/worklist/kept-values.js";
import {
	loadSchemaValues,
	reviewedValueKeys,
	routeSchemaValues,
	schemaValueKey,
	unkeptValues,
} from "../src/worklist/schema-values.js";
import { readRepositoryAdrStatuses } from "./adr-statuses.js";

const germanValues = await loadSchemaValues("de");

describe("the schema values", () => {
	test("list each Core and inflectional value a route allows, through unions", () => {
		const nullable = (...values: string[]) => ({
			anyOf: [{ type: "string", enum: values }, { type: "null" }],
		});
		expect(
			routeSchemaValues("Lexeme/PART", {
				properties: {
					lemma: {
						properties: {
							coreFeatures: {
								properties: {
									polarity: nullable("Neg", "Pos"),
									hasSepPrefix: {
										anyOf: [{}, { type: "null" }],
									},
								},
							},
						},
					},
					inflectionalFeatures: {
						anyOf: [
							{ properties: { degree: { const: "Cmp" } } },
							{ properties: { degree: nullable("Pos", "Cmp") } },
							{ type: "null" },
						],
					},
				},
			}).map(schemaValueKey),
		).toEqual([
			"Lexeme/PART Core polarity=Neg",
			"Lexeme/PART Core polarity=Pos",
			"Lexeme/PART Inflectional degree=Cmp",
			"Lexeme/PART Inflectional degree=Pos",
		]);
	});

	test("are read from Dumling's German routes", () => {
		const keys = new Set(germanValues.map(schemaValueKey));
		expect(keys.has("Lexeme/PART Core partType=Mod")).toBe(true);
		// Answers are INTJ partType Res, so Pos left German PART (#734).
		expect(keys.has("Lexeme/PART Core polarity=Pos")).toBe(false);
		// German ADP Core is abbr only (ADR 0032).
		expect(keys.has("Lexeme/ADP Core adpType=Circ")).toBe(false);
		expect(keys.has("Lexeme/VERB Inflectional verbForm=Fin")).toBe(true);
	});

	test("count a use only in a record reviewed through Attestation", () => {
		const [reviewed] = loadSpecRecords().filter(
			(record) => record.reviewDepth === "Reading",
		);
		if (!reviewed) throw Error("Expected a Reviewed record");
		const { reviewDepth: _, ...draft } = reviewed;
		expect(reviewedValueKeys([reviewed]).size).toBeGreaterThan(0);
		expect(reviewedValueKeys([draft]).size).toBe(0);
		expect(
			reviewedValueKeys([{ ...reviewed, reviewDepth: "Segmentation" }])
				.size,
		).toBe(0);
	});

	test("are unkept when neither used nor kept", () => {
		const values = routeSchemaValues("Lexeme/PART", {
			properties: {
				lemma: {
					properties: {
						coreFeatures: {
							properties: {
								polarity: { enum: ["Neg", "Pos"] },
								partType: { enum: ["Inf"] },
							},
						},
					},
				},
			},
		});
		expect(
			unkeptValues(values, new Set(["Lexeme/PART Core polarity=Neg"]), [
				{
					route: "Lexeme/PART",
					bag: "Core",
					feature: "partType",
					value: "Inf",
					keptBy: { issue: 1 },
					why: "Open",
				},
			]).map(schemaValueKey),
		).toEqual(["Lexeme/PART Core polarity=Pos"]);
	});
});

describe("the German keep list", () => {
	const adrStatuses = readRepositoryAdrStatuses();
	const allowed = new Set(germanValues.map(schemaValueKey));

	test("keeps only values the schema allows, once each", () => {
		const keys = germanKeptValues.map(schemaValueKey);
		expect(keys.filter((key) => !allowed.has(key))).toEqual([]);
		expect(new Set(keys).size).toBe(keys.length);
	});

	test("cites a Rule naming the value, a current ADR or an issue", () => {
		for (const kept of germanKeptValues) {
			const { keptBy } = kept;
			if ("rule" in keptBy) {
				const rule = rules.find(({ id }) => id === keptBy.rule);
				expect(rule?.statement, schemaValueKey(kept)).toContain(
					`${kept.feature} ${kept.value}`,
				);
			} else if ("adr" in keptBy) {
				const status = adrStatuses.get(keptBy.adr) ?? "missing";
				expect(
					staleAdrStatus.test(status) || status === "missing",
				).toBe(false);
			} else expect(keptBy.issue).toBeGreaterThan(0);
			expect(kept.why.trim()).not.toBe("");
		}
	});
});
