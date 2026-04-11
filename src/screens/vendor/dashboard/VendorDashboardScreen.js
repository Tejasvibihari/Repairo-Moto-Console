import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TabScreenWrapper from '../../../components/common/TabScreenWrapper'

const VendorDashboardScreen = () => {
    return (
        <TabScreenWrapper showBookingIcon={false} showMenuIcon={true}>
            <View>
                <Text>VendorDashboardScreen</Text>
            </View>
        </TabScreenWrapper>
    )
}

export default VendorDashboardScreen

const styles = StyleSheet.create({})