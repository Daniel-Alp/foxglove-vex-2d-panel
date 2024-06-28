import { Path, ViewCorners } from "./types";

export async function drawOnCanvas(
  paths: Path[],
  viewCorners: ViewCorners,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const viewWidth = viewCorners.x2 - viewCorners.x1;
  const viewHeight = viewCorners.y2 - viewCorners.y1;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

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

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  paths?.forEach((path) => {
    ctx.beginPath();
    path.positions.forEach((pos, index) => {
      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    path.positions.forEach((pos, index) => {
      ctx.moveTo(pos.x, pos.y);
      const radius = index === path.positions.length - 1 ? 10 : 5;
      ctx.arc(pos.x, pos.y, radius * (viewWidth / canvas.width), 0, 2 * Math.PI);
    });
    ctx.fill();
    ctx.closePath();
  });

  ctx.resetTransform();
}
