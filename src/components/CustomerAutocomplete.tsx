import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building, Plus, Search, X, Check, Briefcase } from 'lucide-react';
import { Customer } from '../types';

interface CustomerAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  customers: Customer[];
  onAddNewCustomer: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onOpenCustomerManagement?: () => void;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value,
  onChange,
  customers,
  onAddNewCustomer,
  placeholder = 'Firma veya Müşteri Adı Ara / Yazınız...',
  required = false,
  className = '',
  onOpenCustomerManagement
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers by "includes" (içerir mantığı)
  const filteredCustomers = useMemo(() => {
    const q = (value || '').trim().toLocaleLowerCase('tr-TR');
    if (!q) {
      return customers;
    }
    return customers.filter((c) =>
      c.name.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [customers, value]);

  // Check if current typed value exactly matches an existing customer
  const exactMatchExists = useMemo(() => {
    const q = (value || '').trim().toLocaleLowerCase('tr-TR');
    if (!q) return false;
    return customers.some((c) => c.name.trim().toLocaleLowerCase('tr-TR') === q);
  }, [customers, value]);

  const handleSelect = (customerName: string) => {
    onChange(customerName);
    setIsOpen(false);
  };

  const handleCreateNew = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = (value || '').trim();
    if (!trimmed) return;
    onAddNewCustomer(trimmed);
    onChange(trimmed);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Building className="w-4 h-4 text-blue-500" />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          required={required}
          placeholder={placeholder}
          className="w-full pl-9 pr-16 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm bg-white font-medium text-slate-800 placeholder-slate-400"
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setIsOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition cursor-pointer"
            title={isOpen ? 'Listeyi Kapat' : 'Kayıtlı Firmaları Listele'}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scroll animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Quick Add Option when typed firm is not in system */}
          {value.trim() && !exactMatchExists && (
            <div className="p-2 border-b border-slate-100 bg-blue-50/70">
              <button
                type="button"
                onMouseDown={handleCreateNew}
                className="w-full text-left px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-between shadow-xs cursor-pointer active:scale-98"
              >
                <span className="flex items-center gap-2 truncate mr-2">
                  <Plus className="w-4 h-4 shrink-0 bg-white/20 rounded p-0.5" />
                  <span className="truncate">
                    <b>"{value.trim()}"</b> Firmasını Kaydet ve Seç
                  </span>
                </span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono shrink-0">
                  + Yeni Firma
                </span>
              </button>
            </div>
          )}

          {/* List of matching customers */}
          {filteredCustomers.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-100">
                <span>Kayıtlı Firmalar ({filteredCustomers.length})</span>
                {onOpenCustomerManagement && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      onOpenCustomerManagement();
                    }}
                    className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Briefcase className="w-2.5 h-2.5" /> Tümünü Yönet
                  </button>
                )}
              </div>

              {filteredCustomers.map((cust) => {
                const isSelected = cust.name.trim().toLowerCase() === value.trim().toLowerCase();
                return (
                  <div
                    key={cust.id}
                    onMouseDown={() => handleSelect(cust.name)}
                    className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="truncate">{cust.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cust.vergiNo && (
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          VKN: {cust.vergiNo}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-2">
                "<b>{value}</b>" içeren kayıtlı firma bulunamadı.
              </p>
              {value.trim() && (
                <button
                  type="button"
                  onMouseDown={handleCreateNew}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  "{value.trim()}" Firmasını Yeni Olarak Ekle
                </button>
              )}
            </div>
          )}

          {/* Bottom helper */}
          {onOpenCustomerManagement && filteredCustomers.length > 0 && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[11px] text-slate-500">
              <span>İçerir mantığı ile filtreler</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  onOpenCustomerManagement();
                }}
                className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Firma Listesini Yönet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
