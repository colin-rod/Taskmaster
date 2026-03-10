<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  const errorMessage = $derived(
    $page.url.searchParams.get('error') === 'invalid_token'
      ? 'This confirmation link is invalid or has expired. Please request a new one.'
      : (form?.error ?? null),
  );

  let loginLoading = $state(false);
  let signupLoading = $state(false);
  let magicLinkLoading = $state(false);
</script>

<div class="container max-w-lg mx-auto px-4 py-8 md:py-16">
  <div class="rounded-md border bg-card p-6">
    <div class="mb-6">
      <h1 class="font-accent text-page-title">HomeBase</h1>
      <p class="text-muted-foreground">Sign in to manage your household tasks</p>
    </div>

    {#if errorMessage}
      <div class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
        {errorMessage}
      </div>
    {/if}

    {#if form?.success}
      <div class="mb-4 rounded-md border border-primary/50 bg-primary-tint p-3 text-sm">
        {form.message}
      </div>
    {/if}

    <!-- Login Tab -->
    <div class="space-y-4">
      <h2 class="text-section-header font-ui">Login</h2>
      <form
        method="POST"
        action="?/login"
        use:enhance={() => {
          loginLoading = true;
          return async ({ update }) => {
            await update();
            loginLoading = false;
          };
        }}
      >
        <div class="space-y-4">
          <div>
            <label for="email" class="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              autocomplete="email"
              inputmode="email"
              value={form?.email || ''}
              required
              class="select-input mt-1"
            />
          </div>
          <div>
            <label for="password" class="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              autocomplete="current-password"
              required
              class="select-input mt-1"
            />
          </div>
          <button
            type="submit"
            class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            disabled={loginLoading}
          >
            {loginLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>

      <hr class="my-6 border-border-divider" />

      <details class="group">
        <summary class="cursor-pointer text-sm text-foreground-secondary hover:text-foreground">
          Sign Up or use Magic Link
        </summary>
        <div class="mt-4 space-y-6">
          <!-- Signup -->
          <form
            method="POST"
            action="?/signup"
            use:enhance={() => {
              signupLoading = true;
              return async ({ update }) => {
                await update();
                signupLoading = false;
              };
            }}
          >
            <h3 class="text-sm font-medium mb-3">Create Account</h3>
            <div class="space-y-3">
              <div>
                <label for="signup-email" class="text-sm font-medium">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  autocomplete="email"
                  value={form?.email || ''}
                  required
                  class="select-input mt-1"
                />
              </div>
              <div>
                <label for="signup-password" class="text-sm font-medium">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  name="password"
                  autocomplete="new-password"
                  required
                  class="select-input mt-1"
                />
              </div>
              <div>
                <label for="confirm-password" class="text-sm font-medium">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  name="confirmPassword"
                  autocomplete="new-password"
                  required
                  class="select-input mt-1"
                />
              </div>
              <button
                type="submit"
                class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                disabled={signupLoading}
              >
                {signupLoading ? 'Creating account...' : 'Sign Up'}
              </button>
            </div>
          </form>

          <!-- Magic Link -->
          <form
            method="POST"
            action="?/magiclink"
            use:enhance={() => {
              magicLinkLoading = true;
              return async ({ update }) => {
                await update();
                magicLinkLoading = false;
              };
            }}
          >
            <h3 class="text-sm font-medium mb-3">Magic Link</h3>
            <div class="space-y-3">
              <div>
                <label for="magic-email" class="text-sm font-medium">Email</label>
                <input
                  id="magic-email"
                  type="email"
                  name="email"
                  autocomplete="email"
                  value={form?.email || ''}
                  required
                  class="select-input mt-1"
                />
              </div>
              <button
                type="submit"
                class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                disabled={magicLinkLoading}
              >
                {magicLinkLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>
          </form>
        </div>
      </details>
    </div>
  </div>
</div>
