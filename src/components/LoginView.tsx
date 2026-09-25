import React, { useState } from 'react';
import { Warehouse, User } from '../types';
import { Truck, Warehouse as WarehouseIcon, AlertCircle, Clock } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Truck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Depo & Rampa Yönetimi</h2>
          <p className="text-xs text-slate-500 mt-1">İşlem yapacağınız depoyu seçip giriş yapınız</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              <span className="inline-flex items-center gap-1">
                <WarehouseIcon className="w-3.5 h-3.5 text-blue-600" />
                İşlem Yapılacak Depo / Tesis
              </span>
            </label>
            <select
              value={depoId}
              onChange={(e) => setDepoId(Number(e.target.value))}
              required
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold bg-slate-50 border-slate-200"
            >
              <option value="" disabled>-- Depo Seçiniz --</option>
              {activeWarehouses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition border-slate-200"
              placeholder="Kullanıcı adı"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition border-slate-200"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition text-sm cursor-pointer"
          >
            Sisteme Giriş Yap
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onLoginAsGuest}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-300 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-blue-600" />
            Misafir Girişi (Şifresiz Sorgulama)
          </button>
        </div>
      </div>
    </div>
  );
};
