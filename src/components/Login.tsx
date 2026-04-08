import React, { useState } from 'react';
import axios from 'axios';
import { 
  Lock, 
  Mail, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Por favor, rellena todos los campos');

    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      if (response.data.success) {
        onLogin(response.data.user);
        toast.success('Bienvenido al RMS');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Lock className="text-blue-600 h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Acceso RMS</CardTitle>
          <CardDescription>
            Introduce tus credenciales para acceder a la Capa de Decisión.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nombre@comoencasa.info" 
                  className="pl-10"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Clave de Acceso</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Entrar <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
