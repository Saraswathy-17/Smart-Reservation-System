const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('smart_res_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || 'An unexpected error occurred.';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (credentials) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (userData) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    getMe: () => request('/auth/me'),
    updateProfile: (profileData) =>
      request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),
    changePassword: (passwordData) =>
      request('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify(passwordData),
      }),
    forgotPassword: (email) =>
      request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token, newPassword) =>
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: newPassword }),
      }),
    getGoogleConfig: () => request('/auth/google/config'),
    googleCallback: (payload) =>
      request('/auth/google/callback', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Resources
  resources: {
    list: (category) =>
      request(`/resources/${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    get: (id) => request(`/resources/${id}`),
    create: (data) =>
      request('/resources/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      request(`/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      request(`/resources/${id}`, {
        method: 'DELETE',
      }),
  },

  // Slots & Availability
  slots: {
    list: (resourceId, date) => {
      const params = new URLSearchParams();
      if (resourceId) params.append('resource_id', resourceId);
      if (date) params.append('slot_date', date);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/slots/${query}`);
    },
    get: (id) => request(`/slots/${id}`),
    generate: (batchData) =>
      request('/slots/generate', {
        method: 'POST',
        body: JSON.stringify(batchData),
      }),
    updateCapacity: (slotId, maxCapacity) =>
      request(`/slots/${slotId}`, {
        method: 'PUT',
        body: JSON.stringify({ max_capacity: maxCapacity }),
      }),
  },

  // Reservations
  reservations: {
    create: (reservationData) =>
      request('/reservations/', {
        method: 'POST',
        body: JSON.stringify(reservationData),
      }),
    listMy: () => request('/reservations/my'),
    get: (id) => request(`/reservations/${id}`),
    cancel: (id, reason) =>
      request(`/reservations/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellation_reason: reason }),
      }),
  },

  // Queue & Prediction
  queue: {
    join: (queueData) =>
      request('/queue/join', {
        method: 'POST',
        body: JSON.stringify(queueData),
      }),
    listMy: () => request('/queue/my'),
    getStatus: (id) => request(`/queue/${id}/status`),
    leave: (id) =>
      request(`/queue/${id}/leave`, {
        method: 'POST',
      }),
  },

  // Admin Portal & Analytics
  admin: {
    getDashboard: () => request('/admin/dashboard'),
    listReservations: (statusFilter) => {
      const query = statusFilter ? `?status_filter=${statusFilter}` : '';
      return request(`/admin/reservations${query}`);
    },
    listQueues: (slotId) => {
      const query = slotId ? `?slot_id=${slotId}` : '';
      return request(`/admin/queue${query}`);
    },
    forcePromote: (queueId) =>
      request(`/admin/queue/${queueId}/force-promote`, {
        method: 'POST',
      }),
    retrainML: (samples = 3000) =>
      request(`/admin/ml/retrain?samples=${samples}`, {
        method: 'POST',
      }),
    listUsers: (search, role) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/admin/users${query}`);
    },
    updateUserStatus: (userId, data) =>
      request(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getUserDetails: (userId) => request(`/admin/users/${userId}/details`),
    getDatabaseStatus: () => request('/admin/database-status'),
    getDatabaseRecords: (table = 'users', limit = 50) =>
      request(`/admin/database-records?table=${table}&limit=${limit}`),
  },

  // Notifications
  notifications: {
    listMy: (limit = 50) => request(`/notifications/my?limit=${limit}`),
    markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: () => request('/notifications/read-all', { method: 'PUT' }),
    listAdmin: (limit = 100) => request(`/notifications/admin?limit=${limit}`),
    broadcast: (data) =>
      request('/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

