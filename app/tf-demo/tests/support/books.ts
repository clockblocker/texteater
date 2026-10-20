import { createDumgen } from "dumgen";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ActionCtx } from "../../convex/_generated/server";
import { folioProcessingPort } from "../../convex/model/folios";
import { processFolios } from "../../server/folioIntake";
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

/** The action's storage port, its mutations run against the test database. */
export const portOf = (t: TestConvexDb, scrollId: Id<"scrolls">) =>
	folioProcessingPort(actionContext(t) as unknown as ActionCtx, scrollId);

const dumgenWith = (jev: ReturnType<typeof fakeJev>) =>
	createDumgen({
		jev: jev.ask,
		luna: async () => {
			throw Error("intake asked Luna");
		},
	});

/** Runs a Scroll's processing to its end with `jev`, as the action does. */
export function runFolios(
	t: TestConvexDb,
	scrollId: Id<"scrolls">,
	jev = fakeJev(),
) {
	return processFolios({
		dumgen: dumgenWith(jev),
		language: "de",
		hasTime: () => true,
		port: portOf(t, scrollId),
	});
}
