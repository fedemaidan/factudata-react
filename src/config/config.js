const isProduction = process.env.NODE_ENV === 'production';

// Cambia estas URL según tus entornos
const config = {
    apiUrl: isProduction ? 'https://miapi.example.com/api' : 'http://localhost:3001/api',
};

export default config;
