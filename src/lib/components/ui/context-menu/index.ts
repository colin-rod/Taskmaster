export { default as Root } from "./context-menu.svelte";
export { default as Trigger } from "./context-menu-trigger.svelte";
export { default as Content } from "./context-menu-content.svelte";
export { default as Item } from "./context-menu-item.svelte";
export { default as Separator } from "./context-menu-separator.svelte";
export { default as SubTrigger } from "./context-menu-sub-trigger.svelte";
export { default as SubContent } from "./context-menu-sub-content.svelte";

// Sub (the wrapper for SubTrigger + SubContent) comes directly from bits-ui
import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
export const Sub = ContextMenuPrimitive.Sub;
