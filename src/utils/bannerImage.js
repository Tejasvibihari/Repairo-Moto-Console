// src/utils/bannerImage.js
// Shared helper for picking + cropping a banner image.
//
// Every banner shown in the mobile app should look consistent in the
// carousel, so every image an admin uploads is forced through the SAME
// aspect ratio crop (16:9 — a standard "hero banner" ratio) and then
// resized down to one canonical pixel size, regardless of what the admin's
// source photo looked like.
//
// We rely on the OS-native crop UI (via expo-image-picker's
// `allowsEditing` + `aspect` options) rather than a hand-rolled gesture
// cropper — it already gives a proper drag/zoom crop box locked to the
// banner ratio on both Android and iOS with zero extra native
// dependencies, so it works in Expo Go and EAS builds alike.

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

// 16:9 — matches common mobile home-screen / promo banner carousels.
export const BANNER_ASPECT = [16, 9];
export const BANNER_ASPECT_RATIO = 16 / 9;

// Canonical output size every banner is normalized to before upload.
export const BANNER_TARGET_WIDTH = 1200;
export const BANNER_TARGET_HEIGHT = 675; // 1200 * 9/16

/**
 * Runs a picked image through the crop + resize/compress pipeline so the
 * final file is always ~1200x675 JPEG, no matter the source.
 */
const normalizeBannerImage = async (uri) => {
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: BANNER_TARGET_WIDTH } }], // height auto-scales — already 16:9 from the crop step
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result; // { uri, width, height }
};

/**
 * Opens the gallery, lets the admin crop to a locked 16:9 box, then
 * normalizes the result. Returns null if the admin cancels.
 */
export const pickBannerImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission required', 'Photo library access is needed to choose a banner image.');
        return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: BANNER_ASPECT,
        quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return normalizeBannerImage(result.assets[0].uri);
};

/**
 * Same as above but via the camera.
 */
export const pickBannerImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed to take a banner photo.');
        return null;
    }

    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: BANNER_ASPECT,
        quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return normalizeBannerImage(result.assets[0].uri);
};