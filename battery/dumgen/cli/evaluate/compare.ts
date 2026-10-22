/**
 * The evaluate CLI's `--compare` (`cli/evaluate.ts`): two request runs as a
 * request diff, or two evaluation runs side by side.
 */
import { compareRuns, loadRun } from "promptsmith/storage";
import {
	compareRequestRuns,
	isRequestRun,
	loadRequestRun,
} from "../../lab/evaluation/request-diff.js";

/**
 * `--compare`: two request runs as a request diff, which exits 1 on any
 * difference, or two evaluation runs through `runComparison`.
 */
export async function compareCommand(
	outputDirectory: string,
	left: string,
	positionals: readonly string[],
	write: (value: unknown) => void,
) {
	const [right, ...rest] = positionals;
	if (!right || rest.length > 0)
		throw Error("--compare takes two run ids: --compare LEFT RIGHT");
	const requestRuns = [left, right].filter((runId) =>
		isRequestRun(outputDirectory, runId),
	).length;
	if (requestRuns === 1)
		throw Error(
			"--compare takes two request runs or two evaluation runs, not one of each",
		);
	if (requestRuns === 2) {
		const report = compareRequestRuns(
			await loadRequestRun(outputDirectory, left),
			await loadRequestRun(outputDirectory, right),
		);
		write(report);
		if (
			report.changed.length > 0 ||
			report.onlyLeft.length > 0 ||
			report.onlyRight.length > 0
		)
			process.exitCode = 1;
		return report;
	}
	const report = runComparison(
		await loadRun(outputDirectory, left),
		await loadRun(outputDirectory, right),
	);
	write(report);
	return report;
}

type StoredRun = Awaited<ReturnType<typeof loadRun>>;
/** One case as `compareRuns` pairs it. */
type ComparedCase = ReturnType<typeof compareRuns>["cases"][number];
/** A case's status or its verdict on one side; a verdict is null only where the case is absent. */
type Compared =
	| NonNullable<ComparedCase["left"]>["status"]
	| ComparedCase["verdict"]["left"];
const verdicts = ["Passed", "Failed", "Mixed", "Unscored"] as const;

/**
 * Two runs side by side (`--compare`): what each ran and scored, the cases
 * only one has, and each shared case whose status, verdict or output
 * changed, as `before → after` with the output's field-level diff.
 */
function runComparison(left: StoredRun, right: StoredRun) {
	const comparison = compareRuns(left, right);
	const side = (run: StoredRun, key: "left" | "right") => ({
		runId: run.manifest.runId,
		experimentId: run.manifest.experimentId,
		sourceRevision: run.manifest.sourceRevision,
		model: run.manifest.configurations.judgment.model,
		cases: run.cases.length,
		verdicts: Object.fromEntries(
			verdicts.map((verdict) => [
				verdict,
				comparison.cases.filter(
					(entry) => entry.verdict[key] === verdict,
				).length,
			]),
		),
	});
	const arrow = (before: Compared, after: Compared) => `${before} → ${after}`;
	const changed = comparison.cases.flatMap((entry) => {
		if (!entry.left || !entry.right) return [];
		const status = entry.left.status !== entry.right.status;
		if (!status && !entry.verdictChanged && !entry.outputChanges.length)
			return [];
		return [
			{
				caseId: entry.caseId,
				...(status
					? { status: arrow(entry.left.status, entry.right.status) }
					: {}),
				verdict: entry.verdictChanged
					? arrow(entry.verdict.left, entry.verdict.right)
					: entry.verdict.left,
				outputChanges: entry.outputChanges,
			},
		];
	});
	return {
		left: side(left, "left"),
		right: side(right, "right"),
		sameExperiment: comparison.sameExperiment,
		sameCorpus: comparison.sameCorpus,
		unchanged:
			comparison.cases.length -
			changed.length -
			comparison.onlyLeft.length -
			comparison.onlyRight.length,
		onlyLeft: comparison.onlyLeft,
		onlyRight: comparison.onlyRight,
		changed,
	};
}
