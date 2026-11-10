import { v } from "convex/values";
import { assertIdentifier } from "../server/identifiers";
import { internalMutation, mutation } from "./_generated/server";
import {
	failFolioRun,
	nextFolioWindow,
	recoverStaleFolioRun,
	requestFolio,
	requestStartsRun,
	savedShareValidator,
	storeFolioSave,
} from "./model/folios";
import { visitorError } from "./model/validators";
import { consumeRateLimit } from "./rateLimits";

/*
 * A book's Folio processed on request (#1216): `request` is the Learner's
 * ask, and the rest is the storage side of `folioProcessing.run`.
 */

/**
 * The Learner asks for one Folio of a book Scroll they may read to be
 * processed. A Folio processing or processed already is left as it is, at
 * no cost; a request that starts paid jev work is rate limited, as a paste
 * and a click are.
 */
export const request = mutation({
	args: { folioId: v.string(), visitorId: v.string() },
	returns: v.null(),
	handler: async (ctx, { folioId, visitorId }) => {
		assertIdentifier(visitorId, "visitorId");
		const id = ctx.db.normalizeId("folios", folioId);
		const folio = id ? await ctx.db.get(id) : null;
		const scroll = folio ? await ctx.db.get(folio.scrollId) : null;
		if (
			!folio ||
			!scroll ||
			(scroll.owner !== undefined && scroll.owner !== visitorId)
		)
			throw visitorError("InvalidInput", "This text does not exist.");
		if (!requestStartsRun(folio)) return null;
		const limit = await consumeRateLimit(ctx, "folioRequest", visitorId);
		if (!limit.ok) throw visitorError("RateLimited", limit.message);
		await requestFolio(ctx, folio);
		return null;
	},
});

const runArgs = { folioId: v.id("folios"), run: v.number() };

export const nextWindow = internalMutation({
	args: runArgs,
	returns: v.union(
		v.null(),
		v.object({
			sentences: v.array(
				v.object({
					sentenceId: v.id("sentences"),
					paragraph: v.number(),
					stitchedText: v.string(),
				}),
			),
		}),
	),
	handler: (ctx, { folioId, run }) => nextFolioWindow(ctx, folioId, run),
});

/** Stores one save of a processed window; see `storeFolioSave`. */
export const storeSave = internalMutation({
	args: { ...runArgs, shares: v.array(savedShareValidator) },
	returns: v.null(),
	handler: async (ctx, { folioId, run, shares }) => {
		await storeFolioSave(ctx, folioId, run, shares);
		return null;
	},
});

/** The run failed: the Learner may ask for the Folio again. */
export const failRun = internalMutation({
	args: runArgs,
	returns: v.null(),
	handler: async (ctx, { folioId, run }) => {
		await failFolioRun(ctx, folioId, run);
		return null;
	},
});

export const recoverStaleRun = internalMutation({
	args: runArgs,
	returns: v.null(),
	handler: async (ctx, { folioId, run }) => {
		await recoverStaleFolioRun(ctx, folioId, run);
		return null;
	},
});
