import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { insertSection, placeScroll } from "./model/codex";
import { persistSubmittedScroll } from "./modules/scroll/submission";

/**
 * A nested book for exercising the Library, a Codex, Scroll status and next
 * across Sections before Intake writes Sections (#1190, #1191). A dev and
 * e2e path, never a Learner feature:
 *
 *     bunx convex run libraryFixtures:seedNestedBook
 *
 * Its keys start with `e2e:`, so the Library shelves it with the other
 * fixtures. Seeding again finds the stored book and changes nothing.
 */

const NESTED_BOOK_KEY = "e2e:nested-book";

type FixtureScroll = {
	readonly kind: "Scroll";
	readonly title: string;
	readonly sentences: readonly string[];
};
type FixtureSection = {
	readonly kind: "Section";
	readonly title: string;
	readonly contents: readonly (FixtureSection | FixtureScroll)[];
};

const scroll = (
	title: string,
	sentences: readonly string[],
): FixtureScroll => ({ kind: "Scroll", title, sentences });
const section = (
	title: string,
	contents: FixtureSection["contents"],
): FixtureSection => ({ kind: "Section", title, contents });

/** Long enough to scroll, so a reading position has somewhere to be. */
const longChapter = Array.from(
	{ length: 24 },
	(_, index) =>
		`Am ${(index + 1).toString()}. Tag wanderte die Familie weiter durch den dichten Wald, und niemand wusste, wie lange der Weg noch dauern würde.`,
);

/**
 * Teil 1 › Kapitel 1, Kapitel 2; Teil 2 › Abschnitt A › Kapitel 3, then
 * Kapitel 4; Nachwort. Next from Kapitel 2 crosses into Teil 2 and down
 * into Abschnitt A, and from Kapitel 3 climbs back out of it.
 */
const NESTED_BOOK = section("Die lange Reise", [
	section("Teil 1", [
		scroll("Kapitel 1", longChapter),
		scroll("Kapitel 2", [
			"Die Kinder schliefen unter einer alten Eiche.",
			"Am Morgen weckte sie der Regen.",
		]),
	]),
	section("Teil 2", [
		section("Abschnitt A", [
			scroll("Kapitel 3", [
				"Hinter dem Wald lag ein kleines Dorf.",
				"Dort gab es Brot und warme Suppe.",
			]),
		]),
		scroll("Kapitel 4", [
			"Der Bäcker erzählte von einem Fluss im Norden.",
			"Sie beschlossen, ihn am nächsten Tag zu suchen.",
		]),
	]),
	scroll("Nachwort", ["So endet die lange Reise der Familie."]),
]);

/** One word, run of space or run of punctuation per Segment, each word its own Unresolved unit. */
function storedSentence(key: string, position: number, text: string) {
	const pieces = text.match(/\s+|\p{P}+|[^\s\p{P}]+/gu) ?? [];
	const segments = pieces.map((piece) => ({
		kind: /^\s+$/.test(piece)
			? ("Whitespace" as const)
			: /^\p{P}+$/u.test(piece)
				? ("Punctuation" as const)
				: ("ResolvableText" as const),
		text: piece,
	}));
	return {
		segmentedSentenceId: `${key}:${position.toString()}`,
		position,
		paragraph: Math.floor(position / 4),
		language: "de" as const,
		stitchedText: text,
		segments,
		units: segments.flatMap((segment, index) =>
			segment.kind === "ResolvableText"
				? [{ segments: [index], route: "Unresolved" as const }]
				: [],
		),
	};
}

async function seedContents(
	ctx: MutationCtx,
	sectionId: Id<"sections">,
	contents: FixtureSection["contents"],
	key: string,
): Promise<void> {
	for (const [order, item] of contents.entries()) {
		const itemKey = `${key}:${order.toString()}`;
		const placement = { sectionId, order };
		if (item.kind === "Section") {
			const childId = await insertSection(ctx, {
				title: item.title,
				placement,
			});
			await seedContents(ctx, childId, item.contents, itemKey);
			continue;
		}
		const { scrollId } = await persistSubmittedScroll(ctx, {
			submissionKey: itemKey,
			sourceText: item.sentences.join(" "),
			sentences: item.sentences.map((text, position) =>
				storedSentence(itemKey, position, text),
			),
		});
		await ctx.db.patch(scrollId, { title: item.title });
		await placeScroll(ctx, scrollId, placement);
	}
}

export const seedNestedBook = internalMutation({
	args: {},
	returns: v.id("sections"),
	handler: async (ctx) => {
		const stored = await ctx.db
			.query("sections")
			.withIndex("by_placement", (q) =>
				q.eq("placement.sectionId", undefined),
			)
			.take(100);
		const existing = stored.find(
			(row) => row.submissionKey === NESTED_BOOK_KEY,
		);
		if (existing) return existing._id;
		const bookId = await insertSection(ctx, {
			title: NESTED_BOOK.title,
			submissionKey: NESTED_BOOK_KEY,
		});
		await seedContents(ctx, bookId, NESTED_BOOK.contents, NESTED_BOOK_KEY);
		return bookId;
	},
});
