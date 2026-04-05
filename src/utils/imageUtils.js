// import { env } from '../config/env'; // Or however your backend URL is imported if needed, otherwise we just return simple logic

// If you have a base URL for images from the backend (like http://localhost:5000)
// Otherwise just return the string.
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== 'string') return imagePath;

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // Example: append backend URL if your app sends relative paths
    return `${process.env.EXPO_PUBLIC_API_URL}/${imagePath}`;

    return imagePath;
};
