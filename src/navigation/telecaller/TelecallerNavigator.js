import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import CustomTabBar from '../../components/common/CustomTabBar';
import TelecallerDashboardScreen from '../../screens/telecaller/dashboard/TelecallerDashboardScreen';
import LeadsScreen from '../../screens/telecaller/leads/LeadsScreen';
import LeadDetailScreen from '../../screens/telecaller/leads/LeadDetailScreen';
import LeadFormScreen from '../../screens/telecaller/leads/LeadFormScreen';
import CreateInvoiceScreen from '../../screens/admin/invoice/CreateInoviceScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TelecallerTabs() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    const icon = route.name === 'Dashboard' ? 'home-outline' : 'people-outline';
                    return <Ionicons name={icon} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={TelecallerDashboardScreen} />
            <Tab.Screen name="Leads" component={LeadsScreen} />
        </Tab.Navigator>
    );
}

// Tabs plus the screens that open on top of them.
export default function TelecallerNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="TelecallerTabs">
            <Stack.Screen name="TelecallerTabs" component={TelecallerTabs} />
            <Stack.Screen name="LeadDetail" component={LeadDetailScreen} />
            <Stack.Screen name="LeadForm" component={LeadFormScreen} />
            <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
        </Stack.Navigator>
    );
}
