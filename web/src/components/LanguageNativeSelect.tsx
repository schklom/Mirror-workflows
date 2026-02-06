import { useStore, type Language } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { NativeSelect, NativeSelectOption } from './ui/native-select';

export const LanguageNativeSelect = () => {
  const { language, setLanguage } = useStore();
  const { t } = useTranslation('settings');

  return (
    <NativeSelect
      value={language}
      onChange={(ev) => ev && setLanguage(ev.target.value as Language)}
    >
      {SUPPORTED_LANGUAGES.map((val) => (
        <NativeSelectOption key={val} value={val}>
          {t('language.' + val)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
};
