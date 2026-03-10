<script lang="ts">
	import type { RecurrenceRule } from '$lib/types/index.js';
	import { describeRecurrence } from '$lib/utils/recurrence.js';

	let {
		isRecurring = $bindable(false),
		recurrenceRule = $bindable<RecurrenceRule | null>(null),
	}: {
		isRecurring: boolean;
		recurrenceRule: RecurrenceRule | null;
	} = $props();

	const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let frequency = $state<'daily' | 'weekly' | 'monthly'>('daily');
	let interval = $state(1);
	let byweekday = $state<number[]>([]);
	let timeOfDay = $state('');
	let endsType = $state<'never' | 'on_date'>('never');
	let endsDate = $state('');

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
				endsType = recurrenceRule.ends?.type ?? 'never';
				endsDate = recurrenceRule.ends?.date ?? '';
			} else {
				frequency = 'daily';
				interval = 1;
				byweekday = [];
				timeOfDay = '';
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

		if (endsType === 'on_date' && endsDate) {
			rule.ends = { type: 'on_date', date: endsDate };
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

	let unitLabel = $derived(
		frequency === 'daily' ? (interval === 1 ? 'day' : 'days') :
		frequency === 'weekly' ? (interval === 1 ? 'week' : 'weeks') :
		interval === 1 ? 'month' : 'months'
	);

	let summary = $derived(recurrenceRule ? describeRecurrence(recurrenceRule) : '');
</script>

<div class="border-t pt-4 space-y-3">
	<!-- Toggle -->
	<label class="flex items-center gap-2 cursor-pointer">
		<input
			type="checkbox"
			bind:checked={isRecurring}
			class="w-4 h-4 rounded border-foreground-muted accent-[hsl(var(--primary))]"
		/>
		<span class="text-sm font-medium">Recurring</span>
		{#if isRecurring && summary}
			<span class="text-xs text-foreground-secondary ml-auto">{summary}</span>
		{/if}
	</label>

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
				<option value="daily">{unitLabel}</option>
				<option value="weekly">{unitLabel}</option>
				<option value="monthly">{unitLabel}</option>
			</select>
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
			<input
				id="recurrence-time"
				type="time"
				bind:value={timeOfDay}
				class="select-input mt-1"
			/>
		</div>

		<!-- End condition -->
		<div class="flex items-center gap-2">
			<label for="recurrence-ends" class="text-sm text-foreground-secondary">Ends</label>
			<select id="recurrence-ends" bind:value={endsType} class="select-input flex-1">
				<option value="never">Never</option>
				<option value="on_date">On date</option>
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
	{/if}
</div>
