import type { FunctionReturnType } from "convex/server";
import { ArrowRightIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { api } from "../../convex/_generated/api";

type Presentation = NonNullable<
	FunctionReturnType<typeof api.presentation.forVisitor>
>;

type PipelineStage =
	| "text"
	| "sentence"
	| "segment"
	| "grammar"
	| "lemma"
	| "reading";

const stages = [
	{ id: "text", label: "Text" },
	{ id: "sentence", label: "Sentence" },
	{ id: "segment", label: "Segment" },
	{ id: "grammar", label: "Grammar" },
	{ id: "lemma", label: "Lemma" },
	{ id: "reading", label: "Reading" },
] as const satisfies readonly { id: PipelineStage; label: string }[];

export function ResolutionPipeline({
	presentation,
}: {
	presentation: Presentation;
}) {
	const [activeStage, setActiveStage] = useState<PipelineStage>("reading");

	return (
		<Card size="sm" aria-labelledby="resolution-path-title">
			<CardHeader>
				<CardTitle id="resolution-path-title">
					Resolution path
				</CardTitle>
				<CardDescription>
					Inspect the persisted output of every stage in the learner
					click pipeline.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<nav aria-label="Resolution stages">
					<ol className="flex flex-wrap items-center gap-2">
						{stages.map((stage, index) => (
							<li
								className="flex items-center gap-2"
								key={stage.id}
							>
								{index > 0 ? (
									<ArrowRightIcon
										aria-hidden="true"
										className="size-4 text-muted-foreground"
									/>
								) : null}
								<Button
									type="button"
									size="sm"
									variant={
										activeStage === stage.id
											? "default"
											: "outline"
									}
									aria-pressed={activeStage === stage.id}
									onClick={() => setActiveStage(stage.id)}
								>
									{stage.label}
								</Button>
							</li>
						))}
					</ol>
				</nav>

				<PipelineStageDetail
					activeStage={activeStage}
					presentation={presentation}
				/>
			</CardContent>
		</Card>
	);
}

function PipelineStageDetail({
	activeStage,
	presentation,
}: {
	activeStage: PipelineStage;
	presentation: Presentation;
}) {
	const clickedSegment = presentation.sentence.segments.find(
		({ index }) => index === presentation.clickedSegmentIndex,
	);
	const attestation = presentation.grammaticalResolution.attestation;

	switch (activeStage) {
		case "text":
			return (
				<StageDetail title="Submitted Text" badge="global">
					<p className="text-sm leading-relaxed">
						{presentation.text.sourceText}
					</p>
				</StageDetail>
			);
		case "sentence":
			return (
				<StageDetail
					title={`Source Sentence ${presentation.sentence.position + 1}`}
					badge={presentation.sentence.language}
				>
					<p className="text-sm leading-relaxed">
						{presentation.sentence.stitchedText}
					</p>
				</StageDetail>
			);
		case "segment":
			return (
				<StageDetail
					title={clickedSegment?.text ?? "Clicked Segment"}
					badge={clickedSegment?.kind ?? "unknown"}
				>
					<p className="text-sm text-muted-foreground">
						Segment index {presentation.clickedSegmentIndex}.
						Resolution members{" "}
						{presentation.grammaticalResolution.memberSegmentIndices.join(
							", ",
						)}
						.
					</p>
				</StageDetail>
			);
		case "grammar":
			return (
				<StageDetail
					title={attestation.surface.normalizedSurface}
					badge={`${attestation.surface.surfaceKind} · ${attestation.realizationCoverage}`}
				>
					<div className="flex flex-wrap gap-2">
						{attestation.members.map((member, index) => (
							<Badge
								key={`${member.attested}:${index}`}
								variant="outline"
							>
								{member.attested} · {member.orthography}
							</Badge>
						))}
					</div>
					<p className="text-sm text-muted-foreground">
						{presentation.grammaticalResolution.markedContext}
					</p>
					<FeatureBadges
						label="Surface features"
						features={[
							...attestation.surface.surfaceFeatures,
							...attestation.surface.inflectionalFeatures,
						]}
					/>
				</StageDetail>
			);
		case "lemma":
			return (
				<StageDetail
					title={presentation.lemma.canonicalForm}
					badge={`${presentation.lemma.family} · ${presentation.lemma.kind}`}
				>
					<FeatureBadges
						label="Dumling core features"
						features={presentation.lemma.coreFeatures}
					/>
				</StageDetail>
			);
		case "reading":
			return (
				<StageDetail
					title={`${presentation.reading.emojiDescription} ${presentation.reading.canonicalForm}`}
					badge="Dumdict Reading"
				>
					<p className="text-sm text-muted-foreground">
						This stable global Reading is the start node for the
						note graph below.
					</p>
				</StageDetail>
			);
	}
}

function StageDetail({
	title,
	badge,
	children,
}: {
	title: string;
	badge: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3" aria-live="polite">
			<div className="flex flex-wrap items-center gap-2">
				<h3 className="font-medium">{title}</h3>
				<Badge variant="secondary">{badge}</Badge>
			</div>
			{children}
		</section>
	);
}

export function FeatureBadges({
	label,
	features,
}: {
	label: string;
	features: readonly { readonly name: string; readonly value: string }[];
}) {
	return (
		<div className="flex flex-col gap-2">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			{features.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{features.map((feature) => (
						<Badge key={feature.name} variant="outline">
							{feature.name}: {feature.value}
						</Badge>
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground">No features.</p>
			)}
		</div>
	);
}
