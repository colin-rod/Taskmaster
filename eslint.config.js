import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node, NotificationPermission: 'readonly' },
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: { parser: ts.parser },
		},
		rules: {
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/prefer-svelte-reactivity': 'off',
			'svelte/prefer-writable-derived': 'off',
			'svelte/require-each-key': 'off',
		},
	},
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/', '.vercel/', 'coverage/'],
	},
);
