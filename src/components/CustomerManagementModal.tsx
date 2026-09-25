import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Building,
  Search,
  Check,
  Phone,
  UserCheck,
  FileText
} from 'lucide-react';
import { Customer } from '../types';

interface CustomerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string, customerName: string) => void;
}

export const CustomerManagementModal: React.FC<CustomerManagementModalProps> = ({
  isOpen,
  onClose,
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // New customer form state
  const [name, setName] = useState('');
  const [vergiNo, setVergiNo] = useState('');
  const [yetkili, setYetkili] = useState('');
  const [telefon, setTelefon] = useState('');
  const [notlar, setNotlar] = useState('');

  // Edit customer form state
  const [editName, setEditName] = useState('');
  const [editVergiNo, setEditVergiNo] = useState('');
  const [editYetkili, setEditYetkili] = useState('');
  const [editTelefon, setEditTelefon] = useState('');
  const [editNotlar, setEditNotlar] = useState('');

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLocaleLowerCase('tr-TR').includes(q) ||
        (c.vergiNo && c.vergiNo.includes(q)) ||
        (c.yetkili && c.yetkili.toLocaleLowerCase('tr-TR').includes(q)) ||
        (c.telefon && c.telefon.includes(q))
    );
  }, [customers, searchQuery]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setShowAddForm(true);
    setEditingCustomer(null);
    setName(searchQuery.trim());
    setVergiNo('');
    setYetkili('');
    setTelefon('');
    setNotlar('');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      vergiNo: vergiNo.trim() || '',
      yetkili: yetkili.trim() || '',
      telefon: telefon.trim() || '',
      notlar: notlar.trim() || '',
      olusturmaTarihi: new Date().toLocaleString('tr-TR')
    };

    onAddCustomer(newCust);
    setShowAddForm(false);
    setName('');
    setVergiNo('');
    setYetkili('');
    setTelefon('');
    setNotlar('');
  };

  const handleStartEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowAddForm(false);
    setEditName(customer.name);
    setEditVergiNo(customer.vergiNo || '');
    setEditYetkili(customer.yetkili || '');
    setEditTelefon(customer.telefon || '');
    setEditNotlar(customer.notlar || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim()) return;

    const updated: Customer = {
      ...editingCustomer,
      name: editName.trim(),
      vergiNo: editVergiNo.trim() || '',
      yetkili: editYetkili.trim() || '',
      telefon: editTelefon.trim() || '',
      notlar: editNotlar.trim() || ''
    };

    onUpdateCustomer(updated);
    setEditingCustomer(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
                Müşteri Firma Tanımlama ve Yönetimi
              </h2>
              <p className="text-xs text-slate-300">
                Sistemde kayıtlı firmaları yönetin, arayın ve yeni firma ekleyin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Firma Adı, VKN veya Yetkili Ara (içerir mantığı)..."
              className="w-full pl-9 pr-8 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shrink-0">
              {filteredCustomers.length} Firma
            </span>
            <button
              onClick={handleStartAdd}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 active:scale-98"
            >
              <Plus className="w-4 h-4" /> Yeni Firma Ekle
            </button>
          </div>
        </div>

        {/* Add Form Panel (Collapsible) */}
        {showAddForm && (
          <form
            onSubmit={handleSaveNew}
            className="p-4 bg-blue-50/60 border-b border-blue-200/70 space-y-3 shrink-0 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" /> Yeni Müşteri / Firma Tanımla
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Vazgeç
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Firma Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: ABC Lojistik San. Tic. Ltd. Şti."
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Vergi No / VKN (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={vergiNo}
                  onChange={(e) => setVergiNo(e.target.value)}
                  placeholder="Örn: 1234567890"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Yetkili Kişi (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={yetkili}
                  onChange={(e) => setYetkili(e.target.value)}
                  placeholder="Örn: Ahmet Bey"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  İletişim Telefonu (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  placeholder="Örn: 0212 555 10 20"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Kaydet ve Sisteme Ekle
              </button>
            </div>
          </form>
        )}

        {/* Edit Form Modal/Panel */}
        {editingCustomer && (
          <form
            onSubmit={handleSaveEdit}
            className="p-4 bg-amber-50/70 border-b border-amber-200 space-y-3 shrink-0 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-amber-600" /> Firmayı Düzenle: {editingCustomer.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Kapat
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Firma Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Vergi No / VKN
                </label>
                <input
                  type="text"
                  value={editVergiNo}
                  onChange={(e) => setEditVergiNo(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Yetkili Kişi
                </label>
                <input
                  type="text"
                  value={editYetkili}
                  onChange={(e) => setEditYetkili(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  İletişim Telefonu
                </label>
                <input
                  type="text"
                  value={editTelefon}
                  onChange={(e) => setEditTelefon(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Değişiklikleri Güncelle
              </button>
            </div>
          </form>
        )}

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scroll space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                {searchQuery ? `"${searchQuery}" ile eşleşen firma bulunamadı.` : 'Henüz kayıtlı firma yok.'}
              </p>
              {searchQuery && (
                <button
                  onClick={handleStartAdd}
                  className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  "{searchQuery}" Olarak Kayıt Ekle
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredCustomers.map((cust) => (
                <div
                  key={cust.id}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600 shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {cust.name}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                      {cust.vergiNo && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-600">
                          VKN: {cust.vergiNo}
                        </span>
                      )}
                      {cust.yetkili && (
                        <span className="flex items-center gap-1 truncate">
                          <UserCheck className="w-3 h-3 text-slate-400" /> {cust.yetkili}
                        </span>
                      )}
                      {cust.telefon && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {cust.telefon}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(cust)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCustomer(cust.id, cust.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <span>Toplam <b>{customers.length}</b> kayıtlı firma bulunmaktadır.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition shadow-xs"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
