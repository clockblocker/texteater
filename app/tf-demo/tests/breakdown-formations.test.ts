import { expect, test } from "bun:test";
import { api } from "../convex/_generated/api";
import {
	createPlaygroundConvex,
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
	playgroundFixtures,
} from "./support/convex";

/** A stored base's Formations, by its Canonical Form in the Breakdown fixtures. */
async function formationsOf(canonicalForm: string) {
	const t = createPlaygroundConvex();
	await t.mutation(playgroundFixtures.load, {});
	const lemma = await t.run((ctx) =>
		ctx.db
			.query("lemmas")
			.filter((q) => q.eq(q.field("canonicalForm"), canonicalForm))
			.first(),
	);
	if (!lemma) throw new Error(`No fixture Lemma ${canonicalForm}.`);
	const note = await t.query(api.routeNotes.get, {
		target: { kind: "Lemma", lemmaId: lemma._id },
	});
	if (note?.kind !== "Lemma") throw new Error("Expected a Lemma Note.");
	return note.formations.map(({ group, formations }) => [
		group,
		formations.map((formation) => formation.canonicalForm),
	]);
}

test(
	"a base's Formations list the words that name it as their Source",
	async () => {
		expect(await formationsOf("kaufen")).toEqual([
			[
				"Prefixed",
				["abkaufen", "aufkaufen", "einkaufen", "erkaufen", "verkaufen"],
			],
			["Compounds", ["Kaufhaus"]],
			["Derivations", ["Käufer"]],
			["Sourced", ["Kauf"]],
		]);
		expect(await formationsOf("einkaufen")).toEqual([
			["Sourced", ["Einkauf"]],
		]);
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS * 2,
);
