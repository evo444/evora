import { API } from '../contexts/AuthContext';

export const eventService = {
  getAll: (params) => API.get('/api/events', { params }).then(r => r.data),
  getById: (id) => API.get(`/api/events/${id}`).then(r => r.data),
  create: (formData) => API.post('/api/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  update: (id, formData) => API.put(`/api/events/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  delete: (id) => API.delete(`/api/events/${id}`).then(r => r.data),
  submit: (formData) => API.post('/api/events/submit', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  getSubmissions: () => API.get('/api/events/submissions').then(r => r.data),
  approveSubmission: (id) => API.put(`/api/events/submissions/${id}/approve`).then(r => r.data),
  rejectSubmission: (id) => API.delete(`/api/events/submissions/${id}/reject`).then(r => r.data),
};

export const commentService = {
  getByEvent: (eventId) => API.get(`/api/comments/${eventId}`).then(r => r.data),
  create: (eventId, text) => API.post(`/api/comments/${eventId}`, { text }).then(r => r.data),
  update: (id, text) => API.put(`/api/comments/${id}`, { text }).then(r => r.data),
  delete: (id) => API.delete(`/api/comments/${id}`).then(r => r.data),
};

export const ratingService = {
  getByEvent: (eventId) => API.get(`/api/ratings/${eventId}`).then(r => r.data),
  getMyRating: (eventId) => API.get(`/api/ratings/${eventId}/mine`).then(r => r.data),
  rate: (eventId, stars) => API.post(`/api/ratings/${eventId}`, { stars }).then(r => r.data),
};

export const adminService = {
  getUsers: () => API.get('/api/admin/users').then(r => r.data),
  approveUser: (id) => API.put(`/api/admin/users/${id}/approve`).then(r => r.data),
  rejectUser: (id) => API.put(`/api/admin/users/${id}/reject`).then(r => r.data),
  deleteUser: (id) => API.delete(`/api/admin/users/${id}`).then(r => r.data),
  getAnalytics: () => API.get('/api/admin/analytics').then(r => r.data),
  toggleTrending: (id) => API.put(`/api/admin/events/${id}/trending`).then(r => r.data),
};
