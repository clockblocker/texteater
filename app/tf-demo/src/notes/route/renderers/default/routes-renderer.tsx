import { LoaderCircleIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import type { NavigationTarget } from "@/lib/navigation";
import type {
	RouteNoteData,
	RouteNoteDefaultRenderer,
	RouteNotePresentationCapabilities,
} from "../../route-note-render-context";

export const renderDefaultRouteNoteRoutes = ((context) => (
	<>
		{renderRouteNoteBody(context.note, context.capabilities)}
		<RoutePagination capabilities={context.capabilities} />
	</>
)) satisfies RouteNoteDefaultRenderer;

function renderRouteNoteBody(
	note: RouteNoteData,
	capabilities: RouteNotePresentationCapabilities,
) {
	switch (note.routeKind) {
		case "Attestation":
			return (
				<AttestationRouteNote note={note} capabilities={capabilities} />
			);
		case "Surface":
			return <SurfaceRouteNote note={note} capabilities={capabilities} />;
		case "Lemma":
			return <LemmaRouteNote note={note} capabilities={capabilities} />;
	}
}

function RoutePagination({
	capabilities,
}: {
	capabilities: RouteNotePresentationCapabilities;
}) {
	const { pagination } = capabilities;
	if (!pagination.hasMore && pagination.error === null) return null;
	return (
		<div className="flex flex-col gap-2">
			{pagination.hasMore ? (
				<button
					type="button"
					className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
					disabled={
						pagination.isLoading || pagination.loadMore === null
					}
					onClick={() => void pagination.loadMore?.()}
				>
					{pagination.isLoading ? (
						<LoaderCircleIcon className="size-4 animate-spin" />
					) : null}
					{pagination.isLoading
						? "Loading…"
						: "Load more route connections"}
				</button>
			) : null}
			{pagination.error ? (
				<p className="text-sm text-destructive" role="alert">
					{pagination.error}
				</p>
			) : null}
		</div>
	);
}

function AttestationRouteNote({
	note,
	capabilities,
}: {
	note: Extract<RouteNoteData, { routeKind: "Attestation" }>;
	capabilities: RouteNotePresentationCapabilities;
}) {
	return (
		<article
			className="flex flex-col gap-5"
			aria-label="Attestation Route Note"
		>
			<RouteSection title="Source">
				<RouteLink
					target={note.source.target}
					capabilities={capabilities}
				>
					<p className="text-base leading-relaxed">
						{note.source.sentenceSnippet}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Sentence {note.source.sentencePosition + 1}
					</p>
				</RouteLink>
			</RouteSection>
			<RouteSection title="Ordered members">
				<ol className="grid gap-2">
					{note.members.map((member) => (
						<li
							key={member.segmentIndex}
							className="flex items-center gap-2"
						>
							<span>{member.attested}</span>
							<Badge variant="outline">
								{member.orthography}
							</Badge>
						</li>
					))}
				</ol>
				<Badge variant="secondary">{note.realizationCoverage}</Badge>
			</RouteSection>
			<RouteSection title="Resolution route">
				<div className="grid gap-2 sm:grid-cols-2">
					<RouteLink
						target={note.surface.target}
						capabilities={capabilities}
					>
						Surface · {note.surface.normalizedSurface}
					</RouteLink>
					<RouteLink
						target={note.reading.target}
						capabilities={capabilities}
					>
						Unit Reading · {note.reading.emojiDescription}{" "}
						{note.reading.canonicalForm}
					</RouteLink>
				</div>
			</RouteSection>
		</article>
	);
}

function SurfaceRouteNote({
	note,
	capabilities,
}: {
	note: Extract<RouteNoteData, { routeKind: "Surface" }>;
	capabilities: RouteNotePresentationCapabilities;
}) {
	return (
		<article
			className="flex flex-col gap-5"
			aria-label="Surface Route Note"
		>
			<div className="flex flex-wrap gap-2">
				<Badge variant="secondary">{note.language}</Badge>
				<Badge variant="outline">{note.spelling}</Badge>
				<Badge variant="outline">{note.surfaceKind}</Badge>
			</div>
			<FeatureList
				featureSets={[
					note.surfaceFeatures,
					note.inflectionalFeatures ?? {},
				]}
			/>
			<RouteSection title="Lemma">
				<RouteLink
					target={note.lemma.target}
					capabilities={capabilities}
				>
					{note.lemma.canonicalForm} · {note.lemma.family} ·{" "}
					{note.lemma.kind}
				</RouteLink>
			</RouteSection>
			<RouteSection title="Source occurrences">
				<RouteGrid
					items={note.connections.occurrences.map((occurrence) => ({
						key: occurrence.attestationId,
						target: occurrence.target,
						label: occurrence.sentenceSnippet,
						detail: occurrence.members.join(" · "),
					}))}
					empty="No surviving occurrences."
					capabilities={capabilities}
				/>
			</RouteSection>
			<RouteSection title="Same written form">
				<RouteGrid
					items={note.connections.sameWrittenForm.map(
						surfaceRouteItem,
					)}
					empty="No distinct same-written-form Surfaces."
					capabilities={capabilities}
				/>
			</RouteSection>
		</article>
	);
}

function LemmaRouteNote({
	note,
	capabilities,
}: {
	note: Extract<RouteNoteData, { routeKind: "Lemma" }>;
	capabilities: RouteNotePresentationCapabilities;
}) {
	return (
		<article className="flex flex-col gap-5" aria-label="Lemma Route Note">
			<div className="flex flex-wrap gap-2">
				<Badge variant="secondary">{note.language}</Badge>
				<Badge variant="outline">{note.family}</Badge>
				<Badge variant="outline">{note.lemmaKind}</Badge>
			</div>
			<FeatureList featureSets={[note.coreFeatures]} />
			<RouteSection title="Known Surfaces">
				<RouteGrid
					items={note.connections.surfaces.map(surfaceRouteItem)}
					empty="No known Surfaces."
					capabilities={capabilities}
				/>
			</RouteSection>
			<RouteSection title="Unit Readings">
				<RouteGrid
					items={note.connections.readings.map((reading) => ({
						key: reading.readingId,
						target: reading.target,
						label: `${reading.emojiDescription} ${note.canonicalForm}`,
					}))}
					empty="No Unit Readings for this Lemma."
					capabilities={capabilities}
				/>
			</RouteSection>
			<RouteSection title="Same written form">
				<RouteGrid
					items={note.connections.sameWrittenForm.map((lemma) => ({
						key: lemma.lemmaId,
						target: lemma.target,
						label: lemma.canonicalForm,
						detail: `${lemma.family} · ${lemma.kind}`,
					}))}
					empty="No distinct same-form Lemmas."
					capabilities={capabilities}
				/>
			</RouteSection>
		</article>
	);
}

function RouteSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
			<h2 className="text-sm font-medium">{title}</h2>
			{children}
		</section>
	);
}

function RouteLink({
	target,
	children,
	capabilities,
}: {
	target: NavigationTarget;
	children: React.ReactNode;
	capabilities: RouteNotePresentationCapabilities;
}) {
	return (
		<Link
			to={capabilities.hrefFor(target)}
			className="block rounded-lg border bg-background px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
		>
			{children}
		</Link>
	);
}

function RouteGrid({
	items,
	empty,
	capabilities,
}: {
	items: readonly {
		key: string;
		target: NavigationTarget;
		label: string;
		detail?: string;
	}[];
	empty: string;
	capabilities: RouteNotePresentationCapabilities;
}) {
	if (items.length === 0) {
		return <p className="text-sm text-muted-foreground">{empty}</p>;
	}
	return (
		<ul className="grid gap-2 sm:grid-cols-2">
			{items.map((item) => (
				<li key={item.key}>
					<RouteLink target={item.target} capabilities={capabilities}>
						<p className="font-medium">{item.label}</p>
						{item.detail ? (
							<p className="mt-1 text-xs text-muted-foreground">
								{item.detail}
							</p>
						) : null}
					</RouteLink>
				</li>
			))}
		</ul>
	);
}

function FeatureList({
	featureSets,
}: {
	featureSets: readonly Readonly<
		Record<string, string | readonly string[] | null>
	>[];
}) {
	const features = featureSets.flatMap((featureSet) =>
		Object.entries(featureSet).map(([name, value]) => ({
			name,
			value:
				value === null
					? "—"
					: Array.isArray(value)
						? value.join(", ")
						: value,
		})),
	);
	if (features.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2">
			{features.map((feature) => (
				<Badge key={feature.name} variant="outline">
					{feature.name}: {feature.value}
				</Badge>
			))}
		</div>
	);
}

function surfaceRouteItem(surface: {
	surfaceId: string;
	normalizedSurface: string;
	canonicalForm: string;
	family: string;
	kind: string;
	target: NavigationTarget;
}) {
	return {
		key: surface.surfaceId,
		target: surface.target,
		label: surface.normalizedSurface,
		detail: `${surface.canonicalForm} · ${surface.family} · ${surface.kind}`,
	};
}
