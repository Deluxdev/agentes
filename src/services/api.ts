import axios from "axios";

const api = axios.create({
  baseURL: "https://express-tarefa.onrender.com/api/financeiro",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
