import type { Metadata } from 'next'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = { title: 'Forgot password | BuildMyRig' }

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
