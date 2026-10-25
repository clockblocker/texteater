import type { EntryRoute } from "../../playground-router";
import { InspectorSection } from "../inspector";
import { NotePrototype } from "../note-prototype";
import { BREAKDOWN_EXAMPLES } from "./examples";

/**
 * Build step 4 of #1241: a Reading's Breakdown on its Note, and a base's
 * Formations, rendered by tf-demo's real Blocks from the Notes Study fake db.
 */
export function BreakdownsPrototype({ route }: { readonly route: EntryRoute }) {
	return (
		<NotePrototype
			route={route}
			title="Breakdowns"
			examples={BREAKDOWN_EXAMPLES}
			lead={
				<>
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
						Browser Back walks back. These are the real Notes'
						defaults, approved on 2026-10-24.
					</p>
				</>
			}
		>
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
					Shown here: each piece is a Link to its target's Note, as
					Relations and Source links are. The other option (#1241, not
					specified yet) makes the wording a hidden text like a
					Definition Text, so a click on a word resolves through the
					click path and deals a Deck instead of opening the stored
					link.
				</p>
			</InspectorSection>
		</NotePrototype>
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
	"Is “Base of” the right label for the words with this one as Source?",
	"A fast sweep across the word flashes every mark; should the first reveal wait a beat?",
];
