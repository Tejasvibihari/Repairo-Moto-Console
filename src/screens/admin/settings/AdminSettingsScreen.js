import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TabScreenWrapper from '../../../components/common/TabScreenWrapper'

const AdminSettingsScreen = () => {
    return (
        <TabScreenWrapper greeting="Admin Settings" showMenuIcon={true}>
            <View style={styles.content}>
                <Text>Admin Settings Content</Text>
            </View>
        </TabScreenWrapper>
    )
}

export default AdminSettingsScreen

const styles = StyleSheet.create({})