import React from 'react';

export default function LoadingSpinner({ fullScreen = false, size = 32, message }) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        style={{ width: size, height: size }}
        className="border-3 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin"
      />
      {message && <p className="text-xs text-slate-500 font-medium">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90 backdrop-blur-xs z-50">
        {spinner}
      </div>
    );
  }
  return <div className="flex justify-center py-8">{spinner}</div>;
}
