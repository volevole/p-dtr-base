// src/config/api.js
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://p-dtr-base.onrender.com'    //process.env.REACT_APP_API_URL 
  : 'http://localhost:3001';

export default API_URL;