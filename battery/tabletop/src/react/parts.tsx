import {
	type CSSProperties,
	createContext,
	type HTMLAttributes,
	type ReactNode,
	use,
	useCallback,
	useLayoutEffect,
} from "react";
import type { Place, RegionId, SlotSpec } from "../core/place";
import { restAngle } from "../core/turn";
import type { Engine } from "./engine";
import { useTableHandle } from "./table";

type Styled = CSSProperties & Record<`--${string}`, string | number>;

/** Development check: an anchored Body follows its anchor's transformed box. */
function assertUntransformed(engine: Engine, el: HTMLElement, what: string) {
	if (!engine.assert) return;
	const style = getComputedStyle(el);
	const moved = [
		style.transform,
		style.translate,
		style.rotate,
		style.scale,
	].some((value) => value !== "none" && value !== "");
	if (moved)
		console.error(
			`tabletop: ${what} is transformed, so every Body anchored in it moves by its transformed box. Regions and Slots are never transformed.`,
		);
}

/**
 * A place on the Table that Presentations rest in: a Pane's element. It is
 * the anchor and the size container its Slots are laid out in (`%` and
 * `cq*` units reach its size), and it is never transformed.
 */
export function Region({
	id,
	style,
	children,
	...rest
}: HTMLAttributes<HTMLDivElement> & {
	readonly id: RegionId;
	readonly children?: ReactNode;
}) {
	const { engine } = useTableHandle();
	const ref = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			engine.regions.set(id, el);
			assertUntransformed(engine, el, `Region "${id}"`);
			return () => {
				if (engine.regions.get(id) === el) engine.regions.delete(id);
			};
		},
		[engine, id],
	);
	return (
		<div
			{...rest}
			ref={ref}
			data-tabletop-region={id}
			style={
				{
					...style,
					anchorName: engine.anchorOf(`region:${id}`),
				} as Styled
			}
		>
			{children}
		</div>
	);
}

/** An invisible box in its Region, laid out by ordinary CSS: where a Body rests. */
export function Slot({ spec }: { readonly spec: SlotSpec }) {
	const { engine } = useTableHandle();
	const ref = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			engine.slots.set(spec.id, el);
			assertUntransformed(engine, el, `Slot "${spec.id}"`);
			return () => {
				if (engine.slots.get(spec.id) === el)
					engine.slots.delete(spec.id);
			};
		},
		[engine, spec.id],
	);
	return (
		<div
			ref={ref}
			aria-hidden="true"
			data-tabletop-slot={spec.id}
			style={
				{
					...spec.style,
					anchorName: engine.anchorOf(spec.id),
				} as Styled
			}
		/>
	);
}

type BodyContextValue = { readonly id: string; readonly place: Place };
const BodyContext = createContext<BodyContextValue | null>(null);

function useBody(): BodyContextValue & { readonly engine: Engine } {
	const body = use(BodyContext);
	const { engine } = useTableHandle();
	if (!body) throw new Error("tabletop: render this inside a <Body>");
	return { ...body, engine };
}

function samePlace(a: Place, b: Place): boolean {
	return (
		a.slot === b.slot &&
		a.rotate === b.rotate &&
		a.scale === b.scale &&
		a.z === b.z &&
		a.side === b.side &&
		a.form === b.form
	);
}

/**
 * One Presentation's element, in every form. At rest it sits on its Place's
 * Slot by CSS anchoring, its box `anchor-size()` plus whatever is still to
 * go, so a resize, a zoom or a Split drag moves it in the Region's own
 * layout pass. The Table writes only the offsets of a move in flight.
 */
export function Body({
	id,
	place,
	style,
	children,
	...rest
}: HTMLAttributes<HTMLDivElement> & {
	readonly id: string;
	readonly place: Place;
	readonly children?: ReactNode;
}) {
	const { engine } = useTableHandle();
	const ref = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			engine.attach(id, el);
			return () => engine.detach(id, el);
		},
		[engine, id],
	);
	useLayoutEffect(() => {
		const body = engine.body(id);
		const was = body.place;
		body.place = place;
		if (
			engine.assert &&
			was &&
			!engine.transacting &&
			!samePlace(was, place)
		)
			console.warn(
				`tabletop: Body "${id}" changed its Place outside transact, so it jumped there. Commit model changes through the Table.`,
			);
	}, [engine, id, place]);
	return (
		<div
			{...rest}
			ref={ref}
			data-tabletop-body={id}
			data-form={place.form}
			style={
				{
					...style,
					positionAnchor: engine.anchorOf(place.slot),
					"--rest-rotate": `${place.rotate}deg`,
					"--rest-scale": place.scale,
					"--rest-z": Math.round(place.z),
				} as Styled
			}
		>
			<BodyContext value={{ id, place }}>{children}</BodyContext>
		</div>
	);
}

/**
 * A Body's two sides, back to back in one grid cell of a `preserve-3d`
 * shell: each hides when it faces away, and the shell turns about the
 * Body's axis. Paint containment sits on the faces, so the turn's lift is
 * never clipped. Under reduced motion the shell stays flat and the front
 * fades over the back.
 */
export function Shell({
	front,
	back,
	faceClassName,
}: {
	readonly front: ReactNode;
	readonly back: ReactNode;
	readonly faceClassName?: string;
}) {
	const { id, place, engine } = useBody();
	const ref = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			const body = engine.body(id);
			body.shell = el;
			return () => {
				if (body.shell === el) body.shell = null;
			};
		},
		[engine, id],
	);
	const down = place.side === "back";
	return (
		<div
			ref={ref}
			data-tabletop-shell=""
			data-side={place.side}
			style={{ "--rest-turn": `${restAngle(place.side)}deg` } as Styled}
		>
			<div
				data-tabletop-face="back"
				aria-hidden={!down}
				className={faceClassName}
			>
				{back}
			</div>
			<div
				data-tabletop-face="front"
				aria-hidden={down}
				className={faceClassName}
			>
				{front}
			</div>
		</div>
	);
}

/**
 * A part of a Body's face that keeps its identity across forms. When the
 * form changes it moves from where it was to its new place, by position
 * only. With `only`, it exists in that form alone and fades in once the
 * Body is most of the way there.
 */
export function Part({
	id,
	only,
	children,
	...rest
}: HTMLAttributes<HTMLDivElement> & {
	readonly id: string;
	readonly only?: string;
	readonly children?: ReactNode;
}) {
	const { id: bodyId, place, engine } = useBody();
	const ref = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			const body = engine.body(bodyId);
			body.parts.set(id, { id, el, terms: [], written: new Set() });
			return () => {
				if (body.parts.get(id)?.el === el) body.parts.delete(id);
			};
		},
		[engine, bodyId, id],
	);
	if (only !== undefined && only !== place.form) return null;
	return (
		<div {...rest} ref={ref} data-tabletop-part={id}>
			{children}
		</div>
	);
}

/**
 * A light layer for a face: a glare lit only while its Body is handled and
 * at opacity 0 everywhere else (#1314). Its look is plain CSS on
 * `--glare-x`, `--glare-y` (where the light sits) and `--glare-o`, which the
 * Body's tilt alone writes. Place it last in each face that should shine.
 */
export function Glare({ className }: { readonly className?: string }) {
	const { id, engine } = useBody();
	const ref = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			const body = engine.body(id);
			body.lights.add(el);
			return () => {
				body.lights.delete(el);
			};
		},
		[engine, id],
	);
	return (
		<div
			ref={ref}
			aria-hidden="true"
			data-tabletop-glare=""
			className={className}
		/>
	);
}
