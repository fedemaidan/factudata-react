import axios from "axios";
import { attachAuthInterceptors } from "src/services/_authInterceptor";

const isProduction = process.env.NODE_ENV === "production";
const apiUrl =
  process.env.NEXT_PUBLIC_CELULANDIA_URL
  || (isProduction
    ? "https://api.sorbydata.com/api/celulandia"
    : "http://localhost:3003/api/celulandia");
// Crea una instancia de axios
const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 1000 * 60 * 30, // 30 minutos
});

attachAuthInterceptors(api);

export default api;
