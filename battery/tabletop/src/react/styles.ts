/**
 * The Table's stylesheet. Rest is CSS: a Body's seat sits on its Slot
 * through `anchor()` and `anchor-size()`, and the Body fills it, reading
 * its rotation, scale and side from `--rest-*`, which React writes; the
 * seat stacks by `--rest-z`, doubled so a crossing can draw a Body just
 * below the ones it crosses. Everything in flight is written by the
 * Table's one writer straight on the Body's own properties (`paint.ts`)
 * and taken off again at rest. Held and leaving Bodies' seats stand on a
 * px box (`--seat-*`) instead of their Slot. While the Table reads Parts,
 * `[data-tabletop-measuring]` takes every transform off. Every custom
 * property here is registered and doesn't inherit.
 *
 * The Table's frame loop is the only clock on its own elements: no CSS
 * transition or animation runs on a Slot, seat, Body, shell, face, Part,
 * Glare or veil, whatever the page's stylesheet says. A page-wide rule
 * such as a reduced-motion `transition-duration: 0.01ms` on `*` would
 * otherwise turn every write into a transition: the layout ones (a
 * Slot's place, a seat's stacking, every `--rest-*`) a frame behind the
 * composited ones (`translate`, `rotate`, `scale`, `opacity`), so a frame
 * draws a Body on its old Slot with its new offset (#1322).
 */

/** The Table's own elements: what its writer and its CSS rest alone move. */
const OWN = [
	"[data-tabletop-slot]",
	"[data-tabletop-seat]",
	"[data-tabletop-body]",
	"[data-tabletop-shell]",
	"[data-tabletop-face]",
	"[data-tabletop-part]",
	"[data-tabletop-glare]",
	"[data-tabletop-veils]",
	"[data-tabletop-veils] *",
].join(",");

const LENGTHS = ["--seat-x", "--seat-y", "--seat-w", "--seat-h"];
const ANGLES = ["--rest-rotate", "--fly-turn", "--rest-turn"];
const PERCENTAGES = ["--glare-x", "--glare-y"];
const NUMBERS: readonly (readonly [string, number])[] = [
	["--rest-scale", 1],
	["--turn-lift", 1],
	["--glare-o", 0],
];
const INTEGERS = ["--rest-z"];

function property(name: string, syntax: string, initial: string | number) {
	return `@property ${name}{syntax:"${syntax}";inherits:false;initial-value:${initial}}`;
}

const REGISTERED = [
	...LENGTHS.map((name) => property(name, "<length>", "0px")),
	...ANGLES.map((name) => property(name, "<angle>", "0deg")),
	...PERCENTAGES.map((name) => property(name, "<percentage>", "50%")),
	...NUMBERS.map(([name, initial]) => property(name, "<number>", initial)),
	...INTEGERS.map((name) => property(name, "<integer>", 0)),
].join("\n");

const TURN = "calc(var(--rest-turn) + var(--fly-turn))";

export const TABLE_CSS = `${REGISTERED}
${OWN}{transition:none!important;animation:none!important}
[data-tabletop]{--dir:1;isolation:isolate}
[data-tabletop][dir="rtl"]{--dir:-1}
[data-tabletop-region]{position:relative;container-type:size}
[data-tabletop-slot]{position:absolute;visibility:hidden;pointer-events:none}
[data-tabletop-veils]{position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none}
[data-tabletop-origin]{position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none}
[data-tabletop-seat]{position:fixed;margin:0;inset:auto;
top:anchor(top);left:anchor(left);width:anchor-size(width);height:anchor-size(height);
z-index:calc(var(--rest-z) * 2);contain:size layout;position-visibility:always;pointer-events:none}
[data-tabletop-seat][data-mode]{top:var(--seat-y);left:var(--seat-x);width:var(--seat-w);height:var(--seat-h)}
[data-tabletop-body]{position:absolute;margin:0;box-sizing:border-box;inset:auto;top:0;left:0;
width:100%;height:100%;rotate:calc(var(--dir) * var(--rest-rotate));scale:var(--rest-scale);
transform-origin:50% 50%;contain:layout;pointer-events:auto;
touch-action:none;user-select:none;-webkit-user-select:none}
[data-tabletop-seat][data-mode="unmoored"]>[data-tabletop-body]{pointer-events:none}
[data-tabletop-shell]{display:grid;width:100%;height:100%;transform-style:preserve-3d;
transform:perspective(var(--turn-perspective,600px)) rotateY(calc(var(--dir) * ${TURN})) scale(var(--turn-lift))}
[data-turn-axis="x"] [data-tabletop-shell]{transform:perspective(var(--turn-perspective,600px)) rotateX(${TURN}) scale(var(--turn-lift))}
[data-tabletop-face]{grid-area:1/1;position:relative;min-width:0;min-height:0;
backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;contain:layout paint;isolation:isolate}
[data-tabletop-face="back"]{transform:rotateY(180deg)}
[data-turn-axis="x"] [data-tabletop-face="back"]{transform:rotateX(180deg)}
[data-reduced] [data-tabletop-shell],[data-reduced] [data-tabletop-face="back"]{transform:none}
[data-reduced] [data-tabletop-shell][data-side="back"]>[data-tabletop-face="front"]{opacity:0}
[data-tabletop-measuring]{rotate:none!important;scale:none!important;transform:none!important}
[data-tabletop-measuring] :is([data-tabletop-shell],[data-tabletop-face]){transform:none!important}
[data-tabletop-measuring] [data-tabletop-part]{translate:none!important}
[data-tabletop-glare]{position:absolute;inset:0;pointer-events:none;border-radius:inherit;opacity:var(--glare-o);mix-blend-mode:screen;
background:radial-gradient(farthest-corner circle at var(--glare-x) var(--glare-y),#ffffff59 0%,#ffffff1a 35%,#0000 70%)}`;
