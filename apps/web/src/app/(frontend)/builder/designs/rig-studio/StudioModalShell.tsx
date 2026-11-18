/**
 * rig-studio dialog shell — re-export of the shared kit module (entry 131).
 * The a11y chrome moved to `builder/kit/ModalShell.tsx` so the Atelier design
 * can render its own dialogs through the same Escape/focus/scroll-lock
 * contract. Existing imports keep working unchanged.
 */
export { ModalShell as StudioModalShell } from '../../kit/ModalShell'
