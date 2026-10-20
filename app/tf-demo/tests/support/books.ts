import { createDumgen } from "dumgen";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ActionCtx } from "../../convex/_generated/server";
import { folioProcessingPort } from "../../convex/model/folios";
import { processFolio } from "../../server/folioIntake";
import { actionContext, type TestConvexDb } from "./convex";
import { fakeJev } from "./jev";

/* A .txt book the Folio test files share, and a run of its processing. */

export const VISITOR = "visitor-1";

/** About 250 characters: three German Sentences. */
const paragraph = (chapter: number, index: number) =>
	[
		`Im ${chapter.toString()}. Kapitel ging Effi am ${index.toString()}. Tag langsam an den langen Strand.`,
		"Dort sah sie lange auf das graue Meer hinaus und dachte an die Stadt.",
		"Dann kehrte sie still in das alte Haus am Rand des Dorfes zurück.",
	].join(" ");

/** Front matter, then chapters of 60 Paragraphs, about five Folios each. */
function book(chapters: number): string {
	return [
		"Die lange Reise",
		"Ein Roman in Kapiteln.",
		...Array.from({ length: chapters }, (_, chapter) =>
			[
				`Kapitel ${(chapter + 1).toString()}`,
				...Array.from({ length: 60 }, (_, index) =>
					paragraph(chapter + 1, index + 1),
				),
			].join("\n\n"),
		),
	].join("\n\n");
}

export async function submitBook(t: TestConvexDb) {
	const storageId = await t.run((ctx) =>
		ctx.storage.store(new Blob([new TextEncoder().encode(book(2))])),
	);
	const result = await t.action(api.textFileIntake.submitTextFile, {
		visitorId: VISITOR,
		storageId,
		fileName: "die_lange_reise.txt",
	});
	if (result.status !== "Accepted") throw new Error(result.message);
	const scrolls = await t.run((ctx) => ctx.db.query("scrolls").collect());
	// A book Scroll's key ends in its index in the book.
	const index = (key: string) => Number(key.split("#").at(-1));
	return scrolls
		.sort((a, b) => index(a.submissionKey) - index(b.submissionKey))
		.map(({ _id }) => _id);
}

/** A Scroll's Folios in order, as stored. */
export const foliosOf = (t: TestConvexDb, scrollId: Id<"scrolls">) =>
	t.run((ctx) =>
		ctx.db
			.query("folios")
			.withIndex("by_scroll_id_and_start", (q) =>
				q.eq("scrollId", scrollId),
			)
			.collect(),
	);

/** The action's storage port for one run, its mutations run against the test database. */
export const portOf = (t: TestConvexDb, folioId: Id<"folios">, run: number) =>
	folioProcessingPort(actionContext(t) as unknown as ActionCtx, folioId, run);

const dumgenWith = (jev: ReturnType<typeof fakeJev>) =>
	createDumgen({
		jev: jev.ask,
		luna: async () => {
			throw Error("intake asked Luna");
		},
	});

/**
 * Runs a requested Folio's processing to its end with `jev`, as the
 * action does, through `port` (the run's own by default).
 */
export async function runFolio(
	t: TestConvexDb,
	folioId: Id<"folios">,
	options: {
		readonly jev?: ReturnType<typeof fakeJev>;
		readonly port?: ReturnType<typeof portOf>;
	} = {},
) {
	const folio = await t.run((ctx) => ctx.db.get(folioId));
	return processFolio({
		dumgen: dumgenWith(options.jev ?? fakeJev()),
		language: "de",
		hasTime: () => true,
		port: options.port ?? portOf(t, folioId, folio?.run ?? 0),
	});
}

/** Asks for a Folio and processes it, as the reader's control does. */
export async function requestAndRun(
	t: TestConvexDb,
	folioId: Id<"folios">,
	jev?: ReturnType<typeof fakeJev>,
) {
	await t.mutation(api.folios.request, { folioId, visitorId: VISITOR });
	return runFolio(t, folioId, jev ? { jev } : {});
}
