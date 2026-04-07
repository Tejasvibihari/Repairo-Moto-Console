export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== 'string') return imagePath;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    // Remove leading slash from imagePath if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    // Ensure base URL does not end with trailing slash
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';
    return `${baseUrl}/${cleanPath}`;
};