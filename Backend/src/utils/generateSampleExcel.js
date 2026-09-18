import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Create a realistic B2B jewellery stock spreadsheet
const sampleData = [
  {
    'Style Code': 'RNG-1001',
    'Category': 'Gold Rings',
    'Gross Wt': 6.95,
    'Net Wt': 6.95,
    'Purity': '22 KT',
    'Description': 'Updated filigree ladies signet ring'
  },
  {
    'Style Code': 'RNG-1002',
    'Category': 'Gold Rings',
    'Gross Wt': 8.50,
    'Net Wt': 8.20,
    'Purity': '18 KT',
    'Description': '18K Rose Gold micro-pave solitaire mount'
  },
  {
    'Style Code': 'RNG-1003',
    'Category': 'Gold Rings',
    'Gross Wt': 5.40,
    'Net Wt': 5.40,
    'Purity': '22 KT',
    'Description': 'New geometric band ring'
  },
  {
    'Style Code': 'CHN-2001',
    'Category': 'Gold Chains',
    'Gross Wt': 25.10,
    'Net Wt': 25.10,
    'Purity': '22 KT',
    'Description': '22K Solid Curb chain updated weight'
  },
  {
    'Style Code': 'CHN-2002',
    'Category': 'Gold Chains',
    'Gross Wt': 18.20,
    'Net Wt': 18.20,
    'Purity': '22 KT',
    'Description': 'New rope weave chain'
  },
  {
    'Style Code': 'NCK-3001',
    'Category': 'Gold Necklaces',
    'Gross Wt': 46.00,
    'Net Wt': 45.00,
    'Purity': '22 KT',
    'Description': 'Temple gold necklace revised'
  },
  {
    'Style Code': 'NEW-CAT-01',
    'Category': 'Antique Mangalsutra',
    'Gross Wt': 12.50,
    'Net Wt': 11.80,
    'Purity': '22 KT',
    'Description': 'Brand new category discovered from Excel'
  }
];

const worksheet = XLSX.utils.json_to_sheet(sampleData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'StockMaster');

const outputDir = path.resolve('scratch');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
const filePath = path.join(outputDir, 'sample_jewellery_stock.xlsx');
XLSX.writeFile(workbook, filePath);
console.log('Sample Excel generated at:', filePath);
