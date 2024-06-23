import ReactDOM from "react-dom";
import { Immutable, MessageEvent, PanelExtensionContext, SettingsTree, SettingsTreeAction, SettingsTreeChildren, Subscription, Topic } from "@foxglove/extension";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PanelState, Position } from "./state";
import { produce } from "immer";
import { drawOnCanvas } from "./pathCanvas";

function linearInterpolate(start: number, end: number, t: number) {
  return start + t * (end - start)
}

function Vex2DPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<Immutable<Topic[]>>()
  const [panelState, setPanelState] = useState<PanelState>(() => {
    // Initial state is {} if uninitialised
    if (Object.keys(context.initialState as object).length === 0) {
      return {paths: [], viewCorners: {x1: -240, y1: -240, x2: 240, y2: 240}}
    }

    return context.initialState as PanelState
  })
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const positionTopics = useMemo(() => (topics ?? []).filter(topic => topic.schemaName === "odometry"), [topics])

  const actionHandler = useCallback((settingsTreeAction: SettingsTreeAction) => {
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
  }, [context])

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
        // general: {
        //   fields: {
        //     topic: {
        //       label: "Background",
        //       input: "select",
        //       options,
        //       // value: path.topic
        //     }
        //   },
        //   label: "General"
        // },
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
        }
      },
      actionHandler
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
    drawOnCanvas(panelState, canvasRef.current!)
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

  return (
    <div style={{width: "100%", height: "100%"}}>
      <canvas 
        style={{width: "100%", height: "100%", objectFit:"contain"}}
        width={1080}
        height={1080}
        ref={canvasRef} 
        onWheel={event => {
          const boundingRect = event.currentTarget.getBoundingClientRect()
          const xPanel = event.clientX - boundingRect.left
          const yPanel = boundingRect.height - (event.clientY - boundingRect.top)

          const xView = linearInterpolate(panelState.viewCorners.x1, panelState.viewCorners.x2, xPanel / boundingRect.width)
          const yView = linearInterpolate(panelState.viewCorners.y1, panelState.viewCorners.y2, yPanel / boundingRect.height)
          const t = Math.sign(event.deltaY) * -0.1

          setPanelState({
            ...panelState, 
            viewCorners: {
              x1: linearInterpolate(panelState.viewCorners.x1, xView, t),
              y1: linearInterpolate(panelState.viewCorners.y1, yView, t),
              x2: linearInterpolate(panelState.viewCorners.x2, xView, t),
              y2: linearInterpolate(panelState.viewCorners.y2, yView, t)
            }
          })
        }}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onMouseMove={event => {
          if (!dragging) {
            return
          }
          const boundingRect = event.currentTarget.getBoundingClientRect()
          const viewMovementX = -1 * event.movementX / boundingRect.width * (panelState.viewCorners.x2 - panelState.viewCorners.x1)
          const viewMovementY = event.movementY / boundingRect.height * (panelState.viewCorners.y2 - panelState.viewCorners.y1)
          setPanelState(
            produce<PanelState>(draft => {
              draft.viewCorners.x1 += viewMovementX
              draft.viewCorners.y1 += viewMovementY
              draft.viewCorners.x2 += viewMovementX
              draft.viewCorners.y2 += viewMovementY
            })
          )
        }}
        />
    </div>
  );
}

export function initVex2DPanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<Vex2DPanel context={context} />, context.panelElement)

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement)
  };
} 