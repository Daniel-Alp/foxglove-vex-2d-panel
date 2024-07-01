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
import { PanelState, Path, Position } from "./types";

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]>>();
  const [paths, setPaths] = useState<Path[]>(() => {
    if (JSON.stringify(context.initialState) === "{}") {
      return [];
    }
    // When a new websocket connection is opened, restore only the topic names and colors
    const savedPaths = (context.initialState as PanelState).paths;
    return savedPaths.map((path) => ({ topic: path.topic, positions: [], color: path.color }));
  });

  const positionTopics = useMemo(
    () => (topics ?? []).filter((topic) => topic.schemaName === "odometry"),
    [topics],
  );

  const actionHandler = useCallback((settingsTreeAction: SettingsTreeAction) => {
    setPaths(
      produce<Path[]>((draft) => {
        const { action, payload } = settingsTreeAction;
        const index = Number(payload.path[1]);

        switch (action) {
          case "perform-node-action":
            switch (payload.id) {
              case "add-path":
                draft.push({ topic: undefined, positions: [], color: "black" });
                break;
              case "delete-path":
                draft.splice(index, 1);
                break;
            }
            break;
          case "update":
            // path[0] === "paths" always
            switch (payload.path[2]) {
              case "topic":
                draft[index].topic = payload.value as string;
                draft[index].positions = [];
                break;
              case "color":
                draft[index].color = payload.value as string;
                break;
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
  }, [context, paths]);

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

  return <Canvas paths={paths}></Canvas>;
}

export function initVex2DPanel(context: PanelExtensionContext): () => void {
  // eslint-disable-next-line react/no-deprecated
  ReactDOM.render(<Vex2DPanel context={context} />, context.panelElement);

  return () => {
    // eslint-disable-next-line react/no-deprecated
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
