import type React from "react";

export interface User {
    name: string;
    email: string;
   _id: string;
   role: string;
   image: string;
}

export interface LocationData{
   latitude:number;
   longitude:number;
   formattedAddress:string; 
}

export interface AppContextType{
  user:User | null;
  loading:boolean;
  isAuth:boolean;
  setUser:React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuth:React.Dispatch<React.SetStateAction<boolean>>;
  setLoading:React.Dispatch<React.SetStateAction<boolean>>;
  location:LocationData | null;
  loadingLocation:boolean;
   city:string;
   cart:ICart[]|null;
   fetchCart:()=>Promise<void>;
   subtotal:number;
   quantity:number;
   fetchLocation:()=>Promise<void>;
   fetchUser:()=>Promise<void>;
}

export interface IRestaurant {
   _id:string;
    name:string;
    description?:string;
    image:string;
    ownerId:string;
    phone:number;
    isVerified:boolean;

    autoLocation:{
        type:"Point",
        coordinates:[number,number]; // [longitude,latitude]
        formattedAddress:string;
    };
    isOpen:boolean;
    createdAt:Date;
}

export type PendingRestaurant = IRestaurant;

export interface PendingRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailable: boolean;
}

export interface AddressRecord {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

export interface IMenuItem {
   _id:string
    restaurantId: string;
    name: string;
    description: string;
    image?: string;
    price: number;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICart {
   _id:string,
   userId:string;
   restaurantId:string | IRestaurant;
   itemId:string | IMenuItem;
   quantity:number;
   createdAt:Date;
   updatedAt:Date;
}
export interface IOrder {
  _id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  riderId?: string | null;
  riderPhone?: string | null;
  riderName?: string | null;
  distance?: number;
  riderAmount: number;
  customerDeliveryFee?: number;
  platformSubsidy?: number;
  estimatedPlatformRevenue?: number;

items: {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}[];

subtotal: number;
deliveryFee: number;
platformFee: number;
totalAmount: number;

addressId: string;
deliveryAddress: {
  formattedAddress: string;
  mobile: number;
  latitude: number;
  longitude: number;
};

status:
  | "placed"
  | "accepted"
  | "preparing"
  | "ready_for_rider"
  | "rider_assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

  paymentMethod: "razorpay" | "stripe";
paymentStatus: "pending" | "paid" | "failed";

expiresAt: Date;

createdAt: Date;
updatedAt: Date;
}

export interface AdminStats {
  totalRevenue: number;
  totalRiderPayout: number;
  totalPlatformSubsidy: number;
  netPlatformRevenue: number;
  ordersCount: number;
  usersCount: number;
  totalCustomers: number;
  totalRestaurants: number;
  totalRiders: number;
  growthPercent: number;
  orderGrowthPercent: number;
  peakOrderTime: string;
  pendingRestaurants: number;
  pendingRiders: number;
  cached?: boolean;
}

export interface OrdersTrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopSellingItem {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
  image?: string;
  description?: string;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface HourlyInsight {
  hour: string;
  orders: number;
  revenue: number;
}

export interface RestaurantBiItem {
  itemId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  revenueShare: number;
}

export interface RestaurantDashboardStats {
  revenue: number;
  orders: number;
  delivered: number;
  averageOrderValue: number;
  customerDeliveryFees: number;
  riderPayout: number;
  platformSubsidy: number;
  netPlatformRevenue: number;
  newCustomers: number;
  returningCustomers: number;
  peakOrderTime: string;
  weekOverWeekGrowth: number;
  insights: string[];
  topItems: RestaurantBiItem[];
  lowPerformingItems: RestaurantBiItem[];
  hourlyPerformance: HourlyInsight[];
  revenueSeries: {
    daily: RevenuePoint[];
    weekly: RevenuePoint[];
    monthly: RevenuePoint[];
  };
  cached?: boolean;
}
