/**
 * The lab's `ledger` and `round`: the spend so far, the iteration tables and
 * the current round with its pin.
 */
import { z } from "zod";
import {
	deltaBetween,
	focusBetween,
	loadSide,
} from "../../lab/segmentation/harness/compare.js";
import { focusOf } from "../../lab/segmentation/harness/corpus.js";
import {
	readManifests,
	readOutcomes,
	readSummary,
	summaryPath,
} from "../../lab/segmentation/harness/evidence.js";
import { scoreFocus } from "../../lab/segmentation/harness/focus.js";
import {
	type CompareEntry,
	ledgerTotals,
	readLedger,
} from "../../lab/segmentation/harness/ledger.js";
import {
	currentPin,
	pinDrift,
	pinText,
	readRounds,
	repinned,
	roundOf,
	roundStatus,
	stopLineOf,
	writeRounds,
} from "../../lab/segmentation/harness/round.js";
import {
	type FocusIterationRow,
	focusIterationTable,
	type IterationRow,
	iterationTable,
} from "../../lab/segmentation/harness/table.js";
import {
	evidenceRoot,
	labRoot,
	ledgerPath,
	repository,
	roots,
	roundBook,
	values,
} from "./context.js";

/** What the iteration table reads of a run's summary (`report` writes it). */
const iterationSummarySchema = z.object({
	primary: z.string(),
	policies: z.array(
		z.object({
			policy: z.string(),
			rates: z.object({
				membership: z.number(),
				tolerantUnitAccuracy: z.number(),
				unitAccuracy: z.number(),
			}),
			membershipFlips: z.number(),
			membershipFlipBase: z.number(),
		}),
	),
	cost: z.object({ jevInputTokensPerSentence: z.number() }),
});

export async function ledger() {
	const entries = await readLedger(ledgerPath);
	if (values.table) {
		process.stdout.write(iterationTable(await iterationRows(entries)));
		const focusRows = await focusIterationRows(entries);
		if (focusRows.length > 0)
			process.stdout.write(`\n${focusIterationTable(focusRows)}`);
		return;
	}
	const totals = ledgerTotals(entries);
	const round = roundOf(await readRounds(roundBook));
	const status = roundStatus(round, entries);
	console.log(
		`${entries.length} entries; jev fresh input ${totals.jevFreshInputTokens} tokens over every round; luna fresh ${totals.lunaFreshCalls} calls, ${totals.lunaFreshInputTokens} input / ${totals.lunaFreshOutputTokens} output tokens`,
	);
	console.log(
		`round ${round.id}: ${status.jevFreshInputTokens} fresh jev input tokens in ${status.lines} lines, ${status.leftToStopLine} left to the stop line at ${status.stopLineTokens}`,
	);
}

/**
 * The current round: what it has spent and has left, and its pin against
 * today's dumcorpus. `--repin` pins it at today's dumcorpus, `--open` opens a
 * new current round pinned at it.
 */
export async function roundCommand() {
	const book = await readRounds(roundBook);
	const pin = await currentPin(repository);
	if (values.open) {
		const capTokens = Number(values.cap);
		const stopLine = Number(values["stop-line"]);
		if (!(capTokens > 0) || !(stopLine > 0))
			throw Error(
				"--open needs --cap and --stop-line in fresh jev input tokens",
			);
		if (book.rounds.some((round) => round.id === values.open))
			throw Error(`Round ${values.open} exists already`);
		if (stopLine > capTokens)
			throw Error(
				`--stop-line ${stopLine} is past the cap of ${capTokens} tokens`,
			);
		await writeRounds(roundBook, {
			current: values.open,
			rounds: [
				...book.rounds,
				{
					id: values.open,
					opened: new Date().toISOString().slice(0, 10),
					note: values.note ?? "",
					capTokens,
					stopLineTokens: stopLine,
					pin,
					repins: [],
				},
			],
		});
		console.log(`opened round ${values.open}, pinned at ${pinText(pin)}`);
		return;
	}
	let round = roundOf(book);
	const drift = pinDrift(round.pin, pin);
	if (values.repin && drift.length > 0) {
		const next = repinned(
			book,
			round.id,
			pin,
			values.reason ?? "round --repin",
		);
		await writeRounds(roundBook, next);
		round = roundOf(next);
		console.log(`re-pinned round ${round.id} at ${pinText(pin)}`);
	}
	const status = roundStatus(
		round,
		await readLedger(ledgerPath),
		stopLineOf(round, values["token-budget"]),
	);
	console.log(
		[
			`round ${round.id} (opened ${round.opened}), in fresh jev input tokens`,
			`  spent     ${status.jevFreshInputTokens} in ${status.lines} ledger lines, ${status.jevFreshCalls} fresh calls${status.lunaFreshCalls > 0 ? `, ${status.lunaFreshCalls} fresh Luna calls` : ""}`,
			`  stop line ${status.stopLineTokens}: ${status.leftToStopLine} left`,
			`  cap       ${status.capTokens}: ${status.leftToCap} left, of which ${status.reservedForFinal} are kept for the final held-out run`,
			`  pinned    ${pinText(round.pin)} at ${round.pin.at}${round.repins.length > 0 ? `, re-pinned ${round.repins.length}×` : ""}`,
			`  today     ${pinText(pin)}: ${pinDrift(round.pin, pin).length === 0 ? "matches the pin" : `differs in ${pinDrift(round.pin, pin).join(", ")}; live runs refuse without --repin`}`,
		].join("\n"),
	);
}

/**
 * One row per run with a manifest (noise reruns left out). The delta against
 * the parent comes from the latest recorded compare, else from the committed
 * outcomes of both primaries.
 */
async function iterationRows(
	entries: Awaited<ReturnType<typeof readLedger>>,
): Promise<IterationRow[]> {
	const compares = entries.filter(
		(entry): entry is CompareEntry => entry.command === "compare",
	);
	const rows: IterationRow[] = [];
	for (const manifest of await readManifests(evidenceRoot)) {
		if (manifest.kind !== "run") continue;
		const summary = await readSummary(
			iterationSummarySchema,
			summaryPath(evidenceRoot, manifest.runId),
		);
		const primary = summary?.policies.find(
			(policy) => policy.policy === summary.primary,
		);
		const recorded = compares.findLast(
			(entry) =>
				entry.left.runId === manifest.parent &&
				entry.right.runId === manifest.runId,
		);
		let delta: IterationRow["delta"] = recorded ?? null;
		if (!delta && manifest.parent) {
			try {
				const left = await loadSide({
					...roots,
					runId: manifest.parent,
				});
				const right = await loadSide({
					...roots,
					runId: manifest.runId,
				});
				delta = (await deltaBetween(roots, left, right)).all;
			} catch {
				delta = null;
			}
		}
		rows.push({
			runId: manifest.runId,
			parent: manifest.parent,
			hypothesis: manifest.hypothesis,
			membership: primary?.rates.membership ?? null,
			membershipFlips: primary?.membershipFlips ?? null,
			membershipFlipBase: primary?.membershipFlipBase ?? null,
			tolerantUnitAccuracy: primary?.rates.tolerantUnitAccuracy ?? null,
			unitAccuracy: primary?.rates.unitAccuracy ?? null,
			jevInputTokensPerSentence:
				summary?.cost.jevInputTokensPerSentence ?? null,
			delta,
			verdict: recorded?.verdict ?? null,
		});
	}
	return rows;
}

/**
 * One row per run with a manifest on the membership focus set's source set
 * (#761). The delta against the parent comes from the latest recorded
 * compare that carries one, else from the stored outcomes of both.
 */
async function focusIterationRows(
	entries: Awaited<ReturnType<typeof readLedger>>,
): Promise<FocusIterationRow[]> {
	const compares = entries.filter(
		(entry): entry is CompareEntry => entry.command === "compare",
	);
	const rows: FocusIterationRow[] = [];
	for (const manifest of await readManifests(evidenceRoot)) {
		if (manifest.kind !== "run") continue;
		const focus = focusOf(manifest.set);
		const outcomes = focus && (await readOutcomes(labRoot, manifest.runId));
		if (!focus || !outcomes) continue;
		const recorded = compares.findLast(
			(entry) =>
				entry.left.runId === manifest.parent &&
				entry.right.runId === manifest.runId &&
				entry.focus !== undefined,
		);
		let delta = recorded?.focus ?? null;
		if (!delta && manifest.parent) {
			try {
				delta =
					focusBetween(
						await loadSide({ ...roots, runId: manifest.parent }),
						await loadSide({ ...roots, runId: manifest.runId }),
					)?.delta ?? null;
			} catch {
				delta = null;
			}
		}
		rows.push({
			runId: manifest.runId,
			parent: manifest.parent,
			score: scoreFocus(outcomes, manifest.primary, focus),
			delta,
		});
	}
	return rows;
}
