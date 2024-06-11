import ReactDOM from "react-dom";
import { useEffect, useLayoutEffect, useState } from "react";
import { Immutable, MessageEvent, PanelExtensionContext, SettingsTree, SettingsTreeAction, SettingsTreeChildren, Subscription, Topic } from "@foxglove/extension";
import { produce } from "immer"
import { Config } from "./config";

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]> | undefined>();
  const [messages, setMessages] = useState<Immutable<MessageEvent[]> | undefined>()
  const [config, setConfig] = useState<Config>({trajectories: []});
  const [renderDone, setRenderDone] = useState<() => void | undefined>();

  useEffect(() => {
    const topicOptions = topics ? topics.map((topic) => ({value: topic.name, label: topic.name})) : [];

    const children: SettingsTreeChildren = Object.fromEntries(
      config.trajectories.map((trajectory, index) => [
        `${index}`,
        {
          actions: [
            {
              type: "action",
              id: "delete-trajectory",
              label: "Delete trajectory",
              display: "inline",
              icon: "Clear"
            }
          ],
          fields: {
            topic: {
              label: "Topic",
              input: "select",
              options: topicOptions,
              value: trajectory.topic
            }
          },
          label: trajectory.topic ?? `Trajectory ${index + 1}`
        }
      ])
    );

    const panelSettings: SettingsTree = {
      nodes: {
        trajectories: {
          actions: [
            {
              type: "action",
              id: "add-trajectory",
              label: "Add trajectory",
              display: "inline",
              icon: "Add"
            }
          ],
          children,
          label: "Trajectories"
        }
      },
      actionHandler: (settingsTreeAction: SettingsTreeAction) => {
        setConfig(
          produce<Config>((draft) => {
            const {action, payload} = settingsTreeAction;
            if (action === "perform-node-action") {
              const {path, id} = payload;
              if (id === "add-trajectory") {
                draft.trajectories.push({topic: undefined});
              } else if (id === "delete-trajectory") {
                const index = Number(path[1]);
                draft.trajectories.splice(index, 1);
              }
            } else {
              const {path, value} = payload;
              if (path[0] === "trajectories") {
                const index = Number(path[1]);
                draft.trajectories[index]!.topic = value as string;
              }
            }
          })
        );
      }
    };

    context.updatePanelSettingsEditor(panelSettings);
  });

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setMessages(renderState.allFrames);
      setTopics((renderState.topics ?? []).filter((topic) => topic.schemaName === "odometry"));
    }
    context.watch("topics");
    context.watch("allFrames")

    const subscriptions: Subscription[] = [];
    config.trajectories.forEach((trajectory) => {
      if (trajectory.topic) {
        subscriptions.push({topic: trajectory.topic, preload: true});
      }
    });
    context.subscribe(subscriptions);

  }, [context]);

  useEffect(() => {
    // Putting this here temporarily otherwise vscode complains
  }, [messages])

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <div style={{ height: "100%", padding: "1rem" }}>
    

    </div>
  );
}

export function initVex2DPanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<Vex2DPanel context={context} />, context.panelElement);

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}