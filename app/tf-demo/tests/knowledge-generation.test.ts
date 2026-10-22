import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { api } from "../convex/_generated/api";
import { defaultKnowledgeSettings } from "../convex/knowledgeSettings";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import {
	answeredRelationKinds,
	knowledgeRequestComplete,
	missingKnowledgeRequest,
} from "../server/knowledgeCompletion";
import { createTestConvex } from "./support/convex";
import { BANK_READING } from "./support/knowledgeGeneration";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("retry requests skip saved text and covered translations but retain missing leaves", () => {
	expect(
		missingKnowledgeRequest(
			{
				definition: null,
				transcription: null,
				translations: { en: null, ru: null },
			},
			{
				knowledge: {
					definition: "Ein Geldinstitut.",
					translations: { en: ["bank"], ru: [] },
				},
				checkedRelationKinds: [],
			},
		),
	).toEqual({ transcription: null, translations: { ru: null } });
	expect(
		missingKnowledgeRequest(
			{ definition: null },
			{ knowledge: {}, checkedRelationKinds: [] },
		),
	).toEqual({ definition: null });
});

test("an answered relation kind covers the request even with no stored target", async () => {
	const request = {
		definition: null,
		semanticRelations: { synonym: null, antonym: null },
	};
	const knowledge = { definition: "Ein Geldinstitut." };
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: [] },
			request,
			[],
		),
	).toBe(false);
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: ["synonym", "antonym"] },
			request,
			[],
		),
	).toBe(true);
	expect(
		missingKnowledgeRequest(request, {
			knowledge,
			checkedRelationKinds: ["synonym"],
		}),
	).toEqual({ semanticRelations: { antonym: null } });

	expect(answeredRelationKinds(["synonym", "antonym"], false, [])).toEqual(
		[],
	);
	expect(
		answeredRelationKinds(["synonym", "antonym"], true, [
			{ aspect: "semanticRelations", leaf: "antonym" },
		]),
	).toEqual(["synonym"]);
	expect(
		answeredRelationKinds(["synonym"], true, [
			{ aspect: "semanticRelations" },
		]),
	).toEqual([]);
});

test("Knowledge settings default enabled and persist independently per visitor", async () => {
	const t = createTestConvex();
	const defaults = defaultKnowledgeSettings();
	expect(defaults.semanticRelations.nearAntonym).toBe(true);
	expect(defaults.translations).toEqual({ en: true, ru: true });
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(defaults);
	const hiddenDefinition = { ...defaults, definition: false };
	expect(
		await t.mutation(api.knowledgeSettings.update, {
			visitorId: "visitor-1",
			settings: hiddenDefinition,
		}),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-2" }),
	).toEqual(defaults);

	expect(generationRequestFor(BANK_READING, []).definition).toBeNull();
});
