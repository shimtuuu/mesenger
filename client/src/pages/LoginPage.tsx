import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string; message?: string } };
      };
      const serverMsg = axiosErr.response?.data?.error || axiosErr.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg === 'Invalid email or password' ? 'Неверный email или пароль' : serverMsg);
      } else if (!axiosErr.response || (axiosErr.response.status && axiosErr.response.status >= 500)) {
        setError('Сервер недоступен или произошла ошибка соединения');
      } else {
        setError('Неверный email или пароль');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-sm mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Corp Messenger</h1>
          <p className="text-sm text-gray-500 mt-1">Вход в корпоративный мессенджер</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Электронная почта
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 font-medium transition-colors duration-150 mt-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Войти
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Создать аккаунт
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
