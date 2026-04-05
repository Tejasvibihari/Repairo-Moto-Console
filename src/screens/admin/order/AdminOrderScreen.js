import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TabScreenWrapper from '../../../components/common/TabScreenWrapper'

const AdminOrderScreen = () => {
    return (
        <TabScreenWrapper greeting="Orders" showMenuIcon={true}>
            <View style={styles.content}>
                <Text>Orders Content</Text>
            </View>
        </TabScreenWrapper>
    )
}

export default AdminOrderScreen

const styles = StyleSheet.create({})