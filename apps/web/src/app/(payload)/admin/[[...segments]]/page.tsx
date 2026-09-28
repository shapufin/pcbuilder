import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'
import '@payloadcms/next/css'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = async ({ params, searchParams }: Args) =>
  generatePageMetadata({ config, params, searchParams })

const Page = async ({ params, searchParams }: Args) =>
  RootPage({
    config,
    params,
    searchParams,
    importMap,
  })

export default Page



