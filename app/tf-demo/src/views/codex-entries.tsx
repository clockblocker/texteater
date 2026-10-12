import type { FunctionReturnType } from "convex/server";
import { ArrowRightIcon, FolderIcon } from "lucide-react";
import type { api } from "../../convex/_generated/api";
import type { ScrollTarget, SectionTarget } from "../../shared/navigation";

/** One Section or Scroll as the Library and a Codex list it. */
export type CodexEntry = FunctionReturnType<typeof api.library.list>[number];

type ReadingStatus = CodexEntry["status"];

const STATUS_LABEL: Readonly<Record<ReadingStatus, string>> = {
	NotStarted: "Not started",
	InProgress: "In progress",
	Done: "Done",
};

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
});

/** What opening an entry puts on the Ground: a Section's Codex, or a Scroll. */
export function entryTarget(entry: CodexEntry): SectionTarget | ScrollTarget {
	return entry.kind === "Section"
		? { kind: "Section", sectionId: entry.sectionId, title: entry.title }
		: { kind: "Scroll", scrollId: entry.scrollId, title: entry.title };
}

function entryKey(entry: CodexEntry): string {
	return entry.kind === "Section" ? entry.sectionId : entry.scrollId;
}

/**
 * Sections and Scrolls in the order given, each marked not started, in
 * progress or done. `dated` adds when a Scroll was added, as the Library
 * shows its loose ones.
 */
export function CodexEntryList({
	entries,
	onOpen,
	dated = false,
}: {
	readonly entries: readonly CodexEntry[];
	readonly onOpen: (entry: CodexEntry) => void;
	readonly dated?: boolean;
}) {
	return (
		<ul className="grid gap-3">
			{entries.map((entry) => (
				<li key={entryKey(entry)}>
					<button
						type="button"
						data-codex-entry={entry.kind}
						data-status={entry.status}
						onClick={() => onOpen(entry)}
						className="group w-full rounded-xl bg-card p-4 text-start text-card-foreground ring-1 ring-foreground/10 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]"
					>
						<div className="flex items-start justify-between gap-4">
							<div className="flex min-w-0 flex-col gap-2">
								<p className="flex items-start gap-2 text-base leading-relaxed font-medium">
									{entry.kind === "Section" ? (
										<FolderIcon
											className="mt-1 size-4 shrink-0 text-ink-muted"
											aria-hidden="true"
										/>
									) : null}
									<span className="line-clamp-3">
										{entry.kind === "Section"
											? entry.title
											: entry.preview}
									</span>
								</p>
								<p className="text-xs text-ink-muted tabular-nums">
									<span data-slot="reading-status">
										{STATUS_LABEL[entry.status]}
									</span>
									{dated && entry.kind === "Scroll"
										? ` · Added ${shortDateFormatter.format(entry.createdAt)}`
										: null}
								</p>
							</div>
							<ArrowRightIcon
								className="mt-1 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
								aria-hidden="true"
							/>
						</div>
					</button>
				</li>
			))}
		</ul>
	);
}
