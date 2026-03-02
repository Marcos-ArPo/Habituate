import { useColorScheme as useRNColorScheme } from 'react-native';

import { useAppSettings } from '@/context/settings-context';

export function useColorScheme() {
	const systemColorScheme = useRNColorScheme();
	const settings = useAppSettings();

	return settings?.colorScheme ?? systemColorScheme;
}
