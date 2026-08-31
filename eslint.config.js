import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  { ignores: ['dist/**', '.astro/**', 'node_modules/**', 'server/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  // Доступность проверяется на собранном HTML через html-validate:a11y — там реальная
  // разметка, а не шаблон. Плагин eslint-plugin-jsx-a11y пока не поддерживает ESLint 10,
  // и тянуть его через --legacy-peer-deps в этом проекте неуместно.

  {
    files: ['src/scripts/**/*.js', 'public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      // Инлайн-обработчики запрещены правилом проекта: слушатели вешаются из модулей.
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'write', message: 'document.write ломает парсинг.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='setAttribute'][arguments.0.value='style']",
          message: 'Инлайн-стиль через setAttribute запрещён. Используй класс-модификатор.',
        },
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'innerHTML — риск XSS и инлайна. Собирай узлы через createElement.',
        },
      ],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['tests/**/*.mjs', 'tools/**/*.mjs', '*.config.mjs', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
  },
];
