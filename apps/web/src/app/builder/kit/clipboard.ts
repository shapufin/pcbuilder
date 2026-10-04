/**
 * Design kit: honest clipboard copy — resolves true only when the text
 * actually reached the clipboard (clipboard API, then the execCommand
 * fallback whose boolean return is honored). Callers must gate success UI
 * on the result (entry-55 review: false-success toasts were the round's
 * flagship bug class).
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const input = document.createElement('textarea')
      input.value = text
      document.body.appendChild(input)
      input.select()
      const ok = document.execCommand('copy')
      input.remove()
      return ok
    } catch {
      return false
    }
  }
}
