import { expect, test } from "bun:test";
import type { JudgedGrammar } from "dumgen";
import * as Effect from "effect/Effect";
import type { ResolutionProgressObserver } from "../server/orchestrationPorts";
import {
	fakeResolution,
	grammar,
	providerFailure,
	setup,
} from "./support/click-orchestration";

/*
 * What jev judged of a click reaches the session while Luna is still
 * writing the headword (#1329): saved beside Grammar, never delaying it,
 * never after it, and never failing the click.
 */

const judged: JudgedGrammar = {
	route: { language: "de", family: "Lexeme", kind: "NOUN" },
	coreFeatures: { gender: "Fem" },
	inflectionalFeatures: { case: "Nom", number: "Plur", gender: null },
	surfaceFeatures: null,
	spelling: { kind: "Canonical" },
	members: [{ segment: 0, orthography: "Standard" }],
	realizationCoverage: "Full",
	pending: [],
};

/** Lets every pending callback and timer of the run go first. */
const settle = async () => {
	for (let turn = 0; turn < 20; turn++)
		await new Promise((resolve) => setTimeout(resolve, 0));
};

/** A promise the test resolves when it lets the held step go on. */
function held() {
	let release = () => {};
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { release, released };
}

/** An observer that records each save in `events`; `judgedSave` stands in for the judged one. */
function recordingObserver(
	events: string[],
	judgedSave: (judged: JudgedGrammar) => Promise<void> = async () => {},
): ResolutionProgressObserver {
	return {
		async grammarJudged({ judged }) {
			events.push("judged saving");
			await judgedSave(judged);
			events.push("judged saved");
		},
		async grammarAvailable() {
			events.push("Grammar saved");
		},
		committing(input) {
			events.push("commit");
			return {
				...input,
				succeeded: { phase: "Commit", generationEvents: [] },
			};
		},
	};
}

/** Grammar that reports `judged`, then waits for `luna` before it answers. */
function judgingGrammar(luna: Promise<void>) {
	return fakeResolution({
		grammar: (_input, onJudged) =>
			Effect.gen(function* () {
				if (onJudged) yield* onJudged(judged);
				yield* Effect.promise(() => luna);
				return grammar;
			}),
	}).resolution;
}

test("what jev judged is saved while Luna is still writing the headword, before Grammar and the commit", async () => {
	const events: string[] = [];
	const luna = held();
	const saved: JudgedGrammar[] = [];
	const run = setup({
		resolution: judgingGrammar(luna.released),
		observer: recordingObserver(events, async (judged) => {
			saved.push(judged);
		}),
	});
	const resolved = run.resolve();
	await settle();
	expect(events).toEqual(["judged saving", "judged saved"]);
	expect(saved).toEqual([judged]);
	luna.release();
	await resolved;
	expect(events).toEqual([
		"judged saving",
		"judged saved",
		"Grammar saved",
		"commit",
	]);
	expect(run.writes).toHaveLength(1);
});

test("Grammar that returns as soon as jev has judged, as with a headword code writes, saves no judged step", async () => {
	const events: string[] = [];
	const run = setup({
		resolution: fakeResolution({
			grammar: (_input, onJudged) =>
				Effect.gen(function* () {
					if (onJudged) yield* onJudged(judged);
					return grammar;
				}),
		}).resolution,
		observer: recordingObserver(events),
	});
	await run.resolve();
	expect(events).toEqual(["Grammar saved", "commit"]);
});

test("a held judged save delays neither Grammar nor the commit, and the run ends once it has landed", async () => {
	const events: string[] = [];
	const luna = held();
	const save = held();
	const run = setup({
		resolution: judgingGrammar(luna.released),
		observer: recordingObserver(events, () => save.released),
	});
	let ended = false;
	const resolved = run.resolve().finally(() => {
		ended = true;
	});
	await settle();
	luna.release();
	await settle();
	expect(events).toEqual(["judged saving", "Grammar saved", "commit"]);
	expect(run.writes).toHaveLength(1);
	expect(ended).toBe(false);
	save.release();
	await resolved;
	expect(events.at(-1)).toBe("judged saved");
});

test("a failed judged save leaves the click to commit", async () => {
	const events: string[] = [];
	const luna = held();
	const run = setup({
		resolution: judgingGrammar(luna.released),
		observer: recordingObserver(events, async () => {
			throw new Error("the session row is gone");
		}),
	});
	const resolved = run.resolve();
	await settle();
	luna.release();
	await resolved;
	expect(events).toEqual(["judged saving", "Grammar saved", "commit"]);
	expect(run.writes).toHaveLength(1);
});

test("a click whose Grammar fails still waits for the judged save before it ends", async () => {
	const save = held();
	const run = setup({
		resolution: fakeResolution({
			grammar: (_input, onJudged) =>
				Effect.gen(function* () {
					if (onJudged) yield* onJudged(judged);
					yield* Effect.promise(() => settle());
					return yield* providerFailure("Luna is down");
				}),
		}).resolution,
		observer: recordingObserver([], () => save.released),
	});
	let ended = false;
	const resolved = run.resolve().finally(() => {
		ended = true;
	});
	await settle();
	await settle();
	expect(ended).toBe(false);
	save.release();
	await expect(resolved).rejects.toThrow();
});
