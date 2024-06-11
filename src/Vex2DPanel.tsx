import ReactDOM from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Immutable, MessageEvent, PanelExtensionContext, SettingsTree, SettingsTreeAction, SettingsTreeChildren, Topic } from "@foxglove/extension";
import { produce } from "immer"
import { Config } from "./config";

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]> | undefined>();
  const [messages, setMessages] = useState<Immutable<MessageEvent[]> | undefined>()
  const [config, setConfig] = useState<Config>({trajectories: []});
  const [renderDone, setRenderDone] = useState<() => void | undefined>();

  const odomTopics = useMemo(() => (topics ?? []).filter((topic) => topic.schemaName === "odometry"), [topics]);

  useEffect(() => {
    const odomTopicsOptions = odomTopics.map((topic) => ({value: topic.name, label: topic.name}));

    const children: SettingsTreeChildren = Object.fromEntries(
      config.trajectories.map((trajectory, index) => [
        `${index}`,
        {
          actions: [{
            type: "action",
            id: "delete-trajectory",
            label: "Delete trajectory",
            display: "inline",
            icon: "Clear"
          }],
          label: trajectory.topic ?? `Trajectory ${index + 1}`,
          fields: {
            pathTopic: {
                label: "Topic",
                input: "select",
                options: odomTopicsOptions,
                value: trajectory.topic
            }
          }
        }
      ])
    );

    const panelSettings: SettingsTree = {
      nodes: {
          trajectories: {
              actions: [{
                  type: "action",
                  id: "add-trajectory",
                  label: "Add trajectory",
                  display: "inline",
                  icon: "Add"
              }],
              children,
              label: "Trajectories"
          }
      },
      actionHandler: (action: SettingsTreeAction) => {
        if (action.action === "perform-node-action") {
          const {path, id} = action.payload;
          if (id === "add-trajectory") {
            setConfig(produce<Config>((draft) => {
                draft.trajectories.push({topic: undefined});
              })
            );
          } else if (id === "delete-trajectory") {
            const index = path[1];
            setConfig(produce<Config>((draft) => {
              draft.trajectories.splice(Number(index), 1);
              })
            );
          }
        } else {
          const {path, value} = action.payload;
          if (path[0] === "trajectories") {
            setConfig(produce<Config>((draft) => {
                draft.trajectories[Number(path[1])]!.topic = value as string;
              })
            );
          }
        }
      }
    };
    context.updatePanelSettingsEditor(panelSettings);
  });

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setMessages(renderState.allFrames);
      setTopics(renderState.topics);
    }
    context.watch("topics");
    context.watch("allFrames");
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