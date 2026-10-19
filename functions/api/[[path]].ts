import { handle } from 'hono/cloudflare-pages'
import { createApp } from '../../src/server/app'

export const onRequest = handle(createApp())
