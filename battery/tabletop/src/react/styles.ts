/**
 * The Table's stylesheet. Rest is CSS: a Body sits on its Slot through
 * `anchor()` and `anchor-size()`, and reads its rotation, scale, stacking
 * order and side from `--rest-*`, which React writes. Motion is the
 * `--fly-*` offsets the Table writes while something moves, added inside
 * `calc()` so the box really resizes. Held and leaving Bodies stand on a px
 * box (`--box-*`) instead of their Slot. Every property the Table writes is
 * registered and doesn't inherit, so a write restyles one element.
 */

const LENGTHS = [
	"--fly-x",
	"--fly-y",
	"--fly-w",
	"--fly-h",
	"--box-x",
	"--box-y",
	"--box-w",
	"--box-h",
	"--part-x",
	"--part-y",
];
const ANGLES = [
	"--fly-rotate",
	"--rest-rotate",
	"--box-rotate",
	"--fly-turn",
	"--rest-turn",
];
const NUMBERS: readonly (readonly [string, number])[] = [
	["--fly-lift", 0],
	["--fly-opacity", 0],
	["--part-o", 0],
	["--box-o", 1],
	["--rest-scale", 1],
	["--box-scale", 1],
	["--turn-lift", 1],
];
const INTEGERS = ["--fly-z", "--rest-z", "--box-z", "--fly-raise"];

function property(name: string, syntax: string, initial: string | number) {
	return `@property ${name}{syntax:"${syntax}";inherits:false;initial-value:${initial}}`;
}

const REGISTERED = [
	...LENGTHS.map((name) => property(name, "<length>", "0px")),
	...ANGLES.map((name) => property(name, "<angle>", "0deg")),
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
[data-tabletop-body]{position:fixed;margin:0;box-sizing:border-box;inset:auto;
top:anchor(top);left:anchor(left);
width:calc(anchor-size(width) + var(--fly-w));height:calc(anchor-size(height) + var(--fly-h));
translate:var(--fly-x) var(--fly-y);
rotate:calc(var(--dir) * var(--rest-rotate) + var(--fly-rotate));
scale:calc(var(--rest-scale) * (1 + var(--fly-lift)));
z-index:calc(var(--rest-z) + var(--fly-z) + var(--fly-raise) * 1000);
opacity:calc(1 + var(--fly-opacity));
transform-origin:50% 50%;contain:layout;position-visibility:always;
touch-action:none;user-select:none;-webkit-user-select:none}
[data-tabletop-body][data-mode]{top:var(--box-y);left:var(--box-x);
width:calc(var(--box-w) + var(--fly-w));height:calc(var(--box-h) + var(--fly-h));
rotate:calc(var(--box-rotate) + var(--fly-rotate));
scale:calc(var(--box-scale) * (1 + var(--fly-lift)));
z-index:calc(var(--box-z) + var(--fly-z));
opacity:calc(var(--box-o) + var(--fly-opacity))}
[data-tabletop-body][data-mode="unmoored"]{pointer-events:none}
[data-tabletop-shell]{display:grid;width:100%;height:100%;transform-style:preserve-3d;
transform:perspective(var(--turn-perspective,600px)) rotateY(calc(var(--dir) * ${TURN})) scale(var(--turn-lift))}
[data-turn-axis="x"] [data-tabletop-shell]{transform:perspective(var(--turn-perspective,600px)) rotateX(${TURN}) scale(var(--turn-lift))}
[data-tabletop-face]{grid-area:1/1;position:relative;min-width:0;min-height:0;
backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;contain:layout paint}
[data-tabletop-face="back"]{transform:rotateY(180deg)}
[data-turn-axis="x"] [data-tabletop-face="back"]{transform:rotateX(180deg)}
[data-reduced] [data-tabletop-shell],[data-reduced] [data-tabletop-face="back"]{transform:none}
[data-reduced] [data-tabletop-face="front"]{opacity:var(--turn-front,1)}
[data-reduced] [data-tabletop-shell][data-side="back"]>[data-tabletop-face="front"]{opacity:var(--turn-front,0)}
[data-tabletop-part]{translate:var(--part-x) var(--part-y);opacity:calc(1 + var(--part-o))}`;
