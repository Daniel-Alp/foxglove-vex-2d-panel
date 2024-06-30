import { useEffect, useRef, useState } from "react";

import { drawOnCanvas } from "./renderer";
import { Path, ViewCorners } from "./types";

function linearInterpolate(start: number, end: number, t: number) {
  return start + t * (end - start);
}

export function Canvas({ paths }: { paths: Path[] }): JSX.Element {
  const [viewCorners, setViewCorners] = useState<ViewCorners>({
    x1: -72,
    y1: -72,
    x2: 72,
    y2: 72,
  });
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawOnCanvas(paths, viewCorners, canvasRef.current!);
  }, [paths, viewCorners]);

  function handleOnWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    const boundingRect = e.currentTarget.getBoundingClientRect();
    const xCanvas = e.clientX - boundingRect.left;
    const yCanvas = boundingRect.height - (e.clientY - boundingRect.top);
    const { x1, y1, x2, y2 } = viewCorners;

    const xView = linearInterpolate(x1, x2, xCanvas / boundingRect.width);
    const yView = linearInterpolate(y1, y2, yCanvas / boundingRect.height);
    const t = Math.sign(e.deltaY) * -0.1;

    setViewCorners({
      x1: linearInterpolate(x1, xView, t),
      y1: linearInterpolate(y1, yView, t),
      x2: linearInterpolate(x2, xView, t),
      y2: linearInterpolate(y2, yView, t),
    });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging) {
      return;
    }
    const { width, height } = e.currentTarget.getBoundingClientRect();
    const { x1, y1, x2, y2 } = viewCorners;

    const viewMovementX = -e.movementX * ((x2 - x1) / width);
    const viewMovementY = e.movementY * ((y2 - y1) / height);

    setViewCorners({
      x1: x1 + viewMovementX,
      y1: y1 + viewMovementY,
      x2: x2 + viewMovementX,
      y2: y2 + viewMovementY,
    });
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          objectFit: "contain",
        }}
        width={720}
        height={720}
        ref={canvasRef}
        onWheel={handleOnWheel}
        onMouseMove={handleMouseMove}
        onMouseDown={() => {
          setDragging(true);
        }}
        onMouseUp={() => {
          setDragging(false);
        }}
        onMouseLeave={() => {
          setDragging(false);
        }}
      />
    </div>
  );
}
