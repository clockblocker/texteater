import { LoaderCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
	ShadowNoteDefaultRenderer,
	ShadowNotePresentationCapabilities,
	ShadowNoteReferrer,
} from "../../shadow-note-render-context";

export const renderDefaultShadowNoteRelations = (({ note, capabilities }) => {
	const { references, cleanup } = capabilities;
	return (
		<section className="flex flex-col gap-3" aria-labelledby="referrers">
			<h2 id="referrers" className="text-sm font-medium">
				Referring Unit Reading Notes
			</h2>
			<ShadowReferenceList
				note={note}
				referrers={references.items}
				capabilities={capabilities}
			/>
			{references.hasMore ? (
				<button
					type="button"
					className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
					disabled={
						references.isLoading || references.loadMore === null
					}
					onClick={() => void references.loadMore?.()}
				>
					{references.isLoading ? (
						<LoaderCircleIcon className="size-4 animate-spin" />
					) : null}
					{references.isLoading ? "Loading…" : "Load more references"}
				</button>
			) : null}
			{references.error || cleanup.actionError ? (
				<p className="text-sm text-destructive" role="alert">
					{references.error ?? cleanup.actionError}
				</p>
			) : null}
			{cleanup.outcome ? (
				<p className="text-sm text-muted-foreground" role="status">
					{cleanup.outcome}
				</p>
			) : null}
		</section>
	);
}) satisfies ShadowNoteDefaultRenderer;

function ShadowReferenceList({
	note,
	referrers,
	capabilities,
}: {
	note: Parameters<ShadowNoteDefaultRenderer>[0]["note"];
	referrers: readonly ShadowNoteReferrer[];
	capabilities: ShadowNotePresentationCapabilities;
}) {
	const { cleanup } = capabilities;
	return (
		<ul className="grid gap-3">
			{referrers.map((referrer) => (
				<li
					key={referrer.reading.readingId}
					className="rounded-lg border bg-card p-4"
				>
					<button
						type="button"
						onClick={() =>
							capabilities.follow(referrer.reading.target)
						}
						className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						{referrer.reading.emojiDescription}{" "}
						{referrer.reading.canonicalForm}
					</button>
					{referrer.pendingRelations.map((reference) => (
						<section
							key={reference.locatorKey}
							className="mt-3 rounded-md border p-3"
							aria-label={`Pending ${reference.relation} reference`}
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<Badge variant="outline">
									{reference.relation}
								</Badge>
							</div>
							<p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
								{reference.locatorKey}
							</p>
							{note.inspection.candidates.length === 0 ? (
								<p className="mt-3 text-xs text-muted-foreground">
									No exact Lemma candidate is available.
								</p>
							) : (
								<div className="mt-3 flex flex-wrap gap-2">
									<button
										type="button"
										className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
										disabled={
											cleanup.activeLocator !== null ||
											cleanup.resolve === null
										}
										onClick={() =>
											void cleanup.resolve?.(
												reference.locatorKey,
											)
										}
									>
										{cleanup.activeLocator ===
										reference.locatorKey ? (
											<LoaderCircleIcon className="mr-1 inline size-3 animate-spin" />
										) : null}
										Resolve exact Lemma match
									</button>
								</div>
							)}
							{note.inspection.candidates.map((candidate) => (
								<div
									key={`details:${candidate.lemmaId}`}
									className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
								>
									<button
										type="button"
										onClick={() =>
											capabilities.follow(
												candidate.target,
											)
										}
										className="font-medium hover:text-foreground hover:underline"
									>
										Inspect {candidate.canonicalForm} ·{" "}
										{candidate.family}/{candidate.kind}
									</button>
									{candidate.coreFeatures.map((feature) => (
										<Badge
											key={`${feature.name}:${feature.value}`}
											variant="secondary"
										>
											{feature.name}: {feature.value}
										</Badge>
									))}
								</div>
							))}
						</section>
					))}
					{referrer.structuralReferences.map((reference) => (
						<section
							key={`${reference.aspect}:${reference.path}`}
							className="mt-3 rounded-md border border-dashed p-3"
						>
							<Badge variant="outline">
								{reference.aspect} · {reference.path}
							</Badge>
							<p className="mt-2 text-xs text-muted-foreground">
								Structural Shadow resolution is unavailable
								until Dumrel defines the resolved lexical
								replacement DTO.
							</p>
						</section>
					))}
				</li>
			))}
		</ul>
	);
}
