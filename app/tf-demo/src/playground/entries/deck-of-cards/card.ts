import { animationFrames } from "./animation-frames";
import { deckModules } from "./deck-modules";
import { type EaseName, ease } from "./ease";
import { translate } from "./translate";

// The z-index a dragged Card is lifted to, shared by every Card.
let maxZ = 52;

export type Side = "front" | "back";

type AnimateToParams = {
	readonly delay: number;
	readonly duration: number;
	readonly x?: number;
	readonly y?: number;
	readonly rot?: number;
	/** `cubicInOut` when left out. */
	readonly ease?: EaseName;
	readonly onStart?: () => void;
	readonly onProgress?: (t: number, et: number) => void;
	readonly onComplete?: () => void;
};

type Done = (i: number) => void;

/**
 * One playing card: `i` 0–51 is suit × 13 + rank − 1, and 52–54 are the
 * jokers. `x`, `y` and `rot` are where it was last put, in px and degrees.
 */
export type Card = {
	i: number;
	rank: number;
	suit: number;
	pos: number;
	x: number;
	y: number;
	z: number;
	rot: number;
	side?: Side;
	$el: HTMLDivElement;
	$root?: HTMLElement | null;
	mount: (target: HTMLElement) => void;
	unmount: () => void;
	setSide: (newSide: Side) => void;
	animateTo: (params: AnimateToParams) => void;
	setRankSuit: (rank: number, suit: number) => void;
	enableDragging: () => void;
	enableFlipping: () => void;
	disableFlipping: () => void;
	disableDragging: () => void;
	// Added by `modules/*`.
	bysuit: (cb: Done) => void;
	fan: (i: number, len: number, cb: Done) => void;
	intro: (i: number, cb?: Done) => void;
	poker: (i: number, len: number, cb: Done) => void;
	shuffle: (cb: Done) => void;
	sort: (i: number, len: number, cb: Done, reverse?: boolean) => void;
};

/** Creates Card `i`, back side up, with every module in `deckModules`. */
export function Card(i: number): Card {
	// calculate rank/suit, etc..
	const rank = (i % 13) + 1;
	const suit = (i / 13) | 0;
	const z = (52 - i) / 4;

	// create elements
	const $el = document.createElement("div");
	const $face = document.createElement("div");
	const $back = document.createElement("div");

	// states
	let isDraggable = false;
	let isFlippable = false;

	// self = card; the setters below and the modules fill in the rest
	const self = {
		i,
		rank,
		suit,
		pos: i,
		$el,
		mount,
		unmount,
		setSide,
	} as Card;

	const modules = deckModules;

	// add classes
	$face.classList.add("face");
	$back.classList.add("back");

	// add default transform
	$el.style.transform = translate(`${-z}px`, `${-z}px`);

	// add default values
	self.x = -z;
	self.y = -z;
	self.z = z;
	self.rot = 0;

	// set default side to back
	self.setSide("back");

	// add drag/click listeners
	$el.addEventListener("mousedown", onMousedown);
	$el.addEventListener("touchstart", onMousedown);

	// load modules
	for (const module of Object.values(modules)) {
		module.card?.(self);
	}

	self.animateTo = (params) => {
		const {
			delay,
			duration,
			x = self.x,
			y = self.y,
			rot = self.rot,
			ease: easeName,
			onStart,
			onProgress,
			onComplete,
		} = params;
		let startX = 0;
		let startY = 0;
		let startRot = 0;

		animationFrames(delay, duration)
			.start(() => {
				startX = self.x || 0;
				startY = self.y || 0;
				startRot = self.rot || 0;
				onStart?.();
			})
			.progress((t) => {
				const et = ease[easeName || "cubicInOut"](t);

				const diffX = x - startX;
				const diffY = y - startY;
				const diffRot = rot - startRot;

				onProgress?.(t, et);

				self.x = startX + diffX * et;
				self.y = startY + diffY * et;
				self.rot = startRot + diffRot * et;

				$el.style.transform =
					translate(`${self.x}px`, `${self.y}px`) +
					(diffRot ? `rotate(${self.rot}deg)` : "");
			})
			.end(() => {
				onComplete?.();
			});
	};

	// set rank & suit
	self.setRankSuit = (rank, suit) => {
		$el.setAttribute("class", `card ${suitName(suit)} rank${rank}`);
	};

	self.setRankSuit(rank, suit);

	self.enableDragging = () => {
		// this activates dragging
		if (isDraggable) {
			// already is draggable, do nothing
			return;
		}
		isDraggable = true;
		$el.style.cursor = "move";
	};

	self.enableFlipping = () => {
		if (isFlippable) {
			// already is flippable, do nothing
			return;
		}
		isFlippable = true;
	};

	self.disableFlipping = () => {
		if (!isFlippable) {
			// already disabled flipping, do nothing
			return;
		}
		isFlippable = false;
	};

	self.disableDragging = () => {
		if (!isDraggable) {
			// already disabled dragging, do nothing
			return;
		}
		isDraggable = false;
		$el.style.cursor = "";
	};

	return self;

	function onMousedown(e: MouseEvent | TouchEvent) {
		const startPos = { x: 0, y: 0 };
		const pos = { x: 0, y: 0 };
		const starttime = Date.now();

		e.preventDefault();

		// get start coordinates and start listening window events
		if (e instanceof MouseEvent) {
			startPos.x = pos.x = e.clientX;
			startPos.y = pos.y = e.clientY;
			window.addEventListener("mousemove", onMousemove);
			window.addEventListener("mouseup", onMouseup);
		} else {
			const touch = e.touches[0];
			if (!touch) return;
			startPos.x = pos.x = touch.clientX;
			startPos.y = pos.y = touch.clientY;
			window.addEventListener("touchmove", onMousemove);
			window.addEventListener("touchend", onMouseup);
		}

		if (!isDraggable) {
			// is not draggable, do nothing
			return;
		}

		// move card
		$el.style.transform =
			translate(`${self.x}px`, `${self.y}px`) +
			(self.rot ? ` rotate(${self.rot}deg)` : "");
		$el.style.zIndex = String(maxZ);
		maxZ++;

		function onMousemove(e: MouseEvent | TouchEvent) {
			if (!isDraggable) {
				// is not draggable, do nothing
				return;
			}
			if (e instanceof MouseEvent) {
				pos.x = e.clientX;
				pos.y = e.clientY;
			} else {
				const touch = e.touches[0];
				if (!touch) return;
				pos.x = touch.clientX;
				pos.y = touch.clientY;
			}

			// move card
			$el.style.transform =
				translate(
					`${Math.round(self.x + pos.x - startPos.x)}px`,
					`${Math.round(self.y + pos.y - startPos.y)}px`,
				) + (self.rot ? ` rotate(${self.rot}deg)` : "");
		}

		function onMouseup(e: MouseEvent | TouchEvent) {
			if (isFlippable && Date.now() - starttime < 200) {
				// flip sides
				self.setSide(self.side === "front" ? "back" : "front");
			}
			if (e instanceof MouseEvent) {
				window.removeEventListener("mousemove", onMousemove);
				window.removeEventListener("mouseup", onMouseup);
			} else {
				window.removeEventListener("touchmove", onMousemove);
				window.removeEventListener("touchend", onMouseup);
			}
			if (!isDraggable) {
				// is not draggable, do nothing
				return;
			}

			// set current position
			self.x = self.x + pos.x - startPos.x;
			self.y = self.y + pos.y - startPos.y;
		}
	}

	function mount(target: HTMLElement) {
		// mount card to target (deck)
		target.appendChild($el);

		self.$root = target;
	}

	function unmount() {
		// unmount from root (deck)
		self.$root?.removeChild($el);
		self.$root = null;
	}

	function setSide(newSide: Side) {
		// flip sides
		if (newSide === "front") {
			if (self.side === "back") {
				$el.removeChild($back);
			}
			self.side = "front";
			$el.appendChild($face);
			self.setRankSuit(self.rank, self.suit);
		} else {
			if (self.side === "front") {
				$el.removeChild($face);
			}
			self.side = "back";
			$el.appendChild($back);
			$el.setAttribute("class", "card");
		}
	}
}

function suitName(suit: number) {
	// return suit name from suit value
	if (suit === 0) return "spades";
	if (suit === 1) return "hearts";
	if (suit === 2) return "clubs";
	if (suit === 3) return "diamonds";
	return "joker";
}
