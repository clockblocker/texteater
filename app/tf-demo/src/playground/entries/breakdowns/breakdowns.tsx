import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "lego";
import { useMemo, useState } from "react";
import { type BreakdownDisplay, BreakdownDisplayProvider } from "@/notes";
import {
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "@/workspace/workspace-controller";
import type { EntryRoute } from "../../playground-router";
import { CardFrame, SheetFrame } from "../frames";
import { segmentsFromTarget, targetFromSegments } from "../notes-gallery";
import { PlaygroundNote, playgroundNotesQuery } from "../playground-note";
import { BREAKDOWN_EXAMPLES, exampleTarget } from "./examples";
import { Inspector, InspectorSection } from "./inspector";
import { BreakdownKnobs, PROTOTYPE_BREAKDOWN_DISPLAY } from "./knobs";

const firstExample = BREAKDOWN_EXAMPLES[0]?.examples[0];

/**
 * Build step 4 of #1241: a Reading's Breakdown on its Note, and a base's
 * Formations, rendered by tf-demo's real Blocks from the Notes Study fake db.
 * The frame shows only the Note; the inspector holds the rest.
 *
 * The shown Note is the route, `/playground/breakdowns/<kind>/<id>`, so every
 * click inside the Note is a history entry.
 */
export function BreakdownsPrototype({ route }: { readonly route: EntryRoute }) {
	const snapshot = useQuery(playgroundNotesQuery);
	const [display, setDisplay] = useState<BreakdownDisplay>(
		PROTOTYPE_BREAKDOWN_DISPLAY,
	);
	const [presentation, setPresentation] = useState<"Sheet" | "Card">("Sheet");
	const routed = useMemo(
		() => targetFromSegments(route.segments),
		[route.segments],
	);
	const { setSegments } = route;
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (next) => setSegments(segmentsFromTarget(next)),
			presentCards: () => {},
		}),
		[setSegments],
	);

	if (snapshot.isPending)
		return (
			<div className="p-6" role="status" aria-label="Loading fake db">
				<Skeleton className="h-6 w-64" />
			</div>
		);
	if (snapshot.isError)
		return (
			<p className="p-6 text-sm text-destructive" role="alert">
				The playground fixtures could not be built. Check the Vite
				terminal and reload.
			</p>
		);
	const data = snapshot.data;
	const shownDisplay: BreakdownDisplay = {
		...display,
		formationsOfLemma: (lemmaId) => {
			const note = data.notes[`Lemma:${lemmaId}`];
			return note?.kind === "Lemma" ? note.formations : undefined;
		},
	};
	const target =
		routed ?? (firstExample ? exampleTarget(data, firstExample) : null);
	const Frame = presentation === "Card" ? CardFrame : SheetFrame;

	return (
		<div className="flex min-h-full justify-center px-6 py-10 lg:pe-[23rem]">
			<div className="w-full max-w-2xl">
				{target ? (
					<WorkspaceInteractionProvider interaction={interaction}>
						<BreakdownDisplayProvider value={shownDisplay}>
							<Frame>
								<PlaygroundNote
									target={target}
									presentation={presentation}
									snapshot={data}
									follow={interaction.follow}
								/>
							</Frame>
						</BreakdownDisplayProvider>
					</WorkspaceInteractionProvider>
				) : null}
			</div>
			<Inspector>
				<InspectorSection>
					<p className="text-ink-soft">
						A Reading's Breakdown on its Note (ADR 0050, ADR 0051):
						Constituents by dictionary form, the word's morphemes,
						or a Source; and on a base's Note, its Formations.
					</p>
					<p className="text-ink-soft">
						The morphemes line is the user's sketch: the word plain
						at rest, and under the pointer one morpheme turns blue
						with its school mark drawn above it. Tab into the word
						and walk it with ← →; Enter opens the morpheme's Note.
						Browser Back walks back.
					</p>
				</InspectorSection>
				{BREAKDOWN_EXAMPLES.map((group) => (
					<InspectorSection key={group.title} title={group.title}>
						<ul className="grid gap-1.5">
							{group.examples.map((example) => {
								const next = exampleTarget(data, example);
								return (
									<li key={example.label}>
										<button
											type="button"
											disabled={!next}
											aria-current={
												next &&
												target &&
												JSON.stringify(next) ===
													JSON.stringify(target)
													? "true"
													: undefined
											}
											className="cursor-pointer rounded-sm text-start text-ink hover:text-primary aria-[current=true]:text-primary aria-[current=true]:underline aria-[current=true]:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
											onClick={() =>
												next &&
												setSegments(
													segmentsFromTarget(next),
													{
														replace: false,
													},
												)
											}
										>
											{example.label}
										</button>
										<p className="text-xs text-ink-muted">
											{example.hint}
										</p>
									</li>
								);
							})}
						</ul>
					</InspectorSection>
				))}
				<BreakdownKnobs
					display={display}
					setDisplay={setDisplay}
					presentation={presentation}
					setPresentation={setPresentation}
				/>
				<InspectorSection title="Copied from">
					<ul className="grid list-disc gap-1 ps-4 text-ink-soft">
						{COPIED.map(([what, from]) => (
							<li key={what}>
								<span className="text-ink">{what}</span>: {from}
							</li>
						))}
					</ul>
				</InspectorSection>
				<InspectorSection title="Open questions">
					<ul className="grid list-disc gap-1 ps-4 text-ink-soft">
						{OPEN_QUESTIONS.map((question) => (
							<li key={question}>{question}</li>
						))}
					</ul>
				</InspectorSection>
				<InspectorSection title="Open: clickable wording">
					<p className="text-ink-soft">
						Shown here: each piece is a Link to its target's Note,
						as Relations and Source links are. The other option
						(#1241, not specified yet) makes the wording a hidden
						text like a Definition Text, so a click on a word
						resolves through the click path and deals a Deck instead
						of opening the stored link.
					</p>
				</InspectorSection>
			</Inspector>
		</div>
	);
}

const COPIED: readonly (readonly [string, string])[] = [
	[
		"Constituents",
		"en.wiktionary etymology line (ver- + Arzt, Gast + -e- + Haus), parts as in DWDS Wortzerlegung",
	],
	[
		"Morpheme marks",
		"разбор по составу: prefix ¬ (tick at the end, as sketched), root ⌒, suffix ^, ending □, zero ending empty □, Interfix ring",
	],
	["Source", "DWDS Grundform (Lauf: Grundform laufen), worded as “from”"],
	[
		"Formations",
		"DWDS Wortbildung: one line per group, words joined by ·, three shown, then “… N more”; “Base of” is DWDS's “als Grundform”",
	],
	[
		"Reveal motion",
		"emil-design-eng: a 170 ms ease-out wipe in, a 110 ms fade out, CSS transitions so a reveal interrupts cleanly; keyboard focus reveals at once",
	],
	[
		"Phrasemes",
		"running text: words joined by ·, a fused word kept together",
	],
];

const OPEN_QUESTIONS: readonly string[] = [
	"At rest nothing says the word can be explored; is the pointer cursor cue enough?",
	"The zero ending's target is invisible until hovered; will a learner ever find it?",
	"A pin lasts until a click elsewhere or Escape; is that the right way to clear it?",
	"Formations on each Reading Note repeat the Lemma's list on every Reading.",
	"Is “Base of” the right label for the words with this one as Source?",
	"A fast sweep across the word flashes every mark; should the first reveal wait a beat?",
];
