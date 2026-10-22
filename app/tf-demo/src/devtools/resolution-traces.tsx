/**
 * The Resolution Inspector's detailed traces (`resolution-inspector.tsx`):
 * the flamegraph, each step's payload and transport phases, and the copy
 * buttons and duration formats both views share.
 */
import { usePaginatedQuery } from "convex/react";
import { Button } from "lego";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { layoutFlamegraph } from "./resolution-flamegraph";
import { transportBreakdown } from "./resolution-transport";

type Step = Doc<"inspectionSteps">;

export const time = (ms: number) =>
	ms < 1
		? "<1 ms"
		: ms < 1000
			? `${Math.round(ms)} ms`
			: `${(ms / 1000).toFixed(2)} s`;

export function CopyInspectionReference({ stepId }: { stepId: string }) {
	return (
		<CopyInspectionValue
			value={`bun run resolution_inspector trace ${stepId}`}
			label="Copy detailed trace command"
		/>
	);
}

export function CopyInspectionValue({
	value,
	label,
}: {
	value: string;
	label: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<Button
			type="button"
			size="icon-sm"
			variant="ghost"
			className="inspection-copy-reference"
			aria-label={copied ? "Copied" : label}
			title={copied ? "Copied" : label}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(`\`${value}\``);
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1600);
				} catch {
					setCopied(false);
				}
			}}
		>
			{copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
		</Button>
	);
}

export function DetailedTraces({
	steps,
	visitorId,
	start,
	total,
}: {
	steps: Step[];
	visitorId: string;
	start: number;
	total: number;
}) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [payloads, setPayloads] = useState<Record<string, string>>({});
	const receivePayload = useCallback((id: string, text: string) => {
		setPayloads((current) =>
			current[id] === text ? current : { ...current, [id]: text },
		);
	}, []);
	const graphSteps = steps.flatMap((step) => {
		const phases =
			transportBreakdown(payloads[step.id] ?? "")?.phases ?? [];
		return [
			step,
			...phases.map((phase, index) => ({
				...step,
				id: `${step.id}:transport:${index}`,
				parentId: step.id,
				name: phase.name,
				startedAt: step.startedAt + phase.offsetMs,
				durationMs: phase.durationMs,
			})),
		];
	});
	const selected =
		graphSteps.find((step) => step.id === selectedId) ?? steps[0];
	const selectedCall = steps.find((step) => step._id === selected?._id);
	const [focusedId, setFocusedId] = useState<string | null>(null);
	const focused = steps.find((step) => step.id === focusedId);
	const graphStart = focused?.startedAt ?? start;
	const graphTotal = Math.max(1, focused?.durationMs ?? total);
	const spans = layoutFlamegraph(
		focused
			? graphSteps.filter((step) => step._id === focused._id)
			: graphSteps,
	);
	const rows = Math.max(1, ...spans.map((span) => span.row + 1));
	return (
		<section className="inspection-detailed" aria-label="Detailed traces">
			{steps
				.filter(
					(step) => step.kind === "LLM" || step.kind === "TypeSafe",
				)
				.map((step) => (
					<TracePayloadLoader
						key={step.id}
						step={step}
						visitorId={visitorId}
						onLoad={receivePayload}
					/>
				))}
			<header className="inspection-detailed-heading">
				<div>
					<h3>Detailed trace flamegraph</h3>
					<p className="inspection-detailed-description">
						Select a span to inspect its inputs, outputs, and model
						metadata. Child spans appear below their parent;
						parallel work overlaps in time. Transport phases load
						automatically. Their offsets are measured from executor
						start; placement within the enclosing call is
						approximate.
					</p>
				</div>
			</header>
			<div className="inspection-legend">
				<span data-kind="Code">Code</span>
				<span data-kind="TypeSafe">TypeSafe AI</span>
				<span data-kind="LLM">LLM</span>
			</div>
			<div className="inspection-flamegraph-controls">
				<Button
					size="sm"
					variant="outline"
					disabled={!selectedCall || selectedCall.durationMs <= 0}
					onClick={() =>
						setFocusedId(
							focused ? null : (selectedCall?.id ?? null),
						)
					}
				>
					{focused ? "Show full chain" : "Zoom to selected call"}
				</Button>
				{focused && <span>{focused.name}</span>}
			</div>
			<div className="inspection-flamegraph-scroll">
				<div className="inspection-flamegraph-inner">
					<div className="inspection-axis">
						<span>0</span>
						<span>{time(graphTotal / 2)}</span>
						<span>{time(graphTotal)}</span>
					</div>
					<section
						className="inspection-flamegraph"
						style={{ height: rows * 30 }}
						aria-label="Detailed trace timing spans"
					>
						{spans.map(({ step, row }) => (
							<button
								type="button"
								key={step.id}
								className="inspection-bar inspection-flamegraph-bar"
								data-kind={step.kind}
								data-status={step.status}
								aria-pressed={selected?.id === step.id}
								aria-label={`${step.name}, ${step.timing === "Unmeasured" ? "not measured" : time(step.durationMs)}, ${step.status}`}
								title={`${step.name} · ${step.owner} · ${step.timing === "Unmeasured" ? "not measured" : time(step.durationMs)}`}
								style={{
									left: `${Math.max(0, ((step.startedAt - graphStart) / graphTotal) * 100)}%`,
									width: `${Math.max(0, (step.durationMs / graphTotal) * 100)}%`,
									top: row * 30,
								}}
								onClick={() => setSelectedId(step.id)}
							>
								<span>
									{step.name} ·{" "}
									{step.timing === "Unmeasured"
										? "not measured"
										: time(step.durationMs)}
								</span>
							</button>
						))}
					</section>
				</div>
			</div>
			{selected ? (
				<section
					className="inspection-detailed-step"
					aria-label="Selected trace"
				>
					<header>
						<div>
							<h4>{selected.name}</h4>
							<p className="inspection-detailed-description">
								{selected.owner}
							</p>
						</div>
						<span>
							{selected.timing === "Unmeasured"
								? "not measured"
								: time(selected.durationMs)}
						</span>
						<CopyInspectionReference stepId={selected._id} />
					</header>
					{selectedCall &&
						(selectedCall.kind === "LLM" ||
							selectedCall.kind === "TypeSafe") && (
							<TransportDetails
								text={payloads[selectedCall.id]}
							/>
						)}
					<StepPayload
						key={selectedCall?.id ?? selected.id}
						step={selectedCall ?? selected}
						visitorId={visitorId}
						start={start}
					/>
				</section>
			) : (
				<p className="inspection-empty">
					Completed traces will appear here as they are recorded.
				</p>
			)}
		</section>
	);
}

export function StepPayload({
	step,
	visitorId,
	start,
}: {
	step: Step;
	visitorId: string;
	start: number;
}) {
	const { text, complete } = useInspectionPayload(step, visitorId);
	const [copied, setCopied] = useState(false);
	return (
		<div className="inspection-payload">
			<div className="inspection-payload-meta">
				<span>
					Start +{time(Math.max(0, step.startedAt - start))} ·{" "}
					{step.status}
				</span>
				<Button
					size="sm"
					variant="ghost"
					disabled={!complete}
					onClick={async () => {
						try {
							await navigator.clipboard.writeText(`\`${text}\``);
							setCopied(true);
						} catch {
							setCopied(false);
						}
					}}
				>
					<CopyIcon size={13} />
					{copied ? "Copied" : "Copy JSON"}
				</Button>
			</div>
			{complete ? (
				<>
					{/* biome-ignore lint/a11y/noNoninteractiveTabindex: Long JSON payloads need keyboard scrolling. */}
					<pre tabIndex={0}>{text}</pre>
				</>
			) : (
				<p>Loading inputs and outputs…</p>
			)}
		</div>
	);
}

function useInspectionPayload(step: Step, visitorId: string) {
	const payload = usePaginatedQuery(
		api.resolutionInspection.payload,
		{ visitorId, stepId: step._id },
		{ initialNumItems: 20 },
	);
	useEffect(() => {
		if (payload.status === "CanLoadMore") payload.loadMore(20);
	}, [payload.status, payload.loadMore]);
	const text = payload.results.map((part) => part.text).join("");
	const complete = payload.status === "Exhausted";
	return { text, complete };
}

function TracePayloadLoader({
	step,
	visitorId,
	onLoad,
}: {
	step: Step;
	visitorId: string;
	onLoad: (id: string, text: string) => void;
}) {
	const { text, complete } = useInspectionPayload(step, visitorId);
	useEffect(() => {
		if (complete) onLoad(step.id, text);
	}, [complete, onLoad, step.id, text]);
	return null;
}

function TransportDetails({ text }: { text: string | undefined }) {
	if (text === undefined)
		return (
			<p className="inspection-detailed-description">
				Loading transport timings…
			</p>
		);
	const breakdown = transportBreakdown(text);
	if (!breakdown)
		return (
			<p className="inspection-detailed-description">
				No transport timings were recorded for this call.
			</p>
		);
	return (
		<div className="inspection-transport-details">
			<h5>
				Transport breakdown
				{breakdown.reused === true
					? " · reused connection"
					: breakdown.reused === false
						? " · new connection"
						: ""}
			</h5>
			<table>
				<caption>Recorded phases</caption>
				<thead>
					<tr>
						<th scope="col">Phase</th>
						<th scope="col">Duration</th>
					</tr>
				</thead>
				<tbody>
					{breakdown.phases.map((phase) => (
						<tr key={phase.name}>
							<th scope="row">{phase.name}</th>
							<td>{preciseTime(phase.durationMs)}</td>
						</tr>
					))}
				</tbody>
			</table>
			{breakdown.measurements.length > 0 && (
				<>
					<table>
						<caption>
							Overlapping measurements · do not add to phase
							durations
						</caption>
						<thead>
							<tr>
								<th scope="col">Measurement</th>
								<th scope="col">Duration</th>
							</tr>
						</thead>
						<tbody>
							{breakdown.measurements.map((measurement) => (
								<tr key={measurement.name}>
									<th scope="row">{measurement.name}</th>
									<td>
										{preciseTime(measurement.durationMs)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className="inspection-detailed-description">
						Provider processing is reported as a duration without
						start/end timestamps. Waiting also includes network and
						service overhead; this trace cannot separate queueing
						from model generation.
					</p>
				</>
			)}
		</div>
	);
}

function preciseTime(ms: number) {
	return `${ms.toFixed(ms < 1 ? 3 : 1)} ms`;
}
