import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { api } from "../convex/_generated/api";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import { unavailableProviders } from "./support/providers";

/*
 * A hosted deployment leaves TF_DEMO_ADMIN and TF_INSPECTION unset, so an
 * anonymous caller can neither wipe shared data nor capture inspection.
 */

const FLAGS = ["TF_DEMO_ADMIN", "TF_INSPECTION"] as const;
const previous = Object.fromEntries(
	FLAGS.map((name) => [name, process.env[name]]),
);

beforeEach(() => {
	jest.useFakeTimers();
	for (const name of FLAGS) delete process.env[name];
});

afterEach(() => {
	jest.useRealTimers();
	for (const name of FLAGS) {
		const value = previous[name];
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
});

function inspectionRows(t: TestConvexDb) {
	return t.run(async (ctx) => [
		...(await ctx.db.query("inspectionClicks").collect()),
		...(await ctx.db.query("inspectionSteps").collect()),
		...(await ctx.db.query("inspectionPayloads").collect()),
	]);
}

test("without TF_DEMO_ADMIN the global wipes reject and write nothing", async () => {
	const t = createTestConvex();
	await submitText(t, [["Die", " ", "Banken", "."]]);

	await expect(t.action(api.demoReset.clearSharedData, {})).rejects.toThrow(
		"disabled",
	);
	await expect(t.action(api.demoReset.stripAnalyses, {})).rejects.toThrow(
		"disabled",
	);
	expect(
		await t.run(async (ctx) => ({
			texts: (await ctx.db.query("texts").collect()).length,
			segments: (await ctx.db.query("segments").collect()).length,
		})),
	).toEqual({ texts: 1, segments: 4 });
});

test("without TF_INSPECTION a selection or submission asking for inspection captures none", async () => {
	const t = createTestConvex();
	const { sentenceIds } = await submitText(t, [["Die", " ", "Banken", "."]]);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a Sentence.");

	expect(
		await t.mutation(api.resolutionSessions.selectSegment, {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex: 2,
			routeNoteRequested: false,
			inspect: true,
		}),
	).toMatchObject({ kind: "Resolving" });
	const providers = unavailableProviders();
	try {
		await t
			.action(api.orchestration.submitText, {
				submissionKey: "inspected",
				sourceText: "Die Banken sind geschlossen.",
				inspectionVisitorId: "visitor-1",
			})
			.catch(() => undefined);
	} finally {
		providers.restore();
	}

	expect(await inspectionRows(t)).toEqual([]);
});

test("the flags query reports each flag", async () => {
	const t = createTestConvex();
	expect(await t.query(api.deploymentFlags.get, {})).toEqual({
		admin: false,
		inspection: false,
	});
	process.env.TF_DEMO_ADMIN = "1";
	process.env.TF_INSPECTION = "1";
	expect(await t.query(api.deploymentFlags.get, {})).toEqual({
		admin: true,
		inspection: true,
	});
});
