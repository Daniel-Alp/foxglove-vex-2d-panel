import { ExtensionContext } from "@foxglove/extension";
import { initVEXTwoDeePanel } from "./VEXTwoDee";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "VEX 2D Panel", initPanel: initVEXTwoDeePanel });
}