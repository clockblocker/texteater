import { v } from "convex/values";
import { assertIdentifier } from "../server/identifiers";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import {
	type CodexItem,
	codexItems,
	compareTitles,
	findScrollProgress,
	findSectionProgress,
	nextScrollAfter,
	recordDone,
	recordOpened,
	recordPosition,
	scrollLabel,
	scrollStatus,
	sectionStatus,
	sectionsAbove,
} from "./model/codex";
import { visitorError } from "./model/validators";

/**
 * The Library and the Codex of each Section, with a Visitor's status on every
 * Section and Scroll, the next Scroll at a Scroll's end, and where the reader
 * was (#1192). Learner-facing copy calls a Scroll a text.
 */

const MAX_LIBRARY_SECTIONS = 100;
const MAX_LIBRARY_SCROLLS = 100;
/** Per table: a Codex lists up to this many Sections and as many Scrolls. */
const MAX_CODEX_ITEMS = 500;
/** How much of an untitled Scroll the Library shows. */
const PREVIEW_LENGTH = 280;

/**
 * The submissionKey prefix of what an e2e spec or a fixture seeded. The
 * Library shelves it in its own folder, apart from ordinary entries.
 */
const E2E_SUBMISSION_KEY_PREFIX = "e2e:";

const readingStatusValidator = v.union(
	v.literal("NotStarted"),
	v.literal("InProgress"),
	v.literal("Done"),
);

const codexEntryValidator = v.union(
	v.object({
		kind: v.literal("Section"),
		sectionId: v.id("sections"),
		title: v.string(),
		status: readingStatusValidator,
		fixture: v.optional(v.literal(true)),
	}),
	v.object({
		kind: v.literal("Scroll"),
		scrollId: v.id("scrolls"),
		/** What the Scroll is called wherever it is named. */
		title: v.string(),
		/** Its title or label, or a loose one's start of its text. */
		preview: v.string(),
		createdAt: v.number(),
		status: readingStatusValidator,
		fixture: v.optional(v.literal(true)),
	}),
);

const sectionRefValidator = v.object({
	sectionId: v.id("sections"),
	title: v.string(),
});

/** A Scroll to open from elsewhere, with the Sections it sits in, top first. */
const scrollPlaceValidator = v.object({
	scrollId: v.id("scrolls"),
	title: v.string(),
	sections: v.array(sectionRefValidator),
});

function fixtureFlag(submissionKey: string | undefined) {
	return submissionKey?.startsWith(E2E_SUBMISSION_KEY_PREFIX)
		? { fixture: true as const }
		: {};
}

async function projectItem(ctx: QueryCtx, visitorId: string, item: CodexItem) {
	if (item.kind === "Section")
		return {
			kind: "Section" as const,
			sectionId: item.doc._id,
			title: item.doc.title,
			status: await sectionStatus(ctx, visitorId, item.doc),
			...fixtureFlag(item.doc.submissionKey),
		};
	const scroll = item.doc;
	const title = await scrollLabel(ctx, scroll);
	return {
		kind: "Scroll" as const,
		scrollId: scroll._id,
		title,
		preview:
			scroll.title || scroll.placement
				? title
				: scroll.sourceText.slice(0, PREVIEW_LENGTH),
		createdAt: scroll._creationTime,
		status: await scrollStatus(ctx, visitorId, scroll._id),
		...fixtureFlag(scroll.submissionKey),
	};
}

/** The Sections a Scroll sits in, from `below` (exclusive) down to its own. */
async function sectionsDownTo(
	ctx: QueryCtx,
	scroll: Doc<"scrolls">,
	below: Id<"sections"> | null,
) {
	const chain = await sectionsAbove(ctx, scroll.placement);
	const end = below
		? chain.findIndex((section) => section._id === below)
		: chain.length;
	return chain
		.slice(0, end === -1 ? chain.length : end)
		.reverse()
		.map((section) => ({ sectionId: section._id, title: section.title }));
}

/**
 * Loose Visitor Scrolls owned by `owner`, or shared ones when it is
 * undefined, newest first: one index range, so Definition Texts, Scrolls
 * in a Codex and other Visitors' private Scrolls are neither scanned nor
 * in the read set.
 */
function looseScrolls(ctx: QueryCtx, owner: string | undefined) {
	return ctx.db
		.query("scrolls")
		.withIndex("by_origin_kind_and_placement_and_owner", (q) =>
			q
				.eq("origin.kind", undefined)
				.eq("placement.sectionId", undefined)
				.eq("owner", owner),
		)
		.order("desc")
		.take(MAX_LIBRARY_SCROLLS);
}

/**
 * The Library: top-level Sections by title, numbers in order, then loose
 * Scrolls, shared ones and the Visitor's private ones, newest first.
 * Hidden Definition Texts are never listed.
 */
export async function listLibrary(ctx: QueryCtx, visitorId: string) {
	assertIdentifier(visitorId, "visitorId");
	const [sections, shared, own] = await Promise.all([
		ctx.db
			.query("sections")
			.withIndex("by_placement", (q) =>
				q.eq("placement.sectionId", undefined),
			)
			.take(MAX_LIBRARY_SECTIONS),
		looseScrolls(ctx, undefined),
		looseScrolls(ctx, visitorId),
	]);
	const scrolls = [...shared, ...own]
		.sort((left, right) => right._creationTime - left._creationTime)
		.slice(0, MAX_LIBRARY_SCROLLS);
	const items: CodexItem[] = [
		...sections
			.sort((left, right) => compareTitles(left.title, right.title))
			.map((doc) => ({ kind: "Section" as const, doc })),
		...scrolls.map((doc) => ({ kind: "Scroll" as const, doc })),
	];
	return Promise.all(items.map((item) => projectItem(ctx, visitorId, item)));
}

export const list = query({
	args: { visitorId: v.string() },
	returns: v.array(codexEntryValidator),
	handler: (ctx, { visitorId }) => listLibrary(ctx, visitorId),
});

/**
 * A Section's Codex: its Sections and Scrolls in order, each with the
 * Visitor's status, and the last Scroll the Visitor read under it.
 */
export const codex = query({
	args: { sectionId: v.string(), visitorId: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			sectionId: v.id("sections"),
			title: v.string(),
			status: readingStatusValidator,
			lastRead: v.union(v.null(), scrollPlaceValidator),
			entries: v.array(codexEntryValidator),
		}),
	),
	handler: async (ctx, { sectionId: sectionIdValue, visitorId }) => {
		assertIdentifier(visitorId, "visitorId");
		const sectionId = ctx.db.normalizeId("sections", sectionIdValue);
		const section = sectionId ? await ctx.db.get(sectionId) : null;
		if (!section) return null;
		const items = await codexItems(ctx, section._id, MAX_CODEX_ITEMS);
		const progress = await findSectionProgress(ctx, visitorId, section._id);
		const last = progress ? await ctx.db.get(progress.lastScrollId) : null;
		return {
			sectionId: section._id,
			title: section.title,
			status: await sectionStatus(ctx, visitorId, section),
			lastRead: last
				? {
						scrollId: last._id,
						title: await scrollLabel(ctx, last),
						sections: await sectionsDownTo(ctx, last, section._id),
					}
				: null,
			entries: await Promise.all(
				items.map((item) => projectItem(ctx, visitorId, item)),
			),
		};
	},
});

/**
 * The Scroll that follows one in Codex order, across Section boundaries,
 * with the Sections it sits in from the top-level Section down.
 */
export const next = query({
	args: { scrollId: v.string() },
	returns: v.union(v.null(), scrollPlaceValidator),
	handler: async (ctx, { scrollId: scrollIdValue }) => {
		const scrollId = ctx.db.normalizeId("scrolls", scrollIdValue);
		const scroll = scrollId ? await ctx.db.get(scrollId) : null;
		if (!scroll) return null;
		const following = await nextScrollAfter(ctx, scroll);
		return following
			? {
					scrollId: following._id,
					title: await scrollLabel(ctx, following),
					sections: await sectionsDownTo(ctx, following, null),
				}
			: null;
	},
});

/** A Visitor's status in one Scroll and the Sentence position to resume at. */
export const progress = query({
	args: { scrollId: v.string(), visitorId: v.string() },
	returns: v.object({ status: readingStatusValidator, position: v.number() }),
	handler: async (ctx, { scrollId: scrollIdValue, visitorId }) => {
		assertIdentifier(visitorId, "visitorId");
		const scrollId = ctx.db.normalizeId("scrolls", scrollIdValue);
		const progress = scrollId
			? await findScrollProgress(ctx, visitorId, scrollId)
			: null;
		return progress
			? { status: progress.status, position: progress.position }
			: { status: "NotStarted" as const, position: 0 };
	},
});

/** A Visitor Scroll this Visitor may read: shared, or their own private one. */
async function visitorScroll(
	ctx: QueryCtx,
	scrollIdValue: string,
	visitorId: string,
) {
	const scrollId = ctx.db.normalizeId("scrolls", scrollIdValue);
	const scroll = scrollId ? await ctx.db.get(scrollId) : null;
	if (
		!scroll ||
		scroll.origin ||
		(scroll.owner !== undefined && scroll.owner !== visitorId)
	)
		throw visitorError("InvalidInput", "This text does not exist.");
	return scroll;
}

/** The reader opened a Scroll on a Ground: it is in progress now. */
export const open = mutation({
	args: { scrollId: v.string(), visitorId: v.string() },
	returns: v.null(),
	handler: async (ctx, { scrollId, visitorId }) => {
		assertIdentifier(visitorId, "visitorId");
		const scroll = await visitorScroll(ctx, scrollId, visitorId);
		await recordOpened(ctx, visitorId, scroll);
		return null;
	},
});

/** Marks a Scroll done, or back in progress. */
export const setDone = mutation({
	args: {
		scrollId: v.string(),
		visitorId: v.string(),
		done: v.boolean(),
	},
	returns: v.null(),
	handler: async (ctx, { scrollId, visitorId, done }) => {
		assertIdentifier(visitorId, "visitorId");
		await recordDone(
			ctx,
			visitorId,
			await visitorScroll(ctx, scrollId, visitorId),
			done,
		);
		return null;
	},
});

/** Where the reader is in a Scroll, by Sentence position. */
export const savePosition = mutation({
	args: {
		scrollId: v.string(),
		visitorId: v.string(),
		position: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, { scrollId, visitorId, position }) => {
		assertIdentifier(visitorId, "visitorId");
		if (!Number.isSafeInteger(position) || position < 0)
			throw visitorError(
				"InvalidInput",
				"A reading position is a Sentence position.",
			);
		const scroll = await visitorScroll(ctx, scrollId, visitorId);
		await recordPosition(ctx, visitorId, scroll, position);
		return null;
	},
});
