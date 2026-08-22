import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { hrefFor, type ResolutionTarget } from "@/lib/navigation";
import { NotFoundView } from "@/views/not-found-view";
import { api } from "../../convex/_generated/api";
import type { ResolutionNote } from "../../convex/model/resolutionSessions";

const stagePosition = {
	Starting: 0,
	RouteAvailable: 1,
	GrammarAvailable: 2,
	ReadingAvailable: 3,
	Committing: 4,
	Complete: 5,
	Unresolved: 5,
	Failed: 5,
} as const;

export function ResolutionNoteView({ target }: { target: ResolutionTarget }) {
	const navigate = useNavigate();
	const noteQuery = useQuery({
		...convexQuery(api.resolutionSessions.getResolutionNote, {
			requestId: target.requestId,
		}),
		gcTime: 10_000,
	});
	const note: ResolutionNote | null = noteQuery.data ?? null;

	useEffect(() => {
		const command = completionNavigation(note);
		if (!command) return;
		navigate(command.href, command.options);
	}, [navigate, note?.terminal]);

	if (noteQuery.isPending) return <ResolutionNoteSkeleton />;
	if (!note) {
		return (
			<NotFoundView
				title="Resolution not found"
				description="This Resolution Session does not exist or is no longer active."
			/>
		);
	}
	return <ResolutionNoteFrame note={note} />;
}

export function completionTarget(note: ResolutionNote | null) {
	return note?.terminal?.kind === "Complete" ? note.terminal.target : null;
}

export function completionNavigation(note: ResolutionNote | null) {
	const target = completionTarget(note);
	return target
		? { href: hrefFor(target), options: { replace: true as const } }
		: null;
}

export function ResolutionNoteFrame({ note }: { note: ResolutionNote }) {
	const position = stagePosition[note.stage];
	const isWorking = position < stagePosition.Complete;
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header>
					<div className="flex flex-col gap-3">
						<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							{note.reading
								? `${note.reading.emojiDescription} ${note.reading.canonicalForm}`
								: (note.grammar?.canonicalForm ??
									note.route.selectedSegment)}
						</h1>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">
								{stageLabel(note.stage)}
							</Badge>
							{isWorking ? (
								<LoaderCircleIcon
									className="size-4 animate-spin text-muted-foreground"
									aria-label="Resolution in progress"
								/>
							) : null}
						</div>
					</div>
				</header>

				<article
					className="flex flex-col gap-5"
					aria-label="Resolution note"
				>
					<ResolutionSection title="Source" available={position >= 1}>
						<p className="text-base leading-relaxed">
							{note.route.stitchedText}
						</p>
					</ResolutionSection>

					<ResolutionSection
						title="Grammar"
						available={Boolean(note.grammar)}
					>
						{note.grammar ? (
							<div className="flex flex-col gap-2">
								<p className="font-medium">
									{note.grammar.normalizedSurface} →{" "}
									{note.grammar.canonicalForm}
								</p>
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">
										{note.grammar.family}
									</Badge>
									<Badge variant="outline">
										{note.grammar.kind}
									</Badge>
									<Badge variant="outline">
										{note.grammar.realizationCoverage}
									</Badge>
								</div>
							</div>
						) : null}
					</ResolutionSection>

					<ResolutionSection
						title="Reading"
						available={Boolean(note.reading)}
					>
						{note.reading ? (
							<p className="text-lg font-medium">
								{note.reading.emojiDescription}{" "}
								{note.reading.canonicalForm}
							</p>
						) : null}
					</ResolutionSection>

					{note.terminal?.kind === "Unresolved" ? (
						<p
							className="text-sm text-muted-foreground"
							role="status"
						>
							This Segment could not be resolved. This Resolution
							URL remains available.
						</p>
					) : note.terminal?.kind === "Failed" ? (
						<p className="text-sm text-destructive" role="alert">
							{note.terminal.message}
						</p>
					) : null}
				</article>
			</div>
		</div>
	);
}

function ResolutionSection({
	title,
	available,
	children,
}: {
	title: string;
	available: boolean;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-xl border bg-card p-4" aria-label={title}>
			<h2 className="mb-3 text-sm font-medium">{title}</h2>
			{available ? children : <Skeleton className="h-6 w-3/5" />}
		</section>
	);
}

function ResolutionNoteSkeleton() {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-5"
				role="status"
			>
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-24 w-full" />
			</div>
		</div>
	);
}

function stageLabel(stage: ResolutionNote["stage"]): string {
	return stage.replace(/([a-z])([A-Z])/g, "$1 $2");
}
