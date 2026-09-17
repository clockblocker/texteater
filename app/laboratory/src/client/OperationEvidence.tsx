import type { StoredRun } from "promptsmith/evaluation";

function object(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
function label(key: string) {
	return key.replaceAll(/([a-z])([A-Z])/gu, "$1 $2").replaceAll("_", " ");
}
/** Domain output stays readable without opening transport payloads. */
function Value({ value }: { value: unknown }) {
	if (value === null)
		return (
			<span className="text-muted-foreground">Unmarked / no value</span>
		);
	if (value === undefined)
		return <span className="text-muted-foreground">Not available</span>;
	if (Array.isArray(value))
		return value.length ? (
			<ol className="space-y-2 border-l pl-3">
				{value.map((item, index) => (
					<li key={index}>
						<Value value={item} />
					</li>
				))}
			</ol>
		) : (
			<span>None</span>
		);
	if (typeof value === "object")
		return (
			<dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
				{Object.entries(value).map(([key, item]) => (
					<div className="contents" key={key}>
						<dt className="text-muted-foreground">{label(key)}</dt>
						<dd className="min-w-0 break-words">
							<Value value={item} />
						</dd>
					</div>
				))}
			</dl>
		);
	return (
		<span className="whitespace-pre-wrap break-words">{String(value)}</span>
	);
}
export function OperationEvidence({
	record,
}: {
	record: StoredRun["cases"][number];
}) {
	const traces = "traces" in record ? record.traces : [];
	const input = object(record.input);
	const needsProjection =
		(input.role === "review" || input.role === "held-out") &&
		input.kind !== "corpus";
	return (
		<div className="space-y-5 pt-3">
			{record.error && (
				<p className="rounded border border-destructive p-3">
					{record.error}
				</p>
			)}
			<div className="grid gap-5 lg:grid-cols-2">
				<section className="space-y-2">
					<h3 className="font-medium">Input and expected result</h3>
					<Value value={record.input} />
					<details>
						<summary className="cursor-pointer py-2">
							Comparison expectation
						</summary>
						<Value value={record.idealOutput} />
					</details>
				</section>
				<section className="space-y-2">
					<h3 className="font-medium">Actual result</h3>
					<Value value={record.output} />
					<Value
						value={
							needsProjection
								? {
										review: "Compare the expected construction or sentence with the actual domain result. The raw exact-match field compares different representations and is not a quality verdict.",
									}
								: record.evaluation
						}
					/>
				</section>
			</div>
			{"calls" in record && (
				<p className="text-sm tabular-nums">
					{record.calls} calls · input tokens{" "}
					{record.usage.inputTokens ?? "unknown"} · output tokens{" "}
					{record.usage.outputTokens ?? "unknown"} ·{" "}
					{Math.round(record.durationMs)} ms
				</p>
			)}
			{traces.map((raw, index) => {
				const trace = object(raw);
				const calls = Array.isArray(trace.calls) ? trace.calls : [];
				return (
					<section
						key={String(trace.id ?? index)}
						className="space-y-3 rounded border p-3"
					>
						<h3 className="font-medium">
							{String(trace.operation ?? "Operation")} ·{" "}
							{String(trace.outcome ?? "Recorded")}
						</h3>
						<Value value={trace.failure ?? trace.output} />
						{calls.map((rawCall, callIndex) => {
							const call = object(rawCall),
								request = object(call.request),
								configuration = object(request.configuration);
							return (
								<details
									key={String(call.id ?? callIndex)}
									className="rounded border p-3"
								>
									<summary className="cursor-pointer text-sm">
										{String(call.executor)} ·{" "}
										{String(request.stage)} ·{" "}
										{String(configuration.model)} ·
										transport {String(call.transport)} ·
										validation {String(call.validation)} ·{" "}
										{Math.round(Number(call.durationMs))} ms
									</summary>
									<div className="space-y-3 pt-3">
										<Value
											value={{
												dependsOn: call.dependsOn,
												failure: call.failure,
												answer: call.output,
												metadata: call.metadata,
											}}
										/>
										<details>
											<summary className="cursor-pointer py-2">
												State, candidates and questions
											</summary>
											<Value
												value={{
													state: request.input,
													questions:
														request.questions,
													configuration,
												}}
											/>
										</details>
									</div>
								</details>
							);
						})}
						<details>
							<summary className="cursor-pointer py-2">
								Decisions and unused speculation
							</summary>
							<Value value={trace.events} />
						</details>
					</section>
				);
			})}
			<details>
				<summary className="cursor-pointer py-2">
					Complete evidence JSON
				</summary>
				<pre className="overflow-auto text-xs">
					{JSON.stringify(record, null, 2)}
				</pre>
			</details>
		</div>
	);
}
