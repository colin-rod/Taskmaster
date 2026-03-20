<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { buttonVariants } from "$lib/components/ui/button/index.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: AlertDialogPrimitive.ActionProps = $props();
</script>

<AlertDialogPrimitive.Action
	bind:ref
	class={cn(buttonVariants({ variant: "destructive" }), className)}
	{...restProps}
/>
