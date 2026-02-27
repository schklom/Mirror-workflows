import { useStore, type Language } from '@/lib/store';
import { SUPPORTED_LANGUAGES_PAIRS } from '@/lib/i18n';
import { NativeSelect, NativeSelectOption } from './ui/native-select';

export const LanguageNativeSelect = () => {
  const { language, setLanguage } = useStore();

  return (
    <NativeSelect
      value={language}
      onChange={(ev) => ev && setLanguage(ev.target.value as Language)}
    >
      {SUPPORTED_LANGUAGES_PAIRS.map((ele) => (
        <NativeSelectOption key={ele.code} value={ele.code}>
          {ele.label} ({ele.code})
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
};
