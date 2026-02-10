import axios from "axios";

/**
 * Pre-configured axios instance pointed at our FastAPI backend.
 *
 * This is like creating a shared fetch wrapper with a base URL.
 * All API calls go through this instance, so if the backend URL
 * changes, you only update it in one place.
 */
export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});
