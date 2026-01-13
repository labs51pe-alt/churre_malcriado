import { StoreSettings } from './types';

export const CATEGORIES = ['Sanguches', 'Bebidas', 'Complementos', 'Combos', 'Otros'];

export const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Churre Malcriado',
  currency: 'S/',
  taxRate: 0.18, 
  pricesIncludeTax: true,
  address: 'Av. Principal 123, Piura',
  phone: '999-999-999',
  themeColor: '#e11d48' // Rosa vibrante del logo
};

export const MOCK_PRODUCTS = [
  { id: '1', name: 'Sanguche de Pavo', price: 15.50, category: 'Sanguches', stock: 25, barcode: '77501001' },
  { id: '2', name: 'Sanguche de Lechón', price: 14.50, category: 'Sanguches', stock: 20, barcode: '77501002' },
  { id: '3', name: 'Chicha Morada 500ml', price: 5.00, category: 'Bebidas', stock: 50, barcode: '77501003' },
  { id: '4', name: 'Tamal Piurano', price: 6.00, category: 'Complementos', stock: 15, barcode: '77501004' },
  { id: '5', name: 'Combo Malcriado', price: 22.00, category: 'Combos', stock: 10, barcode: '77501005' },
  { id: '6', name: 'Inca Kola 600ml', price: 3.50, category: 'Bebidas', stock: 40, barcode: '77501006' }
];

export const THEME_COLORS = [
  { name: 'Rosa Churre', hex: '#e11d48' },
  { name: 'Naranja Brasa', hex: '#f97316' },
  { name: 'Amarillo Mostaza', hex: '#eab308' },
  { name: 'Índigo Moderno', hex: '#4f46e5' },
  { name: 'Verde Lima', hex: '#84cc16' },
  { name: 'Negro Elegante', hex: '#0f172a' }
];