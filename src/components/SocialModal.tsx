import React, { useEffect } from 'react';
import { X, ExternalLink, Heart } from 'lucide-react';

interface SocialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SocialModal: React.FC<SocialModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const socialLinks = [
    {
      name: 'TikTok',
      handle: '@itsmickeymontana',
      url: 'https://www.tiktok.com/@itsmickeymontana',
      color: 'hover:border-[#00f2fe]/60 hover:bg-[#00f2fe]/5 text-[#00f2fe]',
      badgeColor: 'bg-[#00f2fe]/10 text-[#00f2fe] border-[#00f2fe]/20',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43c.1-.1.19-.2.28-.31V11.2a8.16 8.16 0 0 0 5.45 2.11V9.86a4.81 4.81 0 0 1-3.21-1.39l.21-1.78z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      handle: 'Mickey Montana',
      url: 'https://www.facebook.com/itsmickeymontana',
      color: 'hover:border-[#1877f2]/60 hover:bg-[#1877f2]/5 text-[#1877f2]',
      badgeColor: 'bg-[#1877f2]/10 text-[#1877f2] border-[#1877f2]/20',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      handle: '@itsmickeymontana',
      url: 'https://www.instagram.com/itsmickeymontana/',
      color: 'hover:border-[#e1306c]/60 hover:bg-[#e1306c]/5 text-[#e1306c]',
      badgeColor: 'bg-[#e1306c]/10 text-[#e1306c] border-[#e1306c]/20',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Accent Glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Heart className="w-5 h-5 fill-rose-500/20" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Mickey Montana</h3>
            <p className="text-xs text-zinc-400">Connect &amp; Follow on Social Media</p>
          </div>
        </div>

        {/* Social Links List */}
        <div className="space-y-2.5 pt-1">
          {socialLinks.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full p-3.5 rounded-xl bg-[#171717] hover:bg-[#1e1e1e] border border-[#262626] transition-all flex items-center justify-between group cursor-pointer ${item.color}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg border shrink-0 transition-transform group-hover:scale-105 ${item.badgeColor}`}>
                  {item.icon}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-white">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {item.handle}
                  </div>
                </div>
              </div>

              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ))}
        </div>

        <div className="pt-1 text-center">
          <p className="text-[11px] text-zinc-500">
            Thanks for using Weikav WK75 WebHID Configurator!
          </p>
        </div>
      </div>
    </div>
  );
};

