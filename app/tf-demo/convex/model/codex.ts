import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Sections, their Codex order, and a Visitor's status in them (#1192). A
 * Codex lists the Sections and Scrolls placed in a Section by
 * `placement.order`, which is unique within that Section. Status lives on
 * Scrolls; a Section counts the Scrolls under it (`scrollCount`) and each
 * Visitor's done ones (`sectionProgress.doneScrolls`), so neither the Library
 * nor a Codex walks a book to say whether a Section is done.
 */

/** Deeper than any book nests; a longer chain is a broken placement. */
const MAX_SECTION_DEPTH = 32;
/** Codex steps `nextScrollAfter` may take past empty Sections. */
const MAX_NEXT_STEPS = 1_000;

type CodexPlacement = NonNullable<Doc<"sections">["placement"]>;

export type ReadingStatus = "NotStarted" | "InProgress" | "Done";

/** One Section or Scroll in a Codex, before it is projected. */
export type CodexItem =
	| { readonly kind: "Section"; readonly doc: Doc<"sections"> }
	| { readonly kind: "Scroll"; readonly doc: Doc<"scrolls"> };

const titleCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base",
});

/** Titles in reading order: "Kapitel 2" before "Kapitel 10". */
export function compareTitles(left: string, right: string): number {
	return titleCollator.compare(left, right) || left.localeCompare(right);
}

/** The Sections above a placement, nearest first. */
export async function sectionsAbove(
	ctx: QueryCtx,
	placement: CodexPlacement | undefined,
): Promise<Doc<"sections">[]> {
	const chain: Doc<"sections">[] = [];
	let sectionId = placement?.sectionId;
	while (sectionId) {
		if (chain.length >= MAX_SECTION_DEPTH)
			throw new Error("Sections nest deeper than a Codex allows.");
		const section = await ctx.db.get(sectionId);
		if (!section) break;
		chain.push(section);
		sectionId = section.placement?.sectionId;
	}
	return chain;
}

/**
 * Writes a Section at the top of the Library or into a Section's Codex.
 * Write a Section before what goes in it.
 */
export async function insertSection(
	ctx: MutationCtx,
	section: {
		readonly title: string;
		readonly placement?: CodexPlacement;
		readonly submissionKey?: string;
	},
): Promise<Id<"sections">> {
	if (section.placement && !(await ctx.db.get(section.placement.sectionId)))
		throw new Error("A Section can only be placed in a stored Section.");
	return ctx.db.insert("sections", { ...section, scrollCount: 0 });
}

/** Places a loose Visitor Scroll in a Codex; every Section above counts it. */
export async function placeScroll(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
	placement: CodexPlacement,
): Promise<void> {
	const scroll = await ctx.db.get(scrollId);
	if (!scroll || scroll.origin || scroll.placement)
		throw new Error(
			"Only a loose Visitor Scroll can be placed in a Codex.",
		);
	const chain = await sectionsAbove(ctx, placement);
	if (chain[0]?._id !== placement.sectionId)
		throw new Error("A Scroll can only be placed in a stored Section.");
	await ctx.db.patch(scrollId, { placement });
	for (const section of chain)
		await ctx.db.patch(section._id, {
			scrollCount: section.scrollCount + 1,
		});
}

/** A Section's Codex in order, up to `limit` Sections and `limit` Scrolls. */
export async function codexItems(
	ctx: QueryCtx,
	sectionId: Id<"sections">,
	limit: number,
): Promise<CodexItem[]> {
	const [sections, scrolls] = await Promise.all([
		ctx.db
			.query("sections")
			.withIndex("by_placement", (q) =>
				q.eq("placement.sectionId", sectionId),
			)
			.take(limit),
		ctx.db
			.query("scrolls")
			.withIndex("by_placement", (q) =>
				q.eq("placement.sectionId", sectionId),
			)
			.take(limit),
	]);
	return [
		...sections.map((doc) => ({ kind: "Section" as const, doc })),
		...scrolls.map((doc) => ({ kind: "Scroll" as const, doc })),
	].sort(compareCodexItems);
}

function compareCodexItems(left: CodexItem, right: CodexItem): number {
	return (
		(left.doc.placement?.order ?? 0) - (right.doc.placement?.order ?? 0) ||
		compareTitles(left.doc.title ?? "", right.doc.title ?? "")
	);
}

/** The first Codex item in a Section after `order`, or its first with none. */
async function itemAfter(
	ctx: QueryCtx,
	sectionId: Id<"sections">,
	order: number | null,
): Promise<CodexItem | null> {
	const [section, scroll] = await Promise.all([
		ctx.db
			.query("sections")
			.withIndex("by_placement", (q) => {
				const inSection = q.eq("placement.sectionId", sectionId);
				return order === null
					? inSection
					: inSection.gt("placement.order", order);
			})
			.first(),
		ctx.db
			.query("scrolls")
			.withIndex("by_placement", (q) => {
				const inSection = q.eq("placement.sectionId", sectionId);
				return order === null
					? inSection
					: inSection.gt("placement.order", order);
			})
			.first(),
	]);
	const items: CodexItem[] = [
		...(section ? [{ kind: "Section" as const, doc: section }] : []),
		...(scroll ? [{ kind: "Scroll" as const, doc: scroll }] : []),
	];
	return items.sort(compareCodexItems)[0] ?? null;
}

/**
 * The Scroll after one in Codex order, depth-first across Section
 * boundaries, as the Librarian's `getNextPage` walks its tree. It stays in
 * the Scroll's top-level Section: the Library itself has no reading order,
 * so a loose Scroll, or the last Scroll of a book, has no next.
 */
export async function nextScrollAfter(
	ctx: QueryCtx,
	scroll: Doc<"scrolls">,
): Promise<Doc<"scrolls"> | null> {
	let cursor: { sectionId: Id<"sections">; order: number | null } | null =
		scroll.placement ?? null;
	for (let step = 0; cursor; step += 1) {
		if (step >= MAX_NEXT_STEPS)
			throw new Error("A Codex walk found no next Scroll in time.");
		const item = await itemAfter(ctx, cursor.sectionId, cursor.order);
		if (item?.kind === "Scroll") return item.doc;
		if (item) {
			/* into the Section; an empty one hands back to its own Codex */
			cursor = { sectionId: item.doc._id, order: null };
			continue;
		}
		const section = await ctx.db.get(cursor.sectionId);
		cursor = section?.placement ?? null;
	}
	return null;
}

export async function findScrollProgress(
	ctx: QueryCtx,
	visitorId: string,
	scrollId: Id<"scrolls">,
) {
	return ctx.db
		.query("scrollProgress")
		.withIndex("by_visitor_id_and_scroll_id", (q) =>
			q.eq("visitorId", visitorId).eq("scrollId", scrollId),
		)
		.unique();
}

export async function findSectionProgress(
	ctx: QueryCtx,
	visitorId: string,
	sectionId: Id<"sections">,
) {
	return ctx.db
		.query("sectionProgress")
		.withIndex("by_visitor_id_and_section_id", (q) =>
			q.eq("visitorId", visitorId).eq("sectionId", sectionId),
		)
		.unique();
}

export async function scrollStatus(
	ctx: QueryCtx,
	visitorId: string,
	scrollId: Id<"scrolls">,
): Promise<ReadingStatus> {
	const progress = await findScrollProgress(ctx, visitorId, scrollId);
	return progress?.status ?? "NotStarted";
}

/** Done when every Scroll under it is; in progress once one was opened. */
export async function sectionStatus(
	ctx: QueryCtx,
	visitorId: string,
	section: Doc<"sections">,
): Promise<ReadingStatus> {
	const progress = await findSectionProgress(ctx, visitorId, section._id);
	if (!progress) return "NotStarted";
	return section.scrollCount > 0 &&
		progress.doneScrolls >= section.scrollCount
		? "Done"
		: "InProgress";
}

/**
 * A Visitor opened a Scroll: it is in progress unless already done, and
 * each Section above it remembers it as the last Scroll read there.
 */
export async function recordOpened(
	ctx: MutationCtx,
	visitorId: string,
	scroll: Doc<"scrolls">,
): Promise<void> {
	if (!(await findScrollProgress(ctx, visitorId, scroll._id)))
		await ctx.db.insert("scrollProgress", {
			visitorId,
			scrollId: scroll._id,
			status: "InProgress",
			position: 0,
		});
	for (const section of await sectionsAbove(ctx, scroll.placement)) {
		const progress = await findSectionProgress(ctx, visitorId, section._id);
		if (!progress)
			await ctx.db.insert("sectionProgress", {
				visitorId,
				sectionId: section._id,
				lastScrollId: scroll._id,
				doneScrolls: 0,
			});
		else if (progress.lastScrollId !== scroll._id)
			await ctx.db.patch(progress._id, { lastScrollId: scroll._id });
	}
}

/** Marks a Scroll done or back in progress; the Sections above count it. */
export async function recordDone(
	ctx: MutationCtx,
	visitorId: string,
	scroll: Doc<"scrolls">,
	done: boolean,
): Promise<void> {
	await recordOpened(ctx, visitorId, scroll);
	const progress = await findScrollProgress(ctx, visitorId, scroll._id);
	if (!progress || (progress.status === "Done") === done) return;
	await ctx.db.patch(progress._id, { status: done ? "Done" : "InProgress" });
	for (const section of await sectionsAbove(ctx, scroll.placement)) {
		const sectionProgress = await findSectionProgress(
			ctx,
			visitorId,
			section._id,
		);
		if (sectionProgress)
			await ctx.db.patch(sectionProgress._id, {
				doneScrolls: Math.max(
					0,
					sectionProgress.doneScrolls + (done ? 1 : -1),
				),
			});
	}
}

/** Where the reader was in a Scroll, by Sentence position. */
export async function recordPosition(
	ctx: MutationCtx,
	visitorId: string,
	scroll: Doc<"scrolls">,
	position: number,
): Promise<void> {
	await recordOpened(ctx, visitorId, scroll);
	const progress = await findScrollProgress(ctx, visitorId, scroll._id);
	if (progress && progress.position !== position)
		await ctx.db.patch(progress._id, { position });
}
