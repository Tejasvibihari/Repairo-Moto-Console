// App.js
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
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

  return (
    <>
      <StatusBar />
      <AuthGate />
    </>
  );
}
export default function App() {
  const [updateInfo, setUpdateInfo] = useVersionCheck(
    process.env.EXPO_PUBLIC_API_URL || "https://api.repairomoto.in"
  );

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <NavigationContainer>
            <ThemedApp />
          </NavigationContainer>

          <UpdateModal
            visible={updateInfo.visible}
            force={updateInfo.force}
            message={updateInfo.message}
            storeUrl={updateInfo.storeUrl}
            onLater={() => setUpdateInfo((prev) => ({ ...prev, visible: false }))}
          />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}