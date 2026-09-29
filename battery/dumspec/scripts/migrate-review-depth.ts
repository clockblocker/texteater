/**
 * One-off migration to layered review (ADR 0037, amended 2026-09-29): a
 * sentence or Breakdown Record's `status` becomes its Review Depth, Reviewed
 * as `"reviewDepth": "Reading"` and Draft as no depth, and every target gains
 * its `route`, copied from its Attestation's Lemma. Edits the text so each
 * file keeps its layout, checks the result against the parsed intent, and
 * skips a file already migrated, so it can be rerun after a merge. Delete it
 * once the branch lands.
 *
 *   bun scripts/migrate-review-depth.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sameValue } from "../src/check-record.js";

type Json = Record<string, unknown>;
type TargetJson = {
	memberSegmentIndices: number[];
	attestation?: {
		surface?: { lemma?: { family?: unknown; kind?: unknown } };
	};
};

const statusLine = /^([ \t]*)"status":[ \t]*"(Draft|Reviewed)",?\r?\n/mu;
// A target opens with its members; a legacy case opens with its source.
const targetOpening =
	/(\{\r?\n([ \t]*)"memberSegmentIndices":[ \t]*\[[^\]]*\],\r?\n)/gu;

/** The file migrated, or undefined when it already is. */
export function migrate(id: string, text: string): string | undefined {
	const before: Json = JSON.parse(text);
	if (!("status" in before)) return undefined;
	const status = before.status;
	const targets = (before.targets ?? []) as TargetJson[];
	const routes = targets.map((target, t) => {
		const lemma = target.attestation?.surface?.lemma;
		if (typeof lemma?.family !== "string" || typeof lemma.kind !== "string")
			throw Error(`${id} targets.${t}: no Lemma to take the route from`);
		return { family: lemma.family, kind: lemma.kind };
	});
	let next = text.replace(statusLine, (_, indent: string) =>
		status === "Reviewed" ? `${indent}"reviewDepth": "Reading",\n` : "",
	);
	let t = 0;
	next = next.replace(
		targetOpening,
		(opening: string, _: string, indent: string) => {
			const route = routes[t++];
			if (!route) throw Error(`${id}: more target openings than targets`);
			const { family, kind } = route;
			return `${opening}${indent}"route": { "family": ${JSON.stringify(family)}, "kind": ${JSON.stringify(kind)} },\n`;
		},
	);
	if (t !== routes.length)
		throw Error(`${id}: found ${t} target openings for ${routes.length}`);
	const { status: _status, ...rest } = before;
	const expected: Json = {
		...rest,
		...(status === "Reviewed" ? { reviewDepth: "Reading" } : {}),
		...("targets" in before
			? {
					targets: targets.map((target, index) => ({
						...target,
						route: routes[index],
					})),
				}
			: {}),
	};
	if (!sameValue(JSON.parse(next), expected))
		throw Error(`${id}: the text edit does not match the intended record`);
	return next;
}

if (import.meta.main) {
	const directory = fileURLToPath(new URL("../records/", import.meta.url));
	let migrated = 0;
	for (const path of readdirSync(directory, {
		recursive: true,
		encoding: "utf8",
	})) {
		const id = path.replaceAll("\\", "/");
		if (!id.endsWith(".json") || id.startsWith("text/")) continue;
		const file = join(directory, path);
		const next = migrate(id, readFileSync(file, "utf8"));
		if (next === undefined) continue;
		writeFileSync(file, next);
		migrated++;
	}
	console.log(`Migrated ${migrated} records`);
}
