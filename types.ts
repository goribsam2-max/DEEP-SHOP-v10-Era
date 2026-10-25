
export enum OrderStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  PROCESSING = 'Processing',
  CHECKING_PAYMENT = 'Checking Payment',
  COMPLETE_PACKAGING = 'Complete Packaging',
  DELIVER_ON_COURIER = 'Deliver on Courier',
  SHIPPED_IN_COURIER = 'Shipped in Courier',
  ON_THE_WAY = 'On the Way',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  RETURNED = 'Returned'
}

export interface Product {
  sellerId?: string;
  isOffer?: boolean;
  isBypass?: boolean;
  isBorderOffer?: boolean;
  isSold?: boolean;
  storage?: string;
  condition?: string;
  batteryHealth?: string;
  warranty?: string;
  borderOfferAdvanceAmount?: number;
  productType?: 'normal' | 'offer' | 'bypass' | 'custom' | 'border_offer';
  createdAt?: number;
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string; 
  images?: string[]; 
  modelUrl?: string; // 3D model link (.glb or .gltf)
  videoUrl?: string; // Video review link
  brand?: string;
  stock: number;
  rating: number;
  numReviews?: number;
  featured?: boolean;
  offerPrice?: number;
  offerEndTime?: number;
  views?: number;
  advanceType?: 'full' | 'custom' | 'none';
  advanceMode?: 'fixed' | 'percentage';
  advanceAmount?: number;
  advancePercentage?: number;
  resellerPrice?: number;
}

export interface UserProfile {
  id?: string;
  kycStatus?: string;
  followersCount?: number;
  reviews?: any[];
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  isAdmin?: boolean;
  isSeller?: boolean;
  sellerStatus?: string;
  type?: string;
  stars?: number;
  purchasedStars?: number;
  xp?: number;
  isReseller?: boolean;
  resellerStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  socialPlatform?: string;
  socialLink?: string;
  customerProofUrl?: string;
  resellerApprovedAt?: number;
  hasActiveSubscription?: boolean;
  subscriptionPlanId?: string;
  subscriptionEnd?: number;
  address?: string;
  phoneNumber?: string;
  coverPhoto?: string;
  followers?: string[];
  following?: string[];
  socialLinks?: {
    facebook?: string;
    tiktok?: string;
    instagram?: string;
  };
  totalReviews?: number;
  positiveReviews?: number;
  totalSold?: number;
  regularBuyers?: number;
  role: 'user' | 'admin' | 'staff' | 'seller' | string;
  isBanned: boolean;
  createdAt: number;
  isRegisteredBadge?: boolean;
  isVerifiedBadge?: boolean;
  registrationDate: number;
  ipAddress?: string;
  lastActive?: number;
  isp?: string;
  timeZone?: string;
  osName?: string;
  browserName?: string;
  locationName?: string;
  region?: 'BD' | 'IN' | 'PK';
  points?: number;
  lastSpinDate?: number;
  addresses?: any[];
  walletBalance?: number;
  affiliateCode?: string;
  isAffiliate?: boolean;
  affiliateStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  totalEarned?: number;
  isCreator?: boolean;
  creatorStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  creatorRejectReason?: string;
  creatorApplyDate?: number;
  contentMonetizationEnabled?: boolean;
  monetizationEnabledAt?: number;
  closeFriends?: string[];
}

export interface CreatorRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  channelUrl: string;
  platform: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: number;
}

export interface AffiliateRequest {
  platform?: string;
  followerCount?: number;
  promotionMethod?: string;
  additionalInfo?: string;
  id: string;
  userId: string;
  email: string;
  displayName: string;
  fullName: string;
  phone: string;
  socialUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface CartItem {
  id?: string;
  price?: number;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  name: string;
  image: string;
}

export interface Order {
  advanceAmount?: number;
  dueAmount?: number;
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus | string;
  paymentMethod: string;
  paymentOption?: string; // 'Full Payment', 'Half Payment', 'Custom Advance', or 'Cash on Delivery'
  transactionId?: string;
  lastDigits?: string;
  receiverNumber?: string;
  senderNumber?: string;
  accountNameSender?: string;
  guardianNumber?: string;
  nidCardUrl?: string;
  productClassification?: string;
  isBorderOffer?: boolean;
  shippingAddress: string;
  contactNumber: string;
  altNumber?: string;
  createdAt: number;
  customerName: string;
  trackingId?: string;
  ipAddress?: string; // Captured at checkout
  riderNumber?: string;
  courierName?: string;
  isSuspicious?: boolean;
  riskReason?: string;
  isGift?: boolean;
  giftNote?: string;
  affiliateRef?: string;
  commissionPaid?: boolean;
  subTotal?: number;
  discount?: number;
  couponCode?: string | null;
  finalized?: boolean;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  tags?: string[];
  views?: number;
  seoTitle?: string;
  seoDescription?: string;
  metaImage?: string;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface ScamReaction {
  userId: string;
  userName: string;
  type: ReactionType;
  createdAt: number;
}

export interface ScamComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  imageUrl?: string;
  replyToCommentId?: string;
  replyToUserName?: string;
  mentions?: string[];
  createdAt: number;
  updatedAt?: number;
  isEdited?: boolean;
  reactions?: Record<string, ReactionType>;
  reactionsCount?: Record<string, number>;
}

export type ImageLayoutStyle = 'collage' | 'carousel' | 'grid' | 'stack';
export type ImageAspectMode = 'original' | 'square' | 'portrait' | 'landscape';

export interface ScamPost {
  id: string;
  postType?: 'scam' | 'news' | 'discussion' | 'normal';
  title: string;
  description: string;
  scammerName?: string;
  scammerPhone?: string;
  scammerBkash?: string;
  scammerSocialLink?: string;
  scamLocation?: string;
  scammedAmount?: number;
  category: 'electronics' | 'delivery' | 'advance_payment' | 'fake_account' | 'tech_news' | 'market_update' | 'lifestyle' | 'other' | string;
  images: string[];
  imageLayout?: ImageLayoutStyle;
  imageAspectRatio?: ImageAspectMode;
  imageNaturalRatios?: number[];
  audioUrl?: string;
  audioDuration?: number;
  audioWaveform?: number[];
  videoUrl?: string;
  music?: {
    audioUrl: string;
    title: string;
    artist: string;
    cover: string;
  };
  themes?: string[];
  contentType?: 'text' | 'image' | 'voice' | 'video' | 'affirmation' | 'scam';
  textStyle?: 'normal' | 'large' | 'quote';
  reporterId: string;
  reporterName: string;
  reporterAvatar?: string;
  votes: number;
  votedUserIds?: string[];
  reactions?: Record<string, ReactionType>;
  reactionsCount?: Record<ReactionType, number>;
  reactionsUsers?: Record<string, { userName: string; userAvatar?: string; type: ReactionType; timestamp: number }>;
  commentsCount: number;
  sharesCount?: number;
  savedByUserIds?: string[];
  createdAt: number;
  updatedAt?: number;
  isEdited?: boolean;
  status?: 'trending' | 'active' | 'verified' | 'resolved' | 'under_review';
  views?: number;
  impressions?: number;
  clicks?: number;
  isAiGenerated?: boolean;
}

export interface AffiliateLog {
  id: string;
  affiliateId: string;
  orderId: string;
  customerName: string;
  commission: number;
  createdAt: number;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  amount: number;
  bkashNumber: string;
  accountName: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt: number;
  type?: 'coin' | 'affiliate' | 'general';
  paymentMethod?: 'bKash' | 'Nagad';
  coinAmount?: number;
  userEmail?: string;
  userPhone?: string;
  reason?: string;
}

export interface StorySong {
  id: string;
  title: string;
  artist: string;
  coverImage?: string;
  audioUrl: string;
  createdAt: number;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  link?: string;
  createdAt: number;
  bannerType?: 'hero' | 'popup' | 'gif';
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  images?: string[];
  replies?: any[];
  createdAt: number;
}

export interface Notification {
  variant?: string;
  id: string;
  userId: string;
  title: string;
  message: string;
  image?: string;
  type?: string;
  link?: string;
  isRead?: boolean;
  createdAt: number;
}

export interface HelpTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string;
  feedback?: 'Satisfied' | 'Not Satisfied';
  viewedByUser?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface OnboardingOffer {
  id: string;
  title1: string;
  title2: string;
  highlightedWord: string;
  description: string;
  glassTitle: string;
  glassDiscount: string;
  imageUrl: string;
  active: boolean;
  order: number;
}
