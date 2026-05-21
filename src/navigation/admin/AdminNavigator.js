import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import CustomTabBar from '../../components/common/CustomTabBar';
import AdminDashboardScreen from '../../screens/admin/dashboard/AdminDashboardScreen';
import AdminOrderScreen from '../../screens/admin/order/AdminOrderScreen';
import AdminManualOrder from '../../screens/admin/order/AdminManualOrder';
import AdminBrandCatalog from '../../screens/admin/brand/AdminBrandCatalog';
import AdminOrderDetail from '../../screens/admin/order/AdminOrderDetail';
import AdminAddModelScreen from '../../screens/admin/brand/AdminAddModelsScreen';
import AdminBrandsScreen from '../../screens/admin/brand/AdminBrandsScreen';
import AdminGenerateInvoice from '../../screens/admin/order/AdminGenerateInvoice';
import ManualInvoiceDetail from '../../screens/admin/invoice/ManualInvoiceDetail';
import CreateInvoiceScreen from '../../screens/admin/invoice/CreateInoviceScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab navigator (no OrderDetail here) ──
function AdminTabs() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'pulse-outline';
                    if (route.name === 'Dashboard') iconName = 'pulse-outline';
                    else if (route.name === 'Orders') iconName = 'receipt-outline';
                    else if (route.name === 'ManualOrder') iconName = 'add-circle-outline';
                    else if (route.name === 'Brands') iconName = 'bicycle';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
            <Tab.Screen name="Orders" component={AdminOrderScreen} />
            <Tab.Screen name="ManualOrder" component={AdminManualOrder} />
            <Tab.Screen name="Brands" component={AdminBrandCatalog} />

        </Tab.Navigator>
    );
}

// ── Stack wraps tabs + detail screens ──
export default function AdminNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="AdminTabs"
        >
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
            <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetail} />
            <Stack.Screen name="AdminBrandCatalog" component={AdminBrandCatalog} />
            <Stack.Screen name="AdminAddModelScreen" component={AdminAddModelScreen} />
            <Stack.Screen name="AdminBrandsScreen" component={AdminBrandsScreen} />
            <Stack.Screen name="AdminGenerateInvoice" component={AdminGenerateInvoice} />
            <Stack.Screen name="ManualInvoiceDetail" component={ManualInvoiceDetail} />
            <Stack.Screen name="AdminEditManualInvoice" component={CreateInvoiceScreen} />
        </Stack.Navigator>
    );
}