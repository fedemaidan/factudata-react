const isProduction = process.env.NODE_ENV === 'production';

// Cambia estas URL según tus entornos
const config = {
    apiUrl: isProduction ? 'https://api-sorbydata.up.railway.app/api' : 'http://localhost:3000/api',
    // apiUrl: 'https://api-sorbydata.up.railway.app/api',
};

export default config;
