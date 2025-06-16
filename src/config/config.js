const isProduction = process.env.NODE_ENV === 'production';

// Cambia estas URL según tus entornos
const config = {
    apiUrl: isProduction ? 'https://api.sorbydata.com/api' : 'http://localhost:3003/api',
    // apiUrl: 'https://api.sorbydata.com/api',
};

export default config;
