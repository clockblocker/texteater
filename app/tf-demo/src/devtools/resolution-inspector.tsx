import { usePaginatedQuery, useQuery } from "convex/react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "lego";
import {
	ActivityIcon,
	ArrowLeftIcon,
	BracesIcon,
	CheckIcon,
	ChevronRightIcon,
	FilterIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
	CopyInspectionReference,
	CopyInspectionValue,
	DetailedTraces,
	StepPayload,
	time,
} from "./resolution-traces";
import "./resolution-inspector.css";

type Step = Doc<"inspectionSteps">;
type Click = Doc<"inspectionClicks">;
const GENERATING_ONLY_KEY = "tf-demo:resolution-inspector:generating-only";
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
	const [generatingOnly, setGeneratingOnly] = useState(
		() => localStorage.getItem(GENERATING_ONLY_KEY) === "true",
	);
	useEffect(() => {
		localStorage.setItem(GENERATING_ONLY_KEY, String(generatingOnly));
	}, [generatingOnly]);
	const history = usePaginatedQuery(
		api.resolutionInspection.list,
		open ? { visitorId, generatingOnly } : "skip",
		{ initialNumItems: 25 },
	);
	// Changing the filter restarts pagination; keep the previous entries on
	// screen until the refiltered page arrives so the panel does not flicker.
	const settled = useRef<Click[]>([]);
	if (history.status !== "LoadingFirstPage")
		settled.current = history.results;
	const loadingFirstPage = history.status === "LoadingFirstPage";
	const results = loadingFirstPage ? settled.current : history.results;
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
					aria-label="Resolution and analysis history"
				>
					<header>
						<div>
							<strong>Resolution inspector</strong>
						</div>
						<div className="resolution-inspector-header-actions">
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											type="button"
											size="icon-sm"
											variant="outline"
											className="resolution-inspector-filter"
											aria-pressed={generatingOnly}
											aria-label="Show generating runs only"
											onClick={() =>
												setGeneratingOnly(
													(value) => !value,
												)
											}
										>
											<FilterIcon size={14} />
										</Button>
									}
								/>
								<TooltipContent side="bottom">
									{generatingOnly
										? "Showing generating runs only. Stored-result selections are hidden."
										: "Showing all runs. Click to hide stored-result selections."}
								</TooltipContent>
							</Tooltip>
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Close inspection history"
								onClick={() => setOpen(false)}
							>
								<XIcon />
							</Button>
						</div>
					</header>
					<div className="resolution-inspector-clicks">
						{loadingFirstPage && results.length === 0 ? (
							<p className="inspection-empty">Loading history…</p>
						) : results.length === 0 ? (
							<p className="inspection-empty">
								{generatingOnly
									? "No generating runs yet. Stored-result selections are hidden by the filter."
									: "Submit or re-analyze a text to inspect sentence splitting and segmentation, or click a word to inspect its resolution. New runs are recorded even while this panel is closed."}
							</p>
						) : (
							results.map((click) => (
								<div
									className="inspection-click"
									key={click._id}
								>
									<button
										type="button"
										className="inspection-click-open"
										onClick={() =>
											setSelected(click.requestId)
										}
									>
										<span className="inspection-click-heading">
											<strong>
												{click.selectedSegment}
											</strong>
											<time>
												{clock(click.startedAt)}
											</time>
										</span>
										<span className="inspection-sentence">
											{click.sentence}
										</span>
										<span className="inspection-click-kind">
											{click.selectionKind === "Analysis"
												? "Sentence splitting & analysis"
												: click.selectionKind ===
														"Available"
													? "Stored result"
													: "Resolution"}
											<ChevronRightIcon size={14} />
										</span>
									</button>
									<div className="inspection-click-actions">
										<CopyInspectionValue
											value={`bun run resolution_inspector request ${click.requestId}`}
											label="Copy full chain command"
										/>
									</div>
								</div>
							))
						)}
						{history.status === "CanLoadMore" && (
							<Button
								variant="ghost"
								onClick={() => history.loadMore(25)}
							>
								Older entries
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
					This inspection may have been removed by a demo reset.
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
					<ArrowLeftIcon size={14} /> Inspection history
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
							: detail.click.selectionKind === "Analysis"
								? "Analysis duration"
								: "Reading resolved"}{" "}
						<strong>{time(resolvedMs ?? total)}</strong>
					</span>
					<span className="inspection-chain-reference">
						Full chain <strong>{time(total)}</strong>
						<CopyInspectionValue
							value={`bun run resolution_inspector request ${requestId}`}
							label="Copy full chain command"
						/>
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
				{detail.click.selectionKind === "Analysis" && (
					<p className="inspection-empty">
						Expand “Split text into sentences” for sentence
						boundaries. The “segment” operation contains language
						and validity judgments, whitespace repairs, segmentation
						rules, and the resulting segments. Detailed traces show
						each model call’s inputs and outputs.
					</p>
				)}
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
									Analysis or resolution is running. Completed
									steps appear when the action records its
									trace.
								</p>
							)}
						</section>
					</>
				)}
				<footer className="inspection-footer">
					{clock(start)} · {requestId}
					<br />
					Timeline includes scheduling gaps. Provider bars include
					response validation.
					{detail.click.selectionKind !== "Analysis" && (
						<>
							{" "}
							Selection timing is unavailable inside Convex’s
							transaction clock.
						</>
					)}
				</footer>
			</div>
		</>
	);
}
