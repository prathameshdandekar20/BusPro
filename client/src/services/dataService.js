import api from './api';

export const authService = {
  signup: async (data) => {
    const response = await api.post('/auth/signup', data);
    if (response.data.token) {
      localStorage.setItem('smartbus_token', response.data.token);
      localStorage.setItem('smartbus_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  login: async (data) => {
    const response = await api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('smartbus_token', response.data.token);
      localStorage.setItem('smartbus_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  googleAuth: async (data) => {
    const response = await api.post('/auth/google', data);
    if (response.data.token) {
      localStorage.setItem('smartbus_token', response.data.token);
      localStorage.setItem('smartbus_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    if (response.data.token) {
      localStorage.setItem('smartbus_token', response.data.token);
      localStorage.setItem('smartbus_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('smartbus_token');
    localStorage.removeItem('smartbus_user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('smartbus_user');
    return user ? JSON.parse(user) : null;
  },

  updateLocalUser: (data) => {
    const currentUser = JSON.parse(localStorage.getItem('smartbus_user') || '{}');
    const updatedUser = { ...currentUser, ...data };
    localStorage.setItem('smartbus_user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('smartbus_token');
  },
};

export const busService = {
  getAll: async (params = {}) => {
    const response = await api.get('/buses', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/buses/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/buses', data);
    return response.data;
  },

  updateSeats: async (busId, availableSeats) => {
    const response = await api.post('/buses/updateSeats', { busId, availableSeats });
    return response.data;
  },

  updateLocation: async (busId, latitude, longitude) => {
    const response = await api.post('/buses/updateLocation', { busId, latitude, longitude });
    return response.data;
  },

  startTrip: async (busId) => {
    const response = await api.post('/buses/startTrip', { busId });
    return response.data;
  },

  endTrip: async (busId) => {
    const response = await api.post('/buses/endTrip', { busId });
    return response.data;
  },

  updateRoute: async (busId, routePoints) => {
    const response = await api.post('/buses/updateRoute', { busId, routePoints });
    return response.data;
  },

  delete: async (busId) => {
    const response = await api.delete(`/buses/${busId}`);
    return response.data;
  },
};

export const rideService = {
  book: async (data) => {
    const response = await api.post('/rides/book', data);
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/rides/history');
    return response.data;
  },

  cancel: async (rideId) => {
    const response = await api.post('/rides/cancel', { rideId });
    return response.data;
  },
};
