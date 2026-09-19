import { createContext, type ReactNode, useContext, useMemo } from "react";
import * as spec from "./motion-spec";

export const DEFAULT_DECK_MOTION = {
	headingEdgeMs: spec.HEADING_EDGE.ms,
	openScale: spec.OPEN_SCALE,
	stiffness: spec.DRAG_SPRING.stiffness,
	damping: spec.DRAG_SPRING.damping,
	morphStiffness: spec.MORPH.stiffness,
	morphDamping: spec.MORPH.damping,
	durationScale: 1,
	zoneFeedbackMs: 150,
	holdMs: spec.LONG_PRESS_MS,
	groundPressMs: spec.GROUND_PRESS_MS,
	commitDistance: 88,
	throwVelocity: 0.3,
	armSlop: 8,
	clickSlop: 4,
	armReleaseMs: 650,
	velocityStaleMs: 100,
	settleTimeoutMs: spec.SETTLE_TIMEOUT_MS,
	/* an index into spec.SNAP_BACK_MODELS; see the note there */
	snapBackModel: spec.SNAP_BACK_MODELS.indexOf("under"),
	snapLandPx: spec.SNAP_LAND_PX,
	holdScale: spec.HOLD_SCALE,
	flyDistance: spec.FLY_DISTANCE,
	flyRotateTo: spec.FLY_ROTATE_TO,
	tiltMax: spec.TILT_MAX,
	tiltPerPx: 1 / 16,
	expandScaleMax: spec.EXPAND_SCALE_MAX,
	expandPerPx: 1 / 800,
	contextStaggerMs: spec.CONTEXT_STAGGER,
	contextStaggerMaxMs: spec.CONTEXT_STAGGER_MAX,
} as const;

type MotionParameters = {
	-readonly [K in keyof typeof DEFAULT_DECK_MOTION]: number;
};
/** Overrides affect the real renderer and gesture handler in both playgrounds. */
export type DeckMotionOverrides = Partial<MotionParameters> & {
	specs?: Partial<
		Record<
			| "border"
			| "clip"
			| "kindLabel"
			| "contexts"
			| "barEnter"
			| "barExit"
			| "flyTravel"
			| "flyRotate"
			| "flyFade"
			| "armLabel"
			| "holdRelease",
			spec.Tween
		>
	>;
};

export function resolveDeckMotion(overrides: DeckMotionOverrides = {}) {
	const p = { ...DEFAULT_DECK_MOTION, ...overrides };
	const transition = (value: spec.Spec) =>
		spec.motionOf(
			value.kind === "spring"
				? {
						...value,
						stiffness:
							value.stiffness /
							Math.max(0.01, p.durationScale) ** 2,
						damping:
							value.damping / Math.max(0.01, p.durationScale),
					}
				: {
						...value,
						ms: value.ms * p.durationScale,
						delayMs: value.delayMs * p.durationScale,
					},
		);
	return {
		...spec,
		transition,
		/* the drag spring keeps its `fromRest`, whatever the knobs say */
		SPRING: transition(spec.spring(p.stiffness, p.damping, true)),
		MORPH: transition(spec.spring(p.morphStiffness, p.morphDamping)),
		HEADING_EDGE: spec.tween(p.headingEdgeMs),
		OPEN_SCALE: p.openScale,
		ZONE_FEEDBACK_MS: p.zoneFeedbackMs * p.durationScale,
		LONG_PRESS_MS: p.holdMs,
		HOLD_SHRINK: spec.tween(
			p.holdMs / Math.max(0.01, p.durationScale),
			"linear",
		),
		GROUND_PRESS_MS: p.groundPressMs,
		GROUND_SHRINK: spec.tween(
			p.groundPressMs / Math.max(0.01, p.durationScale),
			"linear",
		),
		HOLD_SCALE: p.holdScale,
		ARM_SLOP: p.armSlop,
		CLICK_SLOP: p.clickSlop,
		COMMIT: p.commitDistance,
		THROW: p.throwVelocity,
		HOLD_RELEASE_MS: p.armReleaseMs,
		VELOCITY_STALE_MS: p.velocityStaleMs,
		SETTLE_TIMEOUT_MS: p.settleTimeoutMs * p.durationScale,
		SNAP_BACK:
			spec.SNAP_BACK_MODELS[Math.round(p.snapBackModel)] ?? "under",
		SNAP_LAND_PX: p.snapLandPx,
		FLY_DISTANCE: p.flyDistance,
		FLY_ROTATE_TO: p.flyRotateTo,
		TILT_MAX: p.tiltMax,
		leanFor: (dx: number) => spec.leanFor(dx, p.tiltMax, p.tiltPerPx),
		expandScaleFor: (dy: number) =>
			spec.expandScaleFor(dy, p.expandScaleMax, p.expandPerPx),
		contextDelayFor: (nth: number) =>
			Math.min(
				p.contextStaggerMaxMs,
				Math.max(0, nth) * p.contextStaggerMs,
			),
		NOTE_BORDER: p.specs?.border ?? spec.NOTE_BORDER,
		CLIP_FADE: p.specs?.clip ?? spec.CLIP_FADE,
		KIND_LABEL: p.specs?.kindLabel ?? spec.KIND_LABEL,
		CONTEXT_ITEM: p.specs?.contexts ?? spec.CONTEXT_ITEM,
		BAR_ENTER: p.specs?.barEnter ?? spec.BAR_ENTER,
		BAR_EXIT: p.specs?.barExit ?? spec.BAR_EXIT,
		FLY_TRAVEL: p.specs?.flyTravel ?? spec.FLY_TRAVEL,
		FLY_ROTATE: p.specs?.flyRotate ?? spec.FLY_ROTATE,
		FLY_FADE: p.specs?.flyFade ?? spec.FLY_FADE,
		ARM_LABEL: p.specs?.armLabel ?? spec.ARM_LABEL,
		HOLD_RELEASE: p.specs?.holdRelease ?? spec.HOLD_RELEASE,
	};
}

const DeckMotionContext = createContext(resolveDeckMotion());
export function DeckMotionProvider({
	motion,
	children,
}: {
	motion?: DeckMotionOverrides;
	children: ReactNode;
}) {
	const value = useMemo(() => resolveDeckMotion(motion), [motion]);
	return <DeckMotionContext value={value}>{children}</DeckMotionContext>;
}
export function useDeckMotion() {
	return useContext(DeckMotionContext);
}
