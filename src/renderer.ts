import { Path, ViewCorners } from "./types";

export function drawOnCanvas(
  paths: Path[],
  viewCorners: ViewCorners,
  canvas: HTMLCanvasElement,
): void {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    return;
  }

  const viewWidth = viewCorners.x2 - viewCorners.x1;
  const viewHeight = viewCorners.y2 - viewCorners.y1;

  // Set the bottom left corner to be (0,0) and scale to match view width and height
  ctx.translate(0, canvas.height);
  ctx.scale(canvas.width / viewWidth, -canvas.height / viewHeight);
  // Translate so that bottom left view corner is the bottom left corner of the canvas
  ctx.translate(-viewCorners.x1, -viewCorners.y1);

  ctx.fillStyle = "white";
  ctx.fillRect(viewCorners.x1, viewCorners.y1, viewWidth, viewHeight);

  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2 * (viewWidth / canvas.width); // Line is same thickness regardless of zoom
  ctx.lineCap = "round";

  let posInView = true;
  let prevPosInView = true;

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];

    const startPos = path.positions[0];
    if (!startPos) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);

    for (let j = 1; j < path.positions.length; j++) {
      const pos = path.positions[j]!;
      const { x, y } = pos;
      posInView =
        x > viewCorners.x1 && x < viewCorners.x2 && y > viewCorners.y1 && y < viewCorners.y2;
      if (!posInView && !prevPosInView) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      prevPosInView = posInView;
    }

    ctx.stroke();
  }

  ctx.resetTransform();
}
