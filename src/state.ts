export type Position = {
    x: number;
    y: number;
    theta: number;
}

export type Path = {
    positions: Position[];
    // TODO: add colour & thickness properties
}

export type PanelState = {
    paths: Record<string, Path>;
}