const isProduction = process.env.NODE_ENV === 'production';

// Cambia estas URL según tus entornos
const config = {
    apiUrl: isProduction ? 'https://api.staging.sorbydata.com/api' : 'http://localhost:3000/api',
};

export default config;
