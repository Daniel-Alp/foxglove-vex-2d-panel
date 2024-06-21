import ReactDOM from "react-dom";
import { Immutable, MessageEvent, PanelExtensionContext, SettingsTree, SettingsTreeChildren, Subscription, Topic } from "@foxglove/extension";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { PanelState, Position } from "./state";
import { produce } from "immer";

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]> | undefined>()
  const [panelState, setPanelState] = useState<PanelState>(() => {
    // Initial state is {} if uninitialised
    if (Object.keys(context.initialState as object).length === 0) {
      return {paths: []}
    }

    return context.initialState as PanelState
  })

  const positionTopics = useMemo(() => (topics ?? []).filter(topic => topic.schemaName === "odometry"), [topics])

  useEffect(() => {
    context.saveState(panelState);    
    const options = positionTopics.map(topic => ({value: topic.name, label: topic.name}))

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
    )

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
                    draft.paths.push({topic: undefined, positions: []})
                    break
                  case "delete-path":
                    const index = Number(payload.path[1])
                    draft.paths.splice(index, 1)
                    break
                }
                break
              case "update":
                if (payload.path[0] === "paths") {
                  const index = Number(payload.path[1])
                  draft.paths[index] = {topic: payload.value as string, positions: []}
                }
                break
            }
          })
        )
      }
    }
    context.updatePanelSettingsEditor(panelSettings);
  }, [topics, panelState])

  useEffect(() => {
    context.saveState(panelState);    
    const subscriptions: Subscription[] = []
    panelState.paths.forEach(path => {
      if (path.topic) {
        subscriptions.push({topic: path.topic})
      }
    })
    context.subscribe(subscriptions);
  }, [panelState])

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setTopics(renderState.topics);

      const newMessages = renderState.currentFrame as MessageEvent<Position>[];
      setPanelState(
        produce<PanelState>(draft => {
          // Messages are already sorted by receive time
          newMessages?.forEach(messageEvent => {
            draft.paths.forEach(path => {
              if (path.topic === messageEvent.topic) {
                path.positions.push(messageEvent.message)
              }
            })
          });
        })
      );

      done();
    }
    context.watch("topics");
    context.watch("currentFrame");
  }, [context]);

  const listItems = panelState.paths.map(path => 
    <li style={{fontSize: 20}}>
      <h1>Topic: {path.topic}</h1>
      Number of messages: {path.positions.length}
    </li>
  );

  return (
    <div style={{padding: "1rem"}}>
      <ul style={{listStyleType: "none"}}>{listItems}</ul>
    </div>
  );
}

export function initVex2DPanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<Vex2DPanel context={context} />, context.panelElement)

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement)
  };
} 