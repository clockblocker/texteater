import { afterAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runEvaluationCli } from "../../../cli/evaluate.js";
import {
	constituentsCases,
	morphemesCases,
} from "../../../lab/evaluation/breakdown/cases.js";
import {
	evaluateConstituents,
	evaluateMorphemes,
} from "../../../lab/evaluation/breakdown/scoring.js";
import type { JevAsk } from "../../../src/segment/jev.js";

const repository = resolve(import.meta.dir, "..", "..", "..", "..", "..");
const directory = await mkdtemp(join(tmpdir(), "dumgen-breakdown-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

const noun = (canonicalForm: string) => ({
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm,
});
const interfix = {
	language: "de",
	family: "Morpheme",
	kind: "Interfix",
	canonicalForm: "-e-",
};

test("every Breakdown Record without a Source is a segment.inConstituents case, and a bottom word's a segment.inMorphemes case", () => {
	const cases = constituentsCases();
	expect(cases.length).toBeGreaterThanOrEqual(27);
	// Lauf has a Source, so the host never runs a segmenter on it (ADR 0050).
	expect(cases.some(({ id }) => id === "breakdown/de/lauf")).toBe(false);
	const spannen = cases.find(({ id }) => id === "breakdown/de/spannen");
	expect(spannen?.idealOutput).toEqual({ kind: "NoConstituents" });
	const gaestehaus = cases.find(({ id }) => id === "breakdown/de/gaestehaus");
	expect(gaestehaus?.group).toBe("word");
	expect(gaestehaus?.idealOutput).toEqual({
		kind: "Constituents",
		pieces: [
			{ letters: "Gäst", target: noun("Gast") },
			{ letters: "e", target: interfix },
			{ letters: "haus", target: noun("Haus") },
		],
	});
	expect(morphemesCases().map(({ id }) => id)).toEqual(
		expect.arrayContaining(["breakdown/de/kaufen", "breakdown/de/spannen"]),
	);
});

test("an answer passes only exactly; cuts and links are counted apart", () => {
	const gold = {
		kind: "Constituents" as const,
		pieces: [
			{ letters: "Gäst", target: noun("Gast") },
			{ letters: "e", target: interfix },
			{ letters: "haus", target: noun("Haus") },
		],
	};
	const evaluate = evaluateConstituents({ case: "word" });
	expect(
		evaluate({ caseId: "case", idealOutput: gold, output: gold })
			.contractPass,
	).toBe(true);
	const plural = evaluate({
		caseId: "case",
		idealOutput: gold,
		output: {
			kind: "Constituents",
			pieces: [
				{ letters: "Gäste", target: noun("Gast") },
				{ letters: "haus", target: noun("Haus") },
			],
		},
	});
	expect(plural).toMatchObject({
		contractPass: false,
		cuts: { gold: 2, returned: 1, matched: 1 },
		links: { gold: 3, placed: 1, route: 1, linked: 1 },
		hasConstituents: { gold: true, returned: true },
	});
	expect(
		evaluate({
			caseId: "case",
			idealOutput: gold,
			output: { kind: "NoConstituents" },
		}),
	).toMatchObject({
		contractPass: false,
		hasConstituents: { gold: true, returned: false },
	});
	expect(
		evaluateMorphemes({})({
			caseId: "case",
			idealOutput: { pieces: [{ letters: "Haus" }] },
			output: { pieces: [{ letters: "Haus" }] },
		}).contractPass,
	).toBe(true);
});

/** A jev that says no to everything: a Choice's last option, a low Noul. */
function noJudge() {
	const counter = { calls: 0 };
	const jev: JevAsk = async (request) => {
		counter.calls++;
		return {
			model: request.model,
			answers: Object.fromEntries(
				Object.entries(request.questions).map(([id, question]) => [
					id,
					question.type === "noul"
						? { type: "noul", noul: 0.1 }
						: {
								type: "choice",
								choice:
									Object.keys(
										question.type === "choice"
											? question.criteria
											: {},
									).at(-1) ?? "",
								confidence: 1,
								probabilities: {},
							},
				]),
			),
			usage: { input_tokens: 100, output_tokens: 0 },
		};
	};
	return { jev, counter };
}

test("a live run needs a granted budget, prices itself first, writes its ledger line and then replays offline", async () => {
	const { jev, counter } = noJudge();
	const labRoot = join(directory, "lab");
	const evidence = join(directory, "evidence");
	const casesFile = join(directory, "cases.txt");
	await writeFile(casesFile, "breakdown/de/gaestehaus\n");
	const written: unknown[] = [];
	const cli = (argv: string[]) =>
		runEvaluationCli(
			[
				"--experiment",
				"segment-in-constituents/de:breakdown",
				"--revision",
				"test",
				"--cases",
				casesFile,
				"--repetitions",
				"1",
				"--output",
				join(directory, "runs"),
				...argv,
			],
			{
				jev,
				labRoot,
				repository,
				resolveEvidenceRoot: evidence,
				write: (value) => written.push(value),
				warn: () => {},
			},
		);
	await expect(cli([])).rejects.toThrow("needs --budget");
	await expect(cli(["--budget", "1"])).rejects.toThrow(
		"past the budget of 1. Nothing was asked.",
	);
	expect(counter.calls).toBe(0);
	await cli(["--budget", "100000"]);
	expect(counter.calls).toBe(1);
	const ledger = await readFile(
		join(evidence, "segment-breakdown", "ledger.jsonl"),
		"utf8",
	);
	expect(JSON.parse(ledger)).toMatchObject({
		experiment: "segment-in-constituents/de:breakdown",
		budget: 100000,
		jev: { freshCalls: 1, freshInputTokens: 100 },
	});
	await cli(["--offline"]);
	expect(counter.calls).toBe(1);
	expect(written.at(-1)).toMatchObject({
		metrics: { all: { attempts: 1, exact: 0 } },
	});
});
