import { useState } from "react";
import { DEFAULT_TURN, type TurnFeel } from "tabletop/core";
import { Table, useTable } from "tabletop/react";
import { useMotionPreference } from "@/lib/motion-preference";
import { Inspector, InspectorChoice, InspectorSection } from "../inspector";
import { SceneView } from "./scene-view";
import { type SceneActions, useScene } from "./use-scene";

const TITLE = "Tabletop";

type ReducedChoice = "off" | "system" | "on";
const TIME_SCALES = [0.25, 0.5, 1] as const;

/* #1313's turn about the long axis: a Note Card is landscape, so that is X */
const NOTE_TURN: TurnFeel = { ...DEFAULT_TURN, axis: "x" };

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * The tabletop battery end to end (#1317): Note Cards in a Deck on the
 * Ground, a Pane beside it across a Split, every Card one Body resting in
 * a CSS Slot and moved by Terms. The surface shows only the scene; the
 * tricks, the turn and the motion knobs are in the inspector (playground
 * ADR 0001).
 */
export function TabletopEntry() {
	const [reducedMotion, setReducedMotion] = useState<ReducedChoice>("off");
	const [timeScale, setTimeScale] = useState<number>(1);
	const [rtl, setRtl] = useState(false);
	const [turn, setTurn] = useState<TurnFeel>(NOTE_TURN);
	const { preference } = useMotionPreference();
	const table = useTable();
	const actions = useScene(table);
	return (
		<>
			<div className="flex h-full min-h-0 p-6 lg:pe-[23rem]">
				<Table
					table={table}
					dir={rtl ? "rtl" : "ltr"}
					reducedMotion={reducedMotion}
					alwaysPlay={preference === "ignore"}
					timeScale={timeScale}
					turn={turn}
					assert={import.meta.env.DEV}
					className="flex min-h-[36rem] min-w-0 flex-1 select-none"
				>
					<SceneView table={table} actions={actions} />
				</Table>
			</div>
			<Inspector title={TITLE}>
				<InspectorSection>
					<p className="text-ink-soft">
						Every Card rests in an invisible CSS Slot and moves by
						offsets that decay to nothing, so a resize or a Split
						drag never shows a Card in its Region's old box.
					</p>
				</InspectorSection>
				<InspectorSection title="Try this">
					<ul className="grid list-disc gap-1 ps-4 text-ink-soft">
						<li>
							Tap a Card: it grows into a Cover. × or Escape puts
							it back.
						</li>
						<li>
							Drag a Card and let go: it springs home with your
							speed.
						</li>
						<li>
							Drop a Card on the right-hand Pane; drag it back.
						</li>
						<li>
							Throw a Card hard past an edge to send it away. Deal
							brings it back.
						</li>
						<li>Grab a Card while it is still moving.</li>
						<li>
							Press F over a Card (or on a focused one) to turn it
							over.
						</li>
						<li>
							Drag the Split, resize the window or zoom while
							Cards rest or fly.
						</li>
					</ul>
				</InspectorSection>
				<DeckSection actions={actions} />
				<InspectorSection title="Turn">
					<div className="flex flex-wrap gap-1">
						<TopCardTurn actions={actions} />
						<button
							type="button"
							className={button}
							onClick={() => actions.turnAll()}
						>
							Turn every Card
						</button>
					</div>
					<TurnKnobs feel={turn} onChange={setTurn} />
					<p className="text-xs text-ink-muted">
						How a reader turns a Note is #1315's prototype; F and
						these buttons only drive the turn.
					</p>
				</InspectorSection>
				<InspectorSection title="Motion">
					<InspectorChoice<ReducedChoice>
						label="Reduced motion"
						value={reducedMotion}
						options={[
							{ value: "off", label: "off" },
							{ value: "system", label: "system" },
							{ value: "on", label: "on" },
						]}
						onChange={setReducedMotion}
					/>
					<InspectorChoice<`${(typeof TIME_SCALES)[number]}`>
						label="Slow-mo"
						value={
							`${timeScale}` as `${(typeof TIME_SCALES)[number]}`
						}
						options={TIME_SCALES.map((scale) => ({
							value: `${scale}`,
							label: `${scale.toString()}×`,
						}))}
						onChange={(scale) => setTimeScale(Number(scale))}
					/>
					<InspectorChoice<"ltr" | "rtl">
						label="Direction"
						value={rtl ? "rtl" : "ltr"}
						options={[
							{ value: "ltr", label: "LTR" },
							{ value: "rtl", label: "RTL" },
						]}
						onChange={(dir) => setRtl(dir === "rtl")}
					/>
				</InspectorSection>
			</Inspector>
		</>
	);
}

/** deck-of-cards' tricks on the Ground's Deck, with its timing and stagger. */
function DeckSection({ actions }: { readonly actions: SceneActions }) {
	const tricks: readonly (readonly [string, () => unknown])[] = [
		["Deal", actions.deal],
		["Fan", actions.fan],
		["Shuffle", actions.shuffle],
		["Sort", actions.sort],
	];
	return (
		<InspectorSection title="Deck">
			<div className="flex flex-wrap gap-1">
				{tricks.map(([label, play]) => (
					<button
						key={label}
						type="button"
						className={button}
						onClick={() => void play()}
					>
						{label}
					</button>
				))}
			</div>
			<InspectorChoice<"260" | "120">
				label="Fan spread"
				value={actions.scene.spread === 120 ? "120" : "260"}
				options={[
					{ value: "260", label: "260° (deck-of-cards)" },
					{ value: "120", label: "120°" },
				]}
				onChange={(spread) => actions.setSpread(Number(spread))}
			/>
		</InspectorSection>
	);
}

function TopCardTurn({ actions }: { readonly actions: SceneActions }) {
	const top = actions.scene.cards.ground.at(-1);
	return (
		<button
			type="button"
			className={button}
			disabled={!top}
			onClick={() => top && actions.turn(top)}
		>
			Turn the top Card
		</button>
	);
}

const TURN_KNOBS = {
	ms: [0, 300, 600],
	perspective: [300, 600, 1200],
	lift: [0, 0.06, 0.12],
} as const;

/** #1313's turn knobs: length, perspective, lift edge on and the axis. */
function TurnKnobs({
	feel,
	onChange,
}: {
	readonly feel: TurnFeel;
	readonly onChange: (feel: TurnFeel) => void;
}) {
	return (
		<>
			<InspectorChoice
				label="Length"
				value={`${feel.ms}`}
				options={TURN_KNOBS.ms.map((ms) => ({
					value: `${ms}`,
					label: ms === 0 ? "instant" : `${ms} ms`,
				}))}
				onChange={(ms) => onChange({ ...feel, ms: Number(ms) })}
			/>
			<InspectorChoice
				label="Perspective"
				value={`${feel.perspective}`}
				options={TURN_KNOBS.perspective.map((px) => ({
					value: `${px}`,
					label: `${px} px`,
				}))}
				onChange={(px) =>
					onChange({ ...feel, perspective: Number(px) })
				}
			/>
			<InspectorChoice
				label="Lift edge on"
				value={`${feel.lift}`}
				options={TURN_KNOBS.lift.map((lift) => ({
					value: `${lift}`,
					label: lift === 0 ? "none" : `${Math.round(lift * 100)}%`,
				}))}
				onChange={(lift) => onChange({ ...feel, lift: Number(lift) })}
			/>
			<InspectorChoice<TurnFeel["axis"]>
				label="Axis"
				value={feel.axis}
				options={[
					{ value: "x", label: "long (X)" },
					{ value: "y", label: "short (Y)" },
				]}
				onChange={(axis) => onChange({ ...feel, axis })}
			/>
		</>
	);
}
