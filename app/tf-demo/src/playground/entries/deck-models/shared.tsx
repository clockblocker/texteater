import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

/* ------------------------------------------------------------------ log */

export type LogEntry = { readonly id: number; readonly text: string };

export function useEventLog() {
	const [entries, setEntries] = useState<readonly LogEntry[]>([]);
	const next = useRef(1);
	const log = useCallback((text: string) => {
		const id = next.current++;
		setEntries((current) => [...current.slice(-39), { id, text }]);
	}, []);
	const clear = useCallback(() => setEntries([]), []);
	return { entries, log, clear } as const;
}

/* ---------------------------------------------------------------- shell */

/**
 * One prototype: a Pane-shaped stage on the left, its rules and a live event
 * log on the right. Every model renders into the same frame so they compare.
 */
export function ModelShell({
	rules,
	entries,
	onReset,
	toolbar,
	children,
}: {
	rules: readonly { readonly move: string; readonly means: string }[];
	entries: readonly LogEntry[];
	onReset: () => void;
	/** Controls shown above the rules, e.g. a model's own switches. */
	toolbar?: ReactNode;
	children: ReactNode;
}) {
	const [rulesOpen, setRulesOpen] = useState(false);
	const logEnd = useRef<HTMLLIElement>(null);
	useEffect(() => {
		logEnd.current?.scrollIntoView({ block: "nearest" });
	}, [entries]);
	return (
		<div className="flex h-full min-h-0 gap-4 overflow-hidden p-4">
			<div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[0.7rem] border border-line bg-canvas">
				{children}
			</div>
			<aside className="flex min-h-0 w-72 shrink-0 flex-col gap-4 overflow-hidden">
				{toolbar ? (
					<section className="shrink-0 rounded-[0.7rem] border border-line bg-paper px-3 py-2">
						{toolbar}
					</section>
				) : null}
				{/* Folded by default: the rules are a reminder, not the work,
				    and folded away the column always fits the viewport. A
				    `details` cannot do this — Chrome wraps its content in a block
				    `::details-content`, which never shrinks as a flex item, so an
				    open rules list would spill past the aside instead of scrolling. */}
				<section
					className={`flex min-h-0 flex-col rounded-[0.7rem] border border-line bg-paper ${rulesOpen ? "flex-1 basis-0" : "shrink-0"}`}
				>
					<button
						type="button"
						aria-expanded={rulesOpen}
						onClick={() => setRulesOpen((open) => !open)}
						className="flex shrink-0 cursor-pointer items-center gap-1.5 p-3 text-left font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase hover:text-ink"
					>
						<span
							aria-hidden="true"
							className={`text-[0.7rem] leading-none transition-transform ${rulesOpen ? "rotate-90" : ""}`}
						>
							›
						</span>
						Closing rules
					</button>
					{rulesOpen ? (
						<dl className="grid min-h-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 overflow-auto px-3 pb-3 text-[0.8rem]">
							{rules.map((rule) => (
								<div key={rule.move} className="contents">
									<dt className="font-medium text-ink">
										{rule.move}
									</dt>
									<dd className="text-ink-soft">
										{rule.means}
									</dd>
								</div>
							))}
						</dl>
					) : null}
				</section>
				<section className="flex min-h-0 flex-1 basis-0 flex-col rounded-[0.7rem] border border-line bg-paper p-3">
					<div className="mb-2 flex items-baseline justify-between">
						<h3 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
							What happened
						</h3>
						<button
							type="button"
							onClick={onReset}
							className="text-[0.72rem] text-ink-soft underline-offset-2 hover:text-ink hover:underline"
						>
							Reset
						</button>
					</div>
					<ol className="min-h-0 flex-1 space-y-1 overflow-auto font-mono text-[0.7rem] leading-snug text-ink-soft">
						{entries.length === 0 ? (
							<li className="text-ink-muted">
								Select a word in the Text to deal a Deck.
							</li>
						) : null}
						{entries.map((entry) => (
							<li key={entry.id}>{entry.text}</li>
						))}
						<li ref={logEnd} aria-hidden="true" />
					</ol>
				</section>
			</aside>
		</div>
	);
}
