<script lang="ts">
  import '../app.css';

  const { children } = $props();
</script>

<svelte:head>
  <title>HomeBase</title>
</svelte:head>

{@render children()}
