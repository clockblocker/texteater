import { cubicBezier, TW_EASE_IN_OUT } from "../motion";
import {
	colorMix,
	mix,
	type Scene,
	type SceneGroup,
	scene,
	segment,
} from "../scene";

/**
 * READING — motion inside running text and a Note that is still loading.
 * The sheen is `--animate-bone` in `battery/lego/src/styles.css`; the tone
 * change is the `ReaderSegment`'s colour transition; the focus dim is the
 * definition sentence in `renderers/reading/definition/static.tsx`.
 */

/* ---------------------------------------------------------------- sheen */

/** `bone 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite`, −60vw → 110vw. */
const BONE_MS = 2400;
const BONE_EASE = cubicBezier(0.4, 0, 0.6, 1);
const BONE_FROM_VW = -60;
const BONE_TO_VW = 110;

export type SheenFrame = {
	/** The band's `background-position-x`, in vw. */
	readonly position: number;
};

type SheenScene = Omit<Scene<SheenFrame>, "Render">;

const sheenFrame = (t: number): SheenFrame => ({
	position: mix(BONE_FROM_VW, BONE_TO_VW, segment(t, 0, BONE_MS, BONE_EASE)),
});

const boneSheen: SheenScene = {
	key: "bone-sheen",
	title: "Bone sheen",
	source: "lego/styles.css · --animate-bone · bone-sheen",
	where: "main app",
	knobs: [],
	length: () => BONE_MS,
	frame: sheenFrame,
};

const wordSheen: SheenScene = {
	key: "word-sheen",
	title: "Word sheen",
	source: "lego/styles.css · word-sheen · ReaderSegment tone=resolving",
	where: "main app",
	knobs: [],
	length: () => BONE_MS,
	frame: sheenFrame,
};

function sheenStyle(position: number, band: string) {
	return {
		backgroundImage: `linear-gradient(100deg, transparent 30%, ${band} 50%, transparent 70%)`,
		backgroundAttachment: "fixed" as const,
		backgroundRepeat: "no-repeat" as const,
		backgroundSize: "50vw 100vh",
		backgroundPosition: `${position.toFixed(2)}vw 0`,
	};
}

function Stage({ children }: { readonly children: React.ReactNode }) {
	return (
		<div className="relative flex h-[13rem] flex-col justify-center overflow-hidden rounded-[0.7rem] bg-paper px-6">
			{children}
		</div>
	);
}

function Bones({ frame }: { readonly frame: SheenFrame }) {
	const ink = sheenStyle(
		frame.position,
		"color-mix(in srgb, var(--ink) 18%, transparent)",
	);
	return (
		<Stage>
			<div className="space-y-3">
				<span
					className="inline-block h-[1.1em] w-[7rem] rounded-[0.22em] bg-primary/25 align-middle"
					style={ink}
				/>
				<div className="space-y-2 text-[0.85rem] leading-relaxed">
					{["92%", "78%", "86%"].map((width) => (
						<span
							key={width}
							className="block h-[0.7em] rounded-[0.22em] bg-line"
							style={{ ...ink, width }}
						/>
					))}
				</div>
			</div>
		</Stage>
	);
}

function Resolving({ frame }: { readonly frame: SheenFrame }) {
	return (
		<Stage>
			<p className="font-serif text-[1.05rem] leading-relaxed text-ink">
				Nur der Wind kannte{" "}
				<span
					className="bg-ink bg-clip-text text-transparent underline decoration-dashed decoration-[0.09em] underline-offset-[0.18em]"
					style={{
						...sheenStyle(frame.position, "var(--word-known)"),
						textDecorationColor: "var(--word-resolving)",
					}}
				>
					noch
				</span>{" "}
				den Weg hinein.
			</p>
		</Stage>
	);
}

/* ----------------------------------------------------------------- tone */

const TONE_MS = 150;

export type ToneFrame = {
	/** 0 unknown, 1 known. */
	readonly p: number;
};

const toneChange = scene<ToneFrame>({
	key: "tone-change",
	title: "Tone change",
	source: "lego/molecules/reader-segment.tsx · transition-colors duration-150",
	where: "main app",
	knobs: [],
	length: () => TONE_MS,
	frame: (t) => ({ p: segment(t, 0, TONE_MS, TW_EASE_IN_OUT) }),
	Render: ({ frame }) => (
		<Stage>
			<p className="font-serif text-[1.05rem] leading-relaxed text-ink">
				Nur der Wind kannte{" "}
				<span
					style={{
						color: colorMix(
							"var(--word-unknown)",
							"var(--word-known)",
							frame.p,
						),
					}}
				>
					noch
				</span>{" "}
				den Weg hinein.
			</p>
		</Stage>
	),
});

/* ---------------------------------------------------------------- focus */

const FOCUS_MS = 150;

export type FocusFrame = {
	readonly opacity: number;
};

const definitionFocus = scene<FocusFrame>({
	key: "definition-focus",
	title: "Definition dims",
	source: "renderers/reading/definition/static.tsx · data-focused",
	where: "main app",
	knobs: [],
	length: () => FOCUS_MS,
	frame: (t) => ({
		opacity: mix(1, 0.7, segment(t, 0, FOCUS_MS, TW_EASE_IN_OUT)),
	}),
	Render: ({ frame }) => (
		<Stage>
			<div className="space-y-1 text-[0.9rem] leading-relaxed text-ink">
				<p className="px-2 py-1" style={{ opacity: frame.opacity }}>
					<span className="text-word-known">noch</span> — still, yet;
					up to this moment.
				</p>
				<p className="px-2 py-1">
					Nur der Wind kannte{" "}
					<span className="text-word-known underline decoration-[0.11em] underline-offset-[0.18em]">
						noch
					</span>{" "}
					den Weg hinein.
				</p>
			</div>
		</Stage>
	),
});

/* --------------------------------------------------------------- group */

export const READING: SceneGroup = {
	key: "reading",
	title: "Reading",
	scenes: [
		scene<SheenFrame>({ ...boneSheen, Render: Bones }),
		scene<SheenFrame>({ ...wordSheen, Render: Resolving }),
		toneChange,
		definitionFocus,
	],
};
