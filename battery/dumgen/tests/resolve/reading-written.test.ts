import { expect, test } from "bun:test";
import {
	attestationOf,
	authoredLemma,
	readOnce,
	writes,
} from "./reading-support.js";
import { fakeJev, sentenceOf, unitOf } from "./support.js";

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

// The description Grammar's Canonical Form call drafted: an offered one
// settles the Reuse before the judge, any other stands in for Luna's after
// it (ADR 0031).

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

test("a draft that is a stored description, compared as Dumling parses it, is a Reuse of it with no judge call", async () => {
	// The judge would pick the other one: it is never asked.
	const jev = fakeJev({ reading: "c0" });
	const luna = writes("🧩");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: ["🏰", "🕰"],
		drafted: "🕰️",
	});
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "🕰" });
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
	expect(trace?.calls).toEqual([]);
	expect(trace?.resolution).toEqual({
		outcome: "Reuse",
		reason: "DraftedStored",
	});
});

test("a draft that is an authored description not stored yet takes that Reading as New with no judge call", async () => {
	const { lemma, readings } = authoredLemma("darum", "ADV");
	const [, other = ""] = readings;
	const jev = fakeJev({ reading: "a0" });
	const { result, trace } = await readOnce(jev, writes("🧩"), {
		attestation: attestationOf(lemma, { inflectionalFeatures: null }),
		sentence: sentenceOf("Darum kommt er."),
		unit: unitOf([0], "Lexeme/ADV"),
		candidates: [],
		drafted: other,
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: other });
	expect(jev.sent).toEqual([]);
	expect(trace?.resolution).toEqual({
		outcome: "New",
		reason: "DraftedStored",
	});
});

test("with a draft that is none of the stored descriptions jev judges first: its pick is reused and the draft dropped", async () => {
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

test("after NoMatch a draft the judge was not offered is the New one, with no Luna call", async () => {
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
	expect(noMatch.trace?.resolution).toEqual({
		outcome: "New",
		reason: "Drafted",
	});
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
