import React, { useState, useEffect } from 'react';
import {
  Star,
  ShieldCheck,
  Check,
  X,
  EyeOff,
  Sparkles,
  MessageSquare,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  Package,
  Truck,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StarRating } from '../common/StarRating';
import { api } from '../../utils/api';

const STATUS_TABS = [
  { key: 'all', label: 'All Reviews' },
  { key: 'PENDING', label: 'Pending Approval' },
  { key: 'APPROVED', label: 'Approved & Public' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'HIDDEN', label: 'Hidden / Unpublished' },
];

export const ReviewsManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ all: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, HIDDEN: 0 });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination
  const [activeStatus, setActiveStatus] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Action states
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const fetchReviews = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        status: activeStatus,
        rating: ratingFilter,
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const [res, statsRes] = await Promise.all([
        api.getAdminReviews(params.toString()),
        api.getAdminReviewStats(),
      ]);

      if (res.success) {
        setReviews(res.reviews || []);
        setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
        if (res.counts) setCounts(res.counts);
      }

      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to load admin reviews:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to fetch reviews' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [activeStatus, ratingFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const handleUpdateStatus = async (reviewId, newStatus) => {
    try {
      const res = await api.updateReviewStatus(reviewId, newStatus);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Review status changed to ${newStatus}.`,
        });
        fetchReviews(true);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update review status' });
    }
  };

  const handleToggleFeature = async (reviewId, currentFeatured) => {
    try {
      const res = await api.toggleReviewFeature(reviewId, !currentFeatured);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: !currentFeatured ? 'Review featured on Homepage!' : 'Review unfeatured.',
        });
        fetchReviews(true);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to toggle feature status' });
    }
  };

  const handleSendReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const res = await api.replyToReview(reviewId, replyText.trim());
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: 'Official KIRSAB reply published successfully.',
        });
        setReplyingReviewId(null);
        setReplyText('');
        fetchReviews(true);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to post reply' });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer review? This action removes inappropriate or offensive content.')) {
      return;
    }

    try {
      const res = await api.deleteReview(reviewId);
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Review removed permanently.' });
        fetchReviews(true);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete review' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <h2 className="text-xl sm:text-2xl font-black text-brand-charcoal">
              Reviews & Testimonials Management
            </h2>
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Moderate authentic customer reviews, reply as KIRSAB, and feature top experiences on the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReviews(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-brand-border rounded-xl text-xs font-bold text-brand-charcoal hover:bg-gray-50 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#176B3A]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn ${
            actionMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-brand-border p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-brand-muted block">Total Reviews</span>
          <span className="text-2xl font-black text-brand-charcoal mt-1 block">
            {counts.all || 0}
          </span>
          <span className="text-[10px] text-brand-muted">Across all orders</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-900 block">Pending Moderation</span>
            {counts.PENDING > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span className="text-2xl font-black text-amber-950 mt-1 block">
            {counts.PENDING || 0}
          </span>
          <span className="text-[10px] text-amber-800 font-semibold">Requires Approval</span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-emerald-900 block">Approved & Public</span>
          <span className="text-2xl font-black text-emerald-950 mt-1 block">
            {counts.APPROVED || 0}
          </span>
          <span className="text-[10px] text-emerald-800 font-semibold">Live on Storefront</span>
        </div>

        <div className="bg-white border border-brand-border p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-brand-muted block">Featured on Home</span>
          <span className="text-2xl font-black text-[#176B3A] mt-1 block">
            {stats?.statusCounts?.featured || 0}
          </span>
          <span className="text-[10px] text-brand-muted font-semibold">Top testimonials</span>
        </div>

        <div className="bg-white border border-brand-border p-4 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase text-brand-muted block">Average Rating</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-2xl font-black text-brand-charcoal">
              {stats?.averageRating ? stats.averageRating : '0.0'}
            </span>
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <span className="text-[10px] text-brand-muted font-semibold">Genuine customer score</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-gray-100">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveStatus(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeStatus === tab.key
                  ? 'bg-[#176B3A] text-white shadow-xs'
                  : 'text-brand-muted hover:text-brand-charcoal hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeStatus === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {counts[tab.key] !== undefined ? counts[tab.key] : counts.all}
              </span>
            </button>
          ))}
        </div>

        {/* Secondary Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Star Filter */}
          <div className="flex items-center gap-1.5 text-xs font-semibold w-full sm:w-auto">
            <span className="text-brand-muted">Rating:</span>
            {['all', '5', '4', '3', '2', '1'].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setRatingFilter(star);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  ratingFilter === star
                    ? 'bg-amber-400 text-amber-950 font-black'
                    : 'bg-gray-100 text-brand-muted hover:bg-gray-200'
                }`}
              >
                {star === 'all' ? 'All' : `${star}★`}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search customer, order, comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B3A]/30 focus:border-[#176B3A]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#176B3A] animate-spin mx-auto" />
          <p className="text-xs text-brand-muted font-medium">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#176B3A] flex items-center justify-center mx-auto">
            <Star className="w-6 h-6" />
          </div>
          <h4 className="text-base font-black text-brand-charcoal">No Reviews Found</h4>
          <p className="text-xs text-brand-muted max-w-sm mx-auto">
            No reviews match the selected status or filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isReplying = replyingReviewId === rev.id;

            return (
              <div
                key={rev.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-shadow space-y-4 ${
                  rev.status === 'PENDING'
                    ? 'border-amber-300 ring-1 ring-amber-200/50'
                    : rev.status === 'APPROVED'
                    ? 'border-emerald-200'
                    : 'border-brand-border'
                }`}
              >
                {/* Header: Customer, Order, Status, Date */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-brand-charcoal">
                        {rev.customer?.name || 'Customer'}
                      </span>

                      {rev.customer?.phone && (
                        <span className="text-xs text-brand-muted font-medium">
                          ({rev.customer.phone})
                        </span>
                      )}

                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#176B3A] text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-[#176B3A]" />
                          <span>Verified Purchase</span>
                        </span>
                      )}

                      {rev.isFeatured && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Featured on Home</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                      <span>Order #{rev.order?.orderNumber || rev.orderId}</span>
                      <span>•</span>
                      <span>
                        Delivered:{' '}
                        {rev.order?.deliveredAt
                          ? new Date(rev.order.deliveredAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Yes'}
                      </span>
                      <span>•</span>
                      <span>
                        Submitted:{' '}
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                        rev.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : rev.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse'
                          : rev.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>
                </div>

                {/* Body: Ratings, Comment, Aspect Badges, Photos */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <StarRating rating={rev.rating} size="md" showLabel />

                    {rev.product && (
                      <span className="text-xs bg-gray-100 text-brand-charcoal font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Package className="w-3 h-3 text-emerald-700" />
                        <span>{rev.product.nameEn} ({rev.product.nameHi})</span>
                      </span>
                    )}
                  </div>

                  {rev.title && (
                    <h4 className="text-sm font-black text-brand-charcoal">
                      {rev.title}
                    </h4>
                  )}

                  <p className="text-xs sm:text-sm text-brand-charcoal/95 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                    "{rev.comment}"
                  </p>

                  {/* Aspect Ratings Badges */}
                  {(rev.productQualityRating || rev.packagingRating || rev.deliveryRating) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {rev.productQualityRating && (
                        <span className="bg-emerald-50 text-emerald-900 font-bold px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Freshness: {rev.productQualityRating}★</span>
                        </span>
                      )}
                      {rev.packagingRating && (
                        <span className="bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-amber-600" />
                          <span>Packaging: {rev.packagingRating}★</span>
                        </span>
                      )}
                      {rev.deliveryRating && (
                        <span className="bg-blue-50 text-blue-900 font-bold px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Delivery: {rev.deliveryRating}★</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Customer Uploaded Photos */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-brand-muted uppercase block">
                        Customer Attached Photos ({rev.images.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {rev.images.map((imgUrl, idx) => (
                          <img
                            key={idx}
                            src={imgUrl}
                            alt="Customer upload"
                            onClick={() => setActivePhoto(imgUrl)}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-brand-border cursor-pointer hover:opacity-90 shadow-xs"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Official KIRSAB Reply (if exists) */}
                  {rev.adminReply && !isReplying && (
                    <div className="bg-[#F7FAF5] border border-emerald-200 rounded-xl p-3.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#176B3A] flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-[#176B3A]" />
                          <span>Official KIRSAB Response</span>
                        </span>
                        {rev.adminRepliedAt && (
                          <span className="text-[10px] text-brand-muted">
                            {new Date(rev.adminRepliedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-charcoal italic">{rev.adminReply}</p>
                    </div>
                  )}

                  {/* Inline Reply Form */}
                  {isReplying && (
                    <div className="bg-[#F7FAF5] border border-emerald-300 rounded-2xl p-4 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#176B3A] flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-[#176B3A]" />
                          <span>Compose Official KIRSAB Response</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        maxLength={1000}
                        placeholder="Write official response to customer (e.g. Thank you for your feedback! We are glad you enjoyed fresh veggies...)"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full text-xs bg-white border border-emerald-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#176B3A]/30"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(null)}
                          className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReply || !replyText.trim()}
                          onClick={() => handleSendReply(rev.id)}
                          className="px-4 py-1.5 bg-[#176B3A] hover:bg-[#2E8B57] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSubmittingReply ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Publish Official Reply</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Bar (Moderation Buttons) */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                  {/* Left: Status updates */}
                  <div className="flex flex-wrap items-center gap-2">
                    {rev.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {rev.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'REJECTED')}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {rev.status !== 'HIDDEN' && rev.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'HIDDEN')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide / Unpublish</span>
                      </button>
                    )}

                    {/* Toggle Feature on Homepage */}
                    <button
                      type="button"
                      onClick={() => handleToggleFeature(rev.id, rev.isFeatured)}
                      className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1 ${
                        rev.isFeatured
                          ? 'bg-amber-100 border-amber-300 text-amber-950 font-black'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{rev.isFeatured ? 'Featured ⭐' : 'Feature on Home'}</span>
                    </button>
                  </div>

                  {/* Right: Reply & Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingReviewId(rev.id);
                        setReplyText(rev.adminReply || '');
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#176B3A] border border-emerald-200 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{rev.adminReply ? 'Edit Reply' : 'Official Reply'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(rev.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Permanently remove inappropriate content"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="bg-white border border-brand-border rounded-2xl px-6 py-4 flex items-center justify-between text-xs">
          <span className="text-brand-muted">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total reviews)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold disabled:opacity-40 hover:bg-gray-100 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold disabled:opacity-40 hover:bg-gray-100 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activePhoto} alt="Review upload preview" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

