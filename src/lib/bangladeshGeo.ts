// Bangladesh Administrative Geographic Hierarchy
// Complete 8 Divisions, 64 Districts (Zila), 495+ Upazilas & Thanas with full English & Bengali support

import { DHAKA_UPAZILAS } from "./geoData/dhaka";
import { CHATTOGRAM_UPAZILAS } from "./geoData/chattogram";
import { RAJSHAHI_UPAZILAS } from "./geoData/rajshahi";
import { KHULNA_UPAZILAS } from "./geoData/khulna";
import { BARISHAL_UPAZILAS, SYLHET_UPAZILAS } from "./geoData/barishal_sylhet";
import { RANGPUR_UPAZILAS, MYMENSINGH_UPAZILAS } from "./geoData/rangpur_mymensingh";

export interface BangladeshDivision {
  id: string;
  name: string;
  bnName: string;
}

export interface BangladeshDistrict {
  id: string;
  divisionId: string;
  name: string;
  bnName: string;
}

export interface BangladeshUpazila {
  id: string;
  districtId: string;
  name: string;
  bnName: string;
  areas?: string[];
}

export const BD_DIVISIONS: BangladeshDivision[] = [
  { id: "dhaka", name: "Dhaka", bnName: "ঢাকা" },
  { id: "chattogram", name: "Chattogram", bnName: "চট্টগ্রাম" },
  { id: "rajshahi", name: "Rajshahi", bnName: "রাজশাহী" },
  { id: "khulna", name: "Khulna", bnName: "খুলনা" },
  { id: "barishal", name: "Barishal", bnName: "বরিশাল" },
  { id: "sylhet", name: "Sylhet", bnName: "সিলেট" },
  { id: "rangpur", name: "Rangpur", bnName: "রংপুর" },
  { id: "mymensingh", name: "Mymensingh", bnName: "ময়মনসিংহ" },
];

export const BD_DISTRICTS: BangladeshDistrict[] = [
  // Dhaka Division (13)
  { id: "dhaka", divisionId: "dhaka", name: "Dhaka", bnName: "ঢাকা" },
  { id: "gazipur", divisionId: "dhaka", name: "Gazipur", bnName: "গাজীপুর" },
  { id: "narayanganj", divisionId: "dhaka", name: "Narayanganj", bnName: "নারায়ণগঞ্জ" },
  { id: "tangail", divisionId: "dhaka", name: "Tangail", bnName: "টাঙ্গাইল" },
  { id: "kishoreganj", divisionId: "dhaka", name: "Kishoreganj", bnName: "কিশোরগঞ্জ" },
  { id: "manikganj", divisionId: "dhaka", name: "Manikganj", bnName: "মানিকগঞ্জ" },
  { id: "munshiganj", divisionId: "dhaka", name: "Munshiganj", bnName: "মুন্সীগঞ্জ" },
  { id: "narsingdi", divisionId: "dhaka", name: "Narsingdi", bnName: "নরসিংদী" },
  { id: "faridpur", divisionId: "dhaka", name: "Faridpur", bnName: "ফরিদপুর" },
  { id: "gopalganj", divisionId: "dhaka", name: "Gopalganj", bnName: "গোপালগঞ্জ" },
  { id: "madaripur", divisionId: "dhaka", name: "Madaripur", bnName: "মাদারীপুর" },
  { id: "rajbari", divisionId: "dhaka", name: "Rajbari", bnName: "রাজবাড়ী" },
  { id: "shariatpur", divisionId: "dhaka", name: "Shariatpur", bnName: "শরীয়তপুর" },

  // Chattogram Division (11)
  { id: "chattogram", divisionId: "chattogram", name: "Chattogram", bnName: "চট্টগ্রাম" },
  { id: "coxs_bazar", divisionId: "chattogram", name: "Cox's Bazar", bnName: "কক্সবাজার" },
  { id: "cumilla", divisionId: "chattogram", name: "Cumilla", bnName: "কুমিল্লা" },
  { id: "feni", divisionId: "chattogram", name: "Feni", bnName: "ফেনী" },
  { id: "brahmanbaria", divisionId: "chattogram", name: "Brahmanbaria", bnName: "ব্রাহ্মণবাড়িয়া" },
  { id: "noakhali", divisionId: "chattogram", name: "Noakhali", bnName: "নোয়াখালী" },
  { id: "chandpur", divisionId: "chattogram", name: "Chandpur", bnName: "চাঁদপুর" },
  { id: "lakshmipur", divisionId: "chattogram", name: "Lakshmipur", bnName: "লক্ষ্মীপুর" },
  { id: "rangamati", divisionId: "chattogram", name: "Rangamati", bnName: "রাঙ্গামাটি" },
  { id: "bandarban", divisionId: "chattogram", name: "Bandarban", bnName: "বান্দরবান" },
  { id: "khagrachhari", divisionId: "chattogram", name: "Khagrachhari", bnName: "খাগড়াছড়ি" },

  // Rajshahi Division (8)
  { id: "rajshahi", divisionId: "rajshahi", name: "Rajshahi", bnName: "রাজশাহী" },
  { id: "bogura", divisionId: "rajshahi", name: "Bogura", bnName: "বগুড়া" },
  { id: "pabna", divisionId: "rajshahi", name: "Pabna", bnName: "পাবনা" },
  { id: "sirajganj", divisionId: "rajshahi", name: "Sirajganj", bnName: "সিরাজগঞ্জ" },
  { id: "naogaon", divisionId: "rajshahi", name: "Naogaon", bnName: "নওগাঁ" },
  { id: "natore", divisionId: "rajshahi", name: "Natore", bnName: "নাটোর" },
  { id: "chapainawabganj", divisionId: "rajshahi", name: "Chapainawabganj", bnName: "চাঁপাইনবাবগঞ্জ" },
  { id: "joypurhat", divisionId: "rajshahi", name: "Joypurhat", bnName: "জয়পুরহাট" },

  // Khulna Division (10)
  { id: "khulna", divisionId: "khulna", name: "Khulna", bnName: "খুলনা" },
  { id: "jashore", divisionId: "khulna", name: "Jashore", bnName: "যশোর" },
  { id: "kushtia", divisionId: "khulna", name: "Kushtia", bnName: "কুষ্টিয়া" },
  { id: "jhenaidah", divisionId: "khulna", name: "Jhenaidah", bnName: "ঝিনাইদহ" },
  { id: "satkhira", divisionId: "khulna", name: "Satkhira", bnName: "সাতক্ষীরা" },
  { id: "bagerhat", divisionId: "khulna", name: "Bagerhat", bnName: "বাগেরহাট" },
  { id: "chuadanga", divisionId: "khulna", name: "Chuadanga", bnName: "চুয়াডাঙ্গা" },
  { id: "meherpur", divisionId: "khulna", name: "Meherpur", bnName: "মেহেরপুর" },
  { id: "magura", divisionId: "khulna", name: "Magura", bnName: "মাগুরা" },
  { id: "narail", divisionId: "khulna", name: "Narail", bnName: "নড়াইল" },

  // Barishal Division (6)
  { id: "barishal", divisionId: "barishal", name: "Barishal", bnName: "বরিশাল" },
  { id: "patuakhali", divisionId: "barishal", name: "Patuakhali", bnName: "পটুয়াখালী" },
  { id: "bhola", divisionId: "barishal", name: "Bhola", bnName: "ভোলা" },
  { id: "pirojpur", divisionId: "barishal", name: "Pirojpur", bnName: "পিরোজপুর" },
  { id: "barguna", divisionId: "barishal", name: "Barguna", bnName: "বরগুনা" },
  { id: "jhalokathi", divisionId: "barishal", name: "Jhalokathi", bnName: "ঝালকাঠি" },

  // Sylhet Division (4)
  { id: "sylhet", divisionId: "sylhet", name: "Sylhet", bnName: "সিলেট" },
  { id: "moulvibazar", divisionId: "sylhet", name: "Moulvibazar", bnName: "মৌলভীবাজার" },
  { id: "habiganj", divisionId: "sylhet", name: "Habiganj", bnName: "হবিগঞ্জ" },
  { id: "sunamganj", divisionId: "sylhet", name: "Sunamganj", bnName: "সুনামগঞ্জ" },

  // Rangpur Division (8)
  { id: "rangpur", divisionId: "rangpur", name: "Rangpur", bnName: "রংপুর" },
  { id: "dinajpur", divisionId: "rangpur", name: "Dinajpur", bnName: "দিনাজপুর" },
  { id: "gaibandha", divisionId: "rangpur", name: "Gaibandha", bnName: "গাইবান্ধা" },
  { id: "kurigram", divisionId: "rangpur", name: "Kurigram", bnName: "কুড়িগ্রাম" },
  { id: "lalmonirhat", divisionId: "rangpur", name: "Lalmonirhat", bnName: "লালমনিরহাট" },
  { id: "nilphamari", divisionId: "rangpur", name: "Nilphamari", bnName: "নীলফামারী" },
  { id: "panchagarh", divisionId: "rangpur", name: "Panchagarh", bnName: "পঞ্চগড়" },
  { id: "thakurgaon", divisionId: "rangpur", name: "Thakurgaon", bnName: "ঠাকুরগাঁও" },

  // Mymensingh Division (4)
  { id: "mymensingh", divisionId: "mymensingh", name: "Mymensingh", bnName: "ময়মনসিংহ" },
  { id: "jamalpur", divisionId: "mymensingh", name: "Jamalpur", bnName: "জামালপুর" },
  { id: "netrokona", divisionId: "mymensingh", name: "Netrokona", bnName: "নেত্রকোণা" },
  { id: "sherpur", divisionId: "mymensingh", name: "Sherpur", bnName: "শেরপুর" },
];

export const BD_UPAZILAS: BangladeshUpazila[] = [
  ...DHAKA_UPAZILAS,
  ...CHATTOGRAM_UPAZILAS,
  ...RAJSHAHI_UPAZILAS,
  ...KHULNA_UPAZILAS,
  ...BARISHAL_UPAZILAS,
  ...SYLHET_UPAZILAS,
  ...RANGPUR_UPAZILAS,
  ...MYMENSINGH_UPAZILAS,
];

export interface FormattedAddressPayload {
  division: string;
  divisionBn?: string;
  district: string;
  districtBn?: string;
  upazila: string;
  upazilaBn?: string;
  areaUnion: string;
  detailedHouseRoad: string;
  fullAddressText: string;
}

export function buildFormattedAddress(payload: {
  division: string;
  district: string;
  upazila: string;
  areaUnion: string;
  detailedHouseRoad: string;
}): string {
  const parts = [
    payload.detailedHouseRoad?.trim(),
    payload.areaUnion?.trim(),
    payload.upazila?.trim(),
    payload.district?.trim(),
    payload.division ? `${payload.division} Division` : ""
  ].filter(Boolean);

  return parts.join(", ");
}

export function getDistrictsByDivision(divisionId: string): BangladeshDistrict[] {
  return BD_DISTRICTS.filter((d) => d.divisionId === divisionId);
}

export function getUpazilasByDistrict(districtId: string): BangladeshUpazila[] {
  return BD_UPAZILAS.filter((u) => u.districtId === districtId);
}
