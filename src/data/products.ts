import type { Product } from '@/types';

export const WHATSAPP_NUMBER = '917358412349';
export const STORE_ADDRESS = {
  line1: '70 Feet Road, Periyar Nagar West',
  line2: 'Perambur',
  city: 'Chennai',
  pincode: '600082',
  phone: '073584 12349',
};
export const INSTAGRAM_HANDLE = 'vesto_in';
export const INSTAGRAM_URL = 'https://instagram.com/vesto_in';
export const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=70+Feet+Road+Periyar+Nagar+West+Perambur+Chennai+600082';

export const formatPrice = (n: number) =>
  '₹' + n.toLocaleString('en-IN');

export const products: Product[] = [
  {
    id: 'oversized-tee',
    name: 'VESTO Oversized Tee',
    price: 699,
    category: 'T-Shirts',
    isNew: true,
    image:
      'https://images.pexels.com/photos/36942017/pexels-photo-36942017.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A relaxed oversized tee cut from heavyweight combed cotton. Drop-shoulder seams and a longer body give it a contemporary streetwear silhouette that drapes clean and wears easy.',
    colors: [
      { name: 'Black', hex: '#1a1916' },
      { name: 'Bone', hex: '#e7e0d2' },
      { name: 'Olive', hex: '#54524a' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: '240 GSM Combed Cotton',
  },
  {
    id: 'premium-shirt',
    name: 'VESTO Premium Shirt',
    price: 999,
    category: 'Shirts',
    isNew: true,
    image:
      'https://images.pexels.com/photos/7905889/pexels-photo-7905889.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A tailored everyday shirt in breathable cotton weave. Clean collar, mother-of-pearl-style buttons, and a modern slim fit that transitions from desk to dinner without missing a beat.',
    colors: [
      { name: 'White', hex: '#f3efe7' },
      { name: 'Sky', hex: '#9fb0c4' },
      { name: 'Charcoal', hex: '#2a2925' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Cotton Blend Weave',
  },
  {
    id: 'relaxed-trouser',
    name: 'VESTO Relaxed Trouser',
    price: 1199,
    category: 'Trousers',
    isNew: true,
    image:
      'https://images.pexels.com/photos/9464625/pexels-photo-9464625.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A relaxed-leg trouser with a clean front and a subtle taper. Cut from a structured cotton-twill that holds its shape through the day, with a comfortable mid-rise and a clean break.',
    colors: [
      { name: 'Stone', hex: '#c1b294' },
      { name: 'Black', hex: '#1a1916' },
      { name: 'Sand', hex: '#d6cbb6' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Cotton Twill',
  },
  {
    id: 'essential-polo',
    name: 'VESTO Essential Polo',
    price: 899,
    category: 'Polos',
    isNew: true,
    image:
      'https://images.pexels.com/photos/10962177/pexels-photo-10962177.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A classic single-rib polo in pique cotton. Trim collar, clean placket, and a tailored body that sits close without pulling. The piece you reach for when you want to look done, not overdone.',
    colors: [
      { name: 'Navy', hex: '#2a2925' },
      { name: 'White', hex: '#f3efe7' },
      { name: 'Olive', hex: '#54524a' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Pique Cotton',
  },
  {
    id: 'denim',
    name: 'VESTO Denim',
    price: 1299,
    category: 'Jeans',
    isNew: true,
    image:
      'https://images.pexels.com/photos/31988321/pexels-photo-31988321.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A mid-rise straight-taper denim in a mid-indigo wash. Built on a stretch-denim base for all-day comfort, with clean hardware and a leg that breaks neatly over your shoe.',
    colors: [
      { name: 'Indigo', hex: '#3f3d37' },
      { name: 'Black', hex: '#1a1916' },
      { name: 'Washed', hex: '#8e8c81' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Stretch Denim',
  },
  {
    id: 'street-tee',
    name: 'VESTO Street Tee',
    price: 749,
    category: 'T-Shirts',
    isNew: true,
    image:
      'https://images.pexels.com/photos/12781928/pexels-photo-12781928.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A boxy streetwear tee with a slightly cropped body and a heavier hand. Built to layer or stand alone, with a ribbed crew neck that keeps its shape wash after wash.',
    colors: [
      { name: 'Black', hex: '#1a1916' },
      { name: 'Bone', hex: '#e7e0d2' },
      { name: 'Rust', hex: '#a89870' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: '220 GSM Cotton',
  },
  {
    id: 'linen-shirt',
    name: 'VESTO Linen Shirt',
    price: 1099,
    category: 'Shirts',
    isNew: false,
    image:
      'https://images.pexels.com/photos/4443831/pexels-photo-4443831.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A breathable linen-blend shirt built for Chennai weather. Relaxed body, soft collar, and a dry hand-feel that only gets better with every wash.',
    colors: [
      { name: 'Sky', hex: '#9fb0c4' },
      { name: 'Sand', hex: '#d6cbb6' },
      { name: 'White', hex: '#f3efe7' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Linen Cotton Blend',
  },
  {
    id: 'cargo-trouser',
    name: 'VESTO Cargo Trouser',
    price: 1299,
    category: 'Trousers',
    isNew: false,
    image:
      'https://images.pexels.com/photos/2897533/pexels-photo-2897533.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A utility cargo trouser with clean flap pockets and a relaxed leg. Sturdy cotton drill with a soft hand, built to move and made to last.',
    colors: [
      { name: 'Olive', hex: '#54524a' },
      { name: 'Stone', hex: '#c1b294' },
      { name: 'Black', hex: '#1a1916' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Cotton Drill',
  },
  {
    id: 'slim-polo',
    name: 'VESTO Slim Polo',
    price: 949,
    category: 'Polos',
    isNew: false,
    image:
      'https://images.pexels.com/photos/9301162/pexels-photo-9301162.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A slim-fit polo with a modern placket and a clean, close body. The pique fabric breathes easy and the collar sits sharp — a warm-weather staple that works anywhere.',
    colors: [
      { name: 'Black', hex: '#1a1916' },
      { name: 'Burgundy', hex: '#5a2e2e' },
      { name: 'White', hex: '#f3efe7' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Pique Cotton',
  },
  {
    id: 'slim-denim',
    name: 'VESTO Slim Denim',
    price: 1399,
    category: 'Jeans',
    isNew: false,
    image:
      'https://images.pexels.com/photos/10004179/pexels-photo-10004179.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A slim-straight denim in a clean dark wash. Minimal fading, clean stitching, and a leg that tapers neatly to the ankle — your go-to for shirts and tees alike.',
    colors: [
      { name: 'Dark Indigo', hex: '#2a2925' },
      { name: 'Black', hex: '#1a1916' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Stretch Denim',
  },
  {
    id: 'henley-tee',
    name: 'VESTO Henley Tee',
    price: 799,
    category: 'T-Shirts',
    isNew: false,
    image:
      'https://images.pexels.com/photos/14941593/pexels-photo-14941593.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A long-sleeve henley in soft cotton jersey. Three-button placket, ribbed cuffs, and a body that sits close without feeling tight — a quiet layering piece with real character.',
    colors: [
      { name: 'Bone', hex: '#e7e0d2' },
      { name: 'Charcoal', hex: '#2a2925' },
      { name: 'Olive', hex: '#54524a' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: '100% Cotton Jersey',
  },
  {
    id: 'oxford-shirt',
    name: 'VESTO Oxford Shirt',
    price: 1149,
    category: 'Shirts',
    isNew: false,
    image:
      'https://images.pexels.com/photos/13339846/pexels-photo-13339846.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    description:
      'A classic oxford-cloth shirt with a button-down collar. Woven from breathable cotton oxford with a soft, textured hand — equally at home with denim or tailoring.',
    colors: [
      { name: 'Blue', hex: '#9fb0c4' },
      { name: 'White', hex: '#f3efe7' },
      { name: 'Pink', hex: '#d6b6b6' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: 'Oxford Cotton',
  },
];

export const getProductById = (id: string) =>
  products.find((p) => p.id === id);

export const newArrivals = products.filter((p) => p.isNew);

export const categories: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'T-Shirts', value: 'T-Shirts' },
  { label: 'Shirts', value: 'Shirts' },
  { label: 'Polos', value: 'Polos' },
  { label: 'Trousers', value: 'Trousers' },
  { label: 'Jeans', value: 'Jeans' },
  { label: 'New Arrivals', value: 'new' },
];
