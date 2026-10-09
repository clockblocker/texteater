import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { JevCache } from "../../../lab/segmentation/harness/jev-cache.js";
import {
	type LedgerEntry,
	readLedger,
	type SpendEntry,
} from "../../../lab/segmentation/harness/ledger.js";
import {
	checkPin,
	currentPin,
	enterRound,
	guardProjectedSpend,
	type Pin,
	priceProjection,
	projectedSpend,
	type Round,
	readRounds,
	roundOf,
	roundSpend,
	roundStatus,
	roundsPath,
	standInAnswers,
	stopLineOf,
	writeRounds,
} from "../../../lab/segmentation/harness/round.js";
import { choice, noul } from "../../../src/segment/ask.js";
import { type JevAsk, pinnedJevModel } from "../../../src/segment/jev.js";

const packageRoot = resolve(import.meta.dir, "..", "..", "..");
const repository = resolve(packageRoot, "../..");
const evidenceRoot = join(packageRoot, "evidence", "segment-in-units-lab");
const directory = await mkdtemp(join(tmpdir(), "segment-in-units-round-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

const pin = (hash: string): Pin => ({
	dumcorpusCommit: "0".repeat(40),
	dumcorpusDirty: false,
	hash,
	inputs: { inventories: hash, rules: "rules" },
	at: "2026-10-02T00:00:00.000Z",
});

const round: Round = {
	id: "r1",
	opened: "2026-10-02",
	note: "",
	capTokens: 119_047_619,
	stopLineTokens: 104_000_000,
	pin: pin("a"),
	repins: [],
};

const spend = (tokens: number, roundId?: string): SpendEntry => ({
	runId: `run-${tokens}`,
	at: "",
	command: "run",
	gitHead: "",
	...(roundId ? { round: roundId } : {}),
	jev: {
		calls: 1,
		freshCalls: 1,
		freshInputTokens: tokens,
		allInputTokens: tokens,
	},
	luna: {
		calls: 0,
		freshCalls: 0,
		freshInputTokens: 0,
		freshOutputTokens: 0,
	},
});

test("a round counts only its own ledger lines, never the whole ledger", () => {
	const entries: LedgerEntry[] = [
		spend(200_000_000),
		spend(1_000, "r0"),
		spend(5_000_000, "r1"),
		spend(2_000_000, "r1"),
	];
	expect(roundSpend(entries, "r1")).toMatchObject({
		lines: 2,
		jevFreshInputTokens: 7_000_000,
	});
	expect(roundStatus(round, entries)).toMatchObject({
		leftToStopLine: 97_000_000,
		leftToCap: 112_047_619,
		reservedForFinal: 15_047_619,
	});
});

test("--token-budget may raise the stop line to the cap for the final run, never past it", () => {
	expect(stopLineOf(round)).toBe(104_000_000);
	expect(stopLineOf(round, "119047619")).toBe(119_047_619);
	expect(() => stopLineOf(round, "119047620")).toThrow("past round r1's cap");
});

test("a live run refuses drifted prompt inputs unless it re-pins; an offline one only reports them", () => {
	expect(
		checkPin({ round, current: pin("a"), live: true, repin: false }),
	).toBeUndefined();
	expect(() =>
		checkPin({ round, current: pin("b"), live: true, repin: false }),
	).toThrow("(inventories) changed");
	expect(
		checkPin({ round, current: pin("b"), live: false, repin: false }),
	).toContain("offline answers built from the old inputs miss");
	expect(
		checkPin({ round, current: pin("b"), live: true, repin: true }),
	).toContain("re-pinned");
});

test("--repin pins the round at today's dumcorpus and keeps the old pin", async () => {
	const root = join(directory, "repin");
	const { mkdir } = await import("node:fs/promises");
	await mkdir(root, { recursive: true });
	await writeRounds(roundsPath(root), { current: "r1", rounds: [round] });
	await expect(
		enterRound({
			evidenceRoot: root,
			repository,
			live: true,
			repin: false,
			reason: "test",
		}),
	).rejects.toThrow("--repin");
	const offline = await enterRound({
		evidenceRoot: root,
		repository,
		live: false,
		repin: false,
		reason: "test",
	});
	expect(offline.warning).toContain("changed since round r1 was pinned");
	const entered = await enterRound({
		evidenceRoot: root,
		repository,
		live: true,
		repin: true,
		reason: "peer edit accepted",
	});
	const book = await readRounds(roundsPath(root));
	expect(roundOf(book).pin.hash).toBe(entered.pin.hash);
	expect(roundOf(book).repins).toEqual([
		{ at: entered.pin.at, from: round.pin, reason: "peer edit accepted" },
	]);
	expect(
		(
			await enterRound({
				evidenceRoot: root,
				repository,
				live: true,
				repin: false,
				reason: "test",
			})
		).warning,
	).toBeUndefined();
});

test("a projection prices a request cached at another repetition exactly and the rest by size", () => {
	const priced = priceProjection({
		samples: [
			{ stage: "route", chars: 1000, inputTokens: 400 },
			{ stage: "route", chars: 2000, inputTokens: 800 },
		],
		requests: [
			{ stage: "route", chars: 1500, questions: 3, inputTokens: 650 },
			{ stage: "route", chars: 3000, questions: 4 },
			{ stage: "segments", chars: 500, questions: 1 },
		],
	});
	expect(priced).toMatchObject({
		requests: 3,
		exactTokens: 650,
		estimatedTokens: 1200 + 200,
		byStage: {
			route: { requests: 2, questions: 7, tokens: 650 + 1200 },
			segments: { requests: 1, questions: 1, tokens: 200 },
		},
	});
	expect(projectedSpend(priced)).toBe(650 + 1400 * 1.25);
	expect(() =>
		guardProjectedSpend({
			round,
			spent: 103_998_000,
			stopLine: round.stopLineTokens,
			priced,
		}),
	).toThrow("past the stop line");
	guardProjectedSpend({
		round,
		spent: 103_997_000,
		stopLine: round.stopLineTokens,
		priced,
	});
});

test("a projecting client asks nothing and writes nothing, answering a miss from another repetition or by stand-in", async () => {
	const cacheDirectory = join(directory, "projection");
	const questions = { q: noul("Does the sentence exist?") };
	const signal = new AbortController().signal;
	const askOf =
		(jev: JevCache) =>
		(sentence: string, repetition: number, stage = "test") =>
			jev
				.ask(repetition)(
					{ model: pinnedJevModel, state: { sentence }, questions },
					{ stage, signal },
				)
				.then(({ answers }) => answers);
	await askOf(
		new JevCache({
			cacheDirectory,
			transport: async () => ({
				model: pinnedJevModel,
				answers: { q: { type: "noul", noul: 0.25 } },
				usage: { input_tokens: 42, output_tokens: 0 },
			}),
		}),
	)("A sentence", 0);
	let asked = 0;
	const transport: JevAsk = async () => {
		asked++;
		throw Error("asked");
	};
	const jev = new JevCache({
		cacheDirectory,
		transport,
		offline: true,
		project: standInAnswers,
	});
	const ask = askOf(jev);
	expect(await ask("A sentence", 0)).toEqual({
		q: { type: "noul", noul: 0.25 },
	});
	expect(await ask("A sentence", 1000)).toEqual({
		q: { type: "noul", noul: 0.25 },
	});
	expect(
		(
			await jev.ask(0)(
				{
					model: pinnedJevModel,
					state: { sentence: "Another sentence" },
					questions: {
						c: choice("Which plan?", {
							Fusion: "split",
							AsWritten: "whole",
						}),
					},
				},
				{ stage: "segments", signal },
			)
		).answers,
	).toEqual({
		c: {
			type: "choice",
			choice: "Fusion",
			confidence: 1,
			probabilities: { Fusion: 1 },
		},
	});
	expect(asked).toBe(0);
	expect(jev.projection.samples).toHaveLength(1);
	expect(jev.projection.requests).toEqual([
		expect.objectContaining({ stage: "test", inputTokens: 42 }),
		expect.objectContaining({ stage: "segments", questions: 1 }),
	]);
	expect(jev.projection.requests[1]).not.toHaveProperty("inputTokens");
	// Nothing was cached for the projected requests.
	await expect(
		askOf(new JevCache({ cacheDirectory, offline: true }))(
			"A sentence",
			1000,
		),
	).rejects.toThrow("cache miss");
});

test("the round book names a current round it holds, and 2026-10-02-5usd stays 119,047,619 tokens, stopping at 104M, opened by fa59d50e's fill", async () => {
	const book = await readRounds(roundsPath(evidenceRoot));
	// Opening a round moves `current`; only its shape is pinned.
	const current = roundOf(book);
	expect(current.stopLineTokens).toBeLessThanOrEqual(current.capTokens);
	expect(current.pin.hash).toMatch(/^[0-9a-f]{64}$/u);
	const first = roundOf(book, "2026-10-02-5usd");
	expect(first).toMatchObject({
		capTokens: 119_047_619,
		stopLineTokens: 104_000_000,
	});
	const fill = [
		"20261002T075303--candidates4--final-1_closed-1--dev--all",
		"20261002T075337--candidates4--final-1_closed-1--heldout--all",
		"20261002T075501--reference--dev--all",
		"20261002T075513--reference--floors-run--dev--all",
		"20261002T075521--reference--heldout--all",
	];
	const entries = await readLedger(join(evidenceRoot, "ledger.jsonl"));
	expect(
		roundSpend(
			entries.filter(
				(entry) => "runId" in entry && fill.includes(entry.runId),
			),
			first.id,
		).jevFreshInputTokens,
	).toBe(6_890_292);
	expect((await currentPin(repository)).inputs).toHaveProperty("inventories");
});
