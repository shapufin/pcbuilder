import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const getPayloadClient = async () => {
  const config = await configPromise
  return getPayload({ config })
}

// Pure helpers live in ./filters (dependency-free, unit-testable per the
// RegisterDeps convention); re-exported so existing '@/lib/shop' imports hold.
export { formatPrice, productFilters } from './filters'
