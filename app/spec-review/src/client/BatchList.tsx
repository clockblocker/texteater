import { Badge, cn } from "lego";
import type { BatchRowView } from "../shared/contract";
import { DepthLabel } from "./DepthLabel";

export function DirtyBadge({ dirty }: { dirty: boolean | null }) {
	if (dirty === null)
		return (
			<Badge variant="outline" title="Not in a git work tree">
				git?
			</Badge>
		);
	return dirty ? (
		<Badge variant="outline" title="git sees this file changed">
			modified
		</Badge>
	) : null;
}

/** The batch's rows, each with its record's state and why it is blocked. */
export function BatchList({
	rows,
	selected,
	onSelect,
}: {
	rows: readonly BatchRowView[];
	selected: string | undefined;
	onSelect: (row: string) => void;
}) {
	return (
		<ol className="min-h-0 flex-1 overflow-y-auto" aria-label="Batch rows">
			{rows.map((row) => (
				<li key={row.row}>
					<button
						type="button"
						data-row={row.row}
						aria-current={row.row === selected ? "true" : undefined}
						onClick={() => onSelect(row.row)}
						className={cn(
							"flex w-full flex-col gap-1 border-b border-line px-4 py-2.5 text-start transition-colors hover:bg-raised/50",
							row.row === selected && "bg-raised",
						)}
					>
						<span className="flex flex-wrap items-center gap-1.5 text-xs">
							<span className="w-9 font-medium font-mono text-ink">
								{row.row}
							</span>
							<Badge variant="secondary">{row.split}</Badge>
							<span className="text-ink-muted">{row.bucket}</span>
							<DepthLabel
								reviewDepth={row.reviewDepth}
								validThrough={row.validThrough}
							/>
							<DirtyBadge dirty={row.dirty} />
						</span>
						<span className="truncate text-ink-soft text-sm">
							{row.sentence ?? row.record}
						</span>
						{row.problem && (
							<span className="text-destructive text-xs">
								{row.problem}
							</span>
						)}
						{row.blocked && (
							<span
								className="text-ink-faint text-xs"
								data-blocked
							>
								{row.blocked}
							</span>
						)}
					</button>
				</li>
			))}
		</ol>
	);
}
