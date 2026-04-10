export interface ExternalProduct {
  name: string;
  sku: string;
  description: string;
  unitPrice: number;
  imageUrl: string;
  externalId: string;
  category: string;
}

export async function fetchExternalCatalog(
  apiUrl?: string
): Promise<ExternalProduct[]> {
  const url =
    apiUrl ||
    'https://dummyjson.com/products?limit=20&select=title,price,description,category,sku,thumbnail';

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // Handle dummyjson format
    if (data.products && Array.isArray(data.products)) {
      return data.products.map((p: any) => ({
        name: p.title,
        sku: p.sku || '',
        description: p.description || '',
        unitPrice: p.price,
        imageUrl: p.thumbnail || '',
        externalId: String(p.id),
        category: p.category || '',
      }));
    }

    // Handle raw array format
    if (Array.isArray(data)) {
      return data.map((p: any) => ({
        name: p.title || p.name || '',
        sku: p.sku || '',
        description: p.description || '',
        unitPrice: p.price || p.unitPrice || 0,
        imageUrl: p.thumbnail || p.imageUrl || '',
        externalId: String(p.id || p.externalId || ''),
        category: p.category || '',
      }));
    }

    return [];
  } catch {
    // Return mock data for demo if the external API is unreachable
    return getMockCatalog();
  }
}

function getMockCatalog(): ExternalProduct[] {
  return [
    {
      name: 'Dell Latitude 5540 Laptop',
      sku: 'DELL-LAT-5540',
      description: '15.6" FHD, Intel i7, 16GB RAM, 512GB SSD',
      unitPrice: 1299.99,
      imageUrl: '',
      externalId: 'mock-1',
      category: 'Laptops',
    },
    {
      name: 'HP EliteDisplay E243 Monitor',
      sku: 'HP-E243',
      description: '24" FHD IPS Monitor with HDMI and DisplayPort',
      unitPrice: 289.99,
      imageUrl: '',
      externalId: 'mock-2',
      category: 'Monitors',
    },
    {
      name: 'Logitech MX Master 3S Mouse',
      sku: 'LOG-MXM3S',
      description: 'Wireless ergonomic mouse with USB-C charging',
      unitPrice: 99.99,
      imageUrl: '',
      externalId: 'mock-3',
      category: 'Peripherals',
    },
    {
      name: 'Cisco Meraki MR46 Access Point',
      sku: 'CISCO-MR46',
      description: 'Wi-Fi 6 cloud-managed indoor access point',
      unitPrice: 649.0,
      imageUrl: '',
      externalId: 'mock-4',
      category: 'Networking',
    },
    {
      name: 'APC Smart-UPS 1500VA',
      sku: 'APC-SMT1500',
      description: 'Line-interactive UPS with LCD display',
      unitPrice: 549.99,
      imageUrl: '',
      externalId: 'mock-5',
      category: 'Power',
    },
    {
      name: 'Samsung 970 EVO Plus 1TB SSD',
      sku: 'SAM-970EVO-1T',
      description: 'NVMe M.2 internal SSD, up to 3500 MB/s read',
      unitPrice: 109.99,
      imageUrl: '',
      externalId: 'mock-6',
      category: 'Storage',
    },
    {
      name: 'Jabra Evolve2 75 Headset',
      sku: 'JAB-E275',
      description: 'Wireless ANC headset with charging stand',
      unitPrice: 299.99,
      imageUrl: '',
      externalId: 'mock-7',
      category: 'Peripherals',
    },
    {
      name: 'Tripp Lite 24-Port Patch Panel',
      sku: 'TL-PP24',
      description: 'Cat6 24-port 1U rack-mount patch panel',
      unitPrice: 59.99,
      imageUrl: '',
      externalId: 'mock-8',
      category: 'Networking',
    },
  ];
}
