import {
  Immutable,
  MessageEvent,
  PanelExtensionContext,
  SettingsTree,
  SettingsTreeAction,
  SettingsTreeChildren,
  Subscription,
  Topic,
} from "@foxglove/extension";
import { produce } from "immer";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";

import { drawOnCanvas } from "./pathCanvas";
import { PanelState, Position } from "./state";

function linearInterpolate(start: number, end: number, t: number) {
  return start + t * (end - start);
}

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]>>();
  const [panelState, setPanelState] = useState<PanelState>(() => {
    // Initial state is {} if uninitialised
    if (Object.keys(context.initialState as object).length === 0) {
      return { paths: [], viewCorners: { x1: -240, y1: -240, x2: 240, y2: 240 } };
    }

    return context.initialState as PanelState;
  });
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const positionTopics = useMemo(
    () => (topics ?? []).filter((topic) => topic.schemaName === "odometry"),
    [topics],
  );

  const actionHandler = useCallback((settingsTreeAction: SettingsTreeAction) => {
    setPanelState(
      produce<PanelState>((draft) => {
        const { action, payload } = settingsTreeAction;
        switch (action) {
          case "perform-node-action":
            switch (payload.id) {
              case "add-path":
                draft.paths.push({ topic: undefined, positions: [] });
                break;
              case "delete-path":
                draft.paths.splice(Number(payload.path[1]), 1);
                break;
            }
            break;
          case "update":
            if (payload.path[0] === "paths") {
              draft.paths[Number(payload.path[1])] = {
                topic: payload.value as string,
                positions: [],
              };
            }
            break;
        }
      }),
    );
  }, []);

  useEffect(() => {
    context.saveState(panelState);
    const options = positionTopics.map((topic) => ({ value: topic.name, label: topic.name }));

    const children: SettingsTreeChildren = Object.fromEntries(
      panelState.paths.map((path, index) => [
        `${index}`,
        {
          actions: [
            {
              type: "action",
              id: "delete-path",
              label: "Delete path",
              display: "inline",
              icon: "Clear",
            },
          ],
          fields: {
            topic: {
              label: "Topic",
              input: "select",
              options,
              value: path.topic,
            },
          },
          label: path.topic ?? `Path ${index + 1}`,
        },
      ]),
    );

    const panelSettings: SettingsTree = {
      nodes: {
        paths: {
          actions: [
            {
              type: "action",
              id: "add-path",
              label: "Add path",
              display: "inline",
              icon: "Add",
            },
          ],
          children,
          label: "Paths",
        },
      },
      actionHandler,
    };
    context.updatePanelSettingsEditor(panelSettings);
  }, [actionHandler, context, panelState, positionTopics]);

  useEffect(() => {
    context.saveState(panelState);
    const subscriptions = panelState.paths
      .filter((path) => path.topic)
      .map((path) => ({ topic: path.topic }));
    context.subscribe(subscriptions as Subscription[]);
    void drawOnCanvas(panelState, canvasRef.current!);
  }, [context, panelState]);

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setTopics(renderState.topics);

      const newMessages = renderState.currentFrame as MessageEvent<Position>[];
      setPanelState(
        produce<PanelState>((draft) => {
          // Messages are already sorted by receive time
          newMessages.forEach((messageEvent) => {
            draft.paths.forEach((path) => {
              if (path.topic === messageEvent.topic) {
                path.positions.push(messageEvent.message);
              }
            });
          });
        }),
      );

      done();
    };
    context.watch("topics");
    context.watch("currentFrame");
  }, [context]);

  const handleOnWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const boundingRect = e.currentTarget.getBoundingClientRect();
    const xCanvas = e.clientX - boundingRect.left;
    const yCanvas = boundingRect.height - (e.clientY - boundingRect.top);
    const { x1, y1, x2, y2 } = panelState.viewCorners;

    const xView = linearInterpolate(x1, x2, xCanvas / boundingRect.width);
    const yView = linearInterpolate(y1, y2, yCanvas / boundingRect.height);
    const t = Math.sign(e.deltaY) * -0.1;

    setPanelState({
      ...panelState,
      viewCorners: {
        x1: linearInterpolate(x1, xView, t),
        y1: linearInterpolate(y1, yView, t),
        x2: linearInterpolate(x2, xView, t),
        y2: linearInterpolate(y2, yView, t),
      },
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) {
      return;
    }
    const boundingRect = e.currentTarget.getBoundingClientRect();
    const { x1, y1, x2, y2 } = panelState.viewCorners;

    const viewMovementX = -e.movementX * ((x2 - x1) / boundingRect.width);
    const viewMovementY = e.movementY * ((y2 - y1) / boundingRect.height);

    setPanelState({
      ...panelState,
      viewCorners: {
        x1: x1 + viewMovementX,
        y1: y1 + viewMovementY,
        x2: x2 + viewMovementX,
        y2: y2 + viewMovementY,
      },
    });
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <canvas
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        width={1080}
        height={1080}
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

export function initVex2DPanel(context: PanelExtensionContext): () => void {
  // eslint-disable-next-line react/no-deprecated
  ReactDOM.render(<Vex2DPanel context={context} />, context.panelElement);

  return () => {
    // eslint-disable-next-line react/no-deprecated
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
