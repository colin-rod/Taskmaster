import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface OnboardingState {
	dismissed: boolean;
	visitedCalendar: boolean;
}

const defaults: OnboardingState = { dismissed: false, visitedCalendar: false };

export function createOnboardingStore(profileId: string) {
	const key = `taskmaster-onboarding-${profileId}`;

	let initial = defaults;
	if (browser) {
		try {
			const raw = localStorage.getItem(key);
			if (raw) initial = { ...defaults, ...JSON.parse(raw) };
		} catch {
			// corrupted data — use defaults
		}
	}

	const store = writable<OnboardingState>(initial);

	if (browser) {
		store.subscribe((value) => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return store;
}
