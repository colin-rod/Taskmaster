import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'taskmaster-calendar-settings';

interface CalendarSettings {
	workingHoursStart: number;
	workingHoursEnd: number;
}

const defaults: CalendarSettings = { workingHoursStart: 8, workingHoursEnd: 19 };

function loadInitial(): CalendarSettings {
	if (!browser) return defaults;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaults;
		const parsed = JSON.parse(raw);
		return {
			workingHoursStart:
				typeof parsed.workingHoursStart === 'number'
					? parsed.workingHoursStart
					: defaults.workingHoursStart,
			workingHoursEnd:
				typeof parsed.workingHoursEnd === 'number' ? parsed.workingHoursEnd : defaults.workingHoursEnd,
		};
	} catch {
		return defaults;
	}
}

export const calendarSettings = writable<CalendarSettings>(loadInitial());

if (browser) {
	calendarSettings.subscribe((value) => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	});
}
