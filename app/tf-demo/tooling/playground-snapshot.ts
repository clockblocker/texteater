import type { FunctionReturnType, RegisteredQuery } from "convex/server";
import type { api } from "../convex/_generated/api";
import { get as readingNote } from "../convex/readingNotes";
import { get as routeNote } from "../convex/routeNotes";
import { get as shadowNote } from "../convex/shadowNotes";
import { get as textView } from "../convex/textViews";
import type { NoteData } from "../src/notes/universal/note/data";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "../tests/support/indexed-db";
import { load, playground } from "./playground-fixtures";

export type PlaygroundSnapshot = {
	catalog: typeof playground extends RegisteredQuery<
		"public",
		Record<string, never>,
		infer Result
	>
		? Awaited<Result>
		: never;
	notes: Record<string, NoteData>;
	texts: Record<
		string,
		NonNullable<FunctionReturnType<typeof api.textViews.get>>
	>;
};

/** Fixture handlers run only against a disposable database, never Convex. */
export async function createPlaygroundSnapshot(): Promise<PlaygroundSnapshot> {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	const catalog = (await runTestQuery(
		db,
		playground,
		{},
	)) as PlaygroundSnapshot["catalog"];
	const notes: Record<string, NoteData> = {};
	async function add(key: string, fn: unknown, args: unknown) {
		const note = (await runTestQuery(db, fn, args)) as NoteData | null;
		if (note) notes[key] = note;
	}
	for (const row of db.rows("readings"))
		await add(`Reading:${row._id}`, readingNote, {
			readingId: row._id,
			visitorId: catalog.visitorId,
		});
	for (const row of db.rows("lemmas"))
		await add(`Lemma:${row._id}`, routeNote, {
			target: { kind: "Lemma", lemmaId: row._id },
		});
	for (const row of db.rows("surfaces"))
		await add(`Surface:${row.normalizedSurface}`, routeNote, {
			target: {
				kind: "Surface",
				language: "de",
				normalizedSurface: row.normalizedSurface,
			},
		});
	for (const row of db.rows("attestations"))
		await add(`Attestation:${row._id}`, routeNote, {
			target: { kind: "Attestation", attestationId: row._id },
		});
	for (const row of db.rows("shadows"))
		await add(`Shadow:${row._id}`, shadowNote, { shadowId: row._id });
	const texts: PlaygroundSnapshot["texts"] = {};
	for (const row of db.rows("texts")) {
		const view = (await runTestQuery(db, textView, {
			textId: row._id,
			visitorId: catalog.visitorId,
		})) as PlaygroundSnapshot["texts"][string] | null;
		if (view) texts[row._id] = view;
	}
	return { catalog, notes, texts };
}
