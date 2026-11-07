import { done, overAt, sumAt } from "../core/move";
import type { Engine } from "./engine";
import type { BodyState } from "./state";
import { setWritten } from "./write";

const SVG = "http://www.w3.org/2000/svg";

/** Where a Body is drawn: its centre (client px), unscaled size, scale and rotation (physical degrees). */
type Geometry = {
	readonly cx: number;
	readonly cy: number;
	readonly w: number;
	readonly h: number;
	readonly s: number;
	readonly rotate: number;
};

/** A crossed Body's shape cut out of the Body crossing it, and how much it shows there. */
type Cut = {
	readonly over: string;
	readonly w: number;
	readonly h: number;
	readonly rx: number;
	readonly matrix: readonly number[];
	readonly shows: number;
};

function geometryOf(
	engine: Engine,
	body: BodyState,
	now: number,
	rects: Map<string, DOMRect | null>,
): Geometry | null {
	let rect = rects.get(body.id);
	if (rect === undefined) {
		const box = body.mode === "rest" ? null : body.box;
		rect = box
			? new DOMRect(box.x, box.y, box.width, box.height)
			: body.place
				? engine.slotRect(body.place.slot)
				: null;
		rects.set(body.id, rect);
	}
	if (!rect) return null;
	const stance = engine.stance(body);
	const w = rect.width + sumAt(body.moves, "width", now);
	const h = rect.height + sumAt(body.moves, "height", now);
	return {
		cx: rect.left + sumAt(body.moves, "x", now) + w / 2,
		cy: rect.top + sumAt(body.moves, "y", now) + h / 2,
		w,
		h,
		s: stance.scale * (1 + sumAt(body.moves, "lift", now)),
		rotate: stance.rotate + sumAt(body.moves, "rotate", now),
	};
}

/**
 * `shape`'s rectangle in `frame`'s own untransformed px, as an SVG
 * `matrix()`: a mask is in its Body's own frame, and both Bodies may be
 * turned and scaled about their centres.
 */
function matrixOf(shape: Geometry, frame: Geometry): number[] {
	const rad = Math.PI / 180;
	const k = shape.s / frame.s;
	const phi = (shape.rotate - frame.rotate) * rad;
	const tb = frame.rotate * rad;
	const dx = shape.cx - frame.cx;
	const dy = shape.cy - frame.cy;
	const local = {
		x: (dx * Math.cos(tb) + dy * Math.sin(tb)) / frame.s + frame.w / 2,
		y: (-dx * Math.sin(tb) + dy * Math.cos(tb)) / frame.s + frame.h / 2,
	};
	const a = k * Math.cos(phi);
	const b = k * Math.sin(phi);
	const hx = shape.w / 2;
	const hy = shape.h / 2;
	return [
		a,
		b,
		-b,
		a,
		local.x - (a * hx - b * hy),
		local.y - (b * hx + a * hy),
	];
}

function apart(a: Geometry, b: Geometry): boolean {
	const reach = (g: Geometry) => (Math.hypot(g.w, g.h) * g.s) / 2;
	return Math.hypot(a.cx - b.cx, a.cy - b.cy) > reach(a) + reach(b);
}

function radiusOf(body: BodyState): number {
	if (body.radius === null) {
		const face = body.el?.querySelector("[data-tabletop-face]");
		body.radius = face
			? Number.parseFloat(getComputedStyle(face).borderTopLeftRadius) || 0
			: 0;
	}
	return body.radius;
}

/**
 * The stacking crossings, drawn. A Body crossing others is drawn above
 * every one of them for the length of its crossing, and each shows through
 * it as much as the crossing has come: the Body's mask has each crossed
 * Body's shape cut out at that share. A Body going back under the ones in
 * front fades out where they lie, so they come over it; one coming forward
 * fades in over them. A mask exists only on a Body crossing others it
 * overlaps, and only while it crosses. Chrome masks only inside the
 * border box, so the moving Body's own shadow is the one thing it leaves.
 */
export class Veils {
	svg: SVGSVGElement | null = null;
	private readonly masks = new Map<string, SVGMaskElement>();
	private readonly engine: Engine;

	constructor(engine: Engine) {
		this.engine = engine;
	}

	private idOf(body: string): string {
		return `${this.engine.prefix}-veil-${body.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
	}

	/** Every crossing's veils at `now`: read first, then written. */
	paint(now: number) {
		const { cuts, sizes } = this.collect(now);
		for (const [id, mask] of this.masks)
			if (!cuts.has(id)) {
				mask.remove();
				this.masks.delete(id);
				const body = this.engine.bodies.get(id);
				if (body?.el)
					setWritten(body.el.style, body.written, "mask-image", null);
			}
		for (const [id, list] of cuts) {
			const body = this.engine.bodies.get(id);
			const size = sizes.get(id);
			if (body?.el && size) this.write(body, size, list);
		}
	}

	/** Each crossing Body's cuts at `now`, and where it is drawn. */
	private collect(now: number) {
		const engine = this.engine;
		const rects = new Map<string, DOMRect | null>();
		const cuts = new Map<string, Cut[]>();
		const sizes = new Map<string, Geometry>();
		for (const body of engine.bodies.values()) {
			const move = body.moves.findLast((it) => it.crossing);
			if (
				!body.el ||
				!move?.crossing ||
				move.crossing.shape.kind === "step" ||
				done(move, now)
			)
				continue;
			const mover = geometryOf(engine, body, now, rects);
			if (!mover) continue;
			for (const [id, shows] of overAt(move, now)) {
				const other = shows > 0.001 ? engine.bodies.get(id) : undefined;
				const over = other?.el
					? geometryOf(engine, other, now, rects)
					: null;
				if (!other || !over || apart(mover, over)) continue;
				sizes.set(body.id, mover);
				cuts.set(body.id, [
					...(cuts.get(body.id) ?? []),
					{
						over: id,
						w: over.w,
						h: over.h,
						rx: radiusOf(other),
						matrix: matrixOf(over, mover),
						shows,
					},
				]);
			}
		}
		return { cuts, sizes };
	}

	private write(body: BodyState, size: Geometry, cuts: readonly Cut[]) {
		const svg = this.svg;
		const el = body.el;
		if (!svg || !el) return;
		let mask = this.masks.get(body.id);
		const id = this.idOf(body.id);
		if (!mask) {
			mask = document.createElementNS(SVG, "mask");
			mask.id = id;
			mask.dataset.tabletopVeil = body.id;
			mask.setAttribute("maskUnits", "userSpaceOnUse");
			mask.setAttribute("maskContentUnits", "userSpaceOnUse");
			mask.append(document.createElementNS(SVG, "rect"));
			svg.append(mask);
			this.masks.set(body.id, mask);
		}
		/* the mask reaches well past the box, so the Body's shadow stays */
		const area = {
			x: String(-size.w),
			y: String(-size.h),
			width: String(3 * size.w),
			height: String(3 * size.h),
		};
		for (const [key, value] of Object.entries(area))
			mask.setAttribute(key, value);
		const ground = mask.firstElementChild;
		if (ground) {
			for (const [key, value] of Object.entries(area))
				ground.setAttribute(key, value);
			ground.setAttribute("fill", "white");
		}
		const shapes = [...mask.children].slice(1);
		cuts.forEach((cut, index) => {
			let shape = shapes[index];
			if (!shape) {
				shape = document.createElementNS(SVG, "rect");
				mask.append(shape);
			}
			shape.setAttribute("data-over", cut.over);
			shape.setAttribute("width", String(cut.w));
			shape.setAttribute("height", String(cut.h));
			shape.setAttribute("rx", String(cut.rx));
			shape.setAttribute("fill", "black");
			shape.setAttribute("fill-opacity", cut.shows.toFixed(4));
			shape.setAttribute(
				"transform",
				`matrix(${cut.matrix.map((value) => value.toFixed(3)).join(" ")})`,
			);
		});
		for (const extra of shapes.slice(cuts.length)) extra.remove();
		setWritten(el.style, body.written, "mask-image", `url(#${id})`);
	}

	clear() {
		for (const mask of this.masks.values()) mask.remove();
		this.masks.clear();
	}
}
