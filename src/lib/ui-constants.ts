/**
 * Shared UI constants for consistent styling across the application.
 * Write once, use everywhere. Do not duplicate these values in components.
 */

/**
 * Standard tab trigger class for all settings sub-page tabs.
 * Uses data-active (ShadCN/BaseUI attribute) with !important to
 * override the component's built-in active styles.
 */
export const TAB_TRIGGER_CLASS =
  'min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white';

/**
 * Standard tab list class for all settings sub-page tab containers.
 */
export const TAB_LIST_CLASS =
  'border-b w-full justify-start rounded-none bg-transparent p-0 mb-6';
