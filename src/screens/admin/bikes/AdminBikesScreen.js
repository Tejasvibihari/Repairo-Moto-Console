import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TabScreenWrapper from '../../../components/common/TabScreenWrapper'

const AdminBikesScreen = () => {
    return (
        <TabScreenWrapper greeting="Bikes" showMenuIcon={true}>
            <View style={styles.content}>
                <Text>Bikes Content</Text>
            </View>
        </TabScreenWrapper>
    )
}

export default AdminBikesScreen

const styles = StyleSheet.create({})