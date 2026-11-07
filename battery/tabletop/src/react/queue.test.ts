import { describe, expect, test } from "bun:test";
import type { Trick } from "../core/trick";
import { type Staged, TrickQueue } from "./queue";

const trick = (name: string): Trick => ({
	order: [name],
	rest: [],
	moves: new Map(),
});

/** A queue whose Table plays nothing and lands each Trick when told. */
function bench(lands: Record<string, number> = {}) {
	const played: string[] = [];
	const cues: { ms: number; fn: () => void }[] = [];
	const queue = new TrickQueue(
		(staged) => {
			const name = staged.trick.order[0] ?? "";
			played.push(name);
			return lands[name] ?? 0;
		},
		(ms, fn) => cues.push({ ms, fn }),
	);
	const land = () => cues.shift()?.fn();
	const stage =
		(name: string): (() => Staged) =>
		() => ({ trick: trick(name) });
	return { queue, played, cues, land, stage };
}

describe("the trick queue", () => {
	test("plays one Trick after another, each once the one before lands", async () => {
		const { queue, played, cues, land, stage } = bench({ sort: 1410 });
		const first = queue.push(stage("intro"));
		void queue.push(stage("sort"));
		expect(played).toEqual(["intro"]);
		land();
		await first;
		expect(played).toEqual(["intro", "sort"]);
		expect(cues[0]?.ms).toBe(1410);
	});

	test("makes each Trick only when its turn comes", () => {
		const { queue, land } = bench();
		let order = "before";
		const seen: string[] = [];
		void queue.push(() => ({ trick: trick("a") }));
		void queue.push(() => {
			seen.push(order);
			return { trick: trick("b") };
		});
		order = "after";
		land();
		expect(seen).toEqual(["after"]);
	});

	test("skips a stage that makes nothing", () => {
		const { queue, played, stage } = bench();
		void queue.push(() => null);
		void queue.push(stage("fan"));
		expect(played).toEqual(["fan"]);
	});

	test("drops what waits, and starts the next at once", async () => {
		const { queue, played, land, stage } = bench();
		void queue.push(stage("intro"));
		const waiting = queue.push(stage("sort"));
		queue.drop();
		await waiting;
		void queue.push(stage("intro"));
		expect(played).toEqual(["intro", "intro"]);
		void queue.push(stage("sort"));
		land();
		expect(played).toEqual(["intro", "intro"]);
		land();
		expect(played).toEqual(["intro", "intro", "sort"]);
	});
});
