export type Position = {
    x: number;
    y: number;
    theta: number;
}

export type Path = {
    topic: string | undefined;
    positions: Position[];
    // TODO: add colour & thickness properties
}

// (x1, y1) and (x2, y2) are points on Cartesian plane representing the bottom left and top right view corners
export type PanelState = {
    paths: Path[];
    viewCorners: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }
}