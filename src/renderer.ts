import fieldImg from "./high_stakes.png";
import { Path, ViewCorners } from "./types";

export function drawOnCanvas(
  paths: Path[],
  viewCorners: ViewCorners,
  canvas: HTMLCanvasElement,
): void {
  const ctx = canvas.getContext("2d", { alpha: false });

  const field_img = new Image();
  field_img.src = fieldImg;

  function draw() {
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

    //Image viewcorners are (-72, -72) and (72, 72)
    ctx.drawImage(field_img, -72, -72, 144, 144);

    ctx.lineWidth = 2 * (viewWidth / canvas.width); // Line is same thickness regardless of zoom
    ctx.lineCap = "round";

    let posInView = true;
    let prevPosInView = true;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];

      if (path.positions.length === 0) {
        continue;
      }
      ctx.strokeStyle = path.color;

      let { x, y } = path.positions[0];
      let prevX = x;
      let prevY = y;

      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 1; j < path.positions.length; j++) {
        ({ x, y } = path.positions[j]);
        posInView =
          x > viewCorners.x1 && x < viewCorners.x2 && y > viewCorners.y1 && y < viewCorners.y2;

        // Skip drawing if distance between previously drawn and current point is too small
        const distance_sq = (x - prevX) * (x - prevX) + (y - prevY) * (y - prevY);
        // Equivalent to sqrt(distance_sq) / viewWidth < 20 / canvas.width
        if (distance_sq * canvas.width * canvas.width < 400 * viewWidth * viewWidth) {
          continue;
        }

        // Skip drawing if previous and current point are out of view
        if (prevPosInView) {
          ctx.lineTo(x, y);
        } else if (posInView) {
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
        }

        prevX = x;
        prevY = y;
        prevPosInView = posInView;
      }

      ctx.stroke();
    }

    ctx.resetTransform();
  }

  requestAnimationFrame(draw);
}
