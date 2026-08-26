import { LockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ReadingNoteDefaultRenderer } from "../../reading-note-render-context";

export const renderDefaultReadingRelations = (({ note, capabilities }) => {
	const relations = note.relations.filter(
		({ relation }) =>
			capabilities.knowledgeSettings.semanticRelations[relation],
	);
	const pendingRelations = note.pendingRelations.filter(
		({ relation }) =>
			capabilities.knowledgeSettings.semanticRelations[relation],
	);
	const grammaticalRelations = note.grammaticalRelations ?? [];
	if (
		relations.length === 0 &&
		pendingRelations.length === 0 &&
		grammaticalRelations.length === 0
	) {
		return null;
	}

	return (
		<div className="space-y-2">
			{relations.length > 0 || pendingRelations.length > 0 ? (
				<ul
					className="flex flex-wrap gap-2"
					aria-label="Semantic relations"
				>
					{relations.map((relation) => (
						<li
							key={`${relation.relation}:${
								relation.target.kind === "UnitReadingNote"
									? relation.target.readingId
									: relation.target.id
							}`}
						>
							<button
								type="button"
								onClick={() =>
									capabilities.follow(relation.target)
								}
								className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<Badge variant="outline">
									{relation.relation}:{" "}
									{relation.targetCanonicalForm}
								</Badge>
							</button>
						</li>
					))}
					{pendingRelations.map((relation) => (
						<li key={relation.locatorKey}>
							<button
								type="button"
								onClick={() =>
									capabilities.follow(relation.target)
								}
								className="inline-flex rounded-md opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<Badge
									variant="outline"
									aria-label={`${relation.relation} relation to Unit Shadow ${relation.targetCanonicalForm}`}
								>
									<LockIcon
										data-icon="inline-start"
										aria-hidden="true"
									/>
									{relation.relation}:{" "}
									{relation.targetCanonicalForm}
								</Badge>
							</button>
						</li>
					))}
				</ul>
			) : null}
			{grammaticalRelations.length > 0 ? (
				<ul
					className="flex flex-wrap gap-2"
					aria-label="Grammatical relations"
				>
					{grammaticalRelations.map((relation) => (
						<li
							key={`${relation.relation}:${relation.target.readingId}`}
						>
							<button
								type="button"
								onClick={() =>
									capabilities.follow(relation.target)
								}
								className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<Badge variant="secondary">
									{relation.relation}:{" "}
									{relation.targetCanonicalForm}
								</Badge>
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}) satisfies ReadingNoteDefaultRenderer;
