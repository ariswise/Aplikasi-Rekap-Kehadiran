import React from 'react';
import { AppNotification } from '../types/attendance';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<ToastProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {notifications.map((item) => {
        let borderClass = 'border-slate-200';
        let bgClass = 'bg-white';
        let icon = <Info className="h-5 w-5 text-blue-500 shrink-0" />;

        if (item.type === 'success') {
          borderClass = 'border-emerald-200';
          bgClass = 'bg-white';
          icon = <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
        } else if (item.type === 'error') {
          borderClass = 'border-rose-200';
          bgClass = 'bg-white';
          icon = <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />;
        } else if (item.type === 'warning') {
          borderClass = 'border-amber-200';
          bgClass = 'bg-white';
          icon = <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
        }

        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${borderClass} ${bgClass} p-3.5 shadow-lg shadow-slate-900/5 transition-all`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              aria-label="Tutup Notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
