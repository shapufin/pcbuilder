import type { Metadata } from 'next'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = { title: 'Create account | BuildMyRig' }

type Props = { searchParams: Promise<{ next?: string }> }

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams
  return <RegisterForm next={next} />
}
