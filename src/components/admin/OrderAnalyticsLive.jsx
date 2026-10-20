import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Package,
  Truck,
  Calendar,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Radio,
  ArrowRight,
  ExternalLink,
  Phone,
  MapPin,
  X,
  History,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { api } from '../../utils/api';
import { getAdminSocket } from '../../utils/socket';
import { formatCurrency } from '../../utils/currency';

export const OrderAnalyticsLive = ({ adminUser, showFeedback }) => {
  // Authoritative Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  // Live Orders Table State
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Socket Connection Status
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);

  // Selected Order for Details & Audit History Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Authoritative Analytics from PostgreSQL
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      const res = await api.getOrderAnalytics();
      if (res && res.success && res.stats) {
        setAnalytics(res.stats);
      }
    } catch (err) {
      console.error('Failed to load order analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  // Fetch Live Orders list
  const fetchLiveOrders = useCallback(async (page = 1) => {
    try {
      setIsLoadingOrders(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter && dateFilter !== 'all') params.append('date', dateFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', page);
      params.append('limit', 15);

      const res = await api.getLiveOrders(`?${params.toString()}`);
      if (res && res.success) {
        setOrders(res.data);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load live orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [statusFilter, dateFilter, debouncedSearch]);

  // Initial load & filter changes
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchLiveOrders(1);
  }, [fetchLiveOrders]);

  // Open Order Details Modal and fetch history
  const handleOpenOrderDetails = async (order) => {
    setSelectedOrder(order);
    setStatusNote('');
    try {
      setIsLoadingHistory(true);
      const res = await api.getOrderHistory(order.id);
      if (res && res.success) {
        setOrderHistory(res.history || []);
      }
    } catch (err) {
      console.error('Failed to load order history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Update Status from Modal or Inline
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setIsUpdatingStatus(true);
      const res = await api.updateOrderStatus(orderId, newStatus, statusNote);
      if (res && res.success) {
        if (showFeedback) showFeedback(res.message);
        // Refresh analytics and order list
        fetchAnalytics();
        fetchLiveOrders(pagination.page);

        // Update modal state if open
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(res.data);
          handleOpenOrderDetails(res.data);
        }
      }
    } catch (err) {
      alert(err.message || 'Status update failed');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Socket.IO Real-time Subscriptions
  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    if (socket.connected) {
      setIsSocketConnected(true);
    }

    const onConnect = () => {
      setIsSocketConnected(true);
      // Re-synchronize snapshot upon reconnect
      socket.emit('admin:request_snapshot');
      fetchAnalytics();
      fetchLiveOrders(pagination.page);
    };

    const onDisconnect = () => {
      setIsSocketConnected(false);
    };

    const onAnalyticsSnapshot = (data) => {
      if (data && data.stats) {
        setAnalytics(data.stats);
        setLastEventTime(new Date().toLocaleTimeString('en-IN'));
      }
    };

    const onOrderCreated = (data) => {
      if (data) {
        if (data.stats) setAnalytics(data.stats);
        if (data.order) {
          setHighlightedOrderId(data.order.id);
          setTimeout(() => setHighlightedOrderId(null), 4000);
          // Prepend newly created order to list
          setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
        }
        setLastEventTime(new Date().toLocaleTimeString('en-IN'));
        if (showFeedback) showFeedback(`🔔 New Order Received: #${data.order?.orderNumber}`);
      }
    };

    const onOrderStatusUpdated = (data) => {
      if (data) {
        if (data.stats) setAnalytics(data.stats);
        if (data.order) {
          setOrders((prev) =>
            prev.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o))
          );
        }
        setLastEventTime(new Date().toLocaleTimeString('en-IN'));
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('admin:analytics_snapshot', onAnalyticsSnapshot);
    socket.on('admin:order_created', onOrderCreated);
    socket.on('admin:order_status_updated', onOrderStatusUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('admin:analytics_snapshot', onAnalyticsSnapshot);
      socket.off('admin:order_created', onOrderCreated);
      socket.off('admin:order_status_updated', onOrderStatusUpdated);
    };
  }, [fetchAnalytics, fetchLiveOrders, pagination.page, showFeedback]);

  // Color mappings for statuses
  const statusBadges = {
    pending: { label: 'Pending', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
    confirmed: { label: 'Confirmed', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
    preparing: { label: 'Preparing', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
    packed: { label: 'Packed', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    ready_for_dispatch: { label: 'Ready for Dispatch', bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    out_for_delivery: { label: 'Out for Delivery', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
    delivered: { label: 'Delivered', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100 text-red-800 border-red-300' },
  };

  const getStatusBadge = (st) => statusBadges[st] || { label: st, bg: 'bg-gray-100 text-gray-800 border-gray-300' };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar & Live Connection Indicator */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-brand-soft text-brand-dark">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-brand-dark tracking-tight">
                Order Analytics & Live Monitoring
              </h2>
              <p className="text-xs text-brand-muted">
                Authoritative real-time tracking, permanent database statistics & live operations
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Badge & Manual Refresh */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              isSocketConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSocketConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
              }`}
            />
            <span>{isSocketConnected ? 'Live Connected' : 'Reconnecting...'}</span>
            {lastEventTime && (
              <span className="text-[10px] text-gray-400 font-normal">({lastEventTime})</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              fetchAnalytics();
              fetchLiveOrders(pagination.page);
            }}
            disabled={isLoadingAnalytics || isLoadingOrders}
            className="p-2 rounded-xl border border-brand-border hover:bg-gray-50 text-brand-charcoal transition-all disabled:opacity-50"
            title="Refresh All Statistics"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingAnalytics || isLoadingOrders ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 2. Permanent Order Statistics Cards (The 10 Required Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        
        {/* Total Orders Ever */}
        <div className="bg-white p-4 rounded-3xl border border-brand-border shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block">
            Total Orders Ever
          </span>
          <span className="text-2xl font-black text-brand-dark mt-1 block">
            {analytics?.totalOrders ?? '--'}
          </span>
          <span className="text-[10px] text-brand-muted block mt-1">
            Permanent database count
          </span>
        </div>

        {/* Completed Orders (Delivered) */}
        <div className="bg-white p-4 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Completed Orders
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {analytics?.completedOrders ?? '--'}
          </span>
          <span className="text-[10px] text-emerald-700/80 block mt-1">
            Delivered successfully
          </span>
        </div>

        {/* Active Orders */}
        <div className="bg-white p-4 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/40 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Active Orders
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {analytics?.activeOrdersCount ?? '--'}
          </span>
          <span className="text-[10px] text-blue-700/80 block mt-1">
            In progress right now
          </span>
        </div>

        {/* Pending Orders */}
        <div className="bg-white p-4 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/40 to-white shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
            Pending Orders
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {analytics?.pendingOrders ?? '--'}
          </span>
          <span className="text-[10px] text-amber-700 block mt-1">
            Awaiting store confirmation
          </span>
        </div>

        {/* Confirmed Orders */}
        <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
            Confirmed Orders
          </span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {analytics?.confirmedOrders ?? '--'}
          </span>
          <span className="text-[10px] text-blue-600 block mt-1">
            Accepted by store
          </span>
        </div>

        {/* Preparing Orders */}
        <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
            Preparing Orders
          </span>
          <span className="text-2xl font-black text-purple-700 mt-1 block">
            {analytics?.preparingOrders ?? '--'}
          </span>
          <span className="text-[10px] text-purple-600 block mt-1">
            Sorting & packing vegetables
          </span>
        </div>

        {/* Out for Delivery */}
        <div className="bg-white p-4 rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50/40 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
              Out for Delivery
            </span>
            <Truck className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <span className="text-2xl font-black text-orange-700 mt-1 block">
            {analytics?.outForDeliveryOrders ?? '--'}
          </span>
          <span className="text-[10px] text-orange-700 block mt-1">
            En route to customer flats
          </span>
        </div>

        {/* Delivered Today */}
        <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
            Delivered Today
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {analytics?.todayDeliveredOrders ?? '--'}
          </span>
          <span className="text-[10px] text-emerald-700/80 block mt-1">
            Total today: {analytics?.todayOrders ?? 0} placed
          </span>
        </div>

        {/* Cancelled Orders */}
        <div className="bg-white p-4 rounded-3xl border border-red-100 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">
            Cancelled Orders
          </span>
          <span className="text-2xl font-black text-red-600 mt-1 block">
            {analytics?.cancelledOrders ?? '--'}
          </span>
          <span className="text-[10px] text-red-600 block mt-1">
            Today cancelled: {analytics?.todayCancelledOrders ?? 0}
          </span>
        </div>

        {/* Total Completed Revenue */}
        <div className="bg-white p-4 rounded-3xl border border-brand-border bg-gradient-to-br from-brand-soft/40 to-white shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark block">
            Completed Revenue
          </span>
          <span className="text-2xl font-black text-brand-dark mt-1 block">
            {formatCurrency(analytics?.totalRevenue || 0)}
          </span>
          <span className="text-[10px] text-brand-muted block mt-1">
            Today's revenue: {formatCurrency(analytics?.todayRevenue || 0)}
          </span>
        </div>

      </div>

      {/* 3. Live Orders Monitoring Table & Filters */}
      <div className="bg-white rounded-3xl border border-brand-border p-5 shadow-xs space-y-4">
        
        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-brand-border">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, customer, phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-brand-border text-xs bg-white font-medium"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'active', label: 'Active (Live)' },
                { id: 'pending', label: 'Pending' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'preparing', label: 'Preparing' },
                { id: 'out_for_delivery', label: 'Out for Delivery' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-brand-dark text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto border border-brand-border rounded-2xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-brand-soft/60 text-brand-dark uppercase tracking-wider font-bold text-[10px] border-b border-brand-border">
              <tr>
                <th className="p-3.5">Order Number</th>
                <th className="p-3.5">Creation Time</th>
                <th className="p-3.5">Customer & Flat</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Last Status Update</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {isLoadingOrders ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-1 text-brand-dark" />
                    <span>Loading real-time orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No orders match the selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isHighlighted = highlightedOrderId === order.id;
                  const badge = getStatusBadge(order.status);
                  const createdDateStr = new Date(order.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const updatedDateStr = new Date(order.lastStatusUpdate || order.updatedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isHighlighted ? 'bg-emerald-100/60 animate-pulse' : ''
                      }`}
                    >
                      {/* Order Number */}
                      <td className="p-3.5 font-mono font-black text-brand-dark">
                        <button
                          type="button"
                          onClick={() => handleOpenOrderDetails(order)}
                          className="hover:underline text-brand-dark flex items-center gap-1"
                        >
                          <span>#{order.orderNumber}</span>
                          {isHighlighted && (
                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                              NEW
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Creation Time */}
                      <td className="p-3.5 text-gray-600 font-medium">{createdDateStr}</td>

                      {/* Customer */}
                      <td className="p-3.5">
                        <div className="font-bold text-brand-charcoal">{order.customerName}</div>
                        <div className="text-[11px] text-brand-muted">{order.address}</div>
                      </td>

                      {/* Item Count */}
                      <td className="p-3.5 font-bold text-brand-charcoal">
                        {order.itemCount} items
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 font-extrabold text-sm text-brand-dark">
                        ₹{order.finalTotal}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-3.5 uppercase font-bold text-[10px] text-gray-500">
                        {order.paymentMethod || 'COD'} ({order.paymentStatus || 'Pending'})
                      </td>

                      {/* Last Status Update */}
                      <td className="p-3.5 text-gray-500 text-[11px] font-medium">{updatedDateStr}</td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenOrderDetails(order)}
                          className="px-3 py-1.5 rounded-xl bg-brand-soft hover:bg-emerald-100/70 text-brand-dark font-bold text-xs inline-flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-brand-muted">
            <span>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchLiveOrders(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-brand-border hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLiveOrders(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-brand-border hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 4. Authorized Order Details & Status History Audit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-black text-lg text-brand-dark">
                    #{selectedOrder.orderNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      getStatusBadge(selectedOrder.status).bg
                    }`}
                  >
                    {getStatusBadge(selectedOrder.status).label}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details & WhatsApp Direct */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-brand-charcoal">{selectedOrder.customerName}</div>
                  <div className="text-gray-600 mt-0.5">Phone: +91 {selectedOrder.customerPhone}</div>
                  <div className="text-gray-600">Address: {selectedOrder.address}</div>
                  {selectedOrder.landmark && (
                    <div className="text-gray-500">Landmark: {selectedOrder.landmark}</div>
                  )}
                  <div className="text-brand-dark font-semibold mt-1">
                    Slot: {selectedOrder.deliverySlot}
                  </div>
                </div>

                <a
                  href={`https://wa.me/91${selectedOrder.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hello ${selectedOrder.customerName}, regarding your KIRSAB order #${selectedOrder.orderNumber}:`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold self-start sm:self-auto hover:bg-emerald-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Customer</span>
                </a>
              </div>

              {selectedOrder.instructions && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 mt-2">
                  <strong>Special Instructions:</strong> {selectedOrder.instructions}
                </div>
              )}
            </div>

            {/* Items Ordered List */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                Ordered Vegetables ({selectedOrder.items?.length || 0})
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden text-xs">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-brand-charcoal">
                        {item.productNameHi} ({item.productNameEn})
                      </span>
                      <span className="text-gray-500 block text-[11px]">
                        {item.quantity} × {item.unit} @ ₹{item.unitPrice}
                      </span>
                    </div>
                    <span className="font-bold text-brand-dark">₹{item.lineTotal}</span>
                  </div>
                ))}
                <div className="p-3 bg-gray-50/70 flex items-center justify-between font-bold text-xs">
                  <span>Subtotal + Delivery Fee</span>
                  <span>₹{selectedOrder.subtotal} + ₹{selectedOrder.deliveryFee}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 flex items-center justify-between font-black text-sm text-brand-dark">
                  <span>Final Order Total:</span>
                  <span>₹{selectedOrder.finalTotal}</span>
                </div>
              </div>
            </div>

            {/* Lifecycle Status Transition Controller */}
            <div className="p-4 rounded-2xl bg-brand-soft/60 border border-brand-border space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-brand-dark">
                Order Lifecycle Transition
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'pending', label: 'Pending' },
                  { id: 'confirmed', label: 'Confirmed' },
                  { id: 'preparing', label: 'Preparing' },
                  { id: 'ready_for_dispatch', label: 'Ready for Dispatch' },
                  { id: 'out_for_delivery', label: 'Out for Delivery' },
                  { id: 'delivered', label: 'Delivered' },
                  { id: 'cancelled', label: 'Cancelled' },
                ].map((st) => {
                  const isCurrent = selectedOrder.status === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={isUpdatingStatus || isCurrent}
                      onClick={() => handleStatusChange(selectedOrder.id, st.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-brand-dark text-white cursor-default shadow-xs'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Optional audit log note (e.g. Dispatched with delivery agent Rahul)..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-brand-border rounded-xl bg-white"
                />
              </div>
            </div>

            {/* Order Status History Audit Trail */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Audit Trail & Lifecycle History</span>
              </h4>

              {isLoadingHistory ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading history...</div>
              ) : orderHistory.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">No status changes logged yet.</div>
              ) : (
                <div className="space-y-2 border-l-2 border-emerald-400 pl-4 py-1 ml-2 text-xs">
                  {orderHistory.map((hist) => (
                    <div key={hist.id} className="relative space-y-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[21px] top-1 border-2 border-white" />
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-brand-dark capitalize">
                          {hist.previousStatus ? `${hist.previousStatus} → ${hist.newStatus}` : hist.newStatus}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(hist.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Actor: <span className="font-medium text-gray-700">{hist.changedBy}</span>
                        {hist.notes && <span> • Note: "{hist.notes}"</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Close CTA */}
            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Close Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
