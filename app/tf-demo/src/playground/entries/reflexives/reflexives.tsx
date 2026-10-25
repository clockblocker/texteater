import { useState } from "react";
import { ValencyLineStyleContext } from "@/notes/de/block-renderers/reading/valency/default";
import {
	DEFAULT_VALENCY_LINE_STYLE,
	type ValencyLineStyle,
} from "@/notes/de/block-renderers/reading/valency/valency-line";
import type { EntryRoute } from "../../playground-router";
import { InspectorChoice, InspectorSection } from "../inspector";
import { type ExampleGroup, reading } from "../note-examples";
import { NotePrototype } from "../note-prototype";

const REFLEXIVE_EXAMPLES: readonly ExampleGroup[] = [
	{
		title: "Verbs",
		examples: [
			{
				label: "sich erinnern 🪞🧠",
				hint: "Reflexive Acc and an + Acc: the heading cites sich, the Valency Line leaves Acc unmarked",
				note: reading("erinnern", "🪞🧠"),
			},
			{
				label: "erinnern 💭",
				hint: "The same Lemma's plain Reading: no sich anywhere",
				note: reading("erinnern", "💭"),
			},
			{
				label: "erinnern (Lemma)",
				hint: "A Lemma heading is bare; its Readings list cites each Reading",
				note: { kind: "Lemma", form: "erinnern" },
			},
			{
				label: "sich schämen 🪞😳",
				hint: "Reflexive Acc and für + Acc",
				note: reading("schämen", "🪞😳"),
			},
			{
				label: "(sich) ausruhen 🛌",
				hint: "An Optional Reflexive Slot: no 🪞, the reflexive in parentheses, the prefix split",
				note: reading("ausruhen", "🛌"),
			},
		],
	},
	{
		title: "Locutions",
		examples: [
			{
				label: "sich Sorgen machen 🪞😟",
				hint: "Reflexive Dat: the Valency Line names the case",
				note: reading("Sorgen machen", "🪞😟"),
			},
			{
				label: "es sich gemütlich machen 🪞🛋️",
				hint: "sich right after the leading es, in the heading and the line",
				note: reading("es gemütlich machen", "🪞🛋️"),
			},
			{
				label: "außer sich sein 🪞😤",
				hint: "A reflexive inside a fixed phrase goes right after its preposition",
				note: reading("außer sein", "🪞😤"),
			},
			{
				label: "sich wie zu Hause fühlen 🪞🏠😌",
				hint: "A reflexive Locution with a Breakdown: sich is no piece of it",
				note: reading("wie zu Hause fühlen", "🪞🏠😌"),
			},
		],
	},
];

/**
 * #1285 phase 7: a Reading's Citation (ADR 0052) and where the Valency Line
 * puts its lexical reflexive, on real Notes from the Notes Study fake db.
 * The Valency Line's placement is the knob; the app shows its default.
 */
export function ReflexivesPrototype({ route }: { readonly route: EntryRoute }) {
	const [style, setStyle] = useState<ValencyLineStyle>(
		DEFAULT_VALENCY_LINE_STYLE,
	);
	return (
		<NotePrototype
			route={route}
			title="Reflexives"
			examples={REFLEXIVE_EXAMPLES}
			wrapNote={(note) => (
				<ValencyLineStyleContext.Provider value={style}>
					{note}
				</ValencyLineStyleContext.Provider>
			)}
			lead={
				<p className="text-ink-soft">
					A lexical reflexive lives in the Reading's Valency Frame,
					never in its Canonical Form (ADR 0052). A Reading's heading
					cites it: sich first, or right after a leading es, or after
					its preposition in a fixed phrase (außer sich sein). A
					Lemma's heading stays bare. The Valency Block's placement is
					a choice to judge here.
				</p>
			}
		>
			<InspectorSection title="Valency Line">
				<InspectorChoice
					label="Reflexive"
					value={style.reflexivePlacement}
					options={[
						{ value: "AfterHead", label: "After the verb" },
						{ value: "BeforeHead", label: "Before the verb" },
					]}
					onChange={(reflexivePlacement) =>
						setStyle({ ...style, reflexivePlacement })
					}
				/>
				<InspectorChoice
					label="Its case"
					value={style.reflexiveCase}
					options={[
						{ value: "DativeOnly", label: "Dat only" },
						{ value: "Always", label: "Always" },
						{ value: "Never", label: "Never" },
					]}
					onChange={(reflexiveCase) =>
						setStyle({ ...style, reflexiveCase })
					}
				/>
			</InspectorSection>
			<InspectorSection title="Copied from">
				<ul className="grid list-disc gap-1 ps-4 text-ink-soft">
					<li>
						<span className="text-ink">After the verb</span>: DWDS's
						WDG lines read as a main clause, the reflexive right
						after the verb: /jmd. stellt sich ‹Dat.› etw. vor/
					</li>
					<li>
						<span className="text-ink">Dat only</span>: Duden names
						a dative reflexive, sich (Dativ) etwas vorstellen, and
						leaves the accusative unmarked
					</li>
				</ul>
			</InspectorSection>
			<InspectorSection title="Alternatives">
				<ul className="grid list-disc gap-1 ps-4 text-ink-soft">
					<li>
						Before the verb: the line opens like the Citation (sich
						erinnern an …), but then the verb and its objects read
						in neither clause order.
					</li>
					<li>
						Case always (sich (Acc)) or never: Always repeats what
						an unmarked sich already says; Never hides that
						vorstellen 'imagine' takes mir, not mich.
					</li>
				</ul>
			</InspectorSection>
		</NotePrototype>
	);
}
