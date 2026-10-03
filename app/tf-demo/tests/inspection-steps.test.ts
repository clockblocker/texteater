import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import { fakeJev, germanAnswers } from "./support/jev";
import {
	bankOccurrenceCommit,
	type Selection,
	sessionGuard,
} from "./support/occurrences";
import { fakeTypeSafe, unavailableProviders } from "./support/providers";

/*
 * These pin the DEV inspection the Resolution Inspector shows for a
 * submission and a click, run through the real actions with jev faked at
 * HTTP. Every step hangs directly under its action's root step.
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

test("an inspected submission shows its root and its code steps", async () => {
	const t = createTestConvex();
	const providers = fakeTypeSafe();
	try {
		await t.action(api.orchestration.submitText, {
			visitorId: "visitor-1",
			submissionKey: "submission",
			sourceText: "Die Banken.",
			inspectionVisitorId: "visitor-1",
		});
	} finally {
		providers.restore();
	}
	const requestId = await submissionRequestId(t);
	expect(await inspection(t, requestId)).toEqual([
		"Analyze submitted text > Persist submitted text [Code · app/tf-demo · Success]",
		"Analyze submitted text > Segment sentences in units [Code · battery/dumgen · segment.inUnits · Success]",
		"Analyze submitted text > Split text into sentences [Code · battery/dumgen · splitText · Success]",
		"Analyze submitted text > segment.inUnits > candidates · Sentence 0 [TypeSafe · battery/dumgen · jev · Success]",
		"Analyze submitted text > segment.inUnits > route · Sentence 0 [TypeSafe · battery/dumgen · jev · Success]",
		"Analyze submitted text > segment.inUnits [Code · battery/dumgen · Success]",
		"Analyze submitted text [Code · app/tf-demo · intake · Success]",
	]);
	const steps = await savedSteps(t, requestId);
	const payload = (name: string) =>
		steps.find((step) => step.name === name)?.payload;
	expect(payload("Analyze submitted text")).toMatchObject({
		input: { sourceText: "Die Banken." },
		output: { persisted: { textId: expect.any(String) } },
	});
	expect(payload("Split text into sentences")).toEqual({
		input: { sourceText: "Die Banken." },
		output: { paragraphs: [{ sentences: ["Die Banken."] }] },
	});
	expect(payload("Segment sentences in units")).toMatchObject({
		input: { paragraphs: [{ sentences: ["Die Banken."] }] },
		output: {
			language: "de",
			paragraphs: [{ sentences: [{ text: "Die Banken." }] }],
		},
	});
	expect(payload("Persist submitted text")).toMatchObject({
		input: { submissionKey: "submission", sourceText: "Die Banken." },
		output: { textId: expect.any(String) },
	});
	// Dumgen's calls carry their prompts and answers under DEV inspection (#885).
	expect(payload("route · Sentence 0")).toMatchObject({
		input: { questions: expect.any(Object) },
		output: { answers: expect.any(Object) },
		stage: "route",
		sentence: 0,
		executor: "jev",
	});
	expect(payload("segment.inUnits")).toMatchObject({
		calls: 2,
		sentences: [{ sentence: 0, outcome: "Segmented" }],
	});
});

test("a failed inspected submission fails its root", async () => {
	const t = createTestConvex();
	// The key already names another Text, so storing fails.
	await submitText(t, [["Die", " ", "Bank", "."]], {
		submissionKey: "taken",
	});
	const providers = fakeTypeSafe();
	try {
		await expect(
			t.action(api.orchestration.submitText, {
				visitorId: "visitor-1",
				submissionKey: "taken",
				sourceText: "Die Banken.",
				inspectionVisitorId: "visitor-1",
			}),
		).rejects.toThrow();
	} finally {
		providers.restore();
	}
	const requestId = await submissionRequestId(t);
	expect(await inspection(t, requestId)).toEqual([
		"Analyze submitted text > Persist submitted text [Code · app/tf-demo · Failure]",
		"Analyze submitted text > Segment sentences in units [Code · battery/dumgen · segment.inUnits · Success]",
		"Analyze submitted text > Split text into sentences [Code · battery/dumgen · splitText · Success]",
		"Analyze submitted text > segment.inUnits > candidates · Sentence 0 [TypeSafe · battery/dumgen · jev · Success]",
		"Analyze submitted text > segment.inUnits > route · Sentence 0 [TypeSafe · battery/dumgen · jev · Success]",
		"Analyze submitted text > segment.inUnits [Code · battery/dumgen · Success]",
		"Analyze submitted text [Code · app/tf-demo · intake · Failure]",
	]);
});

test("an inspected click selects its unit through ClickResolution and calls no model", async () => {
	const t = createTestConvex();
	const selection = await bankenSource(t);
	const guard = await select(t, selection("request-1"), true);
	const providers = unavailableProviders();
	try {
		await t.action(internal.orchestration.runResolutionSession, {
			...guard,
			inspect: true,
		});
	} finally {
		providers.restore();
	}
	expect(providers.requests).toEqual([]);
	expect(await inspection(t, "request-1")).toEqual([
		"Resolution session > Commit unresolved encounter [Code · app/tf-demo · persistence · Success]",
		"Resolution session > Load checkpoints and start run [Code · app/tf-demo · resolutionSessions · Success]",
		"Resolution session > Record Succeeded [Code · app/tf-demo · resolutionSessions · Success]",
		"Resolution session > Resolve grammar [Code · app/tf-demo · ClickResolution · Success]",
		"Resolution session > Resolve selected segment [Code · app/tf-demo · linguisticOrchestration · Success]",
		"Resolution session [Code · app/tf-demo · orchestration.runResolutionSession · Success]",
		SELECTION,
	]);
	// No Reading was made, so no Knowledge attempt was scheduled.
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	expect(
		jobs.filter(
			({ name }) =>
				name === "knowledgeGenerationActions:runKnowledgeGeneration",
		),
	).toEqual([]);
});

test("an inspected click renders each Dumgen operation it runs as rows whose calls carry their payloads (#885)", async () => {
	const t = createTestConvex();
	const { sentenceIds } = await submitText(t, [
		["Er", " ", "gibt", " ", "auf", "."],
	]);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a Sentence.");
	const guard = await select(
		t,
		{
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex: 2,
		},
		true,
	);
	// Intake failed the Sentence, so the click segments it again first.
	await t.run((ctx) =>
		ctx.db.patch(sentenceId, { units: [], segmentationFailed: true }),
	);
	const providers = fakeTypeSafe(fakeJev({ answers: germanAnswers }));
	try {
		await t.action(internal.orchestration.runResolutionSession, {
			...guard,
			inspect: true,
		});
	} finally {
		providers.restore();
	}
	const lines = await inspection(t, "request-1");
	expect(lines).toEqual(
		expect.arrayContaining([
			"Resolution session > segment.inUnits [Code · battery/dumgen · Success]",
			"Resolution session > segment.inUnits > route · Sentence 0 [TypeSafe · battery/dumgen · jev · Success]",
			"Resolution session > resolve.grammar [Code · battery/dumgen · Success]",
			"Resolution session > resolve.grammar > grammar [TypeSafe · battery/dumgen · jev · Success]",
		]),
	);
	const grammar = (await savedSteps(t, "request-1")).find(
		(step) => step.name === "grammar",
	);
	expect(grammar?.payload).toMatchObject({
		input: { questions: expect.any(Object) },
		output: { answers: expect.any(Object) },
	});
});

test("an inspected click reusing another session's occurrence makes no ClickResolution call", async () => {
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
