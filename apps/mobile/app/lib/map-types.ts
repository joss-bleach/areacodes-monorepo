export type MapVoucher = {
  _id: string;
  title: string;
  description: string;
  voucherValidFrom: number;
  voucherValidTo: number;
};

export type MapBusiness = {
  _id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  industry: { name: string; category: string } | null;
  vouchers: MapVoucher[];
};

export type NearbyBusiness = MapBusiness & { distanceMetres: number };

export type LatestVoucher = {
  _id: string;
  title: string;
  businessName: string;
  industryName: string;
};
