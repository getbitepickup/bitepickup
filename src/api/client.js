// src/api/client.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * API Client for making HTTP requests
 */
class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
    this.token = localStorage.getItem('accessToken');
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Get headers for request
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Handle response
   */
  async handleResponse(response) {
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse response:', e);
      data = { message: 'Invalid response from server' };
    }
    
    console.log('📥 API Response:', { 
      status: response.status, 
      ok: response.ok, 
      data: data 
    });
    
    if (!response.ok) {
      // Handle unauthorized (token expired or invalid)
      if (response.status === 401) {
        console.warn('⚠️ Unauthorized request - clearing token');
        this.setToken(null);
      }
      
      // Extract error message from response
      const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
      console.error('❌ API Error:', errorMessage);
      
      throw new Error(errorMessage);
    }
    
    return data;
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}, requireAuth = true) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, requireAuth = true) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse(response);
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, requireAuth = true) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse(response);
  }

  /**
   * DELETE request
   */
  async delete(endpoint, requireAuth = true) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * Upload file
   */
  async upload(endpoint, formData, requireAuth = true) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });
    
    return this.handleResponse(response);
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;