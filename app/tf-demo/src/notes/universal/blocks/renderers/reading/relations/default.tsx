import { LinkButton, NoteAside, NoteList, NoteSection } from "lego";
import { LockIcon } from "lucide-react";
import { relationPreference } from "../../../../../../../shared/knowledge-preferences";
import { citationText } from "../../../citation";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { RelationMark } from "../../common/relation-mark";

export const renderDefaultReadingRelations = (({
	noteData,
	PresentationCapabilities,
	Citation,
}) => {
	const relations = noteData.relations.filter(
		({ relation }) =>
			PresentationCapabilities.knowledgeSettings.semanticRelations[
				relationPreference(relation)
			],
	);
	const pendingRelations = noteData.pendingRelations.filter(
		({ relation }) =>
			PresentationCapabilities.knowledgeSettings.semanticRelations[
				relationPreference(relation)
			],
	);
	const grammaticalAlternatives = noteData.grammaticalAlternatives ?? [];
	// A Source shows in the Breakdown Block (ADR 0050).
	if (
		relations.length === 0 &&
		pendingRelations.length === 0 &&
		grammaticalAlternatives.length === 0
	) {
		return null;
	}

	return (
		<NoteSection label="Relations">
			{relations.length > 0 || pendingRelations.length > 0 ? (
				<NoteList gap="tight" aria-label="Semantic relations">
					{relations.map((relation) => (
						<li
							key={`${relation.relation}:${
								relation.target.kind === "Reading"
									? relation.target.readingId
									: relation.target.lemmaId
							}`}
						>
							<LinkButton
								onClick={() =>
									PresentationCapabilities.follow(
										relation.target,
									)
								}
							>
								<RelationMark relation={relation.relation} />
								{/* A Lemma target has no frame, so it cites the bare form. */}
								{citationText(
									Citation({
										lemma: {
											canonicalForm:
												relation.targetCanonicalForm,
										},
										reflexive: relation.targetReflexive,
									}),
								)}
							</LinkButton>
						</li>
					))}
					{pendingRelations.map((relation) => (
						<li key={relation.locatorKey}>
							<LinkButton
								tone="shadow"
								onClick={() =>
									PresentationCapabilities.follow(
										relation.target,
									)
								}
								aria-label={`${relation.targetCanonicalForm}, not yet in dictionary`}
							>
								<RelationMark relation={relation.relation} />
								<LockIcon
									aria-hidden="true"
									strokeWidth={1.5}
								/>
								{relation.targetCanonicalForm}
							</LinkButton>
						</li>
					))}
				</NoteList>
			) : null}
			{noteData.relationsTruncated ? (
				<NoteAside as="p" className="mt-2">
					Some related words aren’t shown
				</NoteAside>
			) : null}
			{grammaticalAlternatives.length > 0 ? (
				<NoteList
					gap="tight"
					className="[p+&]:mt-2 [ul+&]:mt-2"
					aria-label="Grammatical alternatives"
				>
					{grammaticalAlternatives.map((alternative) => (
						<li
							key={`${alternative.feature}:${alternative.readingKey}`}
						>
							<LinkButton
								disabled={
									!PresentationCapabilities.grammaticalAlternatives ||
									PresentationCapabilities
										.grammaticalAlternatives.pending
								}
								onClick={() => {
									void PresentationCapabilities.grammaticalAlternatives
										?.follow(alternative.readingKey)
										.catch(() => {});
								}}
							>
								{alternative.canonicalForm}{" "}
								<span className="sr-only">
									— vary {alternative.feature}
								</span>
							</LinkButton>
						</li>
					))}
				</NoteList>
			) : null}
			{PresentationCapabilities.grammaticalAlternatives?.error ? (
				<p role="alert" className="mt-2 text-sm text-destructive">
					{PresentationCapabilities.grammaticalAlternatives.error}
				</p>
			) : null}
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;
