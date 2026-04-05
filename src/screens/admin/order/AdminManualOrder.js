import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TabScreenWrapper from '../../../components/common/TabScreenWrapper'

const AdminManualOrder = () => {
    return (
        <TabScreenWrapper greeting="Manual Order" showMenuIcon={true}>
            <View style={styles.content}>
                <Text>Manual Order Content</Text>
            </View>
        </TabScreenWrapper>
    )
}

export default AdminManualOrder

const styles = StyleSheet.create({})