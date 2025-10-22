import axios, { AxiosInstance, AxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export class SplitwiseClient {
  private client: AxiosInstance;
  private accessToken: string;

  constructor() {
    const apiBaseUrl = process.env.SPLITWISE_API_BASE_URL || 'https://secure.splitwise.com/api/v3.0';
    this.accessToken = process.env.SPLITWISE_ACCESS_TOKEN || '';

    if (!this.accessToken) {
      throw new Error('SPLITWISE_ACCESS_TOKEN environment variable is required');
    }

    this.client = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async handleRequest<T>(request: Promise<any>): Promise<T> {
    try {
      const response = await request;
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(
          `Splitwise API Error: ${axiosError.response?.status} - ${
            JSON.stringify(axiosError.response?.data) || axiosError.message
          }`
        );
      }
      throw error;
    }
  }

  // User endpoints
  async getCurrentUser() {
    return this.handleRequest(this.client.get('/get_current_user'));
  }

  async getUser(id: number) {
    return this.handleRequest(this.client.get(`/get_user/${id}`));
  }

  async updateUser(id: number, data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
    locale?: string;
    default_currency?: string;
  }) {
    return this.handleRequest(this.client.post(`/update_user/${id}`, data));
  }

  // Group endpoints
  async getGroups() {
    return this.handleRequest(this.client.get('/get_groups'));
  }

  async getGroup(id: number) {
    return this.handleRequest(this.client.get(`/get_group/${id}`));
  }

  async createGroup(data: {
    name: string;
    group_type?: 'home' | 'trip' | 'couple' | 'other' | 'apartment' | 'house';
    simplify_by_default?: boolean;
    [key: string]: any; // For users__{index}__{property} format
  }) {
    return this.handleRequest(this.client.post('/create_group', data));
  }

  async deleteGroup(id: number) {
    return this.handleRequest(this.client.post(`/delete_group/${id}`));
  }

  async undeleteGroup(id: number) {
    return this.handleRequest(this.client.post(`/undelete_group/${id}`));
  }

  async addUserToGroup(data: {
    group_id: number;
    user_id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  }) {
    return this.handleRequest(this.client.post('/add_user_to_group', data));
  }

  async removeUserFromGroup(data: { group_id: number; user_id: number }) {
    return this.handleRequest(this.client.post('/remove_user_from_group', data));
  }

  // Friend endpoints
  async getFriends() {
    return this.handleRequest(this.client.get('/get_friends'));
  }

  async getFriend(id: number) {
    return this.handleRequest(this.client.get(`/get_friend/${id}`));
  }

  async createFriend(data: {
    user_email: string;
    user_first_name?: string;
    user_last_name?: string;
  }) {
    return this.handleRequest(this.client.post('/create_friend', data));
  }

  async createFriends(data: { [key: string]: any }) {
    return this.handleRequest(this.client.post('/create_friends', data));
  }

  async deleteFriend(id: number) {
    return this.handleRequest(this.client.post(`/delete_friend/${id}`));
  }

  // Expense endpoints
  async getExpenses(params?: {
    group_id?: number;
    friend_id?: number;
    dated_after?: string;
    dated_before?: string;
    updated_after?: string;
    updated_before?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.handleRequest(this.client.get('/get_expenses', { params }));
  }

  async getExpense(id: number) {
    return this.handleRequest(this.client.get(`/get_expense/${id}`));
  }

  async createExpense(data: {
    cost: string;
    description: string;
    details?: string;
    date?: string;
    repeat_interval?: 'never' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
    currency_code?: string;
    category_id?: number;
    group_id?: number;
    split_equally?: boolean;
    [key: string]: any; // For users__{index}__{property} format
  }) {
    return this.handleRequest(this.client.post('/create_expense', data));
  }

  async updateExpense(id: number, data: {
    cost?: string;
    description?: string;
    details?: string;
    date?: string;
    repeat_interval?: 'never' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
    currency_code?: string;
    category_id?: number;
    group_id?: number;
    [key: string]: any; // For users__{index}__{property} format
  }) {
    return this.handleRequest(this.client.post(`/update_expense/${id}`, data));
  }

  async deleteExpense(id: number) {
    return this.handleRequest(this.client.post(`/delete_expense/${id}`));
  }

  async undeleteExpense(id: number) {
    return this.handleRequest(this.client.post(`/undelete_expense/${id}`));
  }

  // Comment endpoints
  async getComments(expenseId: number) {
    return this.handleRequest(this.client.get('/get_comments', { params: { expense_id: expenseId } }));
  }

  async createComment(data: { expense_id: number; content: string }) {
    return this.handleRequest(this.client.post('/create_comment', data));
  }

  async deleteComment(id: number) {
    return this.handleRequest(this.client.post(`/delete_comment/${id}`));
  }

  // Notification endpoints
  async getNotifications(params?: { updated_after?: string; limit?: number }) {
    return this.handleRequest(this.client.get('/get_notifications', { params }));
  }

  // Utility endpoints
  async getCurrencies() {
    return this.handleRequest(this.client.get('/get_currencies'));
  }

  async getCategories() {
    return this.handleRequest(this.client.get('/get_categories'));
  }
}
