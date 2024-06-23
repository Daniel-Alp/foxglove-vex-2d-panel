import { ExtensionContext } from "@foxglove/extension";

import { initVex2DPanel } from "./Vex2DPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "2D VEX", initPanel: initVex2DPanel });
}
