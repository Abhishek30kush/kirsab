import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, PackageCheck, Flame, Radio } from 'lucide-react';
import { api } from '../utils/api';
import { getPublicSocket } from '../utils/socket';
import { useLanguage } from '../context/LanguageContext';

export const LiveOrderCounter = ({ className = '' }) => {
  const { language } = useLanguage();
  const [stats, setStats] = useState({
    completedOrders: 0,
    activeOrders: 0,
    preparingOrders: 0,
    outForDeliveryOrders: 0,
  });
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  // Initial HTTP fetch
  const fetchStats = async () => {
    try {
      const res = await api.getPublicOrderStats();
      if (res && res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      // Quiet fallback
    }
  };

  useEffect(() => {
    fetchStats();

    // Socket.IO real-time connection
    const socket = getPublicSocket();

    if (socket) {
      if (socket.connected) {
        setIsLiveConnected(true);
      }

      socket.on('connect', () => {
        setIsLiveConnected(true);
        socket.emit('public:request_stats');
      });

      socket.on('disconnect', () => {
        setIsLiveConnected(false);
      });

      socket.on('public:order_stats', (newStats) => {
        if (newStats) {
          setStats(newStats);
          setIsPulsing(true);
          setTimeout(() => setIsPulsing(false), 1200);
        }
      });
    }

    // Safe polling fallback every 25 seconds
    const interval = setInterval(fetchStats, 25000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('public:order_stats');
      }
    };
  }, []);

  // Format numbers cleanly
  const formatNum = (num) => (Number(num) || 0).toLocaleString('en-IN');

  const isHindi = language === 'hi';

  return (
    <div
      className={`relative overflow-hidden bg-white/95 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-emerald-100 shadow-xs transition-all duration-300 ${
        isPulsing ? 'ring-2 ring-emerald-400 bg-emerald-50/40' : ''
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Brand Community & Live Dot */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <Flame className="w-4 h-4 fill-emerald-500 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-brand-dark tracking-tight">
                {isHindi ? 'किरसाब लाइव गतिविधि' : 'KIRSAB Community Live Activity'}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isLiveConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
                title={isLiveConnected ? 'Real-time WebSocket connected' : 'Connecting to live stream'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLiveConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                  }`}
                />
                {isLiveConnected ? (isHindi ? 'लाइव' : 'Live') : (isHindi ? 'कनेक्टिंग...' : 'Connecting...')}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              {isHindi
                ? 'शेरवानी लेगेसी एवं आसपास के परिवारों द्वारा वास्तविक ऑर्डर'
                : 'Real-time hyper-local deliveries across Shervani Legacy'}
            </p>
          </div>
        </div>

        {/* Live Counters Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Delivered Orders */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-black text-brand-dark">{formatNum(stats.completedOrders)}</span>
            <span className="text-[11px] text-gray-600">
              {isHindi ? 'सफल डिलीवर' : 'orders delivered'}
            </span>
          </div>

          {/* Active / In Progress */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-black text-emerald-900">{formatNum(stats.activeOrders)}</span>
            <span className="text-[11px] text-emerald-800 font-medium">
              {isHindi ? 'प्रक्रियाधीन' : 'in progress'}
            </span>
          </div>

          {/* Out for Delivery (if any) */}
          {stats.outForDeliveryOrders > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
              <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-black text-blue-900">{stats.outForDeliveryOrders}</span>
              <span className="text-[11px] text-blue-700 font-medium">
                {isHindi ? 'रास्ते में' : 'out for delivery'}
              </span>
            </div>
          )}

          {/* Preparing (if any) */}
          {stats.preparingOrders > 0 && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
              <PackageCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="font-black text-purple-900">{stats.preparingOrders}</span>
              <span className="text-[11px] text-purple-700 font-medium">
                {isHindi ? 'पैकिंग' : 'packing'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
