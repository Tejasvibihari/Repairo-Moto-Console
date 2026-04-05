import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';

const AdminDashboardScreen = () => {
    return (
        <TabScreenWrapper greeting="Admin Dashboard" showMenuIcon={true}>
            <View style={styles.content}>
                <Text>Admin Dashboard Content</Text>
            </View>
        </TabScreenWrapper>
    )
}

export default AdminDashboardScreen

const styles = StyleSheet.create({
    content: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center'
    }
})