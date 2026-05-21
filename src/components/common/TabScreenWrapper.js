import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import TopBar from './TopBar';
import { getImageUrl } from '../../utils/imageUtils';
import { selectUserRole } from '../../store/slices/authSlice';

const TabScreenWrapper = ({ children, showMenuIcon = false, showBookingIcon = false, greeting }) => {
    const navigation = useNavigation();
    const user = useSelector((state) => state.auth.user);
    const role = useSelector(selectUserRole);

    const getAvatarSource = () => {
        if (user?.profileImage) return { uri: getImageUrl(user.profileImage) };
        return null; // TopBar will show fallback icon
    };

    const userName = user?.name || user?.firstName || 'User';

    // Typically you'd use a Drawer, but for now we might not have one. 
    // If you add a DrawerNavigator later, set showMenuIcon=true and this will work.
    const handleMenuPress = () => {
        if (navigation.dispatch) {
            navigation.dispatch(DrawerActions.openDrawer());
        }
    };

    return (
        <View style={styles.container}>
            <TopBar
                userName={userName}
                greeting={greeting}
                avatarSource={getAvatarSource()}
                onMenuPress={handleMenuPress}
                onNotificationPress={() => navigation.navigate('Notifications')}
                onAvatarPress={() => navigation.navigate('Profile')} // Adjust if Profile is in a different stack
                onBookingPress={() => console.log('Boo  king Pressed')} // Adjust navigation target
                showMenuIcon={showMenuIcon}
                showBookingIcon={showBookingIcon}
            />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
});

export default TabScreenWrapper;
