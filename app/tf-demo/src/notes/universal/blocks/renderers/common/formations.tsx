import { LinkButton, NoteSection } from "lego";
import { Fragment, useState } from "react";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { NoteDataFor } from "../../../note/data";

type Formations = NoteDataFor<"Lemma">["formations"];
type FormationGroup = Formations[number];

/** DWDS shows three words per line and folds the rest behind `… N weitere`. */
const FOLDED_AFTER = 3;

function groupLabel({ group, formations }: FormationGroup): string {
	switch (group) {
		case "Prefixed":
			return formations.every(({ kind }) => kind === "VERB")
				? "Prefixed verbs"
				: "Prefixed words";
		case "Compounds":
			return "Compounds";
		case "Derivations":
			return "Derivations";
		case "Sourced":
			// DWDS's `als Grundform`: the words that name this one as their
			// Source, as `Lauf` names `laufen` ("from laufen").
			return "Base of";
		case "Phrases":
			return "Phrases";
	}
}

function FormationLine({
	group,
	ambiguous,
	follow,
}: {
	readonly group: FormationGroup;
	readonly ambiguous: ReadonlySet<string>;
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const [open, setOpen] = useState(false);
	const { formations } = group;
	const folded = formations.length - FOLDED_AFTER;
	const shown =
		open || folded <= 0 ? formations : formations.slice(0, FOLDED_AFTER);
	return (
		<p className="text-pretty">
			<span className="text-sm text-ink-muted compact:text-xs">
				{groupLabel(group)}:{" "}
			</span>
			{shown.map((formation, index) => (
				<Fragment key={formation.readingId}>
					{index > 0 ? (
						<span className="text-ink-muted"> · </span>
					) : null}
					<LinkButton onClick={() => follow(formation.target)}>
						{formation.canonicalForm}
						{/* Two Readings spelled alike tell themselves apart by emoji. */}
						{ambiguous.has(formation.canonicalForm) ? (
							<span className="ms-[0.25em]">
								{formation.emojiDescription}
							</span>
						) : null}
					</LinkButton>
				</Fragment>
			))}
			{folded > 0 ? (
				<button
					type="button"
					aria-expanded={open}
					className="ms-2 cursor-pointer rounded-sm px-1 text-sm text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 compact:text-xs"
					onClick={() => setOpen(!open)}
				>
					{open ? "… less" : `… ${folded} more`}
				</button>
			) : null}
		</p>
	);
}

/**
 * The stored words built on a base (ADR 0050), one line per group as DWDS's
 * word-formation panel sets them: `Prefixed verbs: abkaufen · einkaufen ·
 * verkaufen … 2 more`. The words whose Source is the base show as
 * `Base of: Lauf`, DWDS's `als Grundform`.
 */
export function FormationsSection({
	formations,
	follow,
}: {
	readonly formations: Formations;
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	if (formations.length === 0) return null;
	const counts = new Map<string, number>();
	for (const { formations: members } of formations)
		for (const { canonicalForm } of members)
			counts.set(canonicalForm, (counts.get(canonicalForm) ?? 0) + 1);
	const ambiguous = new Set(
		[...counts].flatMap(([form, count]) => (count > 1 ? [form] : [])),
	);
	return (
		<NoteSection aria-label="Formations" label="Formations">
			<div className="grid gap-1.5">
				{formations.map((group) => (
					<FormationLine
						key={group.group}
						group={group}
						ambiguous={ambiguous}
						follow={follow}
					/>
				))}
			</div>
		</NoteSection>
	);
}
