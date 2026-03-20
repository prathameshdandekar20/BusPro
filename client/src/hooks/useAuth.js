import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/dataService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const userData = await authService.login(credentials);
    setUser(userData);
    return userData;
  }, []);

  const signup = useCallback(async (data) => {
    const userData = await authService.signup(data);
    setUser(userData);
    return userData;
  }, []);

  const googleLogin = useCallback(async (data) => {
    const userData = await authService.googleAuth(data);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (data) => {
    try {
      const updatedUser = await authService.updateProfile(data);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }, []);

  return { user, loading, login, signup, googleLogin, logout, updateUser, isLoggedIn: !!user };
};
