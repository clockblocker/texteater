import { LinkButton, NoteSection } from "lego";
import { LockIcon } from "lucide-react";
import { relationPreference } from "../../../../../../../shared/knowledge-preferences";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { RelationMark } from "../../common/relation-mark";

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
	// A grammatical link (ADR 0036), so no semantic-relation preference hides it.
	const participleLinks = noteData.participleLinks ?? [];
	if (
		relations.length === 0 &&
		pendingRelations.length === 0 &&
		grammaticalAlternatives.length === 0 &&
		participleLinks.length === 0
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
								tone="shadow"
								className="relative"
								onClick={() =>
									PresentationCapabilities.follow(
										relation.target,
									)
								}
								aria-label={`${relation.relation} relation to Unit Shadow ${relation.targetCanonicalForm}`}
							>
								{/* the lock hangs in the margin, so a locked
								    word lines up with every other word */}
								<LockIcon
									aria-hidden="true"
									strokeWidth={1.5}
									className="absolute end-full top-1/2 -translate-y-1/2 compact:static compact:translate-y-0"
								/>
								<RelationMark relation={relation.relation} />
								{relation.targetCanonicalForm}
							</LinkButton>
						</li>
					))}
				</ul>
			) : null}
			{participleLinks.length > 0 ? (
				<ul
					className="grid gap-2 [p+&]:mt-2 [ul+&]:mt-2"
					aria-label="Participle Source"
				>
					{participleLinks.map((link) => (
						<li
							key={
								link.target.kind === "Shadow"
									? link.target.shadowId
									: link.target.lemmaId
							}
							className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
						>
							<span className="text-sm text-ink-muted compact:text-xs">
								participle of
							</span>
							{link.target.kind === "Shadow" ? (
								// A source verb not stored yet is a Unit
								// Shadow, locked like a pending relation target.
								<LinkButton
									tone="shadow"
									onClick={() =>
										PresentationCapabilities.follow(
											link.target,
										)
									}
									aria-label={`participle of Unit Shadow ${link.targetCanonicalForm}`}
								>
									<LockIcon
										aria-hidden="true"
										strokeWidth={1.5}
										className="me-1"
									/>
									{link.targetCanonicalForm}
								</LinkButton>
							) : (
								<LinkButton
									onClick={() =>
										PresentationCapabilities.follow(
											link.target,
										)
									}
								>
									{link.targetCanonicalForm}
								</LinkButton>
							)}
						</li>
					))}
				</ul>
			) : null}
			{noteData.relationsTruncated ? (
				<p className="mt-2 text-sm text-ink-muted compact:text-xs">
					More relations not shown
				</p>
			) : null}
			{grammaticalAlternatives.length > 0 ? (
				<ul
					className="grid gap-2 [p+&]:mt-2 [ul+&]:mt-2"
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
