/**
 * Иконки сайта: `/icons/favicon-32.png`, `/icons/apple-touch.png` и остальные
 * из списка `lib/icons.ts`. Растеризуются на сборке из `public/favicon.svg`.
 */
import type { APIRoute } from 'astro';
import { ICONS, renderIcon } from '../../lib/icons';

export function getStaticPaths() {
  return Object.keys(ICONS).map((name) => ({ params: { name }, props: { name } }));
}

export const GET: APIRoute = async ({ props }) =>
  new Response(await renderIcon(props.name), {
    headers: { 'Content-Type': 'image/png' },
  });
