export type XYPair = {
	x: string;
	y: number;
};

export type Model = {
	matrix: XYPair[];
	baseline: {
		good: { min?: number; max?: number; avg?: number };
		bad: { min?: number; max?: number; avg?: number };
	};
};
