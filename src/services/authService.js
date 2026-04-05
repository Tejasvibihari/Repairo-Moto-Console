export const authService = {
    login: async (credentials) => {
        // Return dummy response
        return {
            data: {
                token: 'dummy_token',
                user: {
                    name: 'Dummy User',
                    email: credentials.email || 'dummy@test.com',
                    role: credentials.role || 'Admin',
                }
            }
        };
    },
    getMe: async () => {
        throw new Error('No session'); // Always logged out on restart for easy testing
    }
};
