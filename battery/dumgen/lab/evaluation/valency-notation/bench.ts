/**
 * The valency notation bench (`bun run valency-notation <command>` in
 * battery/dumgen; the OpenAI key from the repository's .env.local):
 *
 *   tokens                         o200k counts of every gold frame, JSON vs notation
 *   estimate  --variants a,b --reps N [--set dev] [--latency N]
 *   batch     --variants a,b --reps N [--set dev] [--revision r1] [--budget 0.2]
 *   latency   --variants a,b --samples 20 [--revision r1] [--budget 0.1]
 *   score     <run files…> [--set dev] [--misses label]
 *
 * Results go to evidence/valency-notation/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { countTokens } from "gpt-tokenizer/encoding/o200k_base";
import { lunaUsd } from "../resolve-grammar/pricing.js";
import { printGermanFrame } from "./german.js";
import { type ValencyCase, valencyCases } from "./gold.js";
import { requestOf } from "./harness.js";
import { type BenchCase, type Job, runBatch, runLatency } from "./live.js";
import { revisions } from "./revisions.js";
import { readRuns, scoreCalls, summarize, table } from "./score.js";
import {
	notationLark,
	type VariantName,
	variant,
	variantNames,
} from "./variants.js";

const evidence = fileURLToPath(
	new URL("../../../evidence/valency-notation/", import.meta.url),
);
mkdirSync(evidence, { recursive: true });

const { positionals, values } = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: {
		variants: { type: "string", default: "json" },
		reps: { type: "string", default: "1" },
		samples: { type: "string", default: "20" },
		latency: { type: "string", default: "0" },
		set: { type: "string", default: "dev" },
		revision: { type: "string", default: "r1" },
		budget: { type: "string", default: "0.2" },
		limit: { type: "string" },
		misses: { type: "string" },
		"only-json-right": { type: "boolean", default: false },
	},
});
const [command, ...files] = positionals;

type Entry = ValencyCase & { readonly bench: BenchCase };

async function benchCases(set: string): Promise<Entry[]> {
	const cases = await valencyCases(
		set === "all" ? ["dev", "heldout"] : [set as "dev" | "heldout"],
	);
	const limited = values.limit ? cases.slice(0, Number(values.limit)) : cases;
	return limited.map((entry) => ({
		...entry,
		bench: { id: entry.goldCase.id, request: requestOf(entry.goldCase) },
	}));
}

const names = (values.variants ?? "")
	.split(",")
	.filter(Boolean)
	.map((name) => {
		if (!(variantNames as readonly string[]).includes(name))
			throw Error(`${name} is no variant (${variantNames.join(", ")})`);
		return name as VariantName;
	});

const variantAt = (name: VariantName, revision: string) => {
	const paragraphs = revisions[revision];
	if (!paragraphs) throw Error(`${revision} is no revision`);
	return variant(name, paragraphs);
};

const stats = (values: readonly number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
	const p90 = sorted[Math.ceil(0.9 * sorted.length) - 1] ?? 0;
	return { mean: Math.round(mean * 10) / 10, p90, max: sorted.at(-1) ?? 0 };
};

/** What each variant's gold answer would cost in o200k tokens, its prompt prefix too. */
async function tokens() {
	const cases = await benchCases("all");
	const authored = cases.filter(({ coverage }) => coverage === "Authored");
	const written = {
		"json (as Luna answers, {value:…})": ({ frame }: Entry) =>
			JSON.stringify({ value: { valency: frame } }),
		notation: ({ frame, context }: Entry) =>
			printGermanFrame(frame, context),
		"notation + headword": ({ frame, context, goldCase }: Entry) =>
			printGermanFrame(frame, context, {
				headword: goldCase.reading.lemma.canonicalForm,
			}),
		'notation in {"frame":…} (pattern)': ({ frame, context }: Entry) =>
			JSON.stringify({ frame: printGermanFrame(frame, context) }),
		"notation, verb subject elided (lossy)": ({ frame, context }: Entry) =>
			printGermanFrame(context.verb ? frame.slice(1) : frame, {
				verb: false,
			}),
	};
	const rows = Object.entries(written).map(([name, write]) => ({
		name,
		authored: stats(authored.map((entry) => countTokens(write(entry)))),
		all: stats(cases.map((entry) => countTokens(write(entry)))),
	}));
	const prompts = Object.fromEntries(
		variantNames.map((name) => [
			name,
			countTokens(variantAt(name, values.revision ?? "r1").systemPrompt) +
				(name === "lark" ? countTokens(notationLark) : 0),
		]),
	);
	const samples = cases
		.filter(({ coverage }) => coverage === "Authored")
		.slice(0, 12)
		.map(({ goldCase, frame, context }) => ({
			lemma: goldCase.reading.lemma.canonicalForm,
			notation: printGermanFrame(frame, context),
		}));
	const report = {
		cases: cases.length,
		authored: authored.length,
		rows,
		promptTokens: prompts,
		samples,
	};
	writeFileSync(
		join(evidence, "tokens.json"),
		`${JSON.stringify(report, null, "\t")}\n`,
	);
	console.log(JSON.stringify(report, null, 2));
}

/** A round's worst-case price: no cache hit, every gold answer padded by a third. */
function estimate(entries: readonly Entry[], reps: number, latency: number) {
	const perVariant = names.map((name) => {
		const v = variantAt(name, values.revision ?? "r1");
		const tokensOf = (entry: Entry) => {
			const body = v.body(entry.bench.request);
			const input =
				countTokens(JSON.stringify(body.input)) +
				countTokens(JSON.stringify(body.text ?? "")) +
				countTokens(JSON.stringify(body.tools ?? ""));
			const output = Math.round(
				1.3 *
					(countTokens(
						name.startsWith("json")
							? JSON.stringify({
									value: { valency: entry.frame },
								})
							: printGermanFrame(entry.frame, entry.context),
					) +
						10),
			);
			return { inputTokens: input, outputTokens: output };
		};
		const sum = entries.map(tokensOf).reduce(
			(total, next) => ({
				inputTokens: total.inputTokens + next.inputTokens,
				outputTokens: total.outputTokens + next.outputTokens,
			}),
			{ inputTokens: 0, outputTokens: 0 },
		);
		const batchUsd = lunaUsd(sum, "batch") * reps;
		const latencyUsd =
			(lunaUsd(sum, "fast") / entries.length) * (latency + 1);
		return { variant: name, batchUsd, latencyUsd };
	});
	const total = perVariant.reduce(
		(sum, { batchUsd, latencyUsd }) => sum + batchUsd + latencyUsd,
		0,
	);
	return { cases: entries.length, perVariant, worstCaseUsd: total };
}

const apiKey = () => {
	const key = process.env.OPENAI_API_KEY ?? "";
	if (!key) throw Error("OPENAI_API_KEY is not set");
	return key;
};

if (command === "tokens") await tokens();
else if (command === "estimate") {
	const entries = await benchCases(values.set ?? "dev");
	console.log(
		JSON.stringify(
			estimate(entries, Number(values.reps), Number(values.latency)),
			null,
			2,
		),
	);
} else if (command === "batch") {
	const entries = await benchCases(values.set ?? "dev");
	const reps = Number(values.reps);
	const priced = estimate(entries, reps, 0);
	console.log(JSON.stringify(priced));
	if (priced.worstCaseUsd > Number(values.budget))
		throw Error(
			`Projected $${priced.worstCaseUsd.toFixed(4)} is past the budget`,
		);
	const revision = values.revision ?? "r1";
	const jobs: Job[] = names.flatMap((name) =>
		entries.flatMap((entry) =>
			Array.from({ length: reps }, (_, repetition) => ({
				variant: variantAt(name, revision),
				revision,
				benchCase: entry.bench,
				repetition,
			})),
		),
	);
	const file = await runBatch(jobs, { apiKey: apiKey(), evidence });
	console.log(file);
} else if (command === "latency") {
	const entries = await benchCases(values.set ?? "dev");
	const samples = Number(values.samples);
	const step = Math.max(1, Math.floor(entries.length / samples));
	const sample = entries
		.filter((_, index) => index % step === 0)
		.slice(0, samples);
	const priced = estimate(sample, 0, sample.length);
	console.log(JSON.stringify(priced));
	if (priced.worstCaseUsd * 1.5 > Number(values.budget))
		throw Error(
			`Projected $${priced.worstCaseUsd.toFixed(4)} is past the budget`,
		);
	const revision = values.revision ?? "r1";
	const file = await runLatency(
		names.map((name) => ({ variant: variantAt(name, revision), revision })),
		sample.map(({ bench }) => bench),
		{ apiKey: apiKey(), evidence },
	);
	console.log(file);
} else if (command === "score") {
	const entries = await benchCases(values.set ?? "dev");
	const byId = new Map(entries.map((entry) => [entry.goldCase.id, entry]));
	const paths = files.map((file) =>
		file.includes("/") ? file : join(evidence, "runs", file),
	);
	const records = readRuns(paths).filter((record) => byId.has(record.caseId));
	const scored = scoreCalls(records, byId, (record) =>
		variantAt(record.variant, record.revision),
	);
	const rows = summarize(scored);
	const name = paths
		.map((path) => basename(path, ".jsonl"))
		.join("+")
		.slice(0, 150);
	const spent = records.reduce((sum, record) => sum + record.usd, 0);
	writeFileSync(
		join(evidence, `score-${name}.json`),
		`${JSON.stringify({ files: paths.map((path) => basename(path)), spentUsd: spent, rows }, null, "\t")}\n`,
	);
	console.log(table(rows));
	console.log(`spent in these runs: $${spent.toFixed(5)}`);
	if (values.misses) {
		const misses = scored.filter(
			({ label, correct }) => label === values.misses && !correct,
		);
		// The cases JSON got right in some repetition.
		const jsonRight = new Set(
			scored
				.filter(({ label, correct }) => label === "json@r1" && correct)
				.map(({ caseId }) => caseId),
		);
		for (const miss of misses) {
			const entry = byId.get(miss.caseId);
			if (!entry) continue;
			if (values["only-json-right"] && !jsonRight.has(miss.caseId))
				continue;
			console.log(
				[
					`${entry.goldCase.reading.lemma.canonicalForm} ${"emojiDescription" in entry.goldCase.reading ? entry.goldCase.reading.emojiDescription : ""}`,
					`gold: ${printGermanFrame(entry.frame, entry.context)}`,
					`said: ${(miss.text ?? "").replace(/\s+/gu, " ").slice(0, 300)}`,
					...(miss.failed
						? [`failed: ${miss.failed.slice(0, 200)}`]
						: []),
				].join("\n  "),
			);
		}
	}
} else throw Error(`Unknown command ${command ?? ""}`);
