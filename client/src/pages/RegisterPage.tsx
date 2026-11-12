import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const RegisterPage: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedDisplay = displayName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedDisplay || !trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmedUsername)) {
      setError('Имя пользователя должно содержать 3–30 символов: латинские буквы, цифры и _');
      return;
    }

    if (password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        displayName: trimmedDisplay,
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          'Не удалось создать аккаунт. Попробуйте снова.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-sm mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Corp Messenger</h1>
          <p className="text-sm text-gray-500 mt-1">Регистрация нового сотрудника</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Имя и фамилия
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Иван Иванов"
              required
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Имя пользователя
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ivan_ivanov"
              required
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Электронная почта
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@company.com"
              autoComplete="email"
              required
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              autoComplete="new-password"
              required
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Подтвердите пароль
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              autoComplete="new-password"
              required
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 font-medium transition-colors duration-150 mt-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Создать аккаунт
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
