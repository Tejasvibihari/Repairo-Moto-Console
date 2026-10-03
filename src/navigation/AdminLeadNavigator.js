import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminLeadsOverviewScreen from '../screens/admin/lead/AdminLeadsOverviewScreen';
import AdminLeadsListScreen from '../screens/admin/lead/AdminLeadsListScreen';
// Detail / edit screens are shared with the telecaller flow.
import LeadDetailScreen from '../screens/telecaller/leads/LeadDetailScreen';
import LeadFormScreen from '../screens/telecaller/leads/LeadFormScreen';
import ManualInvoiceDetail from '../screens/admin/invoice/ManualInvoiceDetail';

const Stack = createNativeStackNavigator();

export default function AdminLeadNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="AdminLeadsOverview"
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
            }}
        >
            <Stack.Screen name="AdminLeadsOverview" component={AdminLeadsOverviewScreen} />
            <Stack.Screen name="AdminLeadsList" component={AdminLeadsListScreen} />
            <Stack.Screen name="LeadDetail" component={LeadDetailScreen} />
            <Stack.Screen name="LeadForm" component={LeadFormScreen} />
            <Stack.Screen name="ManualInvoiceDetail" component={ManualInvoiceDetail} />
        </Stack.Navigator>
    );
}
