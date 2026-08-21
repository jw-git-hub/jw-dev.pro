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
 * 2. `compressHTML: true` — в Astro 7 по умолчанию 'jsx', где пробел между
 *    строчными элементами съедается по правилам JSX. Нам нужны правила HTML,
 *    иначе «<span>раз</span> <em>два</em>» отрисуется как «разадва».
 */
export default defineConfig({
  site: 'https://jw-dev.pro',
  trailingSlash: 'always',
  compressHTML: true,

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

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru' },
      },
    }),
  ],
});
