import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation } from "./_generated/server";

const MAX_VISITOR_ID_LENGTH = 200;
const MAX_PERSONAL_ANNOTATION_LENGTH = 20_000;

function assertVisitorId(visitorId: string): void {
	if (
		visitorId.trim().length === 0 ||
		visitorId.length > MAX_VISITOR_ID_LENGTH
	) {
		throw new Error("visitorId must contain between 1 and 200 characters.");
	}
}

function assertPersonalAnnotation(text: string): void {
	if (text.length > MAX_PERSONAL_ANNOTATION_LENGTH) {
		throw new Error(
			"Personal Annotation must contain at most 20,000 characters.",
		);
	}
}

type PersonalAnnotationCtx = QueryCtx | MutationCtx;

export async function findPersonalAnnotation(
	ctx: PersonalAnnotationCtx,
	visitorId: string,
	readingId: Id<"readings">,
) {
	return ctx.db
		.query("personalAnnotations")
		.withIndex("by_visitor_id_and_reading_id", (q) =>
			q.eq("visitorId", visitorId).eq("readingId", readingId),
		)
		.unique();
}

export async function loadPersonalAnnotation(
	ctx: QueryCtx,
	visitorId: string,
	readingId: Id<"readings">,
): Promise<string> {
	assertVisitorId(visitorId);
	return (
		(await findPersonalAnnotation(ctx, visitorId, readingId))?.text ?? ""
	);
}

export const update = mutation({
	args: {
		visitorId: v.string(),
		readingId: v.id("readings"),
		text: v.string(),
	},
	returns: v.string(),
	handler: async (ctx, { visitorId, readingId, text }) => {
		assertVisitorId(visitorId);
		assertPersonalAnnotation(text);
		if (!(await ctx.db.get(readingId))) {
			throw new Error("Reading does not exist.");
		}
		const existing = await findPersonalAnnotation(
			ctx,
			visitorId,
			readingId,
		);
		if (text.trim().length === 0) {
			if (existing) await ctx.db.delete(existing._id);
			return "";
		}
		const value = { visitorId, readingId, text, updatedAt: Date.now() };
		if (existing) await ctx.db.replace(existing._id, value);
		else await ctx.db.insert("personalAnnotations", value);
		return text;
	},
});
