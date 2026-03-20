<script lang="ts">
	import type { RecurrenceRule } from '$lib/types/index.js';
	import { describeRecurrence } from '$lib/utils/recurrence.js';
	import TimeInput from '$lib/components/TimeInput.svelte';

	let {
		isRecurring = $bindable(false),
		recurrenceRule = $bindable<RecurrenceRule | null>(null),
		onclose,
	}: {
		isRecurring: boolean;
		recurrenceRule: RecurrenceRule | null;
		onclose?: () => void;
	} = $props();

	const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let frequency = $state<'daily' | 'weekly' | 'monthly'>('daily');
	let interval = $state(1);
	let byweekday = $state<number[]>([]);
	let timeOfDay = $state('');
	let scheduleType = $state<'due_date' | 'completion_date'>('due_date');
	let endsType = $state<'never' | 'on_date' | 'after_n_occurrences'>('never');
	let endsDate = $state('');
	let endsCount = $state(5);

	// Sync from prop → local state when recurrenceRule changes externally
	let lastRuleJson = $state('');
	$effect(() => {
		const json = recurrenceRule ? JSON.stringify(recurrenceRule) : '';
		if (json !== lastRuleJson) {
			lastRuleJson = json;
			if (recurrenceRule) {
				frequency = recurrenceRule.frequency;
				interval = recurrenceRule.interval;
				byweekday = recurrenceRule.byweekday ? [...recurrenceRule.byweekday] : [];
				timeOfDay = recurrenceRule.time_of_day ?? '';
				scheduleType = recurrenceRule.schedule_type ?? 'due_date';
				endsType = recurrenceRule.ends?.type ?? 'never';
				endsDate = recurrenceRule.ends?.type === 'on_date' ? recurrenceRule.ends.date : '';
				endsCount = recurrenceRule.ends?.type === 'after_n_occurrences' ? recurrenceRule.ends.count : 5;
			} else {
				frequency = 'daily';
				interval = 1;
				byweekday = [];
				timeOfDay = '';
				scheduleType = 'due_date';
				endsType = 'never';
				endsDate = '';
			}
		}
	});

	// Sync from local state → prop
	$effect(() => {
		if (!isRecurring) {
			recurrenceRule = null;
			return;
		}

		const rule: RecurrenceRule = {
			frequency,
			interval: Math.max(1, interval),
		};

		if (frequency === 'weekly' && byweekday.length > 0) {
			rule.byweekday = [...byweekday].sort((a, b) => a - b);
		}

		if (timeOfDay) {
			rule.time_of_day = timeOfDay;
		}

		if (scheduleType === 'completion_date') {
			rule.schedule_type = 'completion_date';
		}

		if (endsType === 'on_date' && endsDate) {
			rule.ends = { type: 'on_date', date: endsDate };
		} else if (endsType === 'after_n_occurrences') {
			const existingCompleted =
				recurrenceRule?.ends?.type === 'after_n_occurrences'
					? recurrenceRule.ends.occurrences_completed
					: 0;
			rule.ends = {
				type: 'after_n_occurrences',
				count: Math.max(1, endsCount),
				occurrences_completed: existingCompleted,
			};
		} else {
			rule.ends = { type: 'never' };
		}

		const json = JSON.stringify(rule);
		if (json !== lastRuleJson) {
			lastRuleJson = json;
			recurrenceRule = rule;
		}
	});

	function toggleDay(day: number) {
		if (byweekday.includes(day)) {
			byweekday = byweekday.filter((d) => d !== day);
		} else {
			byweekday = [...byweekday, day];
		}
	}

	let summary = $derived(recurrenceRule ? describeRecurrence(recurrenceRule) : '');
</script>

<div class="border-t pt-4 space-y-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium">Recurring</span>
		<div class="flex items-center gap-2">
			{#if summary}
				<span class="text-xs text-foreground-secondary">{summary}</span>
			{/if}
			{#if onclose}
				<button
					type="button"
					onclick={onclose}
					class="text-foreground-muted hover:text-foreground transition-colors leading-none"
					aria-label="Remove recurring"
				>×</button>
			{/if}
		</div>
	</div>

	{#if isRecurring}
		<!-- Frequency + Interval -->
		<div class="flex items-center gap-2">
			<span class="text-sm text-foreground-secondary">Every</span>
			<input
				type="number"
				min="1"
				max="99"
				bind:value={interval}
				class="select-input w-16 text-center"
			/>
			<select bind:value={frequency} class="select-input flex-1">
				<option value="daily">{interval === 1 ? 'day' : 'days'}</option>
				<option value="weekly">{interval === 1 ? 'week' : 'weeks'}</option>
				<option value="monthly">{interval === 1 ? 'month' : 'months'}</option>
			</select>
		</div>

		<!-- Schedule type -->
		<div>
			<span class="text-sm text-foreground-secondary mb-1.5 block">Next date based on</span>
			<div class="flex gap-1">
				<button
					type="button"
					class="flex-1 h-8 rounded-md text-xs font-medium transition-colors
						{scheduleType === 'due_date'
							? 'bg-primary text-primary-foreground'
							: 'bg-surface-subtle text-foreground-secondary hover:bg-surface-subtle/80'}"
					onclick={() => (scheduleType = 'due_date')}
				>
					Previous due date
				</button>
				<button
					type="button"
					class="flex-1 h-8 rounded-md text-xs font-medium transition-colors
						{scheduleType === 'completion_date'
							? 'bg-primary text-primary-foreground'
							: 'bg-surface-subtle text-foreground-secondary hover:bg-surface-subtle/80'}"
					onclick={() => (scheduleType = 'completion_date')}
				>
					Completion date
				</button>
			</div>
		</div>

		<!-- Weekly: day picker -->
		{#if frequency === 'weekly'}
			<div>
				<span class="text-sm text-foreground-secondary mb-1.5 block">On days</span>
				<div class="flex gap-1">
					{#each DAY_LABELS as label, i}
						<button
							type="button"
							class="w-9 h-8 rounded-md text-xs font-medium transition-colors
								{byweekday.includes(i)
									? 'bg-primary text-primary-foreground'
									: 'bg-surface-subtle text-foreground-secondary hover:bg-surface-subtle/80'}"
							onclick={() => toggleDay(i)}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Time of day -->
		<div>
			<label for="recurrence-time" class="text-sm text-foreground-secondary">Time</label>
			<TimeInput id="recurrence-time" bind:value={timeOfDay} />
		</div>

		<!-- End condition -->
		<div class="flex items-center gap-2">
			<label for="recurrence-ends" class="text-sm text-foreground-secondary">Ends</label>
			<select id="recurrence-ends" bind:value={endsType} class="select-input flex-1">
				<option value="never">Never</option>
				<option value="on_date">On date</option>
				<option value="after_n_occurrences">After a set number of times</option>
			</select>
		</div>

		{#if endsType === 'on_date'}
			<div>
				<input
					type="date"
					bind:value={endsDate}
					class="select-input"
				/>
			</div>
		{/if}

		{#if endsType === 'after_n_occurrences'}
			<div class="flex items-center gap-2">
				<input
					type="number"
					min="1"
					max="999"
					bind:value={endsCount}
					class="select-input w-20 text-center"
				/>
				<span class="text-sm text-foreground-secondary">times</span>
			</div>
		{/if}
	{/if}
</div>
