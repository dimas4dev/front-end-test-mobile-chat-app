import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AppProvider, useAppContext } from '@/hooks/AppContext';
import { DrizzleStudioDevTool } from '@/database/DrizzleStudio';
import { ErrorBoundary, initMonitoring, log, trackNavigation } from '@/utils';

SplashScreen.preventAutoHideAsync();

// Función para proteger rutas basado en autenticación
function useProtectedRoute(isLoggedIn: boolean, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Verificar si estamos en la pantalla de login
    const isLoginRoute = segments[0] === 'login';

    if (!isLoggedIn && !isLoginRoute) {
      // Redirigir a la pantalla de login si no está autenticado
      router.replace('/login');
    } else if (isLoggedIn && isLoginRoute) {
      // Redirigir a la pantalla principal si está autenticado y trata de acceder al login
      router.replace('/');
    }
  }, [isLoggedIn, loading, segments, router]);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Inicializar el sistema de monitoreo al cargar la aplicación
  useEffect(() => {
    const setupMonitoring = async () => {
      try {
        await initMonitoring();
        log.info('Application started');
      } catch (error) {
        console.error('Failed to initialize monitoring:', error);
      }
    };

    setupMonitoring();
  }, []);

  // Manejar errores de carga de fuentes
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <RootLayoutNav />
      </AppProvider>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoggedIn, loading, dbInitialized } = useAppContext();

  // Protección de rutas basada en autenticación
  useProtectedRoute(isLoggedIn, loading);

  // Seguimiento de la navegación
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    // Registrar cada cambio de ruta en el sistema de monitoreo
    if (pathname) {
      trackNavigation(pathname);
    }
  }, [pathname, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="ChatRoom"
          options={{
            presentation: 'modal',
            title: 'Chat',
            headerBackTitle: 'Volver',
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
      <StatusBar style="auto" />
      {__DEV__ && dbInitialized && <DrizzleStudioDevTool />}
    </ThemeProvider>
  );
}
