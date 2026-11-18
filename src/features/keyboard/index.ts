export { default as KeyboardSetting } from './components/KeyboardSetting';
export {
  requestCloseSoftKeyboard,
  requestSoftKeyboard,
  useSoftKeyboardState,
} from './components/softKeyboardControl';
export { default as SoftKeyboardToggle } from './components/SoftKeyboardToggle';
export { default as KeyboardProvider } from './KeyboardProvider';
export {
  readSoftKeyboardPreference,
  type SoftKeyboardPreference,
  supportsSoftKeyboard,
  writeSoftKeyboardPreference,
} from './lib/preference';
