import { api } from "../convex/_generated/api";
import type { NoteData } from "../src/notes/universal/note/data";
import {
	createPlaygroundConvex,
	playgroundFixtures,
} from "../tests/support/convex";
import type { PlaygroundSnapshot } from "./playground-snapshot";

/** Fixture handlers run only against a disposable database, never Convex. */
async function createPlaygroundSnapshot(): Promise<PlaygroundSnapshot> {
	const t = createPlaygroundConvex();
	await t.mutation(playgroundFixtures.load, {});
	const catalog = (await t.query(
		playgroundFixtures.playground,
		{},
	)) as PlaygroundSnapshot["catalog"];
	const { visitorId } = catalog;
	const rows = await t.run(async (ctx) => ({
		readings: await ctx.db.query("readings").collect(),
		lemmas: await ctx.db.query("lemmas").collect(),
		surfaces: await ctx.db.query("surfaces").collect(),
		attestations: await ctx.db.query("attestations").collect(),
		shadows: await ctx.db.query("shadows").collect(),
		texts: await ctx.db.query("texts").collect(),
	}));
	const notes: Record<string, NoteData> = {};
	function add(key: string, note: unknown) {
		if (note) notes[key] = note as NoteData;
	}
	for (const row of rows.readings)
		add(
			`Reading:${row._id}`,
			await t.query(api.readingNotes.get, {
				readingId: row._id,
				visitorId,
			}),
		);
	for (const row of rows.lemmas)
		add(
			`Lemma:${row._id}`,
			await t.query(api.routeNotes.get, {
				target: { kind: "Lemma", lemmaId: row._id },
			}),
		);
	for (const row of rows.surfaces)
		add(
			`Surface:${row.normalizedSurface}`,
			await t.query(api.routeNotes.get, {
				target: {
					kind: "Surface",
					language: "de",
					normalizedSurface: row.normalizedSurface,
				},
			}),
		);
	for (const row of rows.attestations)
		add(
			`Attestation:${row._id}`,
			await t.query(api.routeNotes.get, {
				target: { kind: "Attestation", attestationId: row._id },
			}),
		);
	for (const row of rows.shadows)
		add(
			`Shadow:${row._id}`,
			await t.query(api.shadowNotes.get, { shadowId: row._id }),
		);
	const texts: PlaygroundSnapshot["texts"] = {};
	for (const row of rows.texts) {
		const view = await t.query(api.textViews.get, {
			textId: row._id,
			visitorId,
		});
		if (view) texts[row._id] = view;
	}
	return { catalog, notes, texts };
}

const payload = JSON.stringify(await createPlaygroundSnapshot());
await new Promise<void>((resolve, reject) => {
	process.stdout.write(payload, (error) =>
		error ? reject(error) : resolve(),
	);
});
