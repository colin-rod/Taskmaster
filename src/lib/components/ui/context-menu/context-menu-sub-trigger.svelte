<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { ChevronRight } from "@lucide/svelte";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: ContextMenuPrimitive.SubTriggerProps & { class?: string } = $props();
</script>

<ContextMenuPrimitive.SubTrigger
	bind:ref
	data-slot="context-menu-sub-trigger"
	class={cn(
		"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-surface-subtle focus:text-foreground data-[state=open]:bg-surface-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronRight class="ml-auto h-4 w-4" />
</ContextMenuPrimitive.SubTrigger>
