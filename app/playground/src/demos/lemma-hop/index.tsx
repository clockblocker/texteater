import { type ComponentType, useState } from "react";
import {
	type CardKind,
	cardKinds,
	type FakeResolution,
	germanText,
	hebrewText,
	resolveWord,
	type WordClick,
	WordText,
	wordsOf,
} from "@/fixtures";
import {
	DemoInspector,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useFrameSize,
	useInspectorAvoid,
} from "@/shell";
import {
	CrumbHop,
	type HopProps,
	ParentTagHop,
	TableHop,
	TailHop,
	type Variant,
} from "./hops";

const allWords = [...wordsOf(germanText), ...wordsOf(hebrewText)];
const firstWord = allWords.find((word) => word.text === "ging");

const variants: readonly {
	readonly id: Variant;
	readonly label: string;
	readonly from: string;
	/** The Card a fresh lookup shows first. */
	readonly opensOn: CardKind;
	readonly View: ComponentType<HopProps>;
}[] = [
	{
		id: "tag",
		label: "Parent tag",
		from: "Lute v3",
		opensOn: "Surface",
		View: ParentTagHop,
	},
	{
		id: "tails",
		label: "Tails as links",
		from: "tf-demo Deck",
		opensOn: "Reading",
		View: TailHop,
	},
	{
		id: "crumbs",
		label: "Breadcrumbs",
		from: "trail",
		opensOn: "Reading",
		View: CrumbHop,
	},
	{
		id: "table",
		label: "Inflection table",
		from: "LinguaCafe",
		opensOn: "Surface",
		View: TableHop,
	},
];

/**
 * Lemma hop: four ways to get from the clicked form (ging) to its lemma
 * (gehen) and back, on the same fake Cards. The variant and the clicked
 * word live in the URL (`variant`, `word`).
 */
export default function LemmaHopDemo() {
	const [variantParam, setVariant] = useDemoParam("variant");
	const [wordId, setWordId] = useDemoParam("word");
	// The lookup sits at the inline end from 760px, below the text under it.
	const { inlineSize } = useFrameSize();
	useInspectorAvoid(inlineSize >= 760 ? "inline-end" : "block-end");
	const variant =
		variants.find((candidate) => candidate.id === variantParam) ??
		variants[0];
	const word =
		allWords.find((candidate) => candidate.id === wordId) ?? firstWord;
	if (!variant || !word) throw new Error("lemma-hop: missing fixture");

	const onWordClick = ({ word: clicked }: WordClick) => setWordId(clicked.id);

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorSection>
					<InspectorTry>
						<p>
							Get from the clicked form to its lemma and back.
							Lute v3 puts a clickable parent-term tag on a
							term&rsquo;s form; LinguaCafe has an inflections
							tab.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Click <i>ging</i>, <i>detaillierte</i>, <i>zum</i>{" "}
							or <i>fängt … an</i>, hop to the lemma, then back to
							the form. Compare the variants at width 390.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Variant">
					<InspectorChoice
						label="Hop variant"
						options={variants.map((candidate, index) => ({
							value: candidate.id,
							label: `${String.fromCharCode(97 + index)} · ${candidate.label} · ${candidate.from}`,
						}))}
						value={variant.id}
						onChange={setVariant}
					/>
				</InspectorSection>
			</DemoInspector>
			<div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1.4fr)] @min-[760px]/frame:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] @min-[760px]/frame:grid-rows-1">
				<main className="overflow-auto p-5 @min-[760px]/frame:p-8">
					<div className="mx-auto grid max-w-[38rem] gap-6">
						<WordText
							text={germanText}
							selectedWordId={word.id}
							onWordClick={onWordClick}
						/>
						<WordText
							text={hebrewText}
							selectedWordId={word.id}
							onWordClick={onWordClick}
						/>
					</div>
				</main>
				<aside
					aria-label="Lookup"
					className="overflow-auto border-t border-line p-4 @min-[760px]/frame:border-t-0 @min-[760px]/frame:border-s"
				>
					<Lookup
						key={`${word.id}/${variant.id}`}
						resolution={resolveWord(word)}
						opensOn={variant.opensOn}
						View={variant.View}
					/>
				</aside>
			</div>
		</div>
	);
}

/** One lookup: which Card is in view, and which way the last hop went. */
function Lookup({
	resolution,
	opensOn,
	View,
}: {
	readonly resolution: FakeResolution;
	readonly opensOn: CardKind;
	readonly View: ComponentType<HopProps>;
}) {
	const [view, setView] = useState({ front: opensOn, direction: 0 });
	const onHop = (kind: CardKind) =>
		setView((current) => ({
			front: kind,
			direction: Math.sign(
				cardKinds.indexOf(kind) - cardKinds.indexOf(current.front),
			),
		}));
	return (
		<View
			resolution={resolution}
			front={view.front}
			direction={view.direction}
			onHop={onHop}
		/>
	);
}
