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
	CheckIcon,
	ChevronRightIcon,
	CopyIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
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
	const byId = new Map(orderedSteps.map((step) => [step.id, step]));
	function depth(step: Step): number {
		let current = step;
		let level = 0;
		while (current.parentId && level < 8) {
			const parent = byId.get(current.parentId);
			if (!parent) break;
			level++;
			current = parent;
		}
		return level;
	}
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
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
					<span>{steps.results.length} steps</span>
					{detail.knowledgeState && (
						<span>Knowledge: {detail.knowledgeState}</span>
					)}
				</div>
			</DialogHeader>
			<div className="inspection-scroll">
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
						<div className="inspection-timing-row" key={step.id}>
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
					{orderedSteps.map((step) => (
						<section
							className="inspection-step"
							id={`inspection-step-${step.id}`}
							key={step.id}
						>
							<div className="inspection-step-row">
								<button
									type="button"
									className="inspection-step-toggle"
									style={{
										paddingInlineStart: `${depth(step) * 0.7}rem`,
									}}
									aria-expanded={expanded.has(step.id)}
									onClick={() => toggle(step.id)}
								>
									<ChevronRightIcon
										size={16}
										className={
											expanded.has(step.id)
												? "inspection-chevron-open"
												: ""
										}
									/>
									<span className="inspection-step-title">
										{step.name}
										<small>{step.owner}</small>
									</span>
									<span
										className="inspection-kind"
										data-kind={step.kind}
									>
										{step.kind === "TypeSafe"
											? "TypeSafe AI"
											: step.kind}
									</span>
									<span className="inspection-step-duration">
										{step.timing === "Unmeasured"
											? "not measured"
											: time(step.durationMs)}
									</span>
									<span
										role="img"
										className="inspection-status"
										data-status={step.status}
										aria-label={step.status}
									>
										{step.status === "Success" ? (
											<CheckIcon size={16} />
										) : step.status === "Failure" ? (
											<XIcon size={16} />
										) : (
											step.status
										)}
									</span>
								</button>
								<CopyInspectionReference stepId={step._id} />
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
					{steps.results.length <= 1 && running && (
						<p className="inspection-empty">
							Resolution is running. Completed steps appear when
							the action records its trace.
						</p>
					)}
				</section>
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
					? "Resolution step reference copied"
					: "Copy resolution step reference"
			}
			title={copied ? "Copied" : "Copy reference"}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(
						`bun run resolution_inspector step ${stepId}`,
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

function StepPayload({
	step,
	visitorId,
	start,
}: {
	step: Step;
	visitorId: string;
	start: number;
}) {
	const payload = usePaginatedQuery(
		api.resolutionInspection.payload,
		{ visitorId, stepId: step._id },
		{ initialNumItems: 20 },
	);
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (payload.status === "CanLoadMore") payload.loadMore(20);
	}, [payload.status, payload.loadMore]);
	const text = payload.results.map((part) => part.text).join("");
	const complete = payload.status === "Exhausted";
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
