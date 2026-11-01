import React, { useState } from 'react';
import { Warehouse, User } from '../types';
import { Warehouse as WarehouseIcon, AlertCircle, Clock, Eye, EyeOff } from 'lucide-react';

interface LoginViewProps {
  warehouses: Warehouse[];
  users: User[];
  onLoginSuccess: (user: User, depoId: number) => void;
  onLoginAsGuest: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  warehouses,
  users,
  onLoginSuccess,
  onLoginAsGuest
}) => {
  const activeWarehouses = warehouses.filter((w) => w.aktif !== false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [depoId, setDepoId] = useState<number>(() => activeWarehouses[0]?.id || 1);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (user) {
      setError('');
      const targetDepo = user.role !== 'admin' && user.depoId && user.depoId !== 0 ? user.depoId : depoId;
      onLoginSuccess(user, targetDepo);
    } else {
      setError('Kullanıcı adı veya şifre hatalı!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-7 sm:p-8 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/logiportal.png"
              alt="LogiPortal"
              className="w-48 h-36 object-contain rounded-2xl select-none drop-shadow-md"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">İşlem yapacağınız depoyu seçip giriş yapınız</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm rounded-xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <WarehouseIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                İşlem Yapılacak Depo / Tesis
              </span>
            </label>
            <select
              value={depoId}
              onChange={(e) => setDepoId(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="" disabled>-- Depo Seçiniz --</option>
              {activeWarehouses.map((d) => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {d.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 shadow-2xs"
              placeholder="Kullanıcı adınızı yazınız"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Şifre</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-3.5 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 shadow-2xs"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition"
                title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition text-sm cursor-pointer mt-2"
          >
            Sisteme Giriş Yap
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onLoginAsGuest}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Misafir Girişi (Şifresiz Sorgulama)
          </button>
        </div>
      </div>
    </div>
  );
};
