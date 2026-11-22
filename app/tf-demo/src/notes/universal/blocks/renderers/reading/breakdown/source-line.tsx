import { LinkButton, NoteAside } from "lego";
import { LockIcon } from "lucide-react";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { NoteDataFor } from "../../../../note/data";

type SourceLink = NonNullable<NoteDataFor<"Reading">["sourceLinks"]>[number];

/**
 * A Source (ADR 0050), DWDS's Grundform: `from laufen`. A drifted
 * participle reads `historically the participle of` (ADR 0036). A Source not
 * stored yet is a Unit Shadow, locked like a pending relation target.
 */
export function SourceLine({
	link,
	follow,
}: {
	readonly link: SourceLink;
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const drifted = link.meaning === "Drifted";
	const label = drifted ? "historically the participle of" : "from";
	const pending = link.target.kind === "Shadow";
	return (
		<div
			data-breakdown-line="source"
			className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
		>
			{drifted ? (
				<span className="text-xs font-normal text-ink-soft">
					{label}
				</span>
			) : (
				<NoteAside>{label}</NoteAside>
			)}
			<LinkButton
				tone={pending ? "shadow" : drifted ? "quiet" : "link"}
				className={
					drifted
						? "text-[length:var(--note-aside-size,0.875rem)]"
						: undefined
				}
				onClick={() => follow(link.target)}
				{...(pending
					? {
							"aria-label": `${link.targetCanonicalForm}, pending note`,
						}
					: {})}
			>
				{pending ? (
					<LockIcon
						aria-hidden="true"
						strokeWidth={1.5}
						className="me-1"
					/>
				) : null}
				{link.targetCanonicalForm}
			</LinkButton>
		</div>
	);
}
