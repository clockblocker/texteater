import type { LemmaKindFor } from "dumling/types";
import { LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UnitReadingFamilyFor } from "../reading";
import type {
	SurfaceAnalysis,
	SurfaceAnalysisDescriptionRenderer,
	SurfaceAnalysisDescriptionRendererRegistry,
	SurfaceAnalysisFor,
	SurfaceNoteBlockRenderer,
} from "./surface-note-render-context";

export const renderDefaultSurfaceNoteHeader = (({ noteData }) => (
	<section
		className="flex flex-col gap-2"
		aria-labelledby="surface-note-title"
	>
		<p className="text-sm font-medium text-muted-foreground">
			Surface Note
		</p>
		<h1
			id="surface-note-title"
			className="text-2xl font-semibold tracking-tight sm:text-3xl"
		>
			{noteData.target.normalizedSurface}
		</h1>
	</section>
)) satisfies SurfaceNoteBlockRenderer<"de">;

export const renderDefaultSurfaceNoteRoutes = (({
	noteData,
	PresentationCapabilities,
}) => {
	const activeKey = PresentationCapabilities.activeAnalysisKey;
	const presentation = PresentationCapabilities.presentation ?? "Sheet";
	const active = noteData.analyses.find(
		(analysis) => analysis.analysisKey === activeKey,
	);
	if (presentation === "Card") {
		return (
			<>
				{active ? (
					<footer
						className="rounded-xl border bg-card p-4"
						data-active-surface-analysis={active.analysisKey}
					>
						<p className="text-xs font-medium text-muted-foreground">
							Active analysis
						</p>
						{renderSurfaceAnalysisDescription(active)}
					</footer>
				) : null}
				{active ? null : (
					<SurfaceAnalysisPagination
						capabilities={PresentationCapabilities}
					/>
				)}
			</>
		);
	}
	return (
		<section className="flex flex-col gap-3" aria-label="Surface analyses">
			{noteData.analyses.map((analysis) => {
				const isActive = analysis.analysisKey === activeKey;
				return (
					<article
						key={analysis.analysisKey}
						className="rounded-xl border bg-card p-4"
						data-surface-analysis={analysis.analysisKey}
						data-active={isActive ? "true" : undefined}
						aria-current={isActive ? "true" : undefined}
					>
						{isActive ? (
							<Badge variant="secondary">Active analysis</Badge>
						) : null}
						{renderSurfaceAnalysisDescription(analysis)}
						<button
							type="button"
							className="mt-3 font-medium hover:underline"
							onClick={() =>
								PresentationCapabilities.follow(
									analysis.lemmaTarget,
								)
							}
						>
							Inspect Lemma
						</button>
					</article>
				);
			})}
			<SurfaceAnalysisPagination
				capabilities={PresentationCapabilities}
			/>
		</section>
	);
}) satisfies SurfaceNoteBlockRenderer<"de">;

function SurfaceAnalysisPagination({
	capabilities,
}: {
	capabilities: import("./surface-note-render-context").SurfaceNotePresentationCapabilities;
}) {
	const pagination = capabilities.pagination ?? {
		hasMore: false,
		isLoading: false,
		error: null,
		loadMore: null,
	};
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
					{pagination.isLoading ? "Loading…" : "Load more analyses"}
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

function renderSurfaceAnalysisDescription(analysis: SurfaceAnalysisFor<"de">) {
	const familyRegistry = DE_SURFACE_ANALYSIS_DESCRIPTION_RENDERER_REGISTRY[
		analysis.presented.lemma.family
	] as Readonly<Record<string, unknown>> | undefined;
	const renderer = familyRegistry?.[analysis.presented.lemma.kind];
	if (typeof renderer !== "function") {
		throw new Error(
			`Unsupported Surface analysis route: de/${analysis.presented.lemma.family}/${analysis.presented.lemma.kind}.`,
		);
	}
	return (
		renderer as unknown as (
			value: SurfaceAnalysisFor<"de">,
		) => ReturnType<
			SurfaceAnalysisDescriptionRenderer<"de", "Lexeme", "NOUN">
		>
	)(analysis);
}

export function renderDefaultSurfaceAnalysisDescription<
	F extends UnitReadingFamilyFor<"de">,
	K extends LemmaKindFor<"de", F>,
>(analysis: SurfaceAnalysis<"de", F, K>) {
	const { presented } = analysis;
	const features = Object.entries(presented.inflectionalFeatures).flatMap(
		([name, value]) =>
			value === null
				? []
				: [
						`${name}: ${Array.isArray(value) ? value.join(", ") : value}`,
					],
	);
	return (
		<div className="mt-2 flex flex-col gap-2">
			<p className="font-medium">
				{presented.lemma.canonicalForm} · {presented.lemma.family} ·{" "}
				{presented.lemma.kind}
			</p>
			{features.length > 0 ? (
				<p className="text-sm text-muted-foreground">
					{features.join(" · ")}
				</p>
			) : null}
		</div>
	);
}

const DEFAULT_ANALYSIS_DESCRIPTION = renderDefaultSurfaceAnalysisDescription;

export const DE_SURFACE_ANALYSIS_DESCRIPTION_RENDERER_REGISTRY = {
	Lexeme: {
		ADJ: DEFAULT_ANALYSIS_DESCRIPTION,
		ADP: DEFAULT_ANALYSIS_DESCRIPTION,
		ADV: DEFAULT_ANALYSIS_DESCRIPTION,
		AUX: DEFAULT_ANALYSIS_DESCRIPTION,
		CCONJ: DEFAULT_ANALYSIS_DESCRIPTION,
		DET: DEFAULT_ANALYSIS_DESCRIPTION,
		INTJ: DEFAULT_ANALYSIS_DESCRIPTION,
		NOUN: DEFAULT_ANALYSIS_DESCRIPTION,
		NUM: DEFAULT_ANALYSIS_DESCRIPTION,
		PART: DEFAULT_ANALYSIS_DESCRIPTION,
		PRON: DEFAULT_ANALYSIS_DESCRIPTION,
		PROPN: DEFAULT_ANALYSIS_DESCRIPTION,
		PUNCT: DEFAULT_ANALYSIS_DESCRIPTION,
		SCONJ: DEFAULT_ANALYSIS_DESCRIPTION,
		SYM: DEFAULT_ANALYSIS_DESCRIPTION,
		VERB: DEFAULT_ANALYSIS_DESCRIPTION,
		X: DEFAULT_ANALYSIS_DESCRIPTION,
	},
	Phraseme: {
		Aphorism: DEFAULT_ANALYSIS_DESCRIPTION,
		Collocation: DEFAULT_ANALYSIS_DESCRIPTION,
		DiscourseFormula: DEFAULT_ANALYSIS_DESCRIPTION,
		Idiom: DEFAULT_ANALYSIS_DESCRIPTION,
		Proverb: DEFAULT_ANALYSIS_DESCRIPTION,
	},
	Morpheme: {
		Circumfix: DEFAULT_ANALYSIS_DESCRIPTION,
		Clitic: DEFAULT_ANALYSIS_DESCRIPTION,
		Duplifix: DEFAULT_ANALYSIS_DESCRIPTION,
		Infix: DEFAULT_ANALYSIS_DESCRIPTION,
		Interfix: DEFAULT_ANALYSIS_DESCRIPTION,
		Prefix: DEFAULT_ANALYSIS_DESCRIPTION,
		Root: DEFAULT_ANALYSIS_DESCRIPTION,
		Suffix: DEFAULT_ANALYSIS_DESCRIPTION,
		Suffixoid: DEFAULT_ANALYSIS_DESCRIPTION,
		ToneMarking: DEFAULT_ANALYSIS_DESCRIPTION,
		Transfix: DEFAULT_ANALYSIS_DESCRIPTION,
	},
} satisfies SurfaceAnalysisDescriptionRendererRegistry<"de">;
