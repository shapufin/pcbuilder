/**
 * rig-studio helper layer — re-export of the shared kit module (entry 131).
 * The helpers moved to `builder/kit/part-lib.ts` so the Atelier design can use
 * the same slotCode/zone/fit vocabulary without importing across designs.
 * Kept as a file (not deleted) so every existing import and the #332–352
 * test suite keep working untouched.
 */
export * from '../../kit/part-lib'
