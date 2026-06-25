import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { Package, Inbox, DollarSign } from 'lucide-react';

interface Asset {
  _rowIndex: number;
  [key: string]: any;
}

interface DashboardProps {
  assets: Asset[];
}

export default function Dashboard({ assets }: DashboardProps) {
  const chartStatusRef = useRef<HTMLCanvasElement | null>(null);
  const chartLocationRef = useRef<HTMLCanvasElement | null>(null);
  
  const chartStatusInstance = useRef<Chart | null>(null);
  const chartLocationInstance = useRef<Chart | null>(null);

  // Computations
  const totalItems = assets.length;
  const warehouseItems = assets.filter(a => (a['EQUIPMENT STATUS'] || '').toUpperCase().includes('WAREHOUSE')).length;
  
  const parseCost = (costStr: any): number => {
    if (!costStr) return 0;
    if (typeof costStr === 'number') return costStr;
    const str = String(costStr).trim();
    if (str.includes(',') || str.includes('R$')) {
      const clean = str.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : val;
    }
    const val = parseFloat(str);
    return isNaN(val) ? 0 : val;
  };

  const totalCost = assets.reduce((sum, a) => sum + parseCost(a['COST']), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Status mapping
  const statusCounts: Record<string, number> = {};
  const locCounts: Record<string, number> = {};

  assets.forEach(a => {
    const st = a['EQUIPMENT STATUS'] || 'N/A';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    
    const loc = a['EQUIPMENT LOCATION'] || 'N/A';
    locCounts[loc] = (locCounts[loc] || 0) + 1;
  });

  const statusColorMapping: Record<string, string> = {
    'ASSIGNED': '#10b981',      // Emerald
    'WAREHOUSE': '#3b82f6',     // Blue
    'UNDER REPAIR': '#8b5cf6',  // Purple
    'AWAITING REPAIR': '#f59e0b', // Amber/Yellow
    'SCRAP/TRASH': '#f43f5e'     // Rose/Red
  };

  useEffect(() => {
    // 1. Status Doughnut Chart
    if (chartStatusRef.current) {
      if (chartStatusInstance.current) chartStatusInstance.current.destroy();

      const labels = Object.keys(statusCounts);
      const data = Object.values(statusCounts);
      const bgColors = labels.map(label => statusColorMapping[label.toUpperCase().trim()] || '#94a3b8');

      chartStatusInstance.current = new Chart(chartStatusRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: bgColors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                font: { size: 11, family: 'Inter' }
              }
            }
          }
        }
      });
    }

    // 2. Location Bar Chart
    if (chartLocationRef.current) {
      if (chartLocationInstance.current) chartLocationInstance.current.destroy();

      const labels = Object.keys(locCounts);
      const data = Object.values(locCounts);
      const colorPalette = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#64748b', '#f43f5e'];
      const bgColors = labels.map((_, i) => colorPalette[i % colorPalette.length]);

      chartLocationInstance.current = new Chart(chartLocationRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: bgColors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { display: true, color: '#f1f5f9' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    return () => {
      if (chartStatusInstance.current) chartStatusInstance.current.destroy();
      if (chartLocationInstance.current) chartLocationInstance.current.destroy();
    };
  }, [assets]);

  return (
    <div className="space-y-6 no-print bg-neutral-50/50 p-6 rounded-b-xl border-x border-b border-neutral-200">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-neutral-100 rounded-xl text-neutral-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-neutral-500 text-sm font-medium">Itens Filtrados</h3>
            <p className="text-3xl font-extrabold mt-1 text-neutral-900">{totalItems}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-neutral-500 text-sm font-medium">Em Estoque (Warehouse)</h3>
            <p className="text-3xl font-extrabold mt-1 text-blue-600">{warehouseItems}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-neutral-500 text-sm font-medium">Custo Total (Aprox.)</h3>
            <p className="text-3xl font-extrabold mt-1 text-emerald-600">{formatCurrency(totalCost)}</p>
          </div>
        </div>
      </div>

      {/* Chart Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200/80">
          <h3 className="text-base font-bold mb-6 text-neutral-800">Status dos Equipamentos</h3>
          <div className="h-[250px] relative">
            <canvas ref={chartStatusRef}></canvas>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200/80">
          <h3 className="text-base font-bold mb-6 text-neutral-800">Distribuição por Setor / Local</h3>
          <div className="h-[250px] relative">
            <canvas ref={chartLocationRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
