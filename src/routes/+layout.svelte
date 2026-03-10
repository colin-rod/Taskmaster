<script lang="ts">
  import '../app.css';

  const { children } = $props();
</script>

<svelte:head>
  <title>Taskmaster</title>
</svelte:head>

{@render children()}
