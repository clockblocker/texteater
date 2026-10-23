import { describe, expect, test } from "bun:test";
import {
	dimensionIdSchema,
	directSemanticRelationSchema,
	readingKnowledgeSchema,
	translationLanguageSchema,
} from "dumrel/schema";
import { checkRecord } from "../src/check-record.js";
import { knowledgeCoverageSchema } from "../src/record-schema.js";
import { review, seedJson } from "./negative-fixtures.js";
import { verbCoverage, verbParadigm } from "./verb-fixtures.js";

describe("Knowledge coverage", () => {
	test("a target's Reading carries its Knowledge, checked against the Reading", () => {
		const json = seedJson("de/pass-auf-dich-auf");
		const knowledge = { definition: "to watch out" };
		json.targets[0].reading = { emojiDescription: "👀", knowledge };
		const checked = checkRecord("de/pass-auf-dich-auf", json);
		expect(checked.errors).toEqual([]);
		expect(checked.record?.targets[0]?.knowledge).toEqual(knowledge);
		expect(checked.record?.targets[1]).not.toHaveProperty("knowledge");
	});

	test("a target's coverage covers its structural aspects, and an authored Reading's are the inventory's", () => {
		const json = review(seedJson("de/pass-auf-dich-auf"));
		json.reviewDepth = "Knowledge";
		json.targets[0].reading.knowledge = { definition: "to watch out" };
		json.targets[0].reading.paradigm = verbParadigm;
		json.targets[0].reading.coverage = verbCoverage;
		// dich is authored, so its Knowledge is reviewed in the inventory.
		json.targets[1].reading.knowledge = {};
		const checked = checkRecord("de/pass-auf-dich-auf", json);
		expect([...checked.errors, ...checked.issues]).toEqual([]);
		expect(checked.validThrough).toBe("Knowledge");
		expect(checked.record?.targets[0]?.coverage).toEqual(verbCoverage);
		expect(checked.record?.targets[0]?.paradigm).toEqual(verbParadigm);
		expect(checked.record?.targets[1]?.knowledge).toEqual({});
	});

	test("Knowledge with a structural aspect uncovered stays work in a Draft", () => {
		const json = seedJson("de/pass-auf-dich-auf");
		json.targets[0].reading = {
			emojiDescription: "👀",
			knowledge: { definition: "to watch out" },
			coverage: { definition: "Authored" },
		};
		json.targets[1].reading = { emojiDescription: "👈", knowledge: {} };
		const checked = checkRecord("de/pass-auf-dich-auf", json);
		expect([...checked.errors, ...checked.issues]).toEqual([]);
		expect(checked.validThrough).toBe("Reading");
	});

	test("coverage names every aspect and relation Reading Knowledge stores, and every Variation Dimension", () => {
		const keys = (shape: object) => Object.keys(shape).toSorted();
		const { shape } = knowledgeCoverageSchema;
		expect(keys(shape)).toEqual(
			[...keys(readingKnowledgeSchema.shape), "paradigm"].toSorted(),
		);
		expect(keys(shape.paradigm.unwrap().shape)).toEqual(
			[...dimensionIdSchema.options].toSorted(),
		);
		expect(keys(shape.semanticRelations.unwrap().shape)).toEqual(
			[...directSemanticRelationSchema.options].toSorted(),
		);
		expect(keys(shape.translations.unwrap().shape)).toEqual(
			[...translationLanguageSchema.options].toSorted(),
		);
	});
});
