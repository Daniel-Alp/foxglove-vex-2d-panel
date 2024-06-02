import { Immutable, MessageEvent, PanelExtensionContext, Topic } from "@foxglove/extension";
import { useEffect, useLayoutEffect, useState } from "react";
import ReactDOM from "react-dom";

function VEXTwoDeePanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [messages, setMessages] = useState<undefined | Immutable<MessageEvent[]>>();

  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics);
      setMessages(renderState.currentFrame);
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/some/topic" }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Welcome to your new extension panel!</h2>
      <p>
        Check the{" "}
        <a href="https://foxglove.dev/docs/studio/extensions/getting-started">documentation</a> for
        more details on building extension panels for Foxglove Studio.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "0.2rem" }}>
        <b style={{ borderBottom: "1px solid" }}>Topic</b>
        <b style={{ borderBottom: "1px solid" }}>Schema name</b>
        {(topics ?? []).map((topic) => (
          <>
            <div key={topic.name}>{topic.name}</div>
            <div key={topic.schemaName}>{topic.schemaName}</div>
          </>
        ))}
      </div>
      <div>{messages?.length}</div>
    </div>
  );
}

export function initVEXTwoDeePanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<VEXTwoDeePanel context={context} />, context.panelElement);

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}