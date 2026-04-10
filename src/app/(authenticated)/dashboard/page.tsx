import { Package, ShoppingCart, Building2, AlertTriangle } from 'lucide-react';

const kpiCards = [
  {
    title: 'Total Assets',
    value: 0,
    icon: Package,
    description: 'Items in inventory',
  },
  {
    title: 'Pending Orders',
    value: 0,
    icon: ShoppingCart,
    description: 'Awaiting fulfillment',
  },
  {
    title: 'Active Vendors',
    value: 0,
    icon: Building2,
    description: 'Registered suppliers',
  },
  {
    title: 'Low Stock Alerts',
    value: 0,
    icon: AlertTriangle,
    description: 'Items below threshold',
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.title} className="card-base rounded-xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
