const isProduction = process.env.NODE_ENV === 'production';

// Cambia estas URL según tus entornos
const config = {
    apiUrl: isProduction ? 'https://sorbybotwa-production-fac8.up.railway.app/api' : 'http://localhost:3000/api',
};

export default config;
