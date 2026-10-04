type Dimensions = {
	height: number;
	width: number;
};

export type Point = {
	x: number;
	y: number;
};

export type Rect = Dimensions & Point;
