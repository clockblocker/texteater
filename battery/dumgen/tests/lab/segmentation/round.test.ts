import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { JevCache } from "../../../lab/segmentation/harness/jev-cache.js";
import {
	type LedgerEntry,
	readLedger,
	type SpendEntry,
} from "../../../lab/segmentation/harness/ledger.js";
import {
	type Calibration,
	pricerOf,
	readCalibration,
	tokenModel,
} from "../../../lab/segmentation/harness/pricing.js";
import {
	checkPin,
	currentPin,
	enterRound,
	guardProjectedSpend,
	type Pin,
	priceProjection,
	projectedSpend,
	projectionText,
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

test("a request no cache prices costs a shared overhead plus its characters at its stage's rate, fitted over the pass's cached requests and the ledger's stages", () => {
	const requests = [
		{ stage: "route", chars: 3000, questions: 1 },
		{ stage: "forms", chars: 1000, questions: 1 },
		{ stage: "analysis", chars: 900, questions: 1 },
		{ stage: "route", chars: 100, questions: 1, inputTokens: 70 },
	];
	// Every request costs 100 tokens plus 0.3 a character for route and 0.2
	// for forms: two route sizes in the pass, forms from a ledger line.
	const calibration: Calibration = {
		stages: [
			{ stage: "forms", requests: 4, chars: 2000, inputTokens: 800 },
		],
		perRequest: { gitHead: "head", requests: 10, inputTokens: 8000 },
	};
	const samples = [
		{ stage: "route", chars: 1000, inputTokens: 400 },
		{ stage: "route", chars: 2000, inputTokens: 700 },
	];
	// analysis, with no data of its own, takes every stage's rate:
	// (2,200,000 − 100 × 5,000) / 6,000,000 a character.
	const withSamples = priceProjection({ samples, requests }, calibration);
	expect(withSamples).toMatchObject({
		exactTokens: 70,
		estimatedTokens: 1000 + 300 + 355,
		pricedFrom: {
			repetition: 1,
			stage: 2,
			allStages: 1,
			ledgerRequest: 0,
			characters: 0,
		},
	});
	expect(projectionText(withSamples)).toContain(
		"priced from another repetition's usage 1, the fit of their stage 2, the fit of every stage 1, the ledger's tokens per request 0, 3 characters per token 0",
	);
	// One request size tells no overhead from a rate, so forms alone is 0.4
	// a character, and the other stages take it.
	expect(
		priceProjection({ samples: [], requests }, calibration),
	).toMatchObject({
		estimatedTokens: 1200 + 400 + 360,
		pricedFrom: { stage: 1, allStages: 2 },
	});
	// No stage measured: the ledger's 800 tokens per request.
	expect(
		priceProjection(
			{ samples: [], requests },
			{ ...calibration, stages: [] },
		),
	).toMatchObject({
		estimatedTokens: 2400,
		pricedFrom: { ledgerRequest: 3, characters: 0 },
	});
	// Nothing measured: 3 characters per token, as before calibration.
	expect(priceProjection({ samples: [], requests })).toMatchObject({
		estimatedTokens: 1000 + 333 + 300,
		pricedFrom: { repetition: 1, characters: 3 },
	});
});

test("a stage whose requests are all one size is priced near them, not off a fitted slope (#1241 round 4)", () => {
	// Round 4 priced segment.inMorphemes' breakdown-words at 2,036 tokens a
	// request from four cached requests of 632 to 636 characters; it cost 448.
	const samples = [
		{ stage: "breakdown-words", chars: 632, inputTokens: 426 },
		{ stage: "breakdown-words", chars: 634, inputTokens: 425 },
		{ stage: "breakdown-words", chars: 636, inputTokens: 428 },
		{ stage: "breakdown-words", chars: 635, inputTokens: 424 },
		{ stage: "breakdown-routes", chars: 2000, inputTokens: 920 },
		{ stage: "breakdown-routes", chars: 6000, inputTokens: 2220 },
	];
	const { tokens } = pricerOf(samples)("breakdown-words", 700);
	expect(tokens).toBeGreaterThan(440);
	expect(tokens).toBeLessThan(480);
	const model = tokenModel(
		samples.map((sample) => ({ ...sample, requests: 1 })),
	);
	expect(model?.overhead).toBeCloseTo(270, 0);
});

test("a ledger's calibration keeps every Breakdown line's recorded stages and takes tokens per request from the lines at the latest commit with fresh calls", async () => {
	const path = join(directory, "breakdown-ledger.jsonl");
	const line = (
		experiment: string,
		gitHead: string,
		freshCalls: number,
		freshInputTokens: number,
		stages?: object,
	) =>
		JSON.stringify({
			runId: `${experiment}-${gitHead}`,
			at: "",
			command: "evaluate",
			experiment,
			budget: 1,
			gitHead,
			jev: {
				calls: freshCalls,
				freshCalls,
				freshInputTokens,
				allInputTokens: 0,
			},
			luna: {
				calls: 0,
				freshCalls: 0,
				freshInputTokens: 0,
				freshOutputTokens: 0,
			},
			...(stages ? { stages } : {}),
		});
	await writeFile(
		path,
		`${[
			line("segment-in-constituents/de:breakdown", "a", 10, 1000, {
				routes: { requests: 2, chars: 3000, inputTokens: 1000 },
			}),
			line("segment-in-constituents/de:realtext", "b", 4, 4000, {
				routes: { requests: 1, chars: 1000, inputTokens: 500 },
				forms: { requests: 3, chars: 1200, inputTokens: 400 },
			}),
			line("segment-in-morphemes/de:breakdown", "b", 6, 2000, {
				words: { requests: 6, chars: 3000, inputTokens: 2000 },
			}),
			line("segment-in-morphemes/de:breakdown", "c", 0, 0),
			line("segment-in-units/de:dev", "c", 9, 99_999, {
				units: { requests: 9, chars: 9000, inputTokens: 99_999 },
			}),
		].join("\n")}\n`,
	);
	expect(await readCalibration(path)).toEqual({
		stages: [
			{ stage: "routes", requests: 2, chars: 3000, inputTokens: 1000 },
			{ stage: "routes", requests: 1, chars: 1000, inputTokens: 500 },
			{ stage: "forms", requests: 3, chars: 1200, inputTokens: 400 },
			{ stage: "words", requests: 6, chars: 3000, inputTokens: 2000 },
		],
		perRequest: { gitHead: "b", requests: 10, inputTokens: 6000 },
	});
	expect(
		await readCalibration(join(directory, "none.jsonl")),
	).toBeUndefined();
});
