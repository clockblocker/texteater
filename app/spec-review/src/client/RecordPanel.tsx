import type * as Dumspec from "dumspec/types";
import { Badge, Button, cn } from "lego";
import { type ReactNode, useState } from "react";
import type {
	ActionView,
	IssueView,
	ReadableRecordView,
	RecordView,
	RuleCitationView,
} from "../shared/contract";
import { postSave } from "./api";
import { DirtyBadge } from "./BatchList";
import { DepthLabel } from "./DepthLabel";
import { type Focus, Sentence, sameFocus } from "./Sentence";

/**
 * The texts of a unit's or No Target entry's Segments, with an ellipsis
 * where a word stands between.
 */
function memberText(
	{ memberSegmentIndices }: { memberSegmentIndices: readonly number[] },
	segments: readonly Dumspec.Segment[],
): string {
	return memberSegmentIndices
		.map((index, position) => {
			const text = segments[index]?.text ?? "?";
			const previous = memberSegmentIndices[position - 1];
			if (previous === undefined) return text;
			const between = segments.slice(previous + 1, index);
			return between.some((segment) => segment.kind === "ResolvableText")
				? ` … ${text}`
				: ` ${text}`;
		})
		.join("");
}

function Section({
	title,
	children,
}: {
	title: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-2">
			<h3 className="font-medium text-ink-muted text-xs uppercase tracking-wide">
				{title}
			</h3>
			{children}
		</section>
	);
}

function IssueList({ issues }: { issues: readonly IssueView[] }) {
	return (
		<ul className="flex flex-col gap-1 text-sm">
			{issues.map((issue) => (
				<li key={`${issue.path}:${issue.check}:${issue.message}`}>
					<span className="font-mono text-ink-muted text-xs">
						{issue.path || "record"} [{issue.check}]
					</span>{" "}
					{issue.message}
				</li>
			))}
		</ul>
	);
}

function DeeperIssues({ issues }: { issues: readonly IssueView[] }) {
	const counts = new Map<string, number>();
	for (const issue of issues)
		counts.set(issue.layer ?? "", (counts.get(issue.layer ?? "") ?? 0) + 1);
	if (issues.length === 0)
		return <p className="text-ink-muted text-sm">None.</p>;
	return (
		<details className="text-sm">
			<summary className="cursor-pointer text-ink-soft">
				{[...counts]
					.map(([layer, count]) => `${layer} ${count}`)
					.join(", ")}{" "}
				<span className="text-ink-faint">
					(past this review; they do not block it)
				</span>
			</summary>
			<div className="mt-2">
				<IssueList issues={issues} />
			</div>
		</details>
	);
}

function RuleList({ rules }: { rules: readonly RuleCitationView[] }) {
	if (rules.length === 0)
		return <p className="text-ink-muted text-sm">Cites no Rule.</p>;
	return (
		<ul className="flex flex-col gap-1 text-sm">
			{rules.map((citation) => (
				<li
					key={citation.rule}
					className="flex items-center gap-2"
					data-rule={citation.rule}
				>
					<Badge
						variant={
							citation.status === "current"
								? "secondary"
								: "destructive"
						}
					>
						{citation.status}
					</Badge>
					<span className="font-mono text-xs">{citation.rule}</span>
				</li>
			))}
		</ul>
	);
}

function Action({
	label,
	action,
	busy,
	onRun,
}: {
	label: string;
	action: ActionView;
	busy: boolean;
	onRun: () => void;
}) {
	return (
		<div className="flex flex-col gap-1">
			<Button
				variant={label.startsWith("Approve") ? "default" : "outline"}
				disabled={!action.allowed || busy}
				onClick={onRun}
				className="self-start"
			>
				{label}
			</Button>
			{action.reason && (
				<p className="max-w-80 text-ink-muted text-xs" data-reason>
					{action.reason}
				</p>
			)}
		</div>
	);
}

/** A unit's rows, filled with its details or with placeholders. */
function UnitRows({
	members,
	route,
	lemma,
	rationale,
}: {
	members: ReactNode;
	route: ReactNode;
	lemma: ReactNode;
	rationale: ReactNode;
}) {
	return (
		<dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1 text-sm">
			<dt className="text-ink-muted">Members</dt>
			<dd>{members}</dd>
			<dt className="text-ink-muted">Route</dt>
			<dd>{route}</dd>
			<dt className="text-ink-muted">Draft Lemma</dt>
			<dd className="text-ink-soft">{lemma}</dd>
			<dt className="text-ink-muted">Rationale</dt>
			<dd className="text-ink-soft">{rationale}</dd>
		</dl>
	);
}

function SelectionDetails({
	record,
	focus,
}: {
	record: ReadableRecordView;
	focus: Focus | null;
}) {
	if (!focus) {
		const placeholder = <span className="text-ink-faint">—</span>;
		return (
			<UnitRows
				members={
					<span className="text-ink-muted">
						Hover a word to see its unit; click to select it.
					</span>
				}
				route={placeholder}
				lemma={placeholder}
				rationale={placeholder}
			/>
		);
	}
	if (focus.kind === "noTarget") {
		const entry = record.noTarget[focus.index];
		if (!entry) return null;
		return (
			<dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1 text-sm">
				<dt className="text-ink-muted">Members</dt>
				<dd>{memberText(entry, record.segments)}</dd>
				<dt className="text-ink-muted">No Target</dt>
				<dd>{entry.reason}</dd>
			</dl>
		);
	}
	const unit = record.units[focus.index];
	if (!unit) return null;
	return (
		<UnitRows
			members={memberText(unit, record.segments)}
			route={`${unit.route.family} / ${unit.route.kind}`}
			lemma={
				<>
					{unit.lemmaHint ?? "—"}{" "}
					<span className="text-ink-faint">
						(a hint; not reviewed here)
					</span>
				</>
			}
			rationale={unit.rationale ?? "—"}
		/>
	);
}

/**
 * The focused details. The details of nothing, of every unit and of every No
 * Target entry sit stacked in one grid cell with only the focused one
 * visible, so the panel keeps the height of the record's longest and moving
 * the pointer across the sentence never shifts what lies below.
 */
function FocusDetails({
	record,
	focus,
}: {
	record: ReadableRecordView;
	focus: Focus | null;
}) {
	const layers: readonly { key: string; focus: Focus | null }[] = [
		{ key: "none", focus: null },
		...record.units.map((_, index) => ({
			key: `unit-${index}`,
			focus: { kind: "unit", index } as const,
		})),
		...record.noTarget.map((_, index) => ({
			key: `no-target-${index}`,
			focus: { kind: "noTarget", index } as const,
		})),
	];
	return (
		<div className="grid">
			{layers.map((layer) => {
				const shown =
					layer.focus === null
						? focus === null
						: sameFocus(layer.focus, focus);
				return (
					<div
						key={layer.key}
						className={cn(
							"col-start-1 row-start-1",
							!shown && "invisible",
						)}
						data-selected-unit={
							shown && layer.focus?.kind === "unit"
								? layer.focus.index
								: undefined
						}
						data-selected-no-target={
							shown && layer.focus?.kind === "noTarget"
								? layer.focus.index
								: undefined
						}
					>
						<SelectionDetails record={record} focus={layer.focus} />
					</div>
				);
			})}
		</div>
	);
}

/** One record: its sentence and units, its checks, and its approval. */
export function RecordPanel({
	record,
	onSaved,
}: {
	record: RecordView;
	onSaved: (record: RecordView) => void;
}) {
	const [hovered, setHovered] = useState<Focus | null>(null);
	const [selected, setSelected] = useState<Focus | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<{ error: boolean; text: string }>();
	const { row } = record;

	async function save(action: "approve" | "take-back") {
		if (!record.sha256) return;
		setBusy(true);
		setMessage(undefined);
		try {
			const response = await postSave(action, {
				id: record.id,
				sha256: record.sha256,
			});
			if (response.outcome === "refused")
				setMessage({ error: true, text: response.error });
			else {
				onSaved(response.record);
				setMessage(
					response.outcome === "conflict"
						? {
								error: true,
								text: `${response.error}; this is the record as it is now.`,
							}
						: {
								error: false,
								text:
									action === "approve"
										? "Approved through Segmentation."
										: "Approval taken back; the record is a Draft.",
							},
				);
			}
		} catch (failure) {
			setMessage({ error: true, text: (failure as Error).message });
		} finally {
			setBusy(false);
		}
	}

	const header = (
		<header className="flex flex-col gap-1.5">
			<h2 className="flex flex-wrap items-baseline gap-2">
				<span className="font-medium font-mono text-lg">{row.row}</span>
				<span className="font-mono text-ink-muted text-xs">
					{record.id}
				</span>
			</h2>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<Badge variant="secondary">{row.split}</Badge>
				<span className="text-ink-muted">
					{row.bucket} · {row.change}
				</span>
				{row.consistencySets.length > 0 && (
					<span className="text-ink-muted">
						sets {row.consistencySets.join(", ")}
					</span>
				)}
				{row.openQuestion && (
					<a
						className="text-link underline-offset-4 hover:underline"
						href={row.openQuestion.url}
						target="_blank"
						rel="noreferrer"
					>
						#{row.openQuestion.issue} Q{row.openQuestion.question}
					</a>
				)}
				{record.status === "readable" && (
					<DepthLabel
						reviewDepth={record.reviewDepth}
						validThrough={record.validThrough}
					/>
				)}
				<DirtyBadge dirty={record.dirty} />
			</div>
		</header>
	);

	if (record.status === "unreadable")
		return (
			<div className="flex max-w-3xl flex-col gap-6 p-8">
				{header}
				<p className="text-destructive text-sm">{record.problem}</p>
				<IssueList issues={record.recordIssues} />
			</div>
		);

	const focus = selected ?? hovered;
	return (
		<div className="flex max-w-3xl flex-col gap-6 p-8">
			{header}
			<Sentence
				segments={record.segments}
				units={record.units}
				noTarget={record.noTarget}
				hovered={hovered}
				selected={selected}
				onHover={setHovered}
				onSelect={(next) =>
					setSelected((current) =>
						sameFocus(current, next) ? null : next,
					)
				}
			/>
			<Section title={selected ? "Selected unit" : "Unit"}>
				<FocusDetails record={record} focus={focus} />
			</Section>
			<Section
				title={`Units (${record.units.length}) · coverage ${record.coverage}`}
			>
				<ul className="flex flex-wrap gap-1.5" aria-label="Units">
					{record.units.map((unit, index) => {
						const unitFocus: Focus = { kind: "unit", index };
						return (
							<li key={unit.memberSegmentIndices.join(",")}>
								<button
									type="button"
									data-unit-chip={index}
									onMouseEnter={() => setHovered(unitFocus)}
									onMouseLeave={() => setHovered(null)}
									onClick={() =>
										setSelected((current) =>
											sameFocus(current, unitFocus)
												? null
												: unitFocus,
										)
									}
									className={cn(
										"rounded-md border border-line px-2 py-1 text-start text-sm transition-colors hover:bg-raised/50",
										sameFocus(unitFocus, selected) &&
											"border-link bg-raised",
										sameFocus(unitFocus, hovered) &&
											"bg-raised/50",
									)}
								>
									{memberText(unit, record.segments)}{" "}
									<span className="text-ink-faint text-xs">
										{unit.route.kind}
									</span>
								</button>
							</li>
						);
					})}
					{record.noTarget.map((entry, index) => {
						const entryFocus: Focus = { kind: "noTarget", index };
						return (
							<li key={entry.memberSegmentIndices.join(",")}>
								<button
									type="button"
									data-no-target-chip={index}
									onMouseEnter={() => setHovered(entryFocus)}
									onMouseLeave={() => setHovered(null)}
									onClick={() =>
										setSelected((current) =>
											sameFocus(current, entryFocus)
												? null
												: entryFocus,
										)
									}
									className={cn(
										"rounded-md border border-line border-dashed px-2 py-1 text-start text-ink-muted text-sm transition-colors hover:bg-raised/50",
										sameFocus(entryFocus, selected) &&
											"border-link bg-raised",
										sameFocus(entryFocus, hovered) &&
											"bg-raised/50",
									)}
								>
									{memberText(entry, record.segments)}{" "}
									<span className="text-xs">No Target</span>
								</button>
							</li>
						);
					})}
				</ul>
			</Section>
			<Section title="Review">
				<div className="flex flex-wrap gap-6">
					<Action
						label="Approve Segmentation"
						action={record.approve}
						busy={busy}
						onRun={() => save("approve")}
					/>
					<Action
						label="Take back approval"
						action={record.takeBack}
						busy={busy}
						onRun={() => save("take-back")}
					/>
				</div>
				{message && (
					<p
						role="status"
						className={cn(
							"text-sm",
							message.error ? "text-destructive" : "text-link",
						)}
					>
						{message.text}
					</p>
				)}
			</Section>
			<Section
				title={`Segmentation issues (${record.segmentationIssues.length})`}
			>
				{record.segmentationIssues.length > 0 ? (
					<IssueList issues={record.segmentationIssues} />
				) : (
					<p className="text-ink-muted text-sm">None.</p>
				)}
			</Section>
			{record.recordIssues.length > 0 && (
				<Section
					title={`Record issues (${record.recordIssues.length})`}
				>
					<IssueList issues={record.recordIssues} />
				</Section>
			)}
			<Section
				title={`Deeper-layer issues (${record.deeperIssues.length})`}
			>
				<DeeperIssues issues={record.deeperIssues} />
			</Section>
			<Section title="Cited Rules">
				<RuleList rules={record.rules} />
			</Section>
		</div>
	);
}
