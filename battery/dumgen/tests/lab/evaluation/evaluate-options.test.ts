import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	rejectUnreadRunOptions,
	runEvaluationCli,
} from "../../../cli/evaluate.js";
import { listExperiments } from "../../../lab/evaluation/experiments.js";
import { goldJudge, labWithSetIn } from "./experiments-support.js";

const repository = resolve(import.meta.dir, "..", "..", "..", "..", "..");
const directory = await mkdtemp(join(tmpdir(), "dumgen-evaluate-options-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

const labWithSet = (name: string) => labWithSetIn(directory, name);

test("an evaluate command given an option its experiment does not read in its mode fails before it prices or asks anything", async () => {
	const lab = await labWithSet("unread-options");
	const { jev, counter } = goldJudge();
	const written: unknown[] = [];
	const cli = (argv: string[]) =>
		runEvaluationCli(argv, {
			jev,
			...lab,
			repository,
			write: (value) => written.push(value),
			warn: () => {},
		});
	const estimate = ["--experiment", "segment-in-units/de:dev", "--estimate"];

	await expect(cli([...estimate, "--limit", "2"])).rejects.toThrow(
		"--limit does not apply to an --estimate of segment-in-units/de:dev, which takes --experiment, --revision, --output, --estimate, --units, --judgment-model, --concurrency, --cases, --cases-from, --token-budget. A segment.inUnits run always runs its whole set (or its case list) at 3 repetitions; use --cases <ids file> or --cases-from <request compare report> to run part of a set",
	);
	await expect(cli([...estimate, "--subset", "subset.json"])).rejects.toThrow(
		"--subset does not apply",
	);
	await expect(
		cli([...estimate, "--repetitions", "1", "--gold-only"]),
	).rejects.toThrow("--repetitions, --gold-only do not apply");
	// --requests wins over --estimate, which it does not read.
	await expect(cli([...estimate, "--requests"])).rejects.toThrow(
		"--estimate does not apply to a --requests run of segment-in-units/de:dev, which takes --experiment, --revision, --output, --requests, --units, --judgment-model, --concurrency",
	);
	await expect(
		cli([
			"--experiment",
			"resolve-grammar/de:dev",
			"--revision",
			"test",
			"--requests",
			"--subset",
			"evidence/resolve-grammar/round-2-subset.json",
		]),
	).rejects.toThrow(
		"--subset does not apply to a --requests run of resolve-grammar/de:dev, which takes --experiment, --revision, --output, --requests, --concurrency",
	);
	await expect(
		cli([
			"--experiment",
			"resolve-grammar/de:dev",
			"--estimate",
			"--gold-only",
		]),
	).rejects.toThrow(
		"--gold-only does not apply to an --estimate of resolve-grammar/de:dev, which takes --experiment, --revision, --output, --estimate, --concurrency, --limit, --subset, --repetitions, --whole-round",
	);
	await expect(
		cli([
			"--experiment",
			"resolve-reading/de:dev",
			"--revision",
			"test",
			"--offline",
			"--gold-only",
		]),
	).rejects.toThrow(
		"--gold-only does not apply to an --offline run of resolve-reading/de:dev",
	);
	await expect(
		cli([
			"--experiment",
			"split-text/de:ud-drafts",
			"--revision",
			"test",
			"--limit",
			"2",
			"--units",
			"reference",
		]),
	).rejects.toThrow(
		"--limit, --units do not apply to a live run of split-text/de:ud-drafts, which takes --experiment, --revision, --output",
	);
	await expect(cli(["--list", "--limit", "2"])).rejects.toThrow(
		"--limit does not apply to --list, which takes --list, --output",
	);
	// Every experiment has its options: none reads --parity in an estimate.
	for (const { id } of listExperiments())
		await expect(
			cli(["--experiment", id, "--estimate", "--parity", "x"]),
		).rejects.toThrow(`--parity does not apply to an --estimate of ${id}`);
	expect(counter.calls).toBe(0);
	expect(written).toEqual([]);
});

test("every option combination the evaluate CLI documents passes the option check", () => {
	const documented: [string, Parameters<typeof rejectUnreadRunOptions>[0]][] =
		[
			[
				"segment-in-units/de:dev",
				{
					revision: "r",
					offline: true,
					units: "reference",
					parity: "x",
				},
			],
			["segment-in-units/de:dev", { revision: "r", units: "production" }],
			["segment-in-units/de:heldout:raw", { revision: "r" }],
			["segment-in-units/de:dev:raw", { estimate: true }],
			["segment-in-units/de:dev", { revision: "r", cases: "ids" }],
			[
				"segment-in-units/de:dev",
				{ revision: "r", "cases-from": "report" },
			],
			[
				"segment-in-units/de:dev",
				{
					revision: "r",
					repin: true,
					reason: "x",
					"token-budget": "1",
				},
			],
			["split-text/de:ud-drafts", { revision: "r" }],
			["resolve-grammar/de:dev", { estimate: true }],
			[
				"resolve-grammar/de:dev",
				{
					revision: "r",
					budget: "1",
					"luna-budget": "1",
					"luna-output-budget": "1",
					limit: "1",
					subset: "s",
					repetitions: "1",
				},
			],
			["resolve-reading/de:dev", { estimate: true, "whole-round": true }],
			[
				"resolve-reading/de:dev",
				{
					revision: "r",
					budget: "1",
					"luna-budget": "1",
					"luna-output-budget": "1",
					limit: "1",
					"luna-batch": true,
					"luna-prompt-cache": true,
					"usd-budget": "1",
					subset: "s",
					repetitions: "1",
				},
			],
			[
				"knowledge/de:dev",
				{
					estimate: true,
					"whole-round": true,
					"gold-only": true,
					subset: "s",
				},
			],
			[
				"knowledge/de:spot-check",
				{
					revision: "r",
					budget: "1",
					"luna-budget": "1",
					"luna-output-budget": "1",
					"luna-batch": true,
					"usd-budget": "1",
					limit: "1",
					repetitions: "1",
				},
			],
			[
				"segment-in-units/de:dev",
				{ revision: "r", requests: true, units: "reference" },
			],
			["resolve-grammar/de:dev", { revision: "r", requests: true }],
			["resolve-reading/de:dev", { revision: "r", requests: true }],
			["knowledge/de:dev", { revision: "r", requests: true }],
		];
	for (const [experiment, values] of documented)
		expect(() =>
			rejectUnreadRunOptions(
				{ experiment, output: "o", ...values },
				experiment,
			),
		).not.toThrow();
});
