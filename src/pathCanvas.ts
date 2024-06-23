import { PanelState } from "./state";

//  TODO
//  - detect resizing of canvas element
//  - detect zoom, drag

export async function drawOnCanvas(panelState: PanelState, canvas: HTMLCanvasElement) {  
  const {paths, viewCorners} = panelState

  const viewWidth = viewCorners.x2 - viewCorners.x1
  const viewHeight = viewCorners.y2 - viewCorners.y1

  const ctx = canvas.getContext("2d")

  if (!ctx) {
    return
  }

  // Set the bottom left corner to be (0,0) and scale to match view width and height
  ctx.translate(0, canvas.height)
  ctx.scale(canvas.width/viewWidth, -canvas.height/viewHeight)
  // Translate so that bottom left view corner is the bottom left corner of the canvas
  ctx.translate(-viewCorners.x1, -viewCorners.y1)

  ctx.fillStyle = "white"
  ctx.fillRect(viewCorners.x1, viewCorners.y1, viewWidth, viewHeight);

  ctx.strokeStyle = "black"
  ctx.lineWidth = 1.5 * viewWidth/canvas.width // Line is same thickness regardless of zoom
  ctx.lineCap = "round"

  paths.forEach(path => {
    ctx.beginPath()
    path.positions.forEach((pos, index) => {
      if (index === 0) {
        ctx.moveTo(pos.x, pos.y)
      } else {
        ctx.lineTo(pos.x, pos.y)
      }
    });
    ctx.stroke()
  })

  ctx.resetTransform()
}