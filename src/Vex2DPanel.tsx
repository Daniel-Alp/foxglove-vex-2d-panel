import ReactDOM from "react-dom";
import { Immutable, MessageEvent, PanelExtensionContext, SettingsTree, SettingsTreeChildren, Subscription, Topic } from "@foxglove/extension";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { PanelState, Position } from "./state";
import { produce } from "immer";

type PositionMessage = MessageEvent<Position>;

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]> | undefined>();
  const [messages, setMessages] = useState<PositionMessage[]>();
  const [panelState, setPanelState] = useState<PanelState>(() => {
    // Initial state is {} if uninitialised
    if (Object.keys(context.initialState as object).length === 0) {
      return {paths: []};
    }
    return context.initialState as PanelState;
  });
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  const positionTopics = useMemo(() => (topics ?? []).filter(topic => topic.schemaName === "odometry"), [topics]);

  useEffect(() => {
    context.saveState(panelState);    
    const options = positionTopics.map(topic => ({value: topic.name, label: topic.name}));

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
              icon: "Clear"
            }
          ],
          fields: {
            topic: {
              label: "Topic",
              input: "select",
              options,
              value: path.topic
            }
          },
          label: path.topic ?? `Path ${index + 1}`
        }
      ])  
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
              icon: "Add"
            }
          ],
          children,
          label: "Paths"
        },
      },
      actionHandler: (settingsTreeAction) => {
        setPanelState(
          produce<PanelState>(draft => {
            const {action, payload} = settingsTreeAction;
            switch (action) {
              case "perform-node-action":
                switch (payload.id) {
                  case "add-path":
                    draft.paths.push({topic: undefined, positions: []});
                    break;
                  case "delete-path":
                    const index = Number(payload.path[1]);
                    draft.paths.splice(index, 1);
                    break;
                }
                break;
              case "update":
                if (payload.path[0] === "paths") {
                  const index = Number(payload.path[1]);
                  draft.paths[index] = {topic: payload.value as string, positions: []};
                }
                break;
            }
          })
        );
      }
    }

    context.updatePanelSettingsEditor(panelSettings);
  }, [context, panelState, topics]);

  useEffect(() => {
    context.saveState(panelState);    
    const subscriptions: Subscription[] = [];
    panelState.paths.forEach(path => {
      if (path.topic) {
        subscriptions.push({topic: path.topic});
      }
    });
    context.subscribe(subscriptions);
  }, [panelState]);

  useEffect(() => {
  }, [messages]);

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics);
      setMessages(renderState.currentFrame as PositionMessage[]);
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