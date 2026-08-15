export { default as KeyboardSetting } from './components/KeyboardSetting';
export { default as KeyboardProvider } from './KeyboardProvider';
export {
  readSoftKeyboardPreference,
  type SoftKeyboardPreference,
  supportsSoftKeyboard,
  writeSoftKeyboardPreference,
} from './lib/preference';