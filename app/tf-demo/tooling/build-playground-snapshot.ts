import { api } from "../convex/_generated/api";
import {
	createPlaygroundConvex,
	playgroundFixtures,
} from "../tests/support/convex";
import type { PlaygroundSnapshot } from "./playground-snapshot";

/**
 * The fake db every playground reads, built in a disposable database:
 * fixture handlers never run against Convex.
 */
export async function createPlaygroundSnapshot(): Promise<PlaygroundSnapshot> {
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
		scrolls: await ctx.db.query("scrolls").collect(),
	}));
	const notes: PlaygroundSnapshot["notes"] = {};
	function add(
		key: string,
		note: PlaygroundSnapshot["notes"][string] | null,
	) {
		if (note) notes[key] = note;
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
	const scrolls: PlaygroundSnapshot["scrolls"] = {};
	for (const row of rows.scrolls) {
		const view = await t.query(api.scrollViews.get, {
			scrollId: row._id,
			visitorId,
		});
		if (view) scrolls[row._id] = view;
	}
	return { catalog, notes, scrolls };
}
