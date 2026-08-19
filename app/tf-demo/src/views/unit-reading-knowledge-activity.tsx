import { useMutation } from "convex/react";
import { CircleAlertIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { api } from "../../convex/_generated/api";
import type { UnitReadingNote } from "./unit-reading-note-view";

type KnowledgeState = UnitReadingNote["knowledgeState"];

export function KnowledgeActivity({
	note,
	visitorId,
}: {
	note: UnitReadingNote;
	visitorId: string;
}) {
	const retryKnowledge = useMutation(api.knowledgeGeneration.retry);
	const [isRetrying, setIsRetrying] = useState(false);
	const [retryError, setRetryError] = useState<string | null>(null);
	const attestationId = note.sourceContexts.page[0]?.attestationId;

	async function retry() {
		if (!attestationId || isRetrying) return;
		setIsRetrying(true);
		setRetryError(null);
		try {
			await retryKnowledge({
				attemptKey: crypto.randomUUID(),
				visitorId,
				readingId: note.target.readingId,
				attestationId,
			});
		} catch (cause) {
			setRetryError(
				cause instanceof Error
					? cause.message
					: "Knowledge retry failed.",
			);
		} finally {
			setIsRetrying(false);
		}
	}

	return (
		<KnowledgeActivityPresentation
			state={note.knowledgeState}
			canRetry={attestationId !== undefined}
			isRetrying={isRetrying}
			retryError={retryError}
			onRetry={() => void retry()}
		/>
	);
}

export function KnowledgeActivityPresentation({
	state,
	canRetry,
	isRetrying = false,
	retryError = null,
	onRetry,
}: {
	state: KnowledgeState;
	canRetry: boolean;
	isRetrying?: boolean;
	retryError?: string | null;
	onRetry?: () => void;
}) {
	const isLoading = state.activity === "Loading";
	const isFailed = state.activity === "Failed";
	const status =
		state.status === "Full"
			? "Knowledge ready"
			: state.status === "Partial"
				? "Partial knowledge"
				: "Knowledge pending";
	const activityMessage = isLoading
		? state.status === "Absent"
			? "Generating knowledge for this Reading…"
			: "Expanding the available knowledge for this Reading…"
		: isFailed
			? (state.failureMessage ?? "Knowledge generation failed.")
			: state.status === "Partial"
				? "Some requested knowledge is not available yet."
				: state.status === "Absent"
					? "Knowledge has not been generated yet."
					: null;

	return (
		<section
			className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3"
			aria-label="Knowledge status"
			aria-live="polite"
			aria-busy={isLoading || isRetrying}
		>
			<div className="flex flex-wrap items-center gap-2">
				{isLoading || isRetrying ? (
					<LoaderCircleIcon
						className="size-4 animate-spin"
						aria-hidden="true"
					/>
				) : isFailed ? (
					<CircleAlertIcon
						className="size-4 text-destructive"
						aria-hidden="true"
					/>
				) : null}
				<Badge variant={isFailed ? "destructive" : "secondary"}>
					{status}
				</Badge>
				{activityMessage ? (
					<p className="text-sm text-muted-foreground">
						{activityMessage}
					</p>
				) : null}
			</div>
			{isFailed ? (
				<div className="flex flex-wrap items-center gap-3">
					<button
						type="button"
						className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
						disabled={!canRetry || isRetrying}
						onClick={onRetry}
					>
						{isRetrying
							? "Retrying…"
							: "Retry knowledge generation"}
					</button>
					{!canRetry ? (
						<p className="text-xs text-muted-foreground">
							A source context is required before retrying.
						</p>
					) : null}
				</div>
			) : null}
			{retryError ? (
				<p className="text-sm text-destructive" role="alert">
					{retryError}
				</p>
			) : null}
		</section>
	);
}
