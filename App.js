// App.js
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { useColorScheme } from 'react-native';
import { store } from './src/store';
import AuthGate from './src/navigation/AuthGate';
import { LightTheme, DarkTheme } from './src/styles/Theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncSystemTheme } from './src/store/slices/themeSlice';

// ── Inner component — must be inside <Provider> to use Redux hooks ──
function ThemedApp() {
  const dispatch = useDispatch();
  const systemScheme = useColorScheme(); // "light" | "dark" | null — auto-updates on OS change
  const themeMode = useSelector((state) => state.theme.mode);

  // Fires on mount AND whenever the user flips their OS dark mode setting
  useEffect(() => {
    if (systemScheme) {
      dispatch(syncSystemTheme(systemScheme));
    }
  }, [systemScheme]);

  const activeTheme = themeMode === 'dark' ? DarkTheme : LightTheme;

  return (
    <>
      <StatusBar
        style={themeMode === 'dark' ? 'light' : 'dark'}
        backgroundColor={activeTheme.colors.background}
      />
      <AuthGate />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <ThemedApp />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}