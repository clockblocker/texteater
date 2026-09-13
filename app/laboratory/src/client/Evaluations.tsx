import type { EvaluationRun } from "promptsmith/evaluation";
import type { compareRuns } from "promptsmith/storage";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Experiment = {
	id: string;
	caseCount: number;
	demonstrationCount: number;
	evaluationCount: number;
};
type SavedRun = {
	runId: string;
	manifest?: EvaluationRun["manifest"];
	summary?: EvaluationRun["summary"];
	error?: string;
};
async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, init);
	const result = await response.json();
	if (!response.ok) throw Error(result.error ?? "Request failed");
	return result;
}
const control =
	"min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm";
export function Evaluations() {
	const [experiments, setExperiments] = useState<Experiment[]>([]),
		[saved, setSaved] = useState<SavedRun[]>([]);
	const [experiment, setExperiment] = useState(""),
		[directory, setDirectory] = useState(""),
		[model, setModel] = useState(""),
		[settings, setSettings] = useState("{}"),
		[revision, setRevision] = useState("");
	const [run, setRun] = useState<EvaluationRun | null>(null),
		[comparison, setComparison] = useState<ReturnType<
			typeof compareRuns
		> | null>(null),
		[left, setLeft] = useState(""),
		[right, setRight] = useState("");
	const [busy, setBusy] = useState(false),
		[error, setError] = useState("");
	const query = directory
		? `?directory=${encodeURIComponent(directory)}`
		: "";
	async function action(work: () => Promise<void>) {
		setBusy(true);
		setError("");
		try {
			await work();
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}
	async function refresh() {
		setSaved(await request<SavedRun[]>(`/api/evaluations/runs${query}`));
	}
	useEffect(() => {
		let active = true;
		Promise.all([
			request<Experiment[]>("/api/evaluations/experiments"),
			request<SavedRun[]>("/api/evaluations/runs"),
		])
			.then(([definitions, runs]) => {
				if (active) {
					setExperiments(definitions);
					setExperiment(definitions[0]?.id ?? "");
					setSaved(runs);
				}
			})
			.catch((error) => {
				if (active) setError(String(error));
			});
		return () => {
			active = false;
		};
	}, []);
	const selected = experiments.find((item) => item.id === experiment);
	return (
		<main className="min-h-svh bg-background p-6 text-foreground">
			<div className="mx-auto max-w-6xl space-y-6">
				<header className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold">
							Evaluation runs
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Run held-out cases and compare saved results.
						</p>
					</div>
					<a className="underline underline-offset-4" href="/">
						Interactive laboratory
					</a>
				</header>
				{error && (
					<p
						role="alert"
						className="rounded-md border border-destructive p-3 text-destructive"
					>
						{error}
					</p>
				)}
				<form
					className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2"
					onSubmit={(event) => {
						event.preventDefault();
						void action(async () => {
							const configuration = model
								? { model, settings: JSON.parse(settings) }
								: undefined;
							if (!model && settings !== "{}")
								throw Error(
									"Enter a model to use custom settings",
								);
							const result = await request<EvaluationRun>(
								"/api/evaluations/runs",
								{
									method: "POST",
									headers: {
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										experimentId: experiment,
										sourceRevision: revision,
										configuration,
										outputDirectory: directory || undefined,
									}),
								},
							);
							setRun(result);
							setComparison(null);
							await refresh();
						});
					}}
				>
					<label className="space-y-2 md:col-span-2">
						<span>Experiment</span>
						<select
							className={control}
							value={experiment}
							onChange={(event) =>
								setExperiment(event.target.value)
							}
						>
							{experiments.map((item) => (
								<option key={item.id}>{item.id}</option>
							))}
						</select>
						<span className="block text-sm tabular-nums text-muted-foreground">
							{selected
								? `${selected.demonstrationCount} demonstrations · ${selected.evaluationCount} test cases · ${selected.caseCount} total corpus cases`
								: "Loading experiments…"}
						</span>
					</label>
					<label className="space-y-2">
						<span>Source revision</span>
						<input
							required
							className={control}
							placeholder="Commit or worktree revision"
							value={revision}
							onChange={(event) =>
								setRevision(event.target.value)
							}
						/>
					</label>
					<label className="space-y-2">
						<span>Output directory</span>
						<input
							className={control}
							placeholder="Server default (.runs/dumgen)"
							value={directory}
							onChange={(event) =>
								setDirectory(event.target.value)
							}
						/>
					</label>
					<label className="space-y-2">
						<span>Model override</span>
						<input
							className={control}
							placeholder="Dumgen default"
							value={model}
							onChange={(event) => setModel(event.target.value)}
						/>
					</label>
					<label htmlFor="model-settings" className="space-y-2">
						<span>Model settings (JSON)</span>
						<Textarea
							id="model-settings"
							value={settings}
							onChange={(event) =>
								setSettings(event.target.value)
							}
						/>
					</label>
					<div className="md:col-span-2">
						<Button
							type="submit"
							disabled={
								busy ||
								!experiment ||
								!selected?.evaluationCount
							}
						>
							{busy ? "Working…" : "Run evaluation"}
						</Button>
					</div>
				</form>
				<section className="space-y-3" aria-labelledby="saved-heading">
					<div className="flex items-center justify-between">
						<h2
							id="saved-heading"
							className="text-lg font-semibold"
						>
							Saved runs
						</h2>
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => void action(refresh)}
						>
							Refresh
						</Button>
					</div>
					{saved.length === 0 ? (
						<p className="text-muted-foreground">
							No runs saved in this directory.
						</p>
					) : (
						<div className="overflow-auto rounded-lg border">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-b">
										<th className="p-3">Run</th>
										<th className="p-3">
											Experiment / model
										</th>
										<th className="p-3">Execution</th>
									</tr>
								</thead>
								<tbody>
									{saved.map((item) => (
										<tr
											key={item.runId}
											className="border-b"
										>
											<td className="p-3">
												<button
													type="button"
													className="min-h-10 underline underline-offset-4"
													disabled={
														busy || !!item.error
													}
													onClick={() =>
														void action(
															async () => {
																setRun(
																	await request<EvaluationRun>(
																		`/api/evaluations/runs/${encodeURIComponent(item.runId)}${query}`,
																	),
																);
																setComparison(
																	null,
																);
															},
														)
													}
												>
													{item.runId}
												</button>
											</td>
											<td className="p-3">
												{item.manifest?.experimentId}
												<br />
												{
													item.manifest?.configuration
														.model
												}
											</td>
											<td className="p-3">
												{item.error ??
													item.summary?.status}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					<div className="flex flex-wrap items-end gap-3">
						{(["left", "right"] as const).map((side) => (
							<label
								key={side}
								className="min-w-60 flex-1 space-y-2"
							>
								<span>
									{side === "left"
										? "First run"
										: "Second run"}
								</span>
								<select
									className={control}
									value={side === "left" ? left : right}
									onChange={(event) =>
										(side === "left" ? setLeft : setRight)(
											event.target.value,
										)
									}
								>
									<option value="">Select a saved run</option>
									{saved
										.filter((item) => !item.error)
										.map((item) => (
											<option key={item.runId}>
												{item.runId}
											</option>
										))}
								</select>
							</label>
						))}
						<Button
							variant="outline"
							disabled={busy || !left || !right}
							onClick={() =>
								void action(async () => {
									setComparison(
										await request(
											`/api/evaluations/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}&directory=${encodeURIComponent(directory)}`,
										),
									);
									setRun(null);
								})
							}
						>
							Compare
						</Button>
					</div>
				</section>
				{run && (
					<section className="space-y-3">
						<h2 className="text-lg font-semibold">
							Run {run.manifest.runId}
						</h2>
						<details>
							<summary className="min-h-10 cursor-pointer">
								Configuration and execution summary
							</summary>
							<pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
								{JSON.stringify(
									{
										manifest: run.manifest,
										summary: run.summary,
									},
									null,
									2,
								)}
							</pre>
						</details>
						{run.cases.map((record) => (
							<details
								key={record.caseId}
								className="rounded-lg border p-3"
							>
								<summary className="min-h-10 cursor-pointer tabular-nums">
									{record.caseId} · {record.status} ·{" "}
									{Math.round(record.durationMs)} ms
								</summary>
								<pre className="overflow-auto whitespace-pre-wrap break-words text-xs">
									{JSON.stringify(record, null, 2)}
								</pre>
							</details>
						))}
					</section>
				)}
				{comparison && (
					<section className="space-y-3">
						<h2 className="text-lg font-semibold">
							Run comparison
						</h2>
						{(!comparison.sameCorpus ||
							!comparison.sameExperiment) && (
							<p>
								These runs differ in experiment or selected
								corpus. Missing cases are shown explicitly.
							</p>
						)}
						<details>
							<summary className="min-h-10 cursor-pointer">
								Compare configuration
							</summary>
							<pre className="overflow-auto text-xs">
								{JSON.stringify(
									{
										left: comparison.left,
										right: comparison.right,
									},
									null,
									2,
								)}
							</pre>
						</details>
						{comparison.cases.map((pair) => (
							<details
								key={pair.caseId}
								className="rounded-lg border p-3"
							>
								<summary className="min-h-10 cursor-pointer">
									{pair.caseId} ·{" "}
									{pair.left?.status ?? "Absent"} →{" "}
									{pair.right?.status ?? "Absent"}
								</summary>
								<div className="grid gap-4 md:grid-cols-2">
									{[pair.left, pair.right].map(
										(record, index) => (
											<pre
												key={
													index === 0
														? "left"
														: "right"
												}
												className="overflow-auto whitespace-pre-wrap break-words text-xs"
											>
												{JSON.stringify(
													record,
													null,
													2,
												)}
											</pre>
										),
									)}
								</div>
							</details>
						))}
					</section>
				)}
			</div>
		</main>
	);
}
