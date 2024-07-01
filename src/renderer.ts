import competitionField from "./images/competition_field.png";
import emptyField from "./images/empty_field.png";
import skillsField from "./images/skills_field.png";
import { PanelState, ViewCorners } from "./types";

export function drawOnCanvas(
  panelState: PanelState,
  viewCorners: ViewCorners,
  canvas: HTMLCanvasElement,
): void {
  const ctx = canvas.getContext("2d", { alpha: false });
  const { paths, background } = panelState;

  const field_img = new Image();
  switch (background) {
    case "competition":
      field_img.src = competitionField;
      break;
    case "skills":
      field_img.src = skillsField;
      break;
    case "empty":
      field_img.src = emptyField;
      break;
  }

  function draw() {
    if (!ctx) {
      return;
    }

    const { x1, y1, x2, y2 } = viewCorners;

    const viewWidth = x2 - x1;
    const viewHeight = y2 - y1;

    // Set the bottom left corner to be (0,0) and scale to match view width and height
    ctx.translate(0, canvas.height);
    ctx.scale(canvas.width / viewWidth, -canvas.height / viewHeight);
    // Translate so that bottom left view corner is the bottom left corner of the canvas
    ctx.translate(-x1, -y1);

    ctx.fillStyle = "#808080";
    ctx.fillRect(x1, y1, viewWidth, viewHeight);

    // Image viewcorners are (-72, -72) and (72, 72)
    // The .pngs are already vertically flipped to avoid having to flip them again after canvas scale
    ctx.drawImage(field_img, -72, -72, 144, 144);

    ctx.lineWidth = 2 * (viewWidth / canvas.width); // Line is same thickness regardless of zoom

    let posInView = true;
    let prevPosInView = true;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];

      if (path.positions.length === 0) {
        continue;
      }
      ctx.strokeStyle = path.color;
      ctx.fillStyle = path.color;

      let { x, y } = path.positions[0];
      let prevX = x;
      let prevY = y;

      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 1; j < path.positions.length; j++) {
        ({ x, y } = path.positions[j]);
        posInView = x > x1 && x < x2 && y > y1 && y < y2;
        // Skip drawing if distance between previously drawn and current point is too small
        const distance_sq = (x - prevX) * (x - prevX) + (y - prevY) * (y - prevY);
        // Equivalent to sqrt(distance_sq) / viewWidth < 15 / canvas.width
        if (distance_sq * canvas.width * canvas.width < 225 * viewWidth * viewWidth) {
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

      // Draw arrow indicating heading of final position
      const theta = paths[i].positions[paths[i].positions.length - 1].theta;

      ctx.beginPath();
      ctx.moveTo(x + Math.sin(theta) * 4, y + Math.cos(theta) * 4);
      ctx.lineTo(x + Math.cos(theta) * 2, y - Math.sin(theta) * 2);
      ctx.lineTo(x - Math.cos(theta) * 2, y + Math.sin(theta) * 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.resetTransform();
  }

  requestAnimationFrame(draw);
}
