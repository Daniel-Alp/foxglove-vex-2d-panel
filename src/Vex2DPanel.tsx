import ReactDOM from "react-dom";
import { PanelExtensionContext } from "@foxglove/extension";
import { useEffect, useLayoutEffect, useState } from "react";

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      
      if (renderState.currentFrame && renderState.currentFrame.length > 0) {

      }
    }

    context.watch("topics");
    context.watch("currentFrame");
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <></>
  );
}

export function initVex2DPanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<Vex2DPanel context={context} />, context.panelElement);

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
} 