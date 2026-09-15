import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { Skeleton } from "lego";
import { type ReactNode, useMemo } from "react";

import {
	renderApplicationSubject,
	renderCardTail,
} from "@/views/subject-presentation";
import type {
	ResolutionStepKind,
	WorkspaceSubject,
	WorkspaceTarget,
} from "@/workspace/sheet-workspace";
import {
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "@/workspace/workspace-controller";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { EntryRoute } from "../playground-router";
import { CardFrame, SheetFrame, Stage } from "./frames";

type PlaygroundCatalog = FunctionReturnType<
	typeof api.notesStudyFixtures.playground
>;

/**
 * One Note at a time, shown in both forms. Following any link inside a Note
 * replaces the shown Note, so the route from an Attestation up to its Reading
 * can be walked exactly as the deck would walk it.
 *
 * The shown Note is the route: `/playground/notes/<kind>/<id>`, so every step
 * of that walk is a history entry and can be reloaded or linked to.
 */
export function NotesGallery({ route }: { readonly route: EntryRoute }) {
	const catalog = useQuery({
		...convexQuery(api.notesStudyFixtures.playground, {}),
		gcTime: 10_000,
	});
	const target = useMemo(
		() => targetFromSegments(route.segments),
		[route.segments],
	);
	const setTarget = route.setSegments;
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (next) => setTarget(segmentsFromTarget(next)),
			presentCards: () => {},
			reconcile: () => {},
		}),
		[setTarget],
	);

	if (catalog.isPending) {
		return (
			<div className="p-6" role="status" aria-label="Loading fake db">
				<Skeleton className="h-6 w-64" />
			</div>
		);
	}
	if (catalog.isError || !catalog.data) {
		return (
			<p className="p-6 text-sm text-destructive" role="alert">
				The Notes Study fake db could not be read. Run{" "}
				<code className="font-mono">bun run load:notes-study</code> and
				reload.
			</p>
		);
	}
	if (catalog.data.entries.length === 0) {
		return (
			<p className="p-6 text-sm text-ink-soft">
				The fake db is empty. Run{" "}
				<code className="font-mono">bun run load:notes-study</code> and
				reload.
			</p>
		);
	}

	const subject = target ? subjectFor(target) : null;
	return (
		<div className="flex h-full min-h-0">
			<Catalog
				catalog={catalog.data}
				target={target}
				onSelect={(next) => setTarget(segmentsFromTarget(next))}
			/>
			<div className="min-w-0 flex-1 overflow-auto p-6">
				{subject ? (
					<WorkspaceInteractionProvider interaction={interaction}>
						<div className="flex flex-wrap items-start gap-8">
							<Stage label="Card">
								<CardFrame tail={renderCardTail(subject)}>
									{renderApplicationSubject(subject, "Card", {
										visitorId: catalog.data.visitorId,
									})}
								</CardFrame>
							</Stage>
							<Stage label="Sheet" className="min-w-0 flex-1">
								<SheetFrame>
									{renderApplicationSubject(
										subject,
										"Sheet",
										{
											visitorId: catalog.data.visitorId,
										},
									)}
								</SheetFrame>
							</Stage>
						</div>
					</WorkspaceInteractionProvider>
				) : (
					<p className="text-sm text-ink-muted">
						Pick a Note on the left.
					</p>
				)}
			</div>
		</div>
	);
}

/** `["lemma", id]` and friends. Ids are trusted: this is a dev-only surface. */
function targetFromSegments(
	segments: readonly string[],
): WorkspaceTarget | null {
	const [kind, id, step] = segments;
	if (!kind || !id) return null;
	switch (kind) {
		case "attestation":
			return {
				kind: "Attestation",
				attestationId: id as Id<"attestations">,
			};
		case "surface":
			return { kind: "Surface", language: "de", normalizedSurface: id };
		case "lemma":
			return { kind: "Lemma", lemmaId: id as Id<"lemmas"> };
		case "reading":
			return { kind: "Reading", readingId: id };
		case "shadow":
			return { kind: "Shadow", shadowId: id };
		case "text":
			return { kind: "Text", textId: id };
		case "resolution":
			return step
				? {
						kind: "ResolutionStep",
						requestId: id,
						stepKind: step as ResolutionStepKind,
					}
				: { kind: "Resolution", requestId: id };
		default:
			return null;
	}
}

function segmentsFromTarget(target: WorkspaceTarget): readonly string[] {
	switch (target.kind) {
		case "Attestation":
			return ["attestation", target.attestationId];
		case "Surface":
			return ["surface", target.normalizedSurface];
		case "Lemma":
			return ["lemma", target.lemmaId];
		case "Reading":
			return ["reading", target.readingId];
		case "Shadow":
			return ["shadow", target.shadowId];
		case "Text":
			return ["text", target.textId];
		case "Resolution":
			return ["resolution", target.requestId];
		case "ResolutionStep":
			return ["resolution", target.requestId, target.stepKind];
	}
}

function subjectFor(target: WorkspaceTarget): WorkspaceSubject {
	return target.kind === "Text"
		? { kind: "Text", target }
		: ({ kind: "Note", target } as WorkspaceSubject);
}

function Catalog({
	catalog,
	target,
	onSelect,
}: {
	catalog: PlaygroundCatalog;
	target: WorkspaceTarget | null;
	onSelect: (target: WorkspaceTarget) => void;
}) {
	return (
		<nav
			aria-label="Fake db"
			className="w-64 shrink-0 overflow-auto border-r border-line py-4 text-sm"
		>
			<CatalogGroup label="Units">
				{catalog.entries.map((entry) => (
					<li
						key={entry.readingKey}
						className="grid gap-0.5 px-4 py-1.5"
					>
						<span className="truncate text-ink">
							<span className="me-1.5">
								{entry.emojiDescription}
							</span>
							{entry.canonicalForm}
							<span className="ms-2 text-xs text-ink-muted">
								{entry.kind}
							</span>
						</span>
						<div className="flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-[0.68rem] tracking-[0.06em] uppercase">
							{entry.attestationId ? (
								<TargetChip
									active={isTarget(target, {
										kind: "Attestation",
										attestationId: entry.attestationId,
									})}
									onClick={() =>
										entry.attestationId &&
										onSelect({
											kind: "Attestation",
											attestationId: entry.attestationId,
										})
									}
								>
									Attest
								</TargetChip>
							) : null}
							<TargetChip
								active={isTarget(target, {
									kind: "Surface",
									language: "de",
									normalizedSurface: entry.normalizedSurface,
								})}
								onClick={() =>
									onSelect({
										kind: "Surface",
										language: "de",
										normalizedSurface:
											entry.normalizedSurface,
									})
								}
							>
								Surface
							</TargetChip>
							<TargetChip
								active={isTarget(target, {
									kind: "Lemma",
									lemmaId: entry.lemmaId,
								})}
								onClick={() =>
									onSelect({
										kind: "Lemma",
										lemmaId: entry.lemmaId,
									})
								}
							>
								Lemma
							</TargetChip>
							<TargetChip
								active={isTarget(target, {
									kind: "Reading",
									readingId: entry.readingId,
								})}
								onClick={() =>
									onSelect({
										kind: "Reading",
										readingId: entry.readingId,
									})
								}
							>
								Reading
							</TargetChip>
						</div>
					</li>
				))}
			</CatalogGroup>
			{catalog.shadows.length > 0 ? (
				<CatalogGroup label="Shadows">
					{catalog.shadows.map((shadow) => (
						<li key={shadow.shadowId} className="px-4 py-1">
							<TargetChip
								active={isTarget(target, {
									kind: "Shadow",
									shadowId: shadow.shadowId,
								})}
								onClick={() =>
									onSelect({
										kind: "Shadow",
										shadowId: shadow.shadowId,
									})
								}
								className="font-sans text-sm tracking-normal normal-case"
							>
								{shadow.canonicalForm}
							</TargetChip>
						</li>
					))}
				</CatalogGroup>
			) : null}
		</nav>
	);
}

function CatalogGroup({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<section className="mb-4">
			<h2 className="px-4 pb-1 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
				{label}
			</h2>
			<ul>{children}</ul>
		</section>
	);
}

function TargetChip({
	active,
	className = "",
	...props
}: React.ComponentProps<"button"> & { active: boolean }) {
	return (
		<button
			type="button"
			aria-current={active ? "true" : undefined}
			className={`cursor-pointer rounded-sm text-ink-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=true]:text-primary aria-[current=true]:underline aria-[current=true]:underline-offset-4 ${className}`}
			{...props}
		/>
	);
}

function isTarget(current: WorkspaceTarget | null, candidate: WorkspaceTarget) {
	return (
		current !== null &&
		JSON.stringify(current) === JSON.stringify(candidate)
	);
}
