import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Конфигурация сборки jw-dev.pro.
 *
 * Два решения здесь неочевидны и менять их нельзя без причины:
 *
 * 1. `build.inlineStylesheets: 'never'` — Astro по умолчанию вшивает мелкие
 *    стили прямо в <style> в разметке. Это нарушает правило проекта «ноль
 *    инлайна» и ломает строгий CSP без unsafe-inline.
 *
 * 2. `vite.build.assetsInlineLimit: 0` — Astro вшивает маленькие модули прямо
 *    в <script> в разметке, ровно как и мелкие стили. Ноль отключает порог:
 *    и скрипты, и ассеты остаются отдельными файлами с хешем. Значение живёт
 *    именно в `vite`, ключа `build.assetsInlineLimit` у Astro нет — в конфиге
 *    он молча игнорируется, и скрипт как вшивался, так и вшивается.
 *
 * 3. `markdown.syntaxHighlight: 'prism'` — Shiki по умолчанию красит код
 *    инлайновым `style=` на каждом токене. Это нарушает правило «ноль инлайна»
 *    и ломает строгий CSP. Prism отдаёт те же токены классами, а цвета им
 *    задаёт `src/styles/components/note.css` из палитры проекта.
 *
 * 4. `compressHTML: true` — в Astro 7 по умолчанию 'jsx', где пробел между
 *    строчными элементами съедается по правилам JSX. Нам нужны правила HTML,
 *    иначе «<span>раз</span> <em>два</em>» отрисуется как «разадва».
 */
export default defineConfig({
  site: 'https://jw-dev.pro',
  trailingSlash: 'always',
  compressHTML: true,

  markdown: {
    syntaxHighlight: 'prism',
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    routing: {
      // EN живёт на «/», RU — на «/ru/».
      prefixDefaultLocale: false,
    },
  },

  build: {
    format: 'directory',
    assets: '_astro',
    inlineStylesheets: 'never',
  },

  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru' },
      },
    }),
  ],
});
