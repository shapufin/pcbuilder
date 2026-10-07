import { getPayloadClient } from '@/lib/shop'
import { registerLimiter, registerUser } from '@/lib/auth'

/**
 * POST /api/auth/register — public signup (entry 15). Rate-limited per IP and
 * Origin-checked inside registerUser; roles are pinned server-side to
 * 'customer' (the local API create bypasses the admin-only roles field access,
 * and the zod schema strips any roles/admin keys from the body).
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const payload = await getPayloadClient()
  return registerUser(
    {
      create: ({ data }) => payload.create({ collection: 'users', data: data as never }),
      limiter: registerLimiter,
    },
    { body, headers: req.headers },
  )
}
