export function toast(message) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: message }))
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
