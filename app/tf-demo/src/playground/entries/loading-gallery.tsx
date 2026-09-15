import {
	type NoteSkeletonKind,
	renderNoteSkeleton,
} from "@/views/note-skeletons";
import { TextViewSkeleton } from "@/views/text-view";
import { CardFrame, SheetFrame, Stage } from "./frames";

const NOTE_KINDS: readonly NoteSkeletonKind[] = [
	"Reading",
	"Lemma",
	"Surface",
	"Attestation",
	"Shadow",
];

/** Every Note kind while its data is still on the way, as a Card and as a Sheet. */
export function LoadingGallery() {
	return (
		<div className="grid gap-10 p-6">
			{NOTE_KINDS.map((kind) => (
				<section
					key={kind}
					aria-label={kind}
					className="flex flex-wrap items-start gap-8"
				>
					<Stage label={`${kind} · Card`}>
						<CardFrame tail={kind}>
							{renderNoteSkeleton(kind, "Card")}
						</CardFrame>
					</Stage>
					<Stage label={`${kind} · Sheet`} className="min-w-0 flex-1">
						<SheetFrame>
							{renderNoteSkeleton(kind, "Sheet")}
						</SheetFrame>
					</Stage>
				</section>
			))}
			<Stage label="Text · Sheet">
				<SheetFrame>
					<TextViewSkeleton />
				</SheetFrame>
			</Stage>
		</div>
	);
}
