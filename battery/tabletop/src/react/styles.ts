/**
 * The Table's stylesheet. Rest is CSS: a Body's seat sits on its Slot
 * through `anchor()` and `anchor-size()`, and the Body fills it, reading
 * its rotation, scale and side from `--rest-*`, which React writes; the
 * seat reads the stacking order. Motion is the `--fly-*` offsets the Table
 * writes on the Body while something moves, added inside `calc()` so the
 * box really resizes. Held and leaving Bodies' seats stand on a px box
 * (`--seat-*`) instead of their Slot, and the Body on the hand's offset
 * from it (`--box-*`). A tilting Body leans by its `transform` (`--tilt-*`)
 * and lights its Glares (`--glare-*`). While the Table reads Parts,
 * `[data-tabletop-measuring]` takes every transform off. Every property
 * the Table writes is registered and doesn't inherit, so a write restyles
 * one element.
 */

const LENGTHS = [
	"--fly-x",
	"--fly-y",
	"--fly-w",
	"--fly-h",
	"--box-x",
	"--box-y",
	"--seat-x",
	"--seat-y",
	"--seat-w",
	"--seat-h",
	"--part-x",
	"--part-y",
];
const ANGLES = [
	"--fly-rotate",
	"--rest-rotate",
	"--box-rotate",
	"--fly-turn",
	"--rest-turn",
	"--tilt-x",
	"--tilt-y",
];
const PERCENTAGES = ["--glare-x", "--glare-y"];
const NUMBERS: readonly (readonly [string, number])[] = [
	["--fly-lift", 0],
	["--fly-opacity", 0],
	["--part-o", 0],
	["--box-o", 1],
	["--rest-scale", 1],
	["--box-scale", 1],
	["--turn-lift", 1],
	["--tilt-lift", 0],
	["--glare-o", 0],
];
const INTEGERS = ["--fly-z", "--rest-z", "--box-z", "--fly-raise"];

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
[data-tabletop]{--dir:1;isolation:isolate}
[data-tabletop][dir="rtl"]{--dir:-1}
[data-tabletop-region]{position:relative;container-type:size}
[data-tabletop-slot]{position:absolute;visibility:hidden;pointer-events:none}
[data-tabletop-origin]{position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none}
[data-tabletop-seat]{position:fixed;margin:0;inset:auto;
top:anchor(top);left:anchor(left);width:anchor-size(width);height:anchor-size(height);
z-index:calc(var(--rest-z) + var(--fly-z) + var(--fly-raise) * 1000);
contain:size layout;position-visibility:always;pointer-events:none}
[data-tabletop-seat][data-mode]{top:var(--seat-y);left:var(--seat-x);width:var(--seat-w);height:var(--seat-h);
z-index:calc(var(--box-z) + var(--fly-z))}
[data-tabletop-body]{position:absolute;margin:0;box-sizing:border-box;inset:auto;top:0;left:0;
width:calc(100% + var(--fly-w));height:calc(100% + var(--fly-h));
translate:var(--fly-x) var(--fly-y);
rotate:calc(var(--dir) * var(--rest-rotate) + var(--fly-rotate));
scale:calc(var(--rest-scale) * (1 + var(--fly-lift)));
opacity:calc(1 + var(--fly-opacity));
transform-origin:50% 50%;contain:layout;pointer-events:auto;
touch-action:none;user-select:none;-webkit-user-select:none}
[data-tabletop-seat][data-mode]>[data-tabletop-body]{translate:calc(var(--box-x) + var(--fly-x)) calc(var(--box-y) + var(--fly-y));
rotate:calc(var(--box-rotate) + var(--fly-rotate));
scale:calc(var(--box-scale) * (1 + var(--fly-lift)));
opacity:calc(var(--box-o) + var(--fly-opacity))}
[data-tabletop-seat][data-mode="unmoored"]>[data-tabletop-body]{pointer-events:none}
[data-tabletop-body][data-tilt]{transform:perspective(var(--tilt-perspective,600px)) rotateX(var(--tilt-x)) rotateY(calc(-1 * var(--dir) * var(--tilt-y))) scale(calc(1 + var(--tilt-lift)))}
[data-reduced] [data-tabletop-body]{transform:none}
[data-tabletop-shell]{display:grid;width:100%;height:100%;transform-style:preserve-3d;
transform:perspective(var(--turn-perspective,600px)) rotateY(calc(var(--dir) * ${TURN})) scale(var(--turn-lift))}
[data-turn-axis="x"] [data-tabletop-shell]{transform:perspective(var(--turn-perspective,600px)) rotateX(${TURN}) scale(var(--turn-lift))}
[data-tabletop-face]{grid-area:1/1;position:relative;min-width:0;min-height:0;
backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;contain:layout paint;isolation:isolate}
[data-tabletop-face="back"]{transform:rotateY(180deg)}
[data-turn-axis="x"] [data-tabletop-face="back"]{transform:rotateX(180deg)}
[data-reduced] [data-tabletop-shell],[data-reduced] [data-tabletop-face="back"]{transform:none}
[data-reduced] [data-tabletop-face="front"]{opacity:var(--turn-front,1)}
[data-reduced] [data-tabletop-shell][data-side="back"]>[data-tabletop-face="front"]{opacity:var(--turn-front,0)}
[data-tabletop-part]{translate:var(--part-x) var(--part-y);opacity:calc(1 + var(--part-o))}
[data-tabletop-measuring]{rotate:none!important;scale:none!important;transform:none!important}
[data-tabletop-measuring] :is([data-tabletop-shell],[data-tabletop-face]){transform:none!important}
[data-tabletop-measuring] [data-tabletop-part]{translate:none!important}
[data-tabletop-glare]{position:absolute;inset:0;pointer-events:none;border-radius:inherit;opacity:var(--glare-o);mix-blend-mode:screen;
background:radial-gradient(farthest-corner circle at var(--glare-x) var(--glare-y),#ffffff59 0%,#ffffff1a 35%,#0000 70%)}`;
