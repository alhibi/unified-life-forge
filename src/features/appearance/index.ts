/**
 * The appearance feature — every control that changes how the app looks.
 *
 * Two screens consume these sections: `المظهر` (mode, palette, typography,
 * prayer-clock themes) and `الواجهة` (geometry). They share the atoms in
 * AppearancePrimitives so both read as one product.
 */

export {
  type ChoiceOption,
  ChoiceRow,
  FeedbackLine,
  type InspectorEntry,
  OptionCard,
  SegmentedControl,
  type SegmentedOption,
  SettingsSection,
  type SliderPreset,
  SliderRow,
  ToggleRow,
  TokenInspector,
} from './components/AppearancePrimitives';
export { default as AutoPrayerThemeSection } from './components/AutoPrayerThemeSection';
export { default as InterfaceSection } from './components/InterfaceSection';
export { default as ModeSection } from './components/ModeSection';
export { default as PaletteSection } from './components/PaletteSection';
export { default as TypographySection } from './components/TypographySection';
