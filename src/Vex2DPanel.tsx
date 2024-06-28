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

import { drawOnCanvas } from "./renderer";
import { PanelState, Path, Position, ViewCorners } from "./types";

function linearInterpolate(start: number, end: number, t: number) {
  return start + t * (end - start);
}

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]>>();
  const [paths, setPaths] = useState<Path[]>(() => {
    if (JSON.stringify(context.initialState) === "{}") {
      return [];
    }
    // When a new websocket connection is opened, restore only the topic names
    const savedPaths = (context.initialState as PanelState).paths;
    return savedPaths.map((path) => ({ topic: path.topic, positions: [] }));
  });
  const [viewCorners, setViewCorners] = useState<ViewCorners>({
    x1: -72,
    y1: -72,
    x2: 72,
    y2: 72,
  });
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const positionTopics = useMemo(
    () => (topics ?? []).filter((topic) => topic.schemaName === "odometry"),
    [topics],
  );

  const actionHandler = useCallback((settingsTreeAction: SettingsTreeAction) => {
    setPaths(
      produce<Path[]>((draft) => {
        const { action, payload } = settingsTreeAction;
        switch (action) {
          case "perform-node-action":
            switch (payload.id) {
              case "add-path":
                draft.push({ topic: undefined, positions: [] });
                break;
              case "delete-path":
                draft.splice(Number(payload.path[1]), 1);
                break;
            }
            break;
          case "update":
            if (payload.path[0] === "paths") {
              draft[Number(payload.path[1])] = {
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
    context.saveState({ paths });
    const options = positionTopics.map((topic) => ({ value: topic.name, label: topic.name }));

    const children: SettingsTreeChildren = Object.fromEntries(
      paths.map((path, index) => [
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
  }, [actionHandler, context, paths, positionTopics]);

  useEffect(() => {
    context.saveState({ paths });
    const subscriptions = paths.filter((path) => path.topic).map((path) => ({ topic: path.topic }));
    context.subscribe(subscriptions as Subscription[]);
    void drawOnCanvas(paths, viewCorners, canvasRef.current!);
  }, [context, paths, viewCorners]);

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setTopics(renderState.topics);

      const newMessages = (renderState.currentFrame ?? []) as MessageEvent<Position>[];
      setPaths(
        produce<Path[]>((draft) => {
          // Messages are already sorted by receive time
          newMessages.forEach((messageEvent) => {
            draft.forEach((path) => {
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
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) {
      return;
    }
    const boundingRect = e.currentTarget.getBoundingClientRect();
    const { x1, y1, x2, y2 } = viewCorners;

    const viewMovementX = -e.movementX * ((x2 - x1) / boundingRect.width);
    const viewMovementY = e.movementY * ((y2 - y1) / boundingRect.height);

    setViewCorners({
      x1: x1 + viewMovementX,
      y1: y1 + viewMovementY,
      x2: x2 + viewMovementX,
      y2: y2 + viewMovementY,
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
