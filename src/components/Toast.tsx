import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[#1D9E75]" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#EF9F27]" />,
  };

  const borders = {
    success: 'border-l-4 border-[#1D9E75]',
    error: 'border-l-4 border-red-500',
    info: 'border-l-4 border-blue-500',
    warning: 'border-l-4 border-[#EF9F27]',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 bg-white rounded-xl shadow-lg p-4 ${borders[toast.type]} animate-slide-in`}
        >
          {icons[toast.type]}
          <p className="flex-1 text-sm text-gray-800 font-medium">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
