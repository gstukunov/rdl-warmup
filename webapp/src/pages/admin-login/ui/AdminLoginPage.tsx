import React, { useState } from 'react';
import { Layout } from '@/widgets/layout';
import { Card, CardContent } from '@/shared/ui/card';
import { Button, Input, Label } from '@/shared/ui';
import { useAdminLogin } from '@/features/admin-auth';

interface AdminLoginPageProps {
  onLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useAdminLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }

    setError(null);

    loginMutation.mutate(password, {
      onSuccess: () => {
        onLogin();
      },
      onError: () => {
        setError('Неверный пароль');
      },
    });
  };

  return (
    <Layout 
      header={<h1 className="text-lg font-semibold">Вход в панель админа</h1>}
      className="bg-telegram-bg"
    >
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Пароль администратора</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  disabled={loginMutation.isPending}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive font-medium">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                loading={loginMutation.isPending}
                disabled={loginMutation.isPending}
              >
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};
