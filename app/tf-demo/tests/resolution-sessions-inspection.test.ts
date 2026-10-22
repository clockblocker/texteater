import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import { commitBankOccurrence } from "./support/occurrences";
import { bankenSource, rows, session } from "./support/resolutionSessions";

enableDeploymentFlags();

beforeEach(() => {
	// Sessions schedule their runs; each test drives the run itself.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("Resolution Session", () => {
	test("inspection records repeat selections separately while encounters stay deduplicated", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		await commitBankOccurrence(t, select("request-0", "visitor-0"));
		const args = {
			...select("request-1"),
			inspect: true,
		};

		await t.mutation(api.resolutionSessions.selectSegment, args);
		await t.mutation(api.resolutionSessions.selectSegment, args);
		await t.mutation(api.resolutionSessions.selectSegment, {
			...args,
			requestId: "second-inspected-click",
		});

		expect(
			(await rows(t, "visitorEncounters")).filter(
				({ visitorId }) => visitorId === "visitor-1",
			),
		).toHaveLength(1);
		const clicks = await rows(t, "inspectionClicks");
		expect(clicks).toHaveLength(2);
		expect(await rows(t, "inspectionSteps")).toHaveLength(2);
		const payloads = await rows(t, "inspectionPayloads");
		expect(payloads).toHaveLength(2);
		expect(clicks[0]).toMatchObject({
			selectedSegment: "Banken",
			sentence: "Die Banken.",
			selectionKind: "Available",
		});
		expect(JSON.parse(String(payloads[0]?.text)).output.kind).toBe(
			"Available",
		);
	});

	test("inspection retains terminal status and failure payloads independently of session cleanup", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		await commitBankOccurrence(t, select("request-1"));
		const completed = await session(t, "request-1");
		await t.run(async (ctx) => {
			await ctx.db.insert("inspectionClicks", {
				requestId: "request-1",
				visitorId: "visitor-1",
				selectedSegment: "Banken",
				sentence: "Die Banken.",
				startedAt: 1,
				selectionKind: "Resolving",
			});
			const attempt = await ctx.db
				.query("knowledgeGenerationAttempts")
				.withIndex("by_attempt_key", (q) =>
					q.eq("attemptKey", "request-1"),
				)
				.unique();
			if (attempt) await ctx.db.patch(attempt._id, { state: "Failed" });
		});
		const step = {
			id: "knowledge-run",
			name: "Knowledge",
			kind: "Code" as const,
			owner: "app/tf-demo",
			startedAt: 10,
			durationMs: 40,
			status: "Success" as const,
			payloadJson: JSON.stringify({ error: "Invalid plan" }),
		};

		await t.mutation(internal.resolutionInspection.recordSteps, {
			requestId: "request-1",
			scope: "Knowledge",
			steps: [step],
		});

		expect((await rows(t, "inspectionSteps"))[0]).toMatchObject({
			status: "Failure",
		});
		expect((await rows(t, "inspectionClicks"))[0]).toMatchObject({
			resolutionState: "Complete",
			finishedAt: completed.updatedAt,
			knowledgeState: "Failed",
		});
		expect((await rows(t, "inspectionPayloads"))[0]?.text).toBe(
			step.payloadJson,
		);
	});

	test("selection timing records the browser round trip once and rejects another visitor", async () => {
		const t = createTestConvex();
		await t.run(async (ctx) => {
			await ctx.db.insert("inspectionClicks", {
				requestId: "request-1",
				visitorId: "visitor-1",
				selectedSegment: "Banken",
				sentence: "Die Banken.",
				startedAt: 100,
				selectionKind: "Available",
			});
			await ctx.db.insert("inspectionSteps", {
				requestId: "request-1",
				id: "request-1:selection",
				name: "Reuse stored Attestation",
				kind: "Code",
				owner: "app/tf-demo",
				startedAt: 100,
				durationMs: 0,
				timing: "Unmeasured",
				status: "Success",
			});
		});
		const args = {
			requestId: "request-1",
			visitorId: "visitor-2",
			startedAt: 90,
			durationMs: 25,
		};

		await t.mutation(api.resolutionInspection.recordSelectionTiming, args);
		expect((await rows(t, "inspectionSteps"))[0]?.durationMs).toBe(0);
		await t.mutation(api.resolutionInspection.recordSelectionTiming, {
			...args,
			visitorId: "visitor-1",
		});
		await t.mutation(api.resolutionInspection.recordSelectionTiming, {
			...args,
			visitorId: "visitor-1",
			durationMs: 90,
		});
		expect((await rows(t, "inspectionSteps"))[0]).toMatchObject({
			durationMs: 25,
			startedAt: 90,
		});
	});

	test("an inspected click that joins a running session records no inspection of its own", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const inspected = (requestId: string) => ({
			...select(requestId),
			inspect: true,
		});
		await t.mutation(
			api.resolutionSessions.selectSegment,
			inspected("request-1"),
		);

		expect(
			await t.mutation(
				api.resolutionSessions.selectSegment,
				inspected("request-2"),
			),
		).toMatchObject({ kind: "Resolving", requestId: "request-1" });

		expect(
			(await rows(t, "inspectionClicks")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["request-1"]);
		expect(
			(await rows(t, "inspectionSteps")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["request-1"]);
	});
});

test("analysis history survives without a resolution session and is scoped to its visitor", async () => {
	const t = createTestConvex();
	await t.mutation(internal.resolutionInspection.beginAnalysis, {
		requestId: "analysis-1",
		visitorId: "visitor-1",
		sourceText: "Hallo. Welt!",
	});

	expect(
		await t.query(api.resolutionInspection.detail, {
			requestId: "analysis-1",
			visitorId: "visitor-2",
		}),
	).toBeNull();
	expect(
		await t.query(api.resolutionInspection.detail, {
			requestId: "analysis-1",
			visitorId: "visitor-1",
		}),
	).toMatchObject({ state: "Running", finishedAt: null });
	await t.mutation(internal.resolutionInspection.finishAnalysis, {
		requestId: "analysis-1",
		state: "PermanentFailure",
	});
	expect(
		await t.query(api.resolutionInspection.detail, {
			requestId: "analysis-1",
			visitorId: "visitor-1",
		}),
	).toMatchObject({
		state: "PermanentFailure",
		finishedAt: expect.any(Number),
	});
});
