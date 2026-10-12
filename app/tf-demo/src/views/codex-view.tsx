import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardContent, Skeleton } from "lego";
import { BookOpenIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { visitorErrorMessage } from "@/lib/visitor-error";
import { NotFoundView } from "@/views/not-found-view";
import { GROUND_COLUMN_STYLE } from "@/workspace/compass/pane-chrome";
import {
	useGroundPlace,
	useWorkspaceInteraction,
} from "@/workspace/workspace-controller";
import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import { api } from "../../convex/_generated/api";
import type { SectionTarget } from "../../shared/navigation";
import { type CodexEntry, CodexEntryList, entryTarget } from "./codex-entries";

/**
 * A Section's Codex: its Sections and Scrolls in order, each with the
 * Learner's status, and the last one read under it to continue from. On a
 * Rooted Ground a pick is the line's next rung, so ← comes back here;
 * anywhere else it opens as a Cover.
 */
export function CodexView({ target }: { target: SectionTarget }) {
	const visitorId = useAnonymousVisitorId();
	const { follow } = useWorkspaceInteraction();
	const place = useGroundPlace();
	const codexQuery = useQuery(
		convexQuery(api.library.codex, {
			sectionId: target.sectionId,
			visitorId,
		}),
	);

	/** Up the line through `to` from this Section, or a Cover of its last. */
	function open(to: readonly WorkspaceTarget[]) {
		const last = to.at(-1);
		if (!last) return;
		if (place.line) place.walk(place.line.length, to);
		else follow(last);
	}

	if (codexQuery.isPending) return <CodexSkeleton />;
	const codex = codexQuery.data;
	if (!codex) {
		return (
			<NotFoundView
				title="Not found"
				description={
					codexQuery.error
						? visitorErrorMessage(codexQuery.error)
						: "This does not exist, or it was removed from the demo."
				}
			/>
		);
	}
	const lastRead = codex.lastRead;

	return (
		<CodexColumn>
			<header className="flex flex-col gap-3">
				<h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
					{codex.title}
				</h1>
				{lastRead && codex.status !== "Done" ? (
					<div>
						<Button
							type="button"
							variant="secondary"
							onClick={() =>
								open([
									...lastRead.sections.map(
										({ sectionId, title }) => ({
											kind: "Section" as const,
											sectionId,
											title,
										}),
									),
									{
										kind: "Scroll",
										scrollId: lastRead.scrollId,
										title: lastRead.title,
									},
								])
							}
						>
							<BookOpenIcon data-icon="inline-start" />
							Continue: {lastRead.title}
						</Button>
					</div>
				) : null}
			</header>
			{codex.entries.length > 0 ? (
				<CodexEntryList
					entries={codex.entries}
					onOpen={(entry: CodexEntry) => open([entryTarget(entry)])}
				/>
			) : (
				<Card size="sm">
					<CardContent className="py-3 text-ink-muted">
						<p className="text-pretty">Nothing here yet.</p>
					</CardContent>
				</Card>
			)}
		</CodexColumn>
	);
}

function CodexColumn({ children }: { children: ReactNode }) {
	return (
		<div
			data-slot="codex"
			className="w-full min-h-full flex-auto bg-muted/30"
		>
			<div
				className="mx-auto flex w-full flex-col gap-6 pt-14 pb-24 @max-md:pt-8"
				style={GROUND_COLUMN_STYLE}
			>
				{children}
			</div>
		</div>
	);
}

function CodexSkeleton() {
	return (
		<CodexColumn>
			<div
				className="grid gap-3"
				role="status"
				aria-label="Loading contents"
			>
				<Skeleton className="h-8 w-3/5" />
				{[0, 1, 2].map((index) => (
					<Card key={index} size="sm">
						<CardContent className="flex flex-col gap-3">
							<Skeleton className="h-5 w-4/5" />
							<Skeleton className="h-4 w-2/5" />
						</CardContent>
					</Card>
				))}
			</div>
		</CodexColumn>
	);
}
