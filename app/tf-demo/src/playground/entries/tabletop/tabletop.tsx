import { useState } from "react";
import { DEFAULT_TURN, type TiltFeel, type TurnFeel } from "tabletop/core";
import { Table, useTable } from "tabletop/react";
import { useMotionPreference } from "@/lib/motion-preference";
import { Inspector, InspectorChoice, InspectorSection } from "../inspector";
import { DealSection } from "./deal-knobs";
import { KNOB_BUTTON } from "./knobs";
import { SceneView } from "./scene-view";
import { NOTE_TILT, TiltSection } from "./tilt-knobs";
import type { TurnGesture } from "./turn-gesture";
import { TurnSection } from "./turn-knobs";
import { DEFAULT_DEAL, type DealFeel } from "./use-deal-word";
import { type SceneActions, useScene } from "./use-scene";

const TITLE = "Tabletop";

type ReducedChoice = "off" | "system" | "on";
const TIME_SCALES = [0.25, 0.5, 1] as const;

/* #1313's turn about the long axis: a Note Card is landscape, so that is X */
const NOTE_TURN: TurnFeel = { ...DEFAULT_TURN, axis: "x" };

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
	const [gesture, setGesture] = useState<TurnGesture>("control");
	const [tiltOn, setTiltOn] = useState(true);
	const [tilt, setTilt] = useState<TiltFeel>(NOTE_TILT);
	const [deal, setDeal] = useState<DealFeel>(DEFAULT_DEAL);
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
					tilt={tiltOn ? tilt : null}
					assert={import.meta.env.DEV}
					className="flex min-h-[36rem] min-w-0 flex-1 select-none"
				>
					<SceneView
						table={table}
						actions={actions}
						gesture={gesture}
						axis={turn.axis}
					/>
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
							Move the pointer over a Card: it tilts toward it and
							its glare lights. Hold it by a corner.
						</li>
						<li>
							Turn a Card over with the control in its corner, or
							press F over it (or on a focused one).
						</li>
						<li>
							Deal a word: its Card lands face down and turns up
							when its Knowledge does.
						</li>
						<li>
							Drag the Split, resize the window or zoom while
							Cards rest or fly.
						</li>
					</ul>
				</InspectorSection>
				<DeckSection actions={actions} />
				<TurnSection
					actions={actions}
					gesture={gesture}
					onGesture={setGesture}
					feel={turn}
					onChange={setTurn}
				/>
				<DealSection
					feel={deal}
					onChange={setDeal}
					onDeal={() => actions.dealWord(deal)}
				/>
				<TiltSection
					on={tiltOn}
					feel={tilt}
					onToggle={setTiltOn}
					onChange={setTilt}
				/>
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
						className={KNOB_BUTTON}
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
