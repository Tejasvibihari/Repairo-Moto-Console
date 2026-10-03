// App.js
import 'react-native-gesture-handler';
import React, { useEffect, useMemo } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import StatusBar from './src/components/common/StatusBar';
import AuthGate from './src/navigation/AuthGate';
import { store, persistor } from './src/store';
import { LightTheme, DarkTheme } from './src/styles/Theme';
import { syncSystemTheme } from './src/store/slices/themeSlice';

import UpdateModal from "./src/components/common/UpdateModal";
import useVersionCheck from "./src/utils/useVersionCheck";


// Inner component that uses Redux hooks
function ThemedApp() {
  const dispatch = useDispatch();
  const systemScheme = useColorScheme();
  const themeMode = useSelector((state) => state.theme.mode);

  useEffect(() => {
    if (systemScheme) {
      dispatch(syncSystemTheme(systemScheme));
    }
  }, [systemScheme, dispatch]);

  const activeTheme = themeMode === 'dark' ? DarkTheme : LightTheme;

  // React Navigation paints every screen/scene with its own theme background
  // (light grey by default). Feed it the app theme so screens that don't set
  // their own background - and slide transitions - follow dark mode.
  const navTheme = useMemo(() => {
    const base = themeMode === 'dark' ? NavDarkTheme : NavDefaultTheme;
    const c = activeTheme.colors;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        background: c.background,
        card: c.surface,
        text: c.textPrimary,
        border: c.border,
        notification: c.error,
      },
    };
  }, [themeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar />
      <AuthGate />
    </NavigationContainer>
  );
}
export default function App() {
  // const [updateInfo, setUpdateInfo] = useVersionCheck(
  //   process.env.EXPO_PUBLIC_API_URL || "https://api.repairomoto.in",
  //   "console"
  // );

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <ThemedApp />

          {/* <UpdateModal
           visible={updateInfo.visible}
            force={updateInfo.force}
            message={updateInfo.message}
            storeUrl={updateInfo.storeUrl}
            onLater={() => setUpdateInfo((prev) => ({ ...prev, visible: false }))}
          /> */}
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}