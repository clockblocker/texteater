import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import * as Effect from "effect/Effect";
import { api, internal } from "../convex/_generated/api";
import type { ActionCtx } from "../convex/_generated/server";
import { accumulateTranslations } from "../convex/translationAccumulationActions";
import { accumulateValency } from "../convex/valencyAccumulationActions";
import { readingIdentityKey } from "../server/linguisticIdentity";
import {
	actionContext,
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import { EMPTY_RELATION_RUN } from "./support/knowledge-generation";
import {
	bankOccurrenceCommit,
	bankReading,
	type Selection,
	sessionGuard,
} from "./support/occurrences";
import { fakeTypeSafe, unavailableProviders } from "./support/providers";

/*
 * Post-click DEV inspection: Definition Text materialization, Available-click
 * Knowledge top-up propagation, and post-click translation/valency
 * accumulation all record under the originating click's requestId.
 */

enableDeploymentFlags();

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const SELECTION =
	"Select segment and schedule resolution [Code · app/tf-demo · resolutionSessions.selectSegment · Success]";

async function savedSteps(t: TestConvexDb, requestId: string) {
	const steps = await t.run((ctx) =>
		ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_started_at", (q) =>
				q.eq("requestId", requestId),
			)
			.collect(),
	);
	return Promise.all(
		steps.map(async (step) => ({
			...step,
			payload: JSON.parse(
				(
					await t.run((ctx) =>
						ctx.db
							.query("inspectionPayloads")
							.withIndex("by_step_id_and_part", (q) =>
								q.eq("stepId", step._id),
							)
							.collect(),
					)
				)
					.map(({ text }) => text)
					.join(""),
			),
		})),
	);
}

async function inspection(t: TestConvexDb, requestId: string) {
	const steps = await savedSteps(t, requestId);
	const byId = new Map(steps.map((step) => [step.id, step]));
	const path = (step: (typeof steps)[number]): string => {
		const parent = step.parentId ? byId.get(step.parentId) : undefined;
		return parent
			? `${path(parent)} > ${step.name}`
			: `${step.parentId ? "? > " : ""}${step.name}`;
	};
	return steps
		.map(
			(step) =>
				`${path(step)} [${step.kind} · ${step.owner} · ${step.status}]`,
		)
		.sort();
}

async function bankenSource(t: TestConvexDb) {
	const { sentenceIds } = await submitText(t, [["Die", " ", "Banken", "."]]);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a Sentence.");
	return (requestId: string): Selection => ({
		requestId,
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 2,
	});
}

async function select(t: TestConvexDb, selection: Selection, inspect: boolean) {
	await t.mutation(api.resolutionSessions.selectSegment, {
		...selection,
		inspect,
	});
	return sessionGuard(t, selection.requestId);
}

async function publishInspectedDefinition(
	t: TestConvexDb,
	requestId: string,
	definition: string,
) {
	const selection = await bankenSource(t);
	const click = selection(requestId);
	const guard = await select(t, click, true);
	await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(click, guard),
	);
	await t.mutation(internal.knowledgeGeneration.begin, {
		attemptKey: requestId,
	});
	await t.mutation(internal.knowledgeGeneration.publish, {
		attemptKey: requestId,
		final: false,
		reading: bankReading,
		changes: [
			{
				kind: "Contribute",
				aspect: "definition",
				value: definition,
			},
		],
		pendingRelations: [],
		productionEvidence: {
			request: { definition: null },
			failures: [],
			operationTraces: [],
		},
		relationPublication: { ...EMPTY_RELATION_RUN, runNumber: 1 },
	});
	return { click, readingKey: readingIdentityKey(bankReading) };
}

test("an inspected click carries inspection into Definition Text materialization and reports its state until Ready", async () => {
	const t = createTestConvex();
	const { click, readingKey } = await publishInspectedDefinition(
		t,
		"request-1",
		"Die Banken.",
	);

	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	expect(
		jobs
			.filter(({ name }) => name === "definitionTextActions:materialize")
			.map(({ args }) => args[0]),
	).toEqual([{ ownerReadingKey: readingKey, inspectRequestId: "request-1" }]);
	expect(
		await t.query(api.resolutionInspection.detail, {
			visitorId: click.visitorId,
			requestId: "request-1",
		}),
	).toMatchObject({
		definitionTextState: "Scheduled",
	});

	const providers = fakeTypeSafe();
	try {
		await t.action(internal.definitionTextActions.materialize, {
			ownerReadingKey: readingKey,
			inspectRequestId: "request-1",
		});
	} finally {
		providers.restore();
	}

	expect(await inspection(t, "request-1")).toEqual([
		"Materialize Definition Text > Claim and load definition [Code · app/tf-demo · definitionTextActions · Success]",
		"Materialize Definition Text > Persist segmented definition [Code · app/tf-demo · definitionTextActions · Success]",
		"Materialize Definition Text > segment.inUnits > candidates · Sentence 0 [TypeSafe · battery/dumgen · jev · Success]",
		"Materialize Definition Text > segment.inUnits > route · Sentence 0 [TypeSafe · battery/dumgen · jev · Success]",
		"Materialize Definition Text > segment.inUnits [Code · battery/dumgen · Success]",
		"Materialize Definition Text [Code · app/tf-demo · definitionTextActions · Success]",
		SELECTION,
	]);
	const routeStep = (await savedSteps(t, "request-1")).find(
		(step) => step.name === "route · Sentence 0",
	);
	expect(routeStep?.payload).toMatchObject({
		input: { questions: expect.any(Object) },
		output: { answers: expect.any(Object) },
	});
	expect(
		await t.query(api.resolutionInspection.detail, {
			visitorId: click.visitorId,
			requestId: "request-1",
		}),
	).toMatchObject({
		definitionTextState: "Ready",
	});
});

test("a failed inspected Definition Text materialization marks its root failed on provider failure and missing-key failure", async () => {
	const t = createTestConvex();
	const { readingKey } = await publishInspectedDefinition(
		t,
		"request-1",
		"Die Banken.",
	);

	// 1. Provider failure during `segment.inUnits`: Dumgen marks the sentence
	// failed, `materialize` persists it with `segmentationFailed: true` and
	// marks the inspection root Failure.
	const providers = unavailableProviders();
	const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
	try {
		await t.action(internal.definitionTextActions.materialize, {
			ownerReadingKey: readingKey,
			inspectRequestId: "request-1",
		});
	} finally {
		providers.restore();
		warnSpy.mockRestore();
	}

	expect(await inspection(t, "request-1")).toEqual([
		"Materialize Definition Text > Claim and load definition [Code · app/tf-demo · definitionTextActions · Success]",
		"Materialize Definition Text > Persist segmented definition [Code · app/tf-demo · definitionTextActions · Success]",
		"Materialize Definition Text > segment.inUnits > candidates · Sentence 0 [TypeSafe · battery/dumgen · jev · Failure]",
		"Materialize Definition Text > segment.inUnits [Code · battery/dumgen · Failure]",
		"Materialize Definition Text [Code · app/tf-demo · definitionTextActions · Failure]",
		SELECTION,
	]);

	// 2. Missing Jev key: `materialize` records the failed step, settles the
	// definition text to Failed, and `detail` reports `definitionTextState: "Failed"`.
	const t2 = createTestConvex();
	const { click: click2 } = await publishInspectedDefinition(
		t2,
		"request-2",
		"Die Banken.",
	);
	const savedKey = process.env.TYPESAFE_API_KEY;
	delete process.env.TYPESAFE_API_KEY;
	const errorSpy = spyOn(console, "error").mockImplementation(() => {});
	try {
		await t2.action(internal.definitionTextActions.materialize, {
			ownerReadingKey: readingKey,
			inspectRequestId: "request-2",
		});
	} finally {
		if (savedKey !== undefined) process.env.TYPESAFE_API_KEY = savedKey;
		errorSpy.mockRestore();
	}

	expect(await inspection(t2, "request-2")).toEqual([
		"Materialize Definition Text > Claim and load definition [Code · app/tf-demo · definitionTextActions · Success]",
		"Materialize Definition Text > Definition segmentation failed [Code · app/tf-demo · definitionTextActions · Failure]",
		"Materialize Definition Text > Settle definition materialization [Code · app/tf-demo · definitionTextActions · Success]",
		"Materialize Definition Text [Code · app/tf-demo · definitionTextActions · Failure]",
		SELECTION,
	]);
	expect(
		await t2.query(api.resolutionInspection.detail, {
			visitorId: click2.visitorId,
			requestId: "request-2",
		}),
	).toMatchObject({
		definitionTextState: "Failed",
	});
});

test("an inspected Available click passes inspect to the Knowledge run it schedules", async () => {
	const t = createTestConvex();
	const selection = await bankenSource(t);
	const first = selection("request-1");
	const guard = await select(t, first, false);
	await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(first, guard),
	);
	// Clear the first click's attempt so the second click schedules a fresh run.
	await t.run(async (ctx) => {
		for (const attempt of await ctx.db
			.query("knowledgeGenerationAttempts")
			.collect())
			await ctx.db.delete(attempt._id);
	});

	const second = { ...selection("request-2"), visitorId: "visitor-2" };
	const result = await t.mutation(api.resolutionSessions.selectSegment, {
		...second,
		inspect: true,
	});
	expect(result.kind).toBe("Available");
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	expect(
		jobs
			.filter(
				({ name, args }) =>
					name ===
						"knowledgeGenerationActions:runKnowledgeGeneration" &&
					(args[0] as { attemptKey?: string })?.attemptKey ===
						"request-2",
			)
			.map(({ args }) => args[0]),
	).toEqual([{ attemptKey: "request-2", inspect: true }]);
});

test("inspected post-click translation and valency accumulation record their steps under the click", async () => {
	const t = createTestConvex();
	const { sentenceIds } = await submitText(t, [
		["Die", " ", "Banken", "."],
		["Neue", " ", "Banken", "."],
	]);
	const [firstSentenceId, secondSentenceId] = sentenceIds;
	if (!firstSentenceId || !secondSentenceId)
		throw new Error("Expected two Sentences.");

	// First occurrence creates the Reading and stores an initial translation.
	const first: Selection = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId: firstSentenceId,
		clickedSegmentIndex: 2,
	};
	const firstGuard = await select(t, first, false);
	await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(first, firstGuard),
	);
	await t.mutation(internal.knowledgeGeneration.begin, {
		attemptKey: "request-1",
	});
	await t.mutation(internal.knowledgeGeneration.publish, {
		attemptKey: "request-1",
		final: true,
		reading: bankReading,
		changes: [
			{
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: [[{ kind: "Text", text: "bank" }]],
			},
		],
		pendingRelations: [],
		productionEvidence: {
			request: { translations: { en: null } },
			failures: [],
			operationTraces: [],
		},
		relationPublication: { ...EMPTY_RELATION_RUN, runNumber: 1 },
	});

	// Second inspected occurrence reuses the Reading and schedules accumulation
	// carrying the click's inspectRequestId.
	const second: Selection = {
		requestId: "request-2",
		visitorId: "visitor-1",
		sentenceId: secondSentenceId,
		clickedSegmentIndex: 2,
	};
	const secondGuard = await select(t, second, true);
	const committed = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(second, secondGuard, "Reuse"),
	);
	if (committed.status !== "Committed")
		throw new Error(`Expected Committed, got ${committed.status}.`);

	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	expect(
		jobs
			.filter(
				({ name }) =>
					name === "translationAccumulationActions:accumulate",
			)
			.map(({ args }) => args[0]),
	).toEqual([
		{
			attestationId: committed.attestationId,
			languages: ["en", "ru"],
			inspectRequestId: "request-2",
		},
	]);

	const ctx = actionContext(t) as unknown as Pick<
		ActionCtx,
		"runQuery" | "runMutation"
	>;
	await accumulateTranslations(
		ctx,
		{
			attestationId: committed.attestationId,
			languages: ["en"],
			inspectRequestId: "request-2",
		},
		() =>
			Effect.succeed({
				changes: [
					{
						kind: "Contribute",
						aspect: "translations",
						language: "en",
						value: [
							[{ kind: "Text", text: "financial institution" }],
						],
					},
				],
				failures: [],
			}),
	);
	await accumulateValency(
		ctx,
		{
			attestationId: committed.attestationId,
			inspectRequestId: "request-2",
		},
		() =>
			Effect.succeed({
				changes: [],
				realizedPattern: null,
				failures: [],
			}),
	);

	expect(await inspection(t, "request-2")).toEqual([
		"Accumulate translations > Load translation accumulation input [Code · app/tf-demo · translationAccumulationActions · Success]",
		"Accumulate translations > Publish accumulated translations [Code · app/tf-demo · translationAccumulationActions · Success]",
		"Accumulate translations [Code · app/tf-demo · translationAccumulationActions · Success]",
		"Accumulate valency > Load valency accumulation input [Code · app/tf-demo · valencyAccumulationActions · Success]",
		"Accumulate valency [Code · app/tf-demo · valencyAccumulationActions · Success]",
		SELECTION,
	]);
});
