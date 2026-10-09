/**
 * Experiment rounds: the jev budget the main session grants one round of
 * experiments, in fresh input tokens (the repository tracks tokens only),
 * and the dumcorpus state its prompts are pinned to (#845).
 *
 * `evidence/segment-in-units-lab/rounds.json` holds every round and names
 * the current one. A round counts only the ledger lines tagged with its id,
 * never the whole ledger. Its stop line ends ordinary runs; the tokens
 * between the stop line and the cap are kept for the round's final
 * held-out run, which raises the line to the cap with `--token-budget`.
 *
 * The pin: the requests the unit stage sends quote dumcorpus's Authored
 * Inventories (AUX spellings, the ADP Case Table, DET and PRON identities),
 * so a peer edit to them silently changes prompts and misses the jev cache.
 * A round records the dumcorpus commit and a hash of those inputs; a live run
 * refuses to start when they differ, unless it re-pins (`--repin`), and an
 * offline replay reports the difference.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { rules } from "dumcorpus";
import { z } from "zod";
import type { Answer, Answers } from "../../../src/segment/ask.js";
import { git } from "../../git.js";
import { readStoredJson } from "../../stored-json.js";
import { hashOf, type Projection, type Projector } from "./jev-cache.js";
import { isSpend, type LedgerEntry } from "./ledger.js";

/** The dumcorpus state a round's prompts were built from. */
export type Pin = {
	/** The last commit that changed `battery/dumcorpus/src`. */
	readonly dumcorpusCommit: string;
	/** Whether `battery/dumcorpus/src` had uncommitted changes. */
	readonly dumcorpusDirty: boolean;
	/** One hash over `inputs`; the gate compares it. */
	readonly hash: string;
	readonly inputs: {
		/**
		 * The `dumcorpus/inventories` entry Bun resolves and the modules it
		 * imports: the AUX, DET and PRON members and the ADP Case Table the
		 * requests quote.
		 */
		readonly inventories: string;
		/** dumcorpus's Rules, their text included. */
		readonly rules: string;
	};
	readonly at: string;
};

const pinInputsSchema = z.object({
	inventories: z.string(),
	rules: z.string(),
});

/** A pin as the round book and a run's manifest keep it. */
export const pinSchema = z.object({
	dumcorpusCommit: z.string(),
	dumcorpusDirty: z.boolean(),
	hash: z.string(),
	inputs: pinInputsSchema,
	at: z.string(),
}) satisfies z.ZodType<Pin>;

/**
 * A pin a run's manifest recorded before #913 renamed dumspec to
 * dumcorpus. The rename kept the lab's evidence as written, so these name
 * the commit and its dirtiness after dumspec.
 */
export type LegacyPin = Omit<Pin, "dumcorpusCommit" | "dumcorpusDirty"> & {
	readonly dumspecCommit: string;
	readonly dumspecDirty: boolean;
};

export const legacyPinSchema = z.object({
	dumspecCommit: z.string(),
	dumspecDirty: z.boolean(),
	hash: z.string(),
	inputs: pinInputsSchema,
	at: z.string(),
}) satisfies z.ZodType<LegacyPin>;

export type Round = {
	readonly id: string;
	readonly opened: string;
	readonly note: string;
	/** The budget the round was granted, in fresh jev input tokens. */
	readonly capTokens: number;
	/** Ordinary runs stop here; the rest of the cap is the final run's. */
	readonly stopLineTokens: number;
	readonly pin: Pin;
	/** Earlier pins, each with when and why it was replaced. */
	readonly repins: readonly {
		readonly at: string;
		readonly from: Pin;
		readonly reason: string;
	}[];
};

export type RoundBook = {
	readonly current: string;
	readonly rounds: readonly Round[];
};

const roundBookSchema = z.object({
	current: z.string(),
	rounds: z.array(
		z.object({
			id: z.string(),
			opened: z.string(),
			note: z.string(),
			capTokens: z.number(),
			stopLineTokens: z.number(),
			pin: pinSchema,
			repins: z.array(
				z.object({
					at: z.string(),
					from: pinSchema,
					reason: z.string(),
				}),
			),
		}),
	),
}) satisfies z.ZodType<RoundBook>;

export const roundsPath = (evidenceRoot: string) =>
	join(evidenceRoot, "rounds.json");

export async function readRounds(path: string): Promise<RoundBook> {
	if (!existsSync(path))
		throw Error(`No rounds at ${path}; open one before spending`);
	return readStoredJson(roundBookSchema, path);
}

export async function writeRounds(
	path: string,
	book: RoundBook,
): Promise<void> {
	await writeFile(path, `${JSON.stringify(book, null, "\t")}\n`);
}

export function roundOf(book: RoundBook, id = book.current): Round {
	const round = book.rounds.find((entry) => entry.id === id);
	if (!round) throw Error(`No round ${id} in the round book`);
	return round;
}

/** Fresh tokens of the ledger lines tagged with the round. */
export function roundSpend(entries: readonly LedgerEntry[], roundId: string) {
	const lines = entries.filter(isSpend).filter((entry) => {
		return entry.round === roundId;
	});
	return {
		lines: lines.length,
		jevFreshInputTokens: lines.reduce(
			(total, entry) => total + entry.jev.freshInputTokens,
			0,
		),
		jevFreshCalls: lines.reduce(
			(total, entry) => total + entry.jev.freshCalls,
			0,
		),
		lunaFreshCalls: lines.reduce(
			(total, entry) => total + entry.luna.freshCalls,
			0,
		),
	};
}

/**
 * The line a run stops at: the round's stop line, or `--token-budget`,
 * which may raise it up to the cap for the final run, never past it.
 */
export function stopLineOf(round: Round, override?: string): number {
	if (override === undefined) return round.stopLineTokens;
	const line = Number(override);
	if (!Number.isFinite(line) || line < 0)
		throw Error(`--token-budget ${override} is not a token count`);
	if (line > round.capTokens)
		throw Error(
			`--token-budget ${line} is past round ${round.id}'s cap of ${round.capTokens} tokens; the main session opens a new round instead`,
		);
	return line;
}

/** What the round has spent and has left, for `segment-in-units-lab round`. */
export function roundStatus(
	round: Round,
	entries: readonly LedgerEntry[],
	stopLine = round.stopLineTokens,
) {
	const spend = roundSpend(entries, round.id);
	const spent = spend.jevFreshInputTokens;
	return {
		round: round.id,
		...spend,
		stopLineTokens: stopLine,
		capTokens: round.capTokens,
		leftToStopLine: Math.max(0, stopLine - spent),
		leftToCap: Math.max(0, round.capTokens - spent),
		reservedForFinal: round.capTokens - round.stopLineTokens,
	};
}

const sha256 = (contents: string | Uint8Array) =>
	createHash("sha256").update(contents).digest("hex");

/** A relative import's file: TypeScript sources import `./x.js` for `./x.ts`. */
function importedFile(path: string): string | undefined {
	if (existsSync(path)) return path;
	const source = path.replace(/\.js$/u, ".ts");
	return existsSync(source) ? source : undefined;
}

/**
 * The entry and every module it imports relatively, by path from the entry's
 * directory. Bun resolves workspace packages to their source.
 */
async function moduleGraph(entry: string): Promise<Record<string, string>> {
	const directory = dirname(entry);
	const hashes: Record<string, string> = {};
	const pending = [entry];
	while (pending.length > 0) {
		const file = pending.pop();
		if (!file) break;
		const name = relative(directory, file);
		if (name in hashes) continue;
		const source = await readFile(file, "utf8");
		hashes[name] = sha256(source);
		for (const [, imported] of source.matchAll(
			/(?:from|import)\s*"(\.\.?\/[^"]+)"/gu,
		)) {
			const next =
				imported && importedFile(join(dirname(file), imported));
			if (next) pending.push(next);
		}
	}
	return hashes;
}

/** The dumcorpus state the requests would be built from now. */
export async function currentPin(repository: string): Promise<Pin> {
	const inventories = hashOf(
		await moduleGraph(
			fileURLToPath(import.meta.resolve("dumcorpus/inventories")),
		),
	);
	const inputs = { inventories, rules: hashOf(rules) };
	return {
		dumcorpusCommit: git(
			["log", "-1", "--format=%H", "--", "battery/dumcorpus/src"],
			repository,
		),
		dumcorpusDirty:
			git(
				["status", "--porcelain", "--", "battery/dumcorpus/src"],
				repository,
			).length > 0,
		hash: hashOf(inputs),
		inputs,
		at: new Date().toISOString(),
	};
}

/** The inputs a pin hashes, in its order. */
const pinnedInputs = [
	"inventories",
	"rules",
] as const satisfies readonly (keyof Pin["inputs"])[];

/** The pinned inputs that differ now; none when the hashes agree. */
export function pinDrift(pinned: Pin | LegacyPin, current: Pin): string[] {
	if (pinned.hash === current.hash) return [];
	return pinnedInputs.filter(
		(input) => pinned.inputs[input] !== current.inputs[input],
	);
}

export function pinText(pin: Pin | LegacyPin): string {
	const [commit, dirty] =
		"dumcorpusCommit" in pin
			? [pin.dumcorpusCommit, pin.dumcorpusDirty]
			: [pin.dumspecCommit, pin.dumspecDirty];
	return `dumcorpus ${commit.slice(0, 8)}${dirty ? "+dirty" : ""} inputs ${pin.hash.slice(0, 12)}`;
}

/**
 * The pin gate. A live run refuses to start when the prompt inputs moved
 * since the round was pinned, unless `repin`; an offline run only reports
 * it. Returns the warning to print, if any.
 */
export function checkPin(args: {
	readonly round: Round;
	readonly current: Pin;
	readonly live: boolean;
	readonly repin: boolean;
}): string | undefined {
	const drift = pinDrift(args.round.pin, args.current);
	if (drift.length === 0) return undefined;
	const message = `dumcorpus's prompt inputs (${drift.join(", ")}) changed since round ${args.round.id} was pinned at ${pinText(args.round.pin)}; now ${pinText(args.current)}`;
	if (args.live && !args.repin)
		throw Error(
			`${message}. Requests built from them miss the jev cache. Check out dumcorpus at the pinned state, or pass --repin to pin the round at today's dumcorpus.`,
		);
	return args.live
		? `${message}; re-pinned (--repin)`
		: `${message}; offline answers built from the old inputs miss`;
}

/** The book with the round pinned at `pin`, its old pin kept with `reason`. */
export function repinned(
	book: RoundBook,
	roundId: string,
	pin: Pin,
	reason: string,
): RoundBook {
	return {
		...book,
		rounds: book.rounds.map((round) =>
			round.id === roundId
				? {
						...round,
						pin,
						repins: [
							...round.repins,
							{ at: pin.at, from: round.pin, reason },
						],
					}
				: round,
		),
	};
}

/** A projector that picks one end of every Choice and answers every Noul with `noul`. */
const projectorPicking =
	(end: "first" | "last", noul: number): Projector =>
	({ questions }) =>
		Object.fromEntries(
			Object.entries(questions).map(
				([id, question]): [string, Answer] => {
					if (question.type === "noul")
						return [id, { type: "noul", noul }];
					if (question.type === "choice") {
						const options = Object.keys(question.criteria);
						const choice =
							(end === "first" ? options[0] : options.at(-1)) ??
							"";
						return [
							id,
							{
								type: "choice",
								choice,
								confidence: 1,
								probabilities: { [choice]: 1 },
							},
						];
					}
					return [
						id,
						{
							type: "score",
							score: 0.5,
							confidence: 1,
							probabilities: {},
						},
					];
				},
			),
		) satisfies Answers;

/**
 * Stand-in answers for a projection pass: the first option of a Choice,
 * which for a Segment-stage question is the authored plan, and a high Noul,
 * so the requests that follow a "yes" are priced too.
 */
export const standInAnswers = projectorPicking("first", 0.9);

/**
 * The stand-ins' opposite: the last option of a Choice and a low Noul, so
 * a request diff also builds the requests behind a "no" or a later option
 * (#1064).
 */
export const contraryAnswers = projectorPicking("last", 0.1);

/** Least squares of tokens on characters; undefined without two sizes. */
function fit(samples: readonly { chars: number; inputTokens: number }[]) {
	const n = samples.length;
	if (n === 0) return undefined;
	const meanX = samples.reduce((total, { chars }) => total + chars, 0) / n;
	const meanY =
		samples.reduce((total, { inputTokens }) => total + inputTokens, 0) / n;
	let covariance = 0;
	let variance = 0;
	for (const { chars, inputTokens } of samples) {
		covariance += (chars - meanX) * (inputTokens - meanY);
		variance += (chars - meanX) ** 2;
	}
	if (variance === 0)
		return (chars: number) =>
			meanX === 0 ? meanY : (meanY / meanX) * chars;
	const slope = covariance / variance;
	return (chars: number) => meanY + slope * (chars - meanX);
}

/** Characters per token when no cached request prices a stage. */
const fallbackCharsPerToken = 3;

/**
 * The fresh tokens a projection pass foresees. A request cached at another
 * repetition costs what it cost then; any other is priced by its size,
 * from a fit of the cached requests of its stage, or of every stage when
 * its own has none.
 */
export function priceProjection(projection: Projection) {
	const all = fit(projection.samples);
	const byStageFit = new Map<string, ReturnType<typeof fit>>();
	const fitOf = (stage: string) => {
		if (!byStageFit.has(stage))
			byStageFit.set(
				stage,
				fit(
					projection.samples.filter(
						(sample) => sample.stage === stage,
					),
				),
			);
		return byStageFit.get(stage) ?? all;
	};
	const byStage: Record<
		string,
		{ requests: number; questions: number; tokens: number }
	> = {};
	let exact = 0;
	let estimated = 0;
	for (const request of projection.requests) {
		const tokens =
			request.inputTokens ??
			Math.max(
				0,
				Math.round(
					(
						fitOf(request.stage) ??
						((chars: number) => chars / fallbackCharsPerToken)
					)(request.chars),
				),
			);
		if (request.inputTokens === undefined) estimated += tokens;
		else exact += tokens;
		const stage = byStage[request.stage] ?? {
			requests: 0,
			questions: 0,
			tokens: 0,
		};
		byStage[request.stage] = stage;
		stage.requests++;
		stage.questions += request.questions;
		stage.tokens += tokens;
	}
	return {
		requests: projection.requests.length,
		cachedRequests: projection.samples.length,
		exactTokens: exact,
		estimatedTokens: estimated,
		tokens: exact + estimated,
		byStage,
	};
}

export type PricedProjection = ReturnType<typeof priceProjection>;

/** Headroom on the estimated part of a projection before it meets the stop line. */
const projectionMargin = 1.25;

/** The tokens a run is assumed to spend: exact ones as they are, estimated ones with headroom. */
export const projectedSpend = (priced: PricedProjection) =>
	Math.round(priced.exactTokens + priced.estimatedTokens * projectionMargin);

/**
 * Refuses a live run whose projected spend would carry the round past its
 * stop line.
 */
export function guardProjectedSpend(args: {
	readonly round: Round;
	readonly spent: number;
	readonly stopLine: number;
	readonly priced: PricedProjection;
}): void {
	const projected = projectedSpend(args.priced);
	if (args.spent + projected > args.stopLine)
		throw Error(
			`Round ${args.round.id} has spent ${args.spent} fresh jev input tokens; this run projects ${projected} more (${args.priced.requests} requests, ${args.priced.estimatedTokens} tokens estimated ×${projectionMargin}), past the stop line at ${args.stopLine}. Nothing was asked.`,
		);
}

export const projectionText = (priced: PricedProjection) =>
	`projected ${projectedSpend(priced)} fresh jev input tokens: ${priced.requests} requests the cache misses (${priced.exactTokens} tokens priced from another repetition, ${priced.estimatedTokens} estimated by size ×${projectionMargin}), ${priced.cachedRequests} cached; by stage ${Object.entries(
		priced.byStage,
	)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([stage, entry]) =>
				`${stage} ${entry.requests} requests ${entry.questions} questions ${entry.tokens} tokens`,
		)
		.join("; ")}`;

/**
 * Opens a command's account with the current round: the round, the dumcorpus
 * state the command reads, and the drift warning to print. A live command
 * whose prompt inputs drifted refuses unless `repin`, which pins the round
 * at today's dumcorpus in the round book and keeps the old pin with `reason`.
 */
export async function enterRound(args: {
	readonly evidenceRoot: string;
	readonly repository: string;
	readonly live: boolean;
	readonly repin: boolean;
	readonly reason: string;
}): Promise<{
	readonly round: Round;
	readonly pin: Pin;
	readonly warning?: string;
}> {
	const path = roundsPath(args.evidenceRoot);
	const book = await readRounds(path);
	const round = roundOf(book);
	const pin = await currentPin(args.repository);
	const warning = checkPin({
		round,
		current: pin,
		live: args.live,
		repin: args.repin,
	});
	if (warning === undefined) return { round, pin };
	if (!args.live) return { round, pin, warning };
	const next = repinned(book, round.id, pin, args.reason);
	await writeRounds(path, next);
	return { round: roundOf(next), pin, warning };
}
