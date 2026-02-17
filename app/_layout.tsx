import useAuthStore from '@/store/auth.store';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import './global.css';

Sentry.init({
	dsn: 'https://5f16dde2274969c56f3b848463d4b49f@o4508896855982080.ingest.us.sentry.io/4510893194870784',

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Enable Logs
	enableLogs: true,

	// Configure Session Replay
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1,
	integrations: [
		Sentry.mobileReplayIntegration(),
		Sentry.feedbackIntegration(),
	],

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
	const { isLoading, fetchAuthenticatedUser } = useAuthStore();
	const [fontsLoaded, error] = useFonts({
		'QuickSand-Bold': require('../assets/fonts/Quicksand-Bold.ttf'),
		'QuickSand-Medium': require('../assets/fonts/Quicksand-Medium.ttf'),
		'QuickSand-Regular': require('../assets/fonts/Quicksand-Regular.ttf'),
		'QuickSand-SemiBold': require('../assets/fonts/Quicksand-SemiBold.ttf'),
		'QuickSand-Light': require('../assets/fonts/Quicksand-Light.ttf'),
	});

	useEffect(() => {
		if (error) throw error;
		if (fontsLoaded) SplashScreen.hideAsync();
	}, [fontsLoaded, error]);

	useEffect(() => {
		fetchAuthenticatedUser();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (!fontsLoaded || isLoading) return null;

	return <Stack screenOptions={{ headerShown: false }} />;
});
