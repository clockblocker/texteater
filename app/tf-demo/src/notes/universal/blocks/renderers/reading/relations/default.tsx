import type * as Dumrel from "dumrel/types";
import { LinkButton, Mark, NoteSection } from "lego";
import { LockIcon } from "lucide-react";
import { relationPreference } from "../../../../../../../shared/knowledge-preferences";

import type { ReadingDefaultRenderer } from "../../../renderer";

export const renderDefaultReadingRelations = (({
	noteData,
	PresentationCapabilities,
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
	if (
		relations.length === 0 &&
		pendingRelations.length === 0 &&
		grammaticalAlternatives.length === 0
	) {
		return null;
	}

	return (
		<NoteSection aria-label="Relations" label="Relations">
			{relations.length > 0 || pendingRelations.length > 0 ? (
				<ul className="grid gap-2" aria-label="Semantic relations">
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
								{relation.targetCanonicalForm}
							</LinkButton>
						</li>
					))}
					{pendingRelations.map((relation) => (
						<li key={relation.locatorKey}>
							<LinkButton
								tone="pending"
								onClick={() =>
									PresentationCapabilities.follow(
										relation.target,
									)
								}
								aria-label={`${relation.relation} relation to Unit Shadow ${relation.targetCanonicalForm}`}
							>
								<LockIcon aria-hidden="true" />
								<RelationMark relation={relation.relation} />
								{relation.targetCanonicalForm}
							</LinkButton>
						</li>
					))}
				</ul>
			) : null}
			{grammaticalAlternatives.length > 0 ? (
				<ul
					className="grid gap-2 [ul+&]:mt-2"
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
				</ul>
			) : null}
			{PresentationCapabilities.grammaticalAlternatives?.error ? (
				<p role="alert" className="mt-2 text-sm text-destructive">
					{PresentationCapabilities.grammaticalAlternatives.error}
				</p>
			) : null}
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

const RELATION_MARKS: Record<Dumrel.SemanticRelation, string> = {
	synonym: "=",
	nearSynonym: "≈",
	antonym: "≠",
	nearAntonym: "≉",
	hypernym: "↑",
	hyponym: "↓",
	holonym: "⊂",
	meronym: "⊃",
};
function RelationMark({ relation }: { relation: string }) {
	const mark = Object.hasOwn(RELATION_MARKS, relation)
		? RELATION_MARKS[relation as Dumrel.SemanticRelation]
		: relation;
	return (
		<Mark role="img" aria-label={relation} title={relation}>
			{mark}
		</Mark>
	);
}
