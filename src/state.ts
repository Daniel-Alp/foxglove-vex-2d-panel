export type Position = {
    x: number;
    y: number;
    theta: number;
}

export type Path = {
    topic: string;
    positions: Position[];
    // TODO: add colour & thickness properties
}

export type PanelState = {
    paths: Path[];
}