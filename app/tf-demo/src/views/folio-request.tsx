import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Button, IconSwap } from "lego";
import {
	LoaderCircleIcon,
	MousePointerClickIcon,
	RotateCcwIcon,
} from "lucide-react";
import { useState } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { api } from "../../convex/_generated/api";

/**
 * A book's passages are made clickable one at a time, when the Learner
 * asks (#1216). A passage is a Folio; the Learner never sees the word. Each
 * passage not yet processed opens with one quiet control: ask for it,
 * watch it run, or, when it failed, ask again. A processed passage shows
 * no control; its words are clickable.
 */

type FolioView = NonNullable<
	NonNullable<FunctionReturnType<typeof api.scrollViews.get>>["folios"]
>[number];

/**
 * The Folio each loaded Sentence opens, keyed by Sentence ID: the first
 * loaded Sentence of every Folio not yet processed, so a Folio whose
 * start is not loaded yet still offers its control where it begins to show.
 */
export function folioOpenings(
	sentences: readonly {
		readonly sentenceId: string;
		readonly position: number;
	}[],
	folios: readonly FolioView[] | undefined,
): ReadonlyMap<string, FolioView> {
	const openings = new Map<string, FolioView>();
	if (!folios) return openings;
	const opened = new Set<string>();
	let index = 0;
	for (const sentence of sentences) {
		while (
			index < folios.length &&
			(folios[index]?.end ?? 0) <= sentence.position
		)
			index += 1;
		const folio = folios[index];
		if (
			folio &&
			folio.state !== "Processed" &&
			sentence.position >= folio.start &&
			!opened.has(folio.folioId)
		) {
			opened.add(folio.folioId);
			openings.set(sentence.sentenceId, folio);
		}
	}
	return openings;
}

/** The control a passage not yet processed opens with. */
export function FolioRequest({ folio }: { readonly folio: FolioView }) {
	const visitorId = useAnonymousVisitorId();
	const request = useMutation(api.folios.request);
	const [asked, setAsked] = useState(false);
	const [refused, setRefused] = useState(false);
	/* the server's next state replaces the click's own busy one */
	const [seenState, setSeenState] = useState(folio.state);
	if (seenState !== folio.state) {
		setSeenState(folio.state);
		setAsked(false);
	}
	const running = folio.state === "Processing" || asked;
	const failed = !running && (folio.state === "Failed" || refused);

	function ask() {
		if (running) return;
		setAsked(true);
		setRefused(false);
		request({ folioId: folio.folioId, visitorId }).catch(() => {
			setAsked(false);
			setRefused(true);
		});
	}

	return (
		<div
			data-slot="folio-request"
			data-state={running ? "running" : failed ? "failed" : "idle"}
			aria-live="polite"
			className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1"
		>
			{failed ? (
				<span className="text-xs text-destructive">
					Couldn’t make this passage clickable.
				</span>
			) : null}
			<Button
				type="button"
				variant="ghost"
				size="xs"
				aria-disabled={running || undefined}
				onClick={ask}
				className={`text-ink-muted aria-disabled:cursor-default aria-disabled:hover:bg-transparent ${failed ? "" : "-ms-1.5"}`}
			>
				<IconSwap
					data-icon="inline-start"
					active={running}
					idle={
						failed ? <RotateCcwIcon /> : <MousePointerClickIcon />
					}
					busy={
						<LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
					}
				/>
				{running
					? "Making this passage clickable…"
					: failed
						? "Try again"
						: "Make this passage clickable"}
			</Button>
		</div>
	);
}
