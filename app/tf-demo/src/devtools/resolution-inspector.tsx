import { usePaginatedQuery, useQuery } from "convex/react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "lego";
import {
	ActivityIcon,
	ArrowLeftIcon,
	BracesIcon,
	CheckIcon,
	ChevronRightIcon,
	CopyIcon,
	XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { layoutFlamegraph } from "./resolution-flamegraph";
import { transportBreakdown } from "./resolution-transport";
import "./resolution-inspector.css";

type Step = Doc<"inspectionSteps">;
const time = (ms: number) =>
	ms < 1
		? "<1 ms"
		: ms < 1000
			? `${Math.round(ms)} ms`
			: `${(ms / 1000).toFixed(2)} s`;
const clock = (epoch: number) =>
	new Date(epoch).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

export function ResolutionInspector() {
	const visitorId = useAnonymousVisitorId();
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<string | null>(null);
	const history = usePaginatedQuery(
		api.resolutionInspection.list,
		open ? { visitorId } : "skip",
		{ initialNumItems: 25 },
	);
	return (
		<>
			<Button
				className="resolution-inspector-toggle"
				size="icon"
				variant="outline"
				aria-label="Resolution inspector"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
			>
				<ActivityIcon aria-hidden="true" />
			</Button>
			{open && (
				<aside
					className="resolution-inspector-history"
					aria-label="Resolution click history"
				>
					<header>
						<div>
							<strong>Resolution inspector</strong>
							<p>Clicks from this browser</p>
						</div>
						<Button
							size="icon-sm"
							variant="ghost"
							aria-label="Close click history"
							onClick={() => setOpen(false)}
						>
							<XIcon />
						</Button>
					</header>
					<div className="resolution-inspector-clicks">
						{history.status === "LoadingFirstPage" ? (
							<p className="inspection-empty">Loading clicks…</p>
						) : history.results.length === 0 ? (
							<p className="inspection-empty">
								Click a word in a text or definition. Its
								resolution will be recorded here, even while
								this panel is closed.
							</p>
						) : (
							history.results.map((click) => (
								<button
									type="button"
									className="inspection-click"
									key={click._id}
									onClick={() => setSelected(click.requestId)}
								>
									<span className="inspection-click-heading">
										<strong>{click.selectedSegment}</strong>
										<time>{clock(click.startedAt)}</time>
									</span>
									<span className="inspection-sentence">
										{click.sentence}
									</span>
									<span className="inspection-click-kind">
										{click.selectionKind === "Available"
											? "Stored result"
											: "Resolution"}
										<ChevronRightIcon size={14} />
									</span>
								</button>
							))
						)}
						{history.status === "CanLoadMore" && (
							<Button
								variant="ghost"
								onClick={() => history.loadMore(25)}
							>
								Older clicks
							</Button>
						)}
					</div>
				</aside>
			)}
			<Dialog
				open={selected !== null}
				onOpenChange={(value) => {
					if (!value) setSelected(null);
				}}
			>
				<DialogContent className="resolution-inspector-dialog">
					{selected && (
						<InspectionDetail
							key={selected}
							requestId={selected}
							visitorId={visitorId}
							onBack={() => setSelected(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function InspectionDetail({
	requestId,
	visitorId,
	onBack,
}: {
	requestId: string;
	visitorId: string;
	onBack: () => void;
}) {
	const detail = useQuery(api.resolutionInspection.detail, {
		requestId,
		visitorId,
	});
	const steps = usePaginatedQuery(
		api.resolutionInspection.steps,
		{ requestId, visitorId },
		{ initialNumItems: 100 },
	);
	const orderedSteps = [...steps.results].sort(
		(a, b) => a.startedAt - b.startedAt || b.durationMs - a.durationMs,
	);
	const parentIds = new Set(orderedSteps.map((step) => step.parentId));
	const isTotal = (step: Step) =>
		parentIds.has(step.id) ||
		// This wrapper shares the session parent with its internal steps.
		(step.name === "Resolve selected segment" &&
			step.owner === "app/tf-demo · linguisticOrchestration");
	const stepGroups = [
		{
			title: "Individual steps",
			steps: orderedSteps.filter((step) => !isTotal(step)),
			totals: false,
		},
		{
			title: "Operation totals",
			steps: orderedSteps.filter(isTotal),
			totals: true,
		},
	];
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [showDetailedTraces, setShowDetailedTraces] = useState(false);
	const [now, setNow] = useState(Date.now);
	const running =
		detail &&
		(detail.knowledgeState === "Running" ||
			detail.knowledgeState === "Scheduled" ||
			![
				"Complete",
				"Unresolved",
				"PermanentFailure",
				"Reused",
				"Session removed",
			].includes(detail.state));
	useEffect(() => {
		if (!running) return;
		const timer = setInterval(() => setNow(Date.now()), 100);
		return () => clearInterval(timer);
	}, [running]);
	useEffect(() => {
		if (steps.status === "CanLoadMore") steps.loadMore(100);
	}, [steps.status, steps.loadMore]);
	const toggle = (id: string) =>
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	const reveal = (step: Step) => {
		setExpanded((current) => new Set([...current, step.id]));
		requestAnimationFrame(() =>
			document
				.getElementById(`inspection-step-${step.id}`)
				?.scrollIntoView({ block: "start", behavior: "instant" }),
		);
	};
	if (detail === undefined)
		return (
			<>
				<DialogTitle>Resolution inspector</DialogTitle>
				<DialogDescription>Loading inspection…</DialogDescription>
			</>
		);
	if (!detail)
		return (
			<>
				<DialogTitle>Inspection unavailable</DialogTitle>
				<DialogDescription>
					This click may have been removed by a demo reset.
				</DialogDescription>
			</>
		);
	const start = detail.click.startedAt;
	const lastEnd = Math.max(
		start + 1,
		...orderedSteps.map((step) => step.startedAt + step.durationMs),
	);
	const end = Math.max(
		lastEnd,
		detail.finishedAt ?? start,
		running ? now : start,
	);
	const total = end - start;
	const resolvedMs = detail.finishedAt ? detail.finishedAt - start : null;
	return (
		<>
			<DialogHeader className="inspection-heading">
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					className="inspection-back"
				>
					<ArrowLeftIcon size={14} /> Click history
				</Button>
				<div className="inspection-title-row">
					<DialogTitle>{detail.click.selectedSegment}</DialogTitle>
					<span className="inspection-state">{detail.state}</span>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="inspection-detailed-toggle"
						aria-pressed={showDetailedTraces}
						onClick={() =>
							setShowDetailedTraces((visible) => !visible)
						}
					>
						<BracesIcon size={14} />
						{showDetailedTraces ? "Hide traces" : "Detailed traces"}
					</Button>
				</div>
				<DialogDescription>{detail.click.sentence}</DialogDescription>
				<div className="inspection-metrics">
					<span>
						{resolvedMs === null
							? "Captured duration"
							: "Reading resolved"}{" "}
						<strong>{time(resolvedMs ?? total)}</strong>
					</span>
					<span>
						Full chain <strong>{time(total)}</strong>
					</span>
					<span>
						{stepGroups[0].steps.length} steps ·{" "}
						{stepGroups[1].steps.length} operation totals
					</span>
					{detail.knowledgeState && (
						<span>Knowledge: {detail.knowledgeState}</span>
					)}
				</div>
			</DialogHeader>
			<div className="inspection-scroll">
				{showDetailedTraces ? (
					<DetailedTraces
						steps={orderedSteps}
						total={total}
						visitorId={visitorId}
						start={start}
					/>
				) : (
					<>
						<section
							aria-label="Resolution timing waterfall"
							className="inspection-waterfall"
						>
							<div className="inspection-legend">
								<span data-kind="Code">Code</span>
								<span data-kind="TypeSafe">TypeSafe AI</span>
								<span data-kind="LLM">LLM</span>
							</div>
							<div className="inspection-axis">
								<span>0</span>
								<span>{time(total / 2)}</span>
								<span>{time(total)}</span>
							</div>
							<div
								className="inspection-total"
								title={`Full chain: ${time(total)}`}
							/>
							{orderedSteps.map((step) => (
								<div
									className="inspection-timing-row"
									key={step.id}
								>
									<button
										type="button"
										data-kind={step.kind}
										data-status={step.status}
										className="inspection-bar"
										aria-label={`Inspect ${step.name}, ${step.timing === "Unmeasured" ? "not measured" : time(step.durationMs)}`}
										title={`${step.name} · ${step.owner} · ${step.timing === "Unmeasured" ? "not measured" : time(step.durationMs)}`}
										style={{
											left: `${Math.max(0, ((step.startedAt - start) / total) * 100)}%`,
											width: `${Math.max(0.35, Math.min(100, (step.durationMs / total) * 100))}%`,
										}}
										onClick={() => reveal(step)}
									>
										<span>{step.name}</span>
									</button>
								</div>
							))}
						</section>
						<section
							className="inspection-steps"
							aria-label="Resolution steps"
						>
							{stepGroups
								.filter((group) => group.steps.length > 0)
								.map((group) => (
									<section
										key={group.title}
										aria-label={group.title}
										className={
											group.totals
												? "inspection-totals"
												: undefined
										}
									>
										<header className="inspection-group-heading">
											<h3>{group.title}</h3>
											{group.totals && (
												<p>
													Durations include the steps
													within each operation. They
													overlap; do not add them
													together.
												</p>
											)}
										</header>
										{group.steps.map((step) => (
											<section
												className="inspection-step"
												id={`inspection-step-${step.id}`}
												key={step.id}
											>
												<div className="inspection-step-row">
													<button
														type="button"
														className="inspection-step-toggle"
														aria-expanded={expanded.has(
															step.id,
														)}
														onClick={() =>
															toggle(step.id)
														}
													>
														<ChevronRightIcon
															size={16}
															className={
																expanded.has(
																	step.id,
																)
																	? "inspection-chevron-open"
																	: ""
															}
														/>
														<span className="inspection-step-title">
															{step.name}
															<small>
																{step.owner}
															</small>
														</span>
														<span
															className="inspection-kind"
															data-kind={
																step.kind
															}
														>
															{step.kind ===
															"TypeSafe"
																? "TypeSafe AI"
																: step.kind}
														</span>
														<span className="inspection-step-duration">
															{step.timing ===
															"Unmeasured"
																? "not measured"
																: time(
																		step.durationMs,
																	)}
														</span>
														<span
															role="img"
															className="inspection-status"
															data-status={
																step.status
															}
															aria-label={
																step.status
															}
														>
															{step.status ===
															"Success" ? (
																<CheckIcon
																	size={16}
																/>
															) : step.status ===
																"Failure" ? (
																<XIcon
																	size={16}
																/>
															) : (
																step.status
															)}
														</span>
													</button>
													<CopyInspectionReference
														stepId={step._id}
													/>
												</div>
												{expanded.has(step.id) && (
													<StepPayload
														step={step}
														visitorId={visitorId}
														start={start}
													/>
												)}
											</section>
										))}
									</section>
								))}
							{steps.results.length <= 1 && running && (
								<p className="inspection-empty">
									Resolution is running. Completed steps
									appear when the action records its trace.
								</p>
							)}
						</section>
					</>
				)}
				<footer className="inspection-footer">
					{clock(start)} · {requestId}
					<br />
					Timeline includes scheduling gaps. Provider bars include
					response validation. Selection timing is unavailable inside
					Convex’s transaction clock.
				</footer>
			</div>
		</>
	);
}

function CopyInspectionReference({ stepId }: { stepId: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<Button
			type="button"
			size="icon-sm"
			variant="ghost"
			className="inspection-copy-reference"
			aria-label={
				copied
					? "Detailed trace command copied"
					: "Copy detailed trace command"
			}
			title={copied ? "Copied" : "Copy detailed trace command"}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(
						`bun run resolution_inspector trace ${stepId}`,
					);
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

function DetailedTraces({
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

function StepPayload({
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
							await navigator.clipboard.writeText(text);
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
