import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import { pipelineFixture } from "dumgen/testing";
import { api, internal } from "../convex/_generated/api";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	bankOccurrenceCommit,
	type Selection,
	sessionGuard,
} from "./support/occurrences";
import { fakeProviders, unavailableProviders } from "./support/providers";

/*
 * These pin the DEV inspection the Resolution Inspector shows for a
 * submission, a click and its Knowledge, run through the real actions with
 * the providers faked at HTTP. Every step hangs directly under its action's
 * root step, and a Dumgen call under its operation.
 */

enableDeploymentFlags();

beforeEach(() => {
	// Sessions and Knowledge attempts schedule their runs; each test drives them.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

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

/**
 * One line per saved step: its ancestry by name, kind, owner and status,
 * sorted, so concurrent steps compare independently of their order.
 */
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

/** Each provider request is one Dumgen call, shown once under its own ID. */
async function expectEachCallOnce(
	t: TestConvexDb,
	requestId: string,
	providerRequests: number,
) {
	const calls = (await savedSteps(t, requestId)).filter(
		(step) => step.kind !== "Code",
	);
	expect(new Set(calls.map((step) => step.id)).size).toBe(calls.length);
	expect(calls).toHaveLength(providerRequests);
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
		routeNoteRequested: false,
		inspect,
	});
	return sessionGuard(t, selection.requestId);
}

async function submissionRequestId(t: TestConvexDb) {
	const [click] = await t.run((ctx) =>
		ctx.db.query("inspectionClicks").collect(),
	);
	if (!click) throw new Error("Expected an inspected submission.");
	return click.requestId;
}

const SELECTION =
	"Select segment and schedule resolution [Code · app/tf-demo · resolutionSessions.selectSegment · Success]";

test("an inspected submission shows its root, code steps and each Dumgen call once", async () => {
	const t = createTestConvex();
	const providers = fakeProviders(
		pipelineFixture([
			{
				language: "de",
				items: [
					{
						id: "0",
						decision: "Accepted",
						language: "de",
						stitchedText: "Die Banken.",
					},
				],
			},
		]),
	);
	const warnings = spyOn(console, "warn").mockImplementation(() => {});
	try {
		await t.action(api.orchestration.submitText, {
			visitorId: "visitor-1",
			submissionKey: "submission",
			sourceText: "Die Banken.",
			inspectionVisitorId: "visitor-1",
		});
	} finally {
		providers.restore();
		warnings.mockRestore();
	}
	const requestId = await submissionRequestId(t);
	expect(await inspection(t, requestId)).toEqual([
		"Analyze submitted text > Analyze sentence [Code · app/tf-demo · linguisticOrchestration · Failure]",
		"Analyze submitted text > Persist submitted text [Code · app/tf-demo · Success]",
		"Analyze submitted text > Split text into sentences [Code · app/tf-demo · Intl.Segmenter (de, sentence) · Success]",
		"Analyze submitted text > analyzeSentence > analyzeSentence [TypeSafe · battery/promptsmith · jev-latest · Failure]",
		"Analyze submitted text > analyzeSentence [Code · battery/dumgen · Failure]",
		"Analyze submitted text > segment > segment [TypeSafe · battery/promptsmith · jev-latest · Success]",
		"Analyze submitted text > segment [Code · battery/dumgen · Success]",
		"Analyze submitted text [Code · app/tf-demo · linguisticOrchestration · Success]",
	]);
	await expectEachCallOnce(t, requestId, providers.requests.length);
	const steps = await savedSteps(t, requestId);
	const payload = (name: string) =>
		steps.find((step) => step.name === name)?.payload;
	expect(payload("Analyze submitted text")).toMatchObject({
		input: { sourceText: "Die Banken." },
		output: { persisted: { textId: expect.any(String) } },
	});
	expect(payload("Split text into sentences")).toEqual({
		input: { sourceText: "Die Banken." },
		output: [["Die Banken."]],
	});
	expect(payload("Persist submitted text")).toMatchObject({
		input: { submissionKey: "submission", sourceText: "Die Banken." },
		output: { textId: expect.any(String) },
	});
	expect(payload("segment")).toMatchObject({
		input: { sourceSentences: ["Die Banken."] },
	});
});

test("a failed inspected submission fails its root", async () => {
	const t = createTestConvex();
	const providers = unavailableProviders();
	try {
		await expect(
			t.action(api.orchestration.submitText, {
				visitorId: "visitor-1",
				submissionKey: "unavailable",
				sourceText: "Die Banken.",
				inspectionVisitorId: "visitor-1",
			}),
		).rejects.toThrow();
	} finally {
		providers.restore();
	}
	const requestId = await submissionRequestId(t);
	expect(await inspection(t, requestId)).toEqual([
		"Analyze submitted text > Split text into sentences [Code · app/tf-demo · Intl.Segmenter (de, sentence) · Success]",
		"Analyze submitted text > segment > segment [TypeSafe · battery/promptsmith · jev-latest · Failure]",
		"Analyze submitted text > segment [Code · battery/dumgen · Failure]",
		"Analyze submitted text [Code · app/tf-demo · linguisticOrchestration · Failure]",
	]);
	await expectEachCallOnce(t, requestId, providers.requests.length);
});

test("an inspected click resolving a new Reading, then its Knowledge, shows each step and Dumgen call once", async () => {
	const t = createTestConvex();
	const selection = await bankenSource(t);
	const guard = await select(t, selection("request-1"), true);
	const providers = fakeProviders(
		pipelineFixture([
			{ family: "Lexeme", kind: "NOUN", memberSegmentIndices: [2] },
			{
				memberOrthographies: ["Standard"],
				normalizedMembers: ["Banken"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: {
						case: "Nom",
						number: "Plur",
						article: null,
					},
				},
				lemma: {
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
				},
				realizationCoverage: "Full",
				articleEvidence: null,
				valencyEvidence: [],
			},
			"🏦",
		]),
	);
	const info = spyOn(console, "info").mockImplementation(() => {});
	try {
		await t.action(internal.orchestration.runResolutionSession, {
			...guard,
			inspect: true,
		});
		const click = [
			"Resolution session > Commit resolved occurrence [Code · app/tf-demo · persistence · Success]",
			"Resolution session > Find stored Readings [Code · battery/dumdict · Success]",
			"Resolution session > Load checkpoints and start run [Code · app/tf-demo · resolutionSessions · Success]",
			"Resolution session > Record Succeeded [Code · app/tf-demo · resolutionSessions · Success]",
			"Resolution session > Resolve selected segment [Code · app/tf-demo · linguisticOrchestration · Success]",
			"Resolution session > Save GrammarAvailable [Code · app/tf-demo · resolutionSessions · Success]",
			"Resolution session > Save ReadingAvailable [Code · app/tf-demo · resolutionSessions · Success]",
			"Resolution session > Select target · classified [Code · app/tf-demo · linguisticOrchestration · Success]",
			"Resolution session > classifyTarget > classifyTarget [TypeSafe · battery/promptsmith · jev-latest · Success]",
			"Resolution session > classifyTarget [Code · battery/dumgen · Success]",
			"Resolution session > draftKnowledge > draftKnowledge [LLM · battery/promptsmith · gpt-5.6-luna · Success]",
			"Resolution session > draftKnowledge > draftKnowledge [LLM · battery/promptsmith · gpt-5.6-luna · Success]",
			"Resolution session > draftKnowledge > draftKnowledge [LLM · battery/promptsmith · gpt-5.6-luna · Success]",
			"Resolution session > draftKnowledge > draftKnowledge [LLM · battery/promptsmith · gpt-5.6-luna · Success]",
			"Resolution session > draftKnowledge [Code · battery/dumgen · Success]",
			"Resolution session > resolveGrammar > generateCanonicalForm [LLM · battery/promptsmith · gpt-5.6-luna · Success]",
			"Resolution session > resolveGrammar > resolveGrammar [TypeSafe · battery/promptsmith · jev-latest · Success]",
			"Resolution session > resolveGrammar [Code · battery/dumgen · Success]",
			"Resolution session > resolveOrGenerateReadingEmojiDescription > generateReadingEmojiDescription [LLM · battery/promptsmith · gpt-5.6-luna · Success]",
			"Resolution session > resolveOrGenerateReadingEmojiDescription [Code · battery/dumgen · Success]",
			"Resolution session [Code · app/tf-demo · orchestration.runResolutionSession · Success]",
			SELECTION,
		];
		expect(await inspection(t, "request-1")).toEqual(click);
		await expectEachCallOnce(t, "request-1", providers.requests.length);

		// The Knowledge attempt shares the click's request ID.
		const jobs = await t.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		);
		const knowledge = jobs.find(
			({ name }) =>
				name === "knowledgeGenerationActions:runKnowledgeGeneration",
		);
		expect(knowledge?.args).toEqual([
			{ attemptKey: "request-1", inspect: true },
		]);
		const clickRequests = providers.requests.length;
		await t.action(
			internal.knowledgeGenerationActions.runKnowledgeGeneration,
			{ attemptKey: "request-1", inspect: true },
		);
		const steps = await inspection(t, "request-1");
		expect(
			steps.filter((step) => step.startsWith("Generate and publish")),
		).toEqual([
			"Generate and publish Knowledge > Claim attempt and load input [Code · app/tf-demo · knowledgeGenerationActions · Success]",
			...Array(4).fill(
				"Generate and publish Knowledge > Publish Knowledge contribution [Code · app/tf-demo · knowledgeGenerationActions · Success]",
			),
			"Generate and publish Knowledge > Publish generated Knowledge [Code · app/tf-demo · knowledgeGenerationActions · Success]",
			// Four text leaves and the new Reading's Valency Frame.
			...Array(5).fill(
				"Generate and publish Knowledge > produceKnowledge > produceKnowledge [LLM · battery/promptsmith · gpt-5.6-luna · Success]",
			),
			"Generate and publish Knowledge > produceKnowledge [Code · battery/dumgen · Success]",
			"Generate and publish Knowledge [Code · app/tf-demo · knowledgeGenerationActions · Success]",
		]);
		expect(
			steps.filter((step) => !step.startsWith("Generate and publish")),
		).toEqual(click);
		expect(providers.requests.length).toBe(clickRequests + 5);
		await expectEachCallOnce(t, "request-1", providers.requests.length);
	} finally {
		providers.restore();
		info.mockRestore();
	}
});

test("an inspected click whose model is unavailable fails its root and its failed steps", async () => {
	const t = createTestConvex();
	const selection = await bankenSource(t);
	const guard = await select(t, selection("request-1"), true);
	const providers = unavailableProviders();
	const info = spyOn(console, "info").mockImplementation(() => {});
	try {
		await t.action(internal.orchestration.runResolutionSession, {
			...guard,
			inspect: true,
		});
	} finally {
		providers.restore();
		info.mockRestore();
	}
	expect(await inspection(t, "request-1")).toEqual([
		"Resolution session > Load checkpoints and start run [Code · app/tf-demo · resolutionSessions · Success]",
		"Resolution session > Record GenerationFailed [Code · app/tf-demo · resolutionSessions · Success]",
		"Resolution session > Resolve selected segment [Code · app/tf-demo · linguisticOrchestration · Failure]",
		"Resolution session > Select target · classified [Code · app/tf-demo · linguisticOrchestration · Failure]",
		"Resolution session > classifyTarget > classifyTarget [TypeSafe · battery/promptsmith · jev-latest · Failure]",
		"Resolution session > classifyTarget [Code · battery/dumgen · Failure]",
		"Resolution session [Code · app/tf-demo · orchestration.runResolutionSession · Failure]",
		SELECTION,
	]);
	await expectEachCallOnce(t, "request-1", providers.requests.length);
});

test("an inspected click reusing another session's occurrence makes no Dumgen call", async () => {
	const t = createTestConvex();
	const selection = await bankenSource(t);
	const running = await select(t, selection("request-1"), true);
	const other = { ...selection("request-2"), visitorId: "visitor-2" };
	const winner = await select(t, other, false);
	await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(other, winner),
	);
	await t.action(internal.orchestration.runResolutionSession, {
		...running,
		inspect: true,
	});
	// The other commit gave the Segment its membership, so the run reuses
	// that occurrence and completes in the reuse commit.
	expect(await inspection(t, "request-1")).toEqual([
		"Resolution session > Commit reused occurrence [Code · app/tf-demo · persistence · Success]",
		"Resolution session > Load checkpoints and start run [Code · app/tf-demo · resolutionSessions · Success]",
		"Resolution session > Record Succeeded [Code · app/tf-demo · resolutionSessions · Success]",
		"Resolution session > Resolve selected segment [Code · app/tf-demo · linguisticOrchestration · Success]",
		"Resolution session [Code · app/tf-demo · orchestration.runResolutionSession · Success]",
		SELECTION,
	]);
});

test("an uninspected click saves no inspection steps", async () => {
	const t = createTestConvex();
	const selection = await bankenSource(t);
	const guard = await select(t, selection("request-1"), false);
	const providers = unavailableProviders();
	const info = spyOn(console, "info").mockImplementation(() => {});
	try {
		await t.action(internal.orchestration.runResolutionSession, guard);
	} finally {
		providers.restore();
		info.mockRestore();
	}
	expect(await savedSteps(t, "request-1")).toEqual([]);
});
