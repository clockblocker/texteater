import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { type FunctionReference, getFunctionName } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { ActionCtx } from "../convex/_generated/server";
import {
	folioProcessingPort,
	STALE_FOLIO_RUN_AFTER_MS,
} from "../convex/model/folios";
import {
	foliosOf,
	requestAndRun,
	runFolio,
	submitBook,
	VISITOR,
} from "./support/books";
import {
	actionContext,
	createTestConvex,
	type TestConvexDb,
} from "./support/convex";
import { fakeJev, germanAnswers } from "./support/jev";
import { fakeTypeSafe, unavailableProviders } from "./support/providers";

/**
 * A book is not processed on its own: the Learner asks for one Folio at a
 * time (#1216). Scheduled functions stay unrun (fake timers); each test
 * drives a run through the action's own storage port with a fake jev.
 */

let restore: (() => void) | undefined;

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
	restore?.();
	restore = undefined;
});

/** The Sentences of a Folio, in order. */
const sentencesOf = (
	t: TestConvexDb,
	folio: { scrollId: Id<"scrolls">; start: number; end: number },
) =>
	t.run((ctx) =>
		ctx.db
			.query("sentences")
			.withIndex("by_scroll_id_and_position", (q) =>
				q
					.eq("scrollId", folio.scrollId)
					.gte("position", folio.start)
					.lt("position", folio.end),
			)
			.collect(),
	);

const scheduled = (t: TestConvexDb, name: string) =>
	t.run(async (ctx) =>
		(await ctx.db.system.query("_scheduled_functions").collect()).filter(
			(job) => job.name.includes(name),
		),
	);

/** Each Folio's state in the reader's view of a Scroll. */
async function viewedStates(t: TestConvexDb, scrollId: Id<"scrolls">) {
	const view = await t.query(api.scrollViews.get, {
		scrollId,
		visitorId: VISITOR,
	});
	return view?.folios?.map(({ state }) => state);
}

/** A chapter Scroll of the test book with its Folios. */
async function chapter(t: TestConvexDb) {
	const [, scrollId] = await submitBook(t);
	if (!scrollId) throw new Error("A chapter Scroll.");
	const folios = await foliosOf(t, scrollId);
	if (folios.length < 3) throw new Error("A chapter of several Folios.");
	return { scrollId, folios };
}

describe("a book is not processed on its own", () => {
	test("not on upload, nor on opening it or saving a reading position", async () => {
		const t = createTestConvex();
		const { scrollId, folios } = await chapter(t);
		await t.mutation(api.library.open, { scrollId, visitorId: VISITOR });
		await t.mutation(api.library.savePosition, {
			scrollId,
			visitorId: VISITOR,
			position: folios[1]?.start ?? 0,
		});
		expect(await scheduled(t, "folioProcessing")).toHaveLength(0);
		expect(await viewedStates(t, scrollId)).toEqual(
			folios.map(() => "Unprocessed"),
		);
		const sentences = await t.run((ctx) =>
			ctx.db.query("sentences").collect(),
		);
		expect(sentences.every(({ units }) => units === undefined)).toBe(true);
	});

	test("a paste has no Folios and is processed whole, as before", async () => {
		const providers = fakeTypeSafe(fakeJev({ answers: germanAnswers }));
		restore = providers.restore;
		const t = createTestConvex();
		const result = await t.action(api.orchestration.submitText, {
			visitorId: VISITOR,
			submissionKey: "paste",
			sourceText: "Er gibt auf.\n\nEr wohnt im Haus.",
		});
		if (result.status !== "Accepted") throw new Error(result.message);
		const view = await t.query(api.scrollViews.get, {
			scrollId: result.scrollId,
			visitorId: VISITOR,
		});
		expect(view?.folios).toBeUndefined();
		expect(view?.pages).toBeUndefined();
		expect(view?.sentences.map(({ plain }) => plain === true)).toEqual([
			false,
			false,
		]);
		expect(
			view?.sentences.every(({ segments }) => segments.length > 0),
		).toBe(true);
		expect(await t.run((ctx) => ctx.db.query("folios").collect())).toEqual(
			[],
		);
	});
});

describe("a Folio processed on request", () => {
	test("a request processes that Folio only", async () => {
		const t = createTestConvex();
		const { scrollId, folios } = await chapter(t);
		const asked = folios[1];
		if (!asked) throw new Error("A second Folio.");
		await t.mutation(api.folios.request, {
			folioId: asked._id,
			visitorId: VISITOR,
		});
		expect(await scheduled(t, "folioProcessing:run")).toHaveLength(1);
		expect(await scheduled(t, "folios:recoverStaleRun")).toHaveLength(1);
		expect(await viewedStates(t, scrollId)).toEqual(
			folios.map((_, index) =>
				index === 1 ? "Processing" : "Unprocessed",
			),
		);

		expect(await runFolio(t, asked._id)).toEqual({ kind: "Done" });
		expect(await viewedStates(t, scrollId)).toEqual(
			folios.map((_, index) =>
				index === 1 ? "Processed" : "Unprocessed",
			),
		);
		for (const [index, folio] of folios.entries()) {
			const sentences = await sentencesOf(t, folio);
			expect(sentences.every(({ units }) => units !== undefined)).toBe(
				index === 1,
			);
			if (index === 1)
				expect(
					sentences.some(({ language }) => language === "de"),
				).toBe(true);
		}
	});

	test("asking again for a Folio processing or processed does nothing", async () => {
		const t = createTestConvex();
		const { folios } = await chapter(t);
		const folioId = folios[0]?._id;
		if (!folioId) throw new Error("A Folio.");
		const ask = () =>
			t.mutation(api.folios.request, { folioId, visitorId: VISITOR });
		await ask();
		await ask();
		expect(await scheduled(t, "folioProcessing:run")).toHaveLength(1);
		await runFolio(t, folioId);
		await ask();
		expect(await scheduled(t, "folioProcessing:run")).toHaveLength(1);
		expect((await t.run((ctx) => ctx.db.get(folioId)))?.state).toBe(
			"Processed",
		);
	});

	test("a failed run fails the Folio, and asking again processes it with the same Sentences", async () => {
		const providers = unavailableProviders();
		restore = providers.restore;
		const t = createTestConvex();
		const { scrollId, folios } = await chapter(t);
		const folio = folios[0];
		if (!folio) throw new Error("A Folio.");
		await t.mutation(api.folios.request, {
			folioId: folio._id,
			visitorId: VISITOR,
		});
		// The real action, with jev down.
		await t.action(internal.folioProcessing.run, {
			folioId: folio._id,
			run: 1,
		});
		expect((await viewedStates(t, scrollId))?.[0]).toBe("Failed");
		const before = await sentencesOf(t, folio);
		expect(before.every(({ units }) => units === undefined)).toBe(true);

		expect(await requestAndRun(t, folio._id)).toEqual({ kind: "Done" });
		expect((await viewedStates(t, scrollId))?.[0]).toBe("Processed");
		const after = await sentencesOf(t, folio);
		expect(after.map(({ _id }) => _id)).toEqual(
			before.map(({ _id }) => _id),
		);
		expect(after.every(({ units }) => units !== undefined)).toBe(true);
	});

	test("a save that fails fails the Folio instead of leaving it stuck, and a retry completes it (#1214)", async () => {
		const t = createTestConvex();
		const { folios } = await chapter(t);
		const folio = folios[0];
		if (!folio) throw new Error("A Folio.");
		await t.mutation(api.folios.request, {
			folioId: folio._id,
			visitorId: VISITOR,
		});
		let saves = 0;
		const runMutation = (
			reference: FunctionReference<"mutation">,
			args: Record<string, unknown>,
		) => {
			if (
				getFunctionName(reference) === "folios:storeSave" &&
				++saves === 2
			)
				throw new Error("Function execution timed out");
			const mutate = t.mutation as (
				reference: FunctionReference<"mutation">,
				args: Record<string, unknown>,
			) => Promise<unknown>;
			return mutate(reference, args);
		};
		const timingOut = folioProcessingPort(
			{ runMutation } as unknown as ActionCtx,
			folio._id,
			1,
		);
		expect(await runFolio(t, folio._id, { port: timingOut })).toEqual({
			kind: "Failed",
		});
		expect((await t.run((ctx) => ctx.db.get(folio._id)))?.state).toBe(
			"Failed",
		);
		const stored = (await sentencesOf(t, folio)).filter(
			({ units }) => units !== undefined,
		);
		expect(stored.length).toBeGreaterThan(0);

		expect(await requestAndRun(t, folio._id)).toEqual({ kind: "Done" });
		for (const sentence of await sentencesOf(t, folio)) {
			expect(sentence.units).toBeDefined();
			const indices = await t.run(async (ctx) =>
				(
					await ctx.db
						.query("segments")
						.withIndex("by_sentence_id_and_index", (q) =>
							q.eq("sentenceId", sentence._id),
						)
						.collect()
				).map(({ index }) => index),
			);
			expect(indices).toEqual(indices.map((_, index) => index));
			expect(indices.length > 0).toBe(sentence.language === "de");
		}
	});

	test("the watchdog fails a run that went quiet, and leaves a live one", async () => {
		const t = createTestConvex();
		const { folios } = await chapter(t);
		const folioId = folios[0]?._id;
		if (!folioId) throw new Error("A Folio.");
		await t.mutation(api.folios.request, { folioId, visitorId: VISITOR });
		await t.mutation(internal.folios.recoverStaleRun, { folioId, run: 1 });
		expect((await t.run((ctx) => ctx.db.get(folioId)))?.state).toBe(
			"Processing",
		);
		expect(await scheduled(t, "folios:recoverStaleRun")).toHaveLength(2);

		await t.run((ctx) =>
			ctx.db.patch(folioId, {
				updatedAt: Date.now() - STALE_FOLIO_RUN_AFTER_MS,
			}),
		);
		await t.mutation(internal.folios.recoverStaleRun, { folioId, run: 1 });
		expect((await t.run((ctx) => ctx.db.get(folioId)))?.state).toBe(
			"Failed",
		);
	});

	test("an earlier run stores nothing once a newer request holds the Folio", async () => {
		const t = createTestConvex();
		const { folios } = await chapter(t);
		const folio = folios[0];
		if (!folio) throw new Error("A Folio.");
		await t.mutation(api.folios.request, {
			folioId: folio._id,
			visitorId: VISITOR,
		});
		await t.mutation(internal.folios.failRun, {
			folioId: folio._id,
			run: 1,
		});
		await t.mutation(api.folios.request, {
			folioId: folio._id,
			visitorId: VISITOR,
		});
		expect(
			await runFolio(t, folio._id, {
				port: folioProcessingPort(
					actionContext(t) as unknown as ActionCtx,
					folio._id,
					1,
				),
			}),
		).toEqual({ kind: "Done" });
		expect(await t.run((ctx) => ctx.db.get(folio._id))).toMatchObject({
			state: "Processing",
			run: 2,
		});
		const sentences = await sentencesOf(t, folio);
		expect(sentences.every(({ units }) => units === undefined)).toBe(true);
	});

	test("a Visitor may ask only for a Folio of a Scroll they can read", async () => {
		const t = createTestConvex();
		await expect(
			t.mutation(api.folios.request, {
				folioId: "not-a-folio",
				visitorId: VISITOR,
			}),
		).rejects.toThrow();
		expect(await scheduled(t, "folioProcessing")).toHaveLength(0);
	});
});
