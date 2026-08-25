/**
 * Картинки шаринга: `/og/<язык>/home.png`, `/og/<язык>/work/<слаг>.png`
 * и так далее по списку целей из `lib/og-cards.ts`.
 *
 * Один эндпоинт на все типы страниц — в отличие от страниц, здесь нечего
 * верстать, а различаются только данные. Отдаются как обычные файлы сборки.
 */
import type { APIRoute } from 'astro';
import { renderCard } from '../../../lib/og';
import { ogTargets } from '../../../lib/og-cards';

export async function getStaticPaths() {
  return (await ogTargets()).map(({ locale, path, spec }) => ({
    params: { locale, path },
    props: { spec },
  }));
}

export const GET: APIRoute = async ({ props }) =>
  new Response(await renderCard(props.spec), {
    headers: { 'Content-Type': 'image/png' },
  });
