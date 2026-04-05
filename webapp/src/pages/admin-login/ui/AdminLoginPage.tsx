import React, { useState } from 'react';
import { Layout } from '@/widgets/layout';
import { Card, Button } from '@/shared/ui';
import { adminAuthApi } from '@/features/admin-auth';
import './AdminLoginPage.css';

interface AdminLoginPageProps {
  onLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminAuthApi.login(password);
      onLogin();
    } catch (err) {
      setError('Неверный пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout header={<h1 className="login-title">Вход в панель админа</h1>}>
      <div className="login-container">
        <Card>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Пароль администратора
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Введите пароль"
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Войти
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
};
