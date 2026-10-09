import axios from "axios";
import { getNeonToken, neonEnabled, refreshNeonToken } from "./neonAuth";
import { getSocketId } from "./socket";

const TOKEN_KEY = "whiteboard_token";

export const getToken = () =>
  neonEnabled ? getNeonToken() : localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? "http://localhost:5050/api"
      : "https://kagoj-backend-oju1.onrender.com/api"),
});

api.interceptors.request.use(async (config) => {
  let token = getToken();
  if (neonEnabled && !token) token = await refreshNeonToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const socketId = getSocketId();
  if (socketId) config.headers["x-socket-id"] = socketId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401 && config) {
      if (neonEnabled) {
        if (!config._retried) {
          config._retried = true;
          const token = await refreshNeonToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            return api(config);
          }
        }
      } else {
        clearToken();
        window.location.assign("/login");
      }
    }
    return Promise.reject(
      new Error(error.response?.data?.error || error.message || "Request failed"),
    );
  },
);

const data = (p) => p.then((r) => r.data);
const pick = (p, key) => data(p).then((d) => d[key]);

const base = (id) => `/whiteboards/${id}`;

export const authApi = {
  register: (body) => data(api.post("/auth/register", body)),
  login: (body) => data(api.post("/auth/login", body)),
  me: () => pick(api.get("/auth/me"), "user"),
};

export const userApi = {
  search: (q) => pick(api.get("/users/search", { params: { q } }), "users"),
};

export const boardApi = {
  list: () => pick(api.get("/whiteboards"), "boards"),
  create: (body) => pick(api.post("/whiteboards", body), "board"),
  get: (id) => data(api.get(base(id))),
  update: (id, body) => pick(api.patch(base(id), body), "board"),
  remove: (id) => data(api.delete(base(id))),
  addMember: (id, body) => pick(api.post(`${base(id)}/members`, body), "member"),
  removeMember: (id, userId) => data(api.delete(`${base(id)}/members/${userId}`)),
};

export const uploadApi = {
  image: (boardId, blob, filename) => {
    const form = new FormData();
    form.append("image", blob, filename);
    return pick(api.post(`${base(boardId)}/uploads`, form), "url");
  },
};

export const elementApi = {
  create: (boardId, body) => pick(api.post(`${base(boardId)}/elements`, body), "element"),
  bulkCreate: (boardId, body) =>
    pick(api.post(`${base(boardId)}/elements/bulk`, body), "elements"),
  update: (boardId, elementId, body) =>
    pick(api.patch(`${base(boardId)}/elements/${elementId}`, body), "element"),
  remove: (boardId, elementId) => data(api.delete(`${base(boardId)}/elements/${elementId}`)),
};

const ai = (name, key = "elements") => (boardId, body) =>
  pick(api.post(`${base(boardId)}/ai/${name}`, body), key);

export const aiApi = {
  brainstorm: ai("brainstorm"),
  outline: ai("outline"),
  diagram: ai("diagram"),
  chart: ai("chart"),
  edit: ai("edit"),
  summary: ai("summary", "summary"),
};

export default api;
