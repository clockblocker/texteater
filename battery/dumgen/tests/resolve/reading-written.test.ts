import { expect, test } from "bun:test";
import { readOnce, writes } from "./reading-support.js";
import { fakeJev } from "./support.js";

// A New refused as stale is judged again (ADR 0031 decision 6, #596).

test("a stale New is judged again over the current candidates; a second NoMatch takes the written one with no Luna call", async () => {
	const jev = fakeJev({ reading: "NoMatch" });
	const luna = writes("🧩");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: ["🏰", "🔒"],
		written: "🔐",
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(jev.stages()).toEqual(["reading"]);
	expect(luna.sent).toEqual([]);
	expect(trace?.resolution).toEqual({ outcome: "New", reason: "Rejudged" });
});

test("judged again, a pick reuses the Reading stored since, and a written one stored since is reused with no call", async () => {
	const picked = await readOnce(fakeJev({ reading: "c1" }), writes("🧩"), {
		candidates: ["🏰", "🔒"],
		written: "🔐",
	});
	expect(picked.result).toEqual({ _tag: "Reuse", emojiDescription: "🔒" });
	const jev = fakeJev();
	const stored = await readOnce(jev, writes("🧩"), {
		candidates: ["🏰", "🔐"],
		written: "🔐",
	});
	expect(stored.result).toEqual({ _tag: "Reuse", emojiDescription: "🔐" });
	expect(stored.trace?.resolution?.reason).toBe("WrittenStored");
	expect(jev.sent).toEqual([]);
});

// The description Grammar's Canonical Form call drafted stands in for
// Luna's after the judge (ADR 0031).

test("with nothing stored, the drafted description is the New one, with no call", async () => {
	const jev = fakeJev();
	const luna = writes("🧩");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: [],
		drafted: "🔐",
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
	expect(trace?.resolution).toEqual({ outcome: "New", reason: "Drafted" });
});

test("with stored Readings jev still judges first: its pick is reused and the draft dropped", async () => {
	const jev = fakeJev({ reading: "c0" });
	const luna = writes("🧩");
	const { result } = await readOnce(jev, luna, {
		candidates: ["🏰"],
		drafted: "🔐",
	});
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "🏰" });
	expect(jev.stages()).toEqual(["reading"]);
	// The judge sees the stored descriptions only, never the draft.
	expect(JSON.stringify(jev.sent[0])).not.toContain("🔐");
	expect(luna.sent).toEqual([]);
});

test("after NoMatch the draft is the New one, and a draft already stored is a Reuse of it", async () => {
	const noMatch = await readOnce(
		fakeJev({ reading: "NoMatch" }),
		writes("🧩"),
		{
			candidates: ["🏰"],
			drafted: "🔐",
		},
	);
	expect(noMatch.result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(noMatch.trace?.calls.map(({ stage }) => stage)).toEqual(["reading"]);
	const collided = await readOnce(
		fakeJev({ reading: "NoMatch" }),
		writes("🧩"),
		{ candidates: ["🏰", "🕰"], drafted: "🕰️" },
	);
	expect(collided.result).toEqual({ _tag: "Reuse", emojiDescription: "🕰" });
	expect(collided.trace?.resolution?.reason).toBe("Collision");
});

test("a stale New judged again keeps the written description over the draft", async () => {
	const { result, trace } = await readOnce(
		fakeJev({ reading: "NoMatch" }),
		writes("🧩"),
		{ candidates: ["🏰"], written: "🔐", drafted: "🗝" },
	);
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(trace?.resolution?.reason).toBe("Rejudged");
});
