import type { APIContext } from 'astro';
import { journalFeed } from '../lib/feed';

export const GET = (context: APIContext) => journalFeed('en', context);
