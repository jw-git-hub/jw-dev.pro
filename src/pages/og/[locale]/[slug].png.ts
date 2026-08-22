/**
 * Картинки шаринга кейсов: `/og/en/<slug>.png` и `/og/ru/<slug>.png`.
 *
 * Один эндпоинт на оба языка — в отличие от страниц, здесь нечего верстать,
 * а различаются только данные. Отдаются как обычные файлы сборки.
 */
import type { APIRoute } from 'astro';
import { getCases } from '../../../lib/cases';
import { renderCaseImage } from '../../../lib/og';
import { LOCALES } from '../../../i18n';

export async function getStaticPaths() {
  const paths = [];
  for (const locale of LOCALES) {
    for (const item of await getCases(locale)) {
      paths.push({ params: { locale, slug: item.slug }, props: { item } });
    }
  }
  return paths;
}

export const GET: APIRoute = async ({ props }) =>
  new Response(await renderCaseImage(props.item), {
    headers: { 'Content-Type': 'image/png' },
  });
