<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import { getPriorityDotClass } from '$lib/utils/design-tokens.js';

  let {
    task,
    onTaskClick,
  }: {
    task: Task;
    onTaskClick: (task: Task) => void;
  } = $props();
</script>

<button
  type="button"
  class="w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded text-xs leading-tight truncate transition-colors
    bg-primary/10 hover:bg-primary/20 text-foreground border-l-2 border-primary"
  onclick={() => onTaskClick(task)}
>
  <span
    class="shrink-0 w-1.5 h-1.5 rounded-full {getPriorityDotClass(task.priority)}"
  ></span>
  <span class="truncate">{task.title}</span>
</button>
