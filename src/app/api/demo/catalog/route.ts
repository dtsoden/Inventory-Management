import { NextResponse } from 'next/server';

/**
 * GET /api/demo/catalog
 *
 * Built-in demo catalog API that returns sample IT equipment products.
 * This endpoint exists so users can test the catalog import feature
 * without configuring an external API. The "Try Sample" button in
 * Settings > Integrations > Catalog API points here.
 */

const SAMPLE_PRODUCTS = [
  { id: 1, title: 'Dell Latitude 5540 Laptop', price: 1249.99, description: '15.6" FHD, Intel Core i7-1365U, 16GB RAM, 512GB SSD', category: 'Laptops', sku: 'DEL-LAT-5540', thumbnail: '' },
  { id: 2, title: 'Dell OptiPlex 7010 Desktop', price: 899.00, description: 'Intel Core i5-13500, 16GB RAM, 256GB SSD, Windows 11 Pro', category: 'Desktops', sku: 'DEL-OPT-7010', thumbnail: '' },
  { id: 3, title: 'Cisco Catalyst 9200L Switch', price: 2450.00, description: '24-port PoE+, Network Advantage, Stackable', category: 'Networking', sku: 'CSC-C9200L-24P', thumbnail: '' },
  { id: 4, title: 'Cisco Meraki MR36 Access Point', price: 675.00, description: 'Cloud-managed Wi-Fi 6, 802.11ax, Indoor', category: 'Networking', sku: 'CSC-MR36-HW', thumbnail: '' },
  { id: 5, title: 'UniFi U6 Pro Access Point', price: 149.00, description: 'Wi-Fi 6 dual-band, 5.3 Gbps aggregate, PoE powered', category: 'Networking', sku: 'UBQ-U6-PRO', thumbnail: '' },
  { id: 6, title: 'UniFi Dream Machine Pro', price: 379.00, description: 'All-in-one gateway, switch, and UniFi controller', category: 'Networking', sku: 'UBQ-UDM-PRO', thumbnail: '' },
  { id: 7, title: 'HP LaserJet Pro M404dn', price: 349.99, description: 'Monochrome laser, duplex, 40ppm, Ethernet', category: 'Printers', sku: 'HP-LJP-M404DN', thumbnail: '' },
  { id: 8, title: 'HP EliteDisplay E243 Monitor', price: 279.00, description: '23.8" FHD IPS, HDMI/DP/VGA, Height Adjustable', category: 'Peripherals', sku: 'HP-ED-E243', thumbnail: '' },
  { id: 9, title: 'Lenovo ThinkPad X1 Carbon Gen 11', price: 1649.00, description: '14" WUXGA, Intel Core i7-1365U, 16GB, 512GB SSD', category: 'Laptops', sku: 'LEN-X1C-G11', thumbnail: '' },
  { id: 10, title: 'Lenovo ThinkVision T27h-30 Monitor', price: 389.00, description: '27" QHD IPS, USB-C 75W PD, Daisy Chain', category: 'Peripherals', sku: 'LEN-TV-T27H', thumbnail: '' },
  { id: 11, title: 'Apple MacBook Pro 14" M3 Pro', price: 1999.00, description: 'M3 Pro chip, 18GB RAM, 512GB SSD, Liquid Retina XDR', category: 'Laptops', sku: 'APL-MBP14-M3P', thumbnail: '' },
  { id: 12, title: 'Apple iPad Pro 11" M2', price: 799.00, description: 'M2 chip, 128GB, Wi-Fi, Liquid Retina display', category: 'Mobile', sku: 'APL-IPAD-11M2', thumbnail: '' },
  { id: 13, title: 'Logitech MX Master 3S Mouse', price: 99.99, description: 'Wireless, 8K DPI, Quiet Clicks, USB-C, Multi-device', category: 'Peripherals', sku: 'LOG-MXM-3S', thumbnail: '' },
  { id: 14, title: 'Logitech MX Keys S Keyboard', price: 109.99, description: 'Wireless, Backlit, Smart Actions, USB-C, Multi-device', category: 'Peripherals', sku: 'LOG-MXK-S', thumbnail: '' },
  { id: 15, title: 'Logitech Brio 4K Webcam', price: 169.99, description: '4K Ultra HD, HDR, Auto Light Correction, USB-C', category: 'Peripherals', sku: 'LOG-BRIO-4K', thumbnail: '' },
  { id: 16, title: 'APC Smart-UPS 1500VA', price: 549.00, description: 'Line Interactive, LCD, 120V, 1000W, USB, Rack/Tower', category: 'Power', sku: 'APC-SMT1500', thumbnail: '' },
  { id: 17, title: 'APC Back-UPS Pro 1500S', price: 269.99, description: '1500VA, 10 Outlets, 2 USB, LCD, Sinewave', category: 'Power', sku: 'APC-BR1500S', thumbnail: '' },
  { id: 18, title: 'Samsung Galaxy Tab S9 FE', price: 449.99, description: '10.9" display, 128GB, S Pen included, IP68', category: 'Mobile', sku: 'SAM-TABS9FE', thumbnail: '' },
  { id: 19, title: 'Dell P2723QE 4K USB-C Monitor', price: 459.99, description: '27" 4K IPS, USB-C 90W PD, RJ45, Pivot/Swivel', category: 'Peripherals', sku: 'DEL-P2723QE', thumbnail: '' },
  { id: 20, title: 'Cisco IP Phone 8845', price: 385.00, description: '5" WVGA, HD Video, 5 Lines, Bluetooth, USB', category: 'Networking', sku: 'CSC-CP8845', thumbnail: '' },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const select = url.searchParams.get('select')?.split(',') || [];

  let products = SAMPLE_PRODUCTS.slice(0, limit);

  // If select params provided, filter to those fields
  if (select.length > 0) {
    products = products.map((p) => {
      const filtered: Record<string, unknown> = {};
      for (const field of select) {
        const key = field.trim() as keyof typeof p;
        if (key in p) filtered[key] = p[key];
      }
      return filtered as typeof p;
    });
  }

  return NextResponse.json({
    products,
    total: SAMPLE_PRODUCTS.length,
    limit,
  });
}
