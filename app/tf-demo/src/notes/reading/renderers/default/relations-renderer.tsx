import type { SemanticRelation } from "dumrel";
import { LockIcon } from "lucide-react";

import type { ReadingNoteDefaultRenderer } from "../../reading-note-render-context";

export const renderDefaultReadingRelations = (({
	noteData,
	PresentationCapabilities,
}) => {
	const relations = noteData.relations.filter(
		({ relation }) =>
			PresentationCapabilities.knowledgeSettings.semanticRelations[
				relation
			],
	);
	const pendingRelations = noteData.pendingRelations.filter(
		({ relation }) =>
			PresentationCapabilities.knowledgeSettings.semanticRelations[
				relation
			],
	);
	const grammaticalRelations = noteData.grammaticalRelations ?? [];
	if (
		relations.length === 0 &&
		pendingRelations.length === 0 &&
		grammaticalRelations.length === 0
	) {
		return null;
	}

	return (
		<section
			className="reading-note__section reading-note__relations"
			aria-label="Relations"
		>
			<h2 className="reading-note__section-label">Relations</h2>
			{relations.length > 0 || pendingRelations.length > 0 ? (
				<ul
					className="reading-note__relation-list"
					aria-label="Semantic relations"
				>
					{relations.map((relation) => (
						<li
							key={`${relation.relation}:${
								relation.target.kind === "Reading"
									? relation.target.readingId
									: relation.target.lemmaId
							}`}
						>
							<button
								type="button"
								onClick={() =>
									PresentationCapabilities.follow(
										relation.target,
									)
								}
								className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<span>
									<RelationMark
										relation={relation.relation}
									/>{" "}
									{relation.targetCanonicalForm}
								</span>
							</button>
						</li>
					))}
					{pendingRelations.map((relation) => (
						<li key={relation.locatorKey}>
							<button
								type="button"
								onClick={() =>
									PresentationCapabilities.follow(
										relation.target,
									)
								}
								aria-label={`${relation.relation} relation to Unit Shadow ${relation.targetCanonicalForm}`}
								className="inline-flex rounded-md opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<span>
									<LockIcon
										data-icon="inline-start"
										aria-hidden="true"
									/>
									<RelationMark
										relation={relation.relation}
									/>{" "}
									{relation.targetCanonicalForm}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
			{grammaticalRelations.length > 0 ? (
				<ul
					className="reading-note__relation-list"
					aria-label="Grammatical relations"
				>
					{grammaticalRelations.map((relation) => (
						<li
							key={`${relation.relation}:${relation.target.readingId}`}
						>
							<button
								type="button"
								onClick={() =>
									PresentationCapabilities.follow(
										relation.target,
									)
								}
								className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<span>
									<RelationMark
										relation={relation.relation}
									/>{" "}
									{relation.targetCanonicalForm}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}) satisfies ReadingNoteDefaultRenderer;

const RELATION_MARKS: Record<SemanticRelation, string> = {
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
		? RELATION_MARKS[relation as SemanticRelation]
		: relation;
	return (
		<span
			className="reading-note__relation-mark"
			role="img"
			aria-label={relation}
			title={relation}
		>
			{mark}
		</span>
	);
}
