import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
	ReadingBlockKind,
	SerializedReadingBlockLayout,
} from "../../shared/reading-block-layout";

const READING_BLOCK_LABELS: Readonly<Record<ReadingBlockKind, string>> = {
	Header: "Header",
	SourceContexts: "Source contexts",
	Definition: "Definition",
	Translations: "Translations",
	Relations: "Relations",
	MorphologicalTree: "Morphological tree",
	LexicalBreakdown: "Lexical breakdown",
};

type ReadingBlockLayoutEditorProps = {
	readonly layout: SerializedReadingBlockLayout;
	readonly onOrderChange: (
		order: readonly ReadingBlockKind[],
	) => Promise<SerializedReadingBlockLayout>;
	readonly onVisibilityChange: (
		blockKind: ReadingBlockKind,
		visible: boolean,
	) => Promise<SerializedReadingBlockLayout>;
	readonly className?: string;
};

export function ReadingBlockLayoutEditor({
	layout,
	onOrderChange,
	onVisibilityChange,
	className,
}: ReadingBlockLayoutEditorProps) {
	const [confirmedLayout, setConfirmedLayout] = useState(layout);
	const [pendingChange, setPendingChange] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setConfirmedLayout(layout);
	}, [layout]);

	async function move(blockKind: ReadingBlockKind, offset: -1 | 1) {
		const nextOrder = moveReadingBlock(
			confirmedLayout.order,
			blockKind,
			offset,
		);
		if (nextOrder === confirmedLayout.order) return;
		await save(`Reordering ${readingBlockLabel(blockKind)}`, () =>
			onOrderChange(nextOrder),
		);
	}

	async function setVisible(blockKind: ReadingBlockKind, visible: boolean) {
		await save(
			`${visible ? "Showing" : "Hiding"} ${readingBlockLabel(blockKind)}`,
			() => onVisibilityChange(blockKind, visible),
		);
	}

	async function save(
		pendingLabel: string,
		change: () => Promise<SerializedReadingBlockLayout>,
	) {
		setPendingChange(pendingLabel);
		setError(null);
		try {
			setConfirmedLayout(await change());
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Reading layout update failed.",
			);
		} finally {
			setPendingChange(null);
		}
	}

	const hidden = new Set(confirmedLayout.hidden);
	const disabled = pendingChange !== null;

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<ol
				className="relative flex flex-col before:absolute before:top-5 before:bottom-5 before:left-[1.125rem] before:w-px before:bg-border"
				aria-label="Reading Block order"
				aria-busy={disabled}
			>
				{confirmedLayout.order.map((blockKind, index) => {
					const label = readingBlockLabel(blockKind);
					const isVisible = !hidden.has(blockKind);
					return (
						<li
							key={blockKind}
							className="relative grid min-h-11 grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] items-center gap-2 border-b py-1.5 last:border-b-0"
						>
							<span
								className="relative z-10 flex size-9 items-center justify-center rounded-full border bg-background font-mono text-xs font-medium tabular-nums text-muted-foreground"
								aria-hidden="true"
							>
								{String(index + 1).padStart(2, "0")}
							</span>
							<span
								className={cn(
									"min-w-0 text-sm font-medium",
									!isVisible && "text-muted-foreground",
								)}
							>
								{label}
								{!isVisible ? (
									<span className="ml-2 text-xs font-normal text-muted-foreground">
										Hidden
									</span>
								) : null}
							</span>
							<div className="flex items-center gap-0.5">
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={disabled || index === 0}
									onClick={() => void move(blockKind, -1)}
									aria-label={`Move ${label} up`}
									title={`Move ${label} up`}
								>
									<ChevronUpIcon />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={
										disabled ||
										index ===
											confirmedLayout.order.length - 1
									}
									onClick={() => void move(blockKind, 1)}
									aria-label={`Move ${label} down`}
									title={`Move ${label} down`}
								>
									<ChevronDownIcon />
								</Button>
							</div>
							<Switch
								size="sm"
								checked={isVisible}
								disabled={disabled}
								onCheckedChange={(visible) =>
									void setVisible(blockKind, visible)
								}
								aria-label={`Show ${label}`}
							/>
						</li>
					);
				})}
			</ol>
			<p className="sr-only" aria-live="polite">
				{pendingChange ? `${pendingChange}. Saving.` : ""}
			</p>
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}

export function moveReadingBlock(
	order: readonly ReadingBlockKind[],
	blockKind: ReadingBlockKind,
	offset: -1 | 1,
): readonly ReadingBlockKind[] {
	const fromIndex = order.indexOf(blockKind);
	const toIndex = fromIndex + offset;
	if (fromIndex < 0 || toIndex < 0 || toIndex >= order.length) return order;

	const nextOrder = [...order];
	[nextOrder[fromIndex], nextOrder[toIndex]] = [
		nextOrder[toIndex],
		nextOrder[fromIndex],
	];
	return nextOrder;
}

function readingBlockLabel(blockKind: ReadingBlockKind): string {
	return READING_BLOCK_LABELS[blockKind];
}
