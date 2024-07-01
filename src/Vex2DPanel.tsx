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
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";

import { Canvas } from "./Canvas";
import { PanelState, Position, background } from "./types";

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]>>();
  const [panelState, setPanelState] = useState<PanelState>(() => {
    if (JSON.stringify(context.initialState) === "{}") {
      return { paths: [], background: "competition" };
    }
    // When a new websocket connection is opened, clear old position arrays but restore everything else
    const savedState = context.initialState as PanelState;

    return {
      ...savedState,
      paths: savedState.paths.map((path) => ({ ...path, positions: [] })),
    };
  });

  const positionTopics = useMemo(
    () => (topics ?? []).filter((topic) => topic.schemaName === "odometry"),
    [topics],
  );

  const actionHandler = useCallback((settingsTreeAction: SettingsTreeAction) => {
    setPanelState(
      produce<PanelState>((draft) => {
        const { action, payload } = settingsTreeAction;
        const index = Number(payload.path[1]);
        switch (action) {
          case "perform-node-action":
            switch (payload.id) {
              case "add-path":
                draft.paths.push({ topic: undefined, positions: [], color: "black" });
                break;
              case "delete-path":
                draft.paths.splice(index, 1);
                break;
            }
            break;
          case "update":
            switch (payload.path[0]) {
              case "paths":
                switch (payload.path[2]) {
                  case "topic":
                    draft.paths[index].topic = payload.value as string;
                    draft.paths[index].positions = [];
                    break;
                  case "color":
                    draft.paths[index].color = payload.value as string;
                    break;
                }
                break;
              case "general":
                draft.background = payload.value as background;
            }
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
            color: {
              label: "Color",
              input: "rgb",
              value: path.color,
            },
          },
          label: path.topic ?? `Path ${index + 1}`,
        },
      ]),
    );

    const panelSettings: SettingsTree = {
      nodes: {
        general: {
          fields: {
            background: {
              label: "Background",
              input: "select",
              options: [
                { value: "competition", label: "competition" },
                { value: "skills", label: "skills" },
                { value: "empty", label: "empty" },
              ],
              value: panelState.background,
            },
          },
        },
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
  }, [context, panelState]);

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setTopics(renderState.topics);

      const newMessages = (renderState.currentFrame ?? []) as MessageEvent<Position>[];
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

  return <Canvas panelState={panelState}></Canvas>;
}

export function initVex2DPanel(context: PanelExtensionContext): () => void {
  // eslint-disable-next-line react/no-deprecated
  ReactDOM.render(<Vex2DPanel context={context} />, context.panelElement);

  return () => {
    // eslint-disable-next-line react/no-deprecated
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
