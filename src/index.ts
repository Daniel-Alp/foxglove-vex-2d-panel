import { ExtensionContext } from "@foxglove/extension";
import { initExamplePanel } from "./ExamplePanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "VEX 2D Panel", initPanel: initExamplePanel });
}