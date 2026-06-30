import { useEffect, useState } from 'react';
import { 
  Lock, Key, RefreshCw, FileSpreadsheet, Download, FileText, 
  Search, Grid, List, LayoutDashboard, Plus, Edit, 
  Trash2, ChevronDown, LogOut, Info, Clock 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import FormModal from './components/FormModal';
import HistoryModal from './components/HistoryModal';

interface Asset {
  _rowIndex: number;
  [key: string]: any;
}

interface SelectedFilters {
  type: Set<string>;
  status: Set<string>;
  location: Set<string>;
  company: Set<string>;
  trademark: Set<string>;
}

export default function App() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'dashboard'>('list');
  
  // Auth states
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [loginInput, setLoginInput] = useState('');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    type: new Set(),
    status: new Set(),
    location: new Set(),
    company: new Set(),
    trademark: new Set()
  });

  // Unique values for filter dropdowns & datalists
  const [uniqueValues, setUniqueValues] = useState({
    model: [] as string[],
    type: [] as string[],
    location: [] as string[],
    resp: [] as string[],
    company: [] as string[],
    trademark: [] as string[],
    charger: [] as string[],
    status: [] as string[]
  });

  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  
  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'new' | 'edit' | 'movement'>('new');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<Asset | null>(null);

  useEffect(() => {
    loadAssets();
    // Load spreadsheet URL
    try {
      (window as any).google.script.run
        .withSuccessHandler((url: string) => setSpreadsheetUrl(url))
        .getSpreadsheetUrl();
    } catch(e) {
      console.warn("Could not load spreadsheet URL:", e);
    }

    // Click outside to close filter dropdowns
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.filter-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const loadAssets = () => {
    setLoading(true);
    try {
      (window as any).google.script.run
        .withSuccessHandler((res: string) => {
          const assets: Asset[] = typeof res === 'string' ? JSON.parse(res) : res;
          setAllAssets(assets || []);
          calculateUniqueValues(assets || []);
          setLoading(false);
        })
        .withFailureHandler((err: Error) => {
          alert('Erro ao carregar dados: ' + err.message);
          setLoading(false);
        })
        .getAssets();
    } catch (e: any) {
      alert('Erro de comunicação: ' + e.message);
      setLoading(false);
    }
  };

  const calculateUniqueValues = (assets: Asset[]) => {
    const models = new Set<string>();
    const types = new Set<string>();
    const locations = new Set<string>();
    const resps = new Set<string>();
    const companies = new Set<string>();
    const trademarks = new Set<string>();
    const chargers = new Set<string>();
    const statuses = new Set<string>();

    assets.forEach(a => {
      if (a['EQUIPMENT MODEL']) models.add(a['EQUIPMENT MODEL']);
      if (a['EQUIPMENT TYPE']) types.add(a['EQUIPMENT TYPE']);
      if (a['EQUIPMENT LOCATION']) locations.add(a['EQUIPMENT LOCATION']);
      if (a['CURRENT ASSIGNED RESPONSIBLE']) resps.add(a['CURRENT ASSIGNED RESPONSIBLE']);
      if (a['Asset Origin']) companies.add(a['Asset Origin']);
      if (a['EQUIPMENT TRADEMARK']) trademarks.add(a['EQUIPMENT TRADEMARK']);
      if (a['CHARGER/DC SOURCE?']) chargers.add(a['CHARGER/DC SOURCE?']);
      if (a['EQUIPMENT STATUS']) statuses.add(a['EQUIPMENT STATUS']);
    });

    setUniqueValues({
      model: Array.from(models).sort(),
      type: Array.from(types).sort(),
      location: Array.from(locations).sort(),
      resp: Array.from(resps).sort(),
      company: Array.from(companies).sort(),
      trademark: Array.from(trademarks).sort(),
      charger: Array.from(chargers).sort(),
      status: Array.from(statuses).sort()
    });
  };

  // Perform client-side search & filtering
  useEffect(() => {
    let result = [...allAssets];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(asset => {
        return Object.values(asset).some(val => 
          String(val).toLowerCase().includes(q)
        );
      });
    }

    // Checklist filters
    if (selectedFilters.type.size > 0) {
      result = result.filter(a => selectedFilters.type.has(a['EQUIPMENT TYPE'] || ''));
    }
    if (selectedFilters.status.size > 0) {
      result = result.filter(a => selectedFilters.status.has(a['EQUIPMENT STATUS'] || ''));
    }
    if (selectedFilters.location.size > 0) {
      result = result.filter(a => selectedFilters.location.has(a['EQUIPMENT LOCATION'] || ''));
    }
    if (selectedFilters.company.size > 0) {
      result = result.filter(a => selectedFilters.company.has(a['Asset Origin'] || ''));
    }
    if (selectedFilters.trademark.size > 0) {
      result = result.filter(a => selectedFilters.trademark.has(a['EQUIPMENT TRADEMARK'] || ''));
    }

    // Sort alphabetically by model
    result.sort((a, b) => (a['EQUIPMENT MODEL'] || '').localeCompare(b['EQUIPMENT MODEL'] || ''));
    setFilteredAssets(result);
  }, [allAssets, searchQuery, selectedFilters]);

  // Auth functions
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput === '110220') {
      setIsAdmin(true);
      setAdminPassword(loginInput);
      setShowLoginModal(false);
    } else {
      alert('Senha incorreta.');
    }
  };

  const loginAsViewer = () => {
    setIsAdmin(false);
    setAdminPassword('');
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setAdminPassword('');
    setShowLoginModal(true);
    setLoginInput('');
  };

  // Toggle filter sets
  const toggleFilter = (category: keyof SelectedFilters, val: string) => {
    const updated = new Set(selectedFilters[category]);
    if (updated.has(val)) {
      updated.delete(val);
    } else {
      updated.add(val);
    }
    setSelectedFilters(prev => ({
      ...prev,
      [category]: updated
    }));
  };

  // UI styling helper for status pills
  const getStatusClass = (status: string) => {
    const s = (status || '').toUpperCase().trim();
    if (s.includes('ASSIGNED')) {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    } else if (s.includes('WAREHOUSE')) {
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    } else if (s.includes('UNDER REPAIR')) {
      return 'bg-purple-100 text-purple-800 border border-purple-200';
    } else if (s.includes('AWAITING REPAIR')) {
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    } else if (s.includes('SCRAP/TRASH')) {
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    }
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleOpenFormModal = (mode: 'new' | 'edit' | 'movement', asset: Asset | null = null) => {
    setFormModalMode(mode);
    setSelectedAsset(asset);
    setFormModalOpen(true);
  };

  const handleOpenHistoryModal = (asset: Asset) => {
    setSelectedHistoryAsset(asset);
    setHistoryModalOpen(true);
  };

  const handleDeleteAsset = (asset: Asset) => {
    const serial = asset['SERIAL NUMBER'] || asset['ID'] || 'Sem Serial';
    const type = asset['EQUIPMENT TYPE'] || 'N/A';
    
    if (!confirm(`Tem certeza que deseja EXCLUIR permanentemente o item ${serial} do banco de dados? Essa ação não pode ser desfeita.`)) return;
    
    setLoading(true);
    try {
      (window as any).google.script.run
        .withSuccessHandler(() => {
          loadAssets();
        })
        .withFailureHandler((err: Error) => {
          alert("Erro ao excluir: " + err.message);
          setLoading(false);
        })
        .deleteAsset(asset._rowIndex, serial, type, adminPassword);
    } catch(e: any) {
      alert("Erro de comunicação: " + e.message);
      setLoading(false);
    }
  };

  // ZIP Photo Download
  const [downloadingZip, setDownloadingZip] = useState(false);
  const handleZipDownload = () => {
    setDownloadingZip(true);
    try {
      (window as any).google.script.run
        .withSuccessHandler((res: any) => {
          setDownloadingZip(false);
          if (res.error) {
            alert(res.error);
          } else if (res.url) {
            window.open(res.url, '_blank');
          }
        })
        .withFailureHandler((err: Error) => {
          setDownloadingZip(false);
          alert("Erro: " + err.message);
        })
        .downloadAllPhotosAsZip();
    } catch (e: any) {
      setDownloadingZip(false);
      alert("Erro de comunicação: " + e.message);
    }
  };


  // CSV Export
  const handleExportCSV = () => {
    if (filteredAssets.length === 0) return;
    const headers = Object.keys(allAssets[0]).filter(k => k !== '_rowIndex' && k !== 'base64Photos' && k !== 'ID');
    
    let csv = headers.map(h => `"${h}"`).join(",") + "\n";
    filteredAssets.forEach(a => {
      csv += headers.map(h => `"${(a[h] || '').toString().replace(/"/g, '""')}"`).join(",") + "\n";
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `growatt_assets_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export
  const handleExportPDF = () => {
    if (filteredAssets.length === 0) {
      alert("Nenhum item filtrado para exportar.");
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let itemsHtml = '';
    filteredAssets.forEach(asset => {
      const costStr = asset['COST'] ? Number(asset['COST']).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A';
      const photoUrl = asset['PHOTO LINKS'] || asset['PHOTO URL'];
      let photosHtml = '';
      
      if (photoUrl) {
        const urls = photoUrl.split(',').map((u: string) => u.trim()).filter((u: string) => u.startsWith('http'));
        urls.forEach((u: string) => {
          let printImgUrl = u;
          const matchId = u.match(/id=([a-zA-Z0-9_-]+)/) || u.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (matchId) {
            printImgUrl = 'https://drive.google.com/thumbnail?id=' + matchId[1] + '&sz=w1000';
          }
          photosHtml += `<img src="${printImgUrl}" onerror="this.style.display='none'">`;
        });
      }
      
      if (!photosHtml) {
        photosHtml = `<div class="no-photo">Sem foto registrada para este equipamento</div>`;
      }
      
      const status = asset['EQUIPMENT STATUS'] || 'N/A';
      const statusClass = 'status ' + status.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');

      itemsHtml += `
        <div class="item">
          <div class="item-header">
            <div>
              <h2 class="model">${asset['EQUIPMENT MODEL'] || 'Item sem nome'}</h2>
              <div style="margin-top: 8px;"><span class="serial">SN: ${asset['SERIAL NUMBER'] || asset['ID'] || 'Sem Serial'}</span></div>
            </div>
            <div style="text-align: right;">
              <span class="${statusClass}">${status}</span>
              <div style="margin-top: 10px; font-weight: bold; color: #059669; font-size: 16px;">${costStr}</div>
            </div>
          </div>
          <div class="grid">
            <div class="field"><span class="label">Tipo</span><span class="val">${asset['EQUIPMENT TYPE'] || '-'}</span></div>
            <div class="field"><span class="label">Marca</span><span class="val">${asset['EQUIPMENT TRADEMARK'] || '-'}</span></div>
            <div class="field"><span class="label">Responsável</span><span class="val">${asset['CURRENT ASSIGNED RESPONSIBLE'] || '-'}</span></div>
            <div class="field"><span class="label">Local / Setor</span><span class="val">${asset['EQUIPMENT LOCATION'] || '-'}</span></div>
            <div class="field"><span class="label">Origem</span><span class="val">${asset['Asset Origin'] || '-'}</span></div>
            <div class="field"><span class="label">Data de Fatura</span><span class="val">${asset['PURCHASE DATE (IN-VOICE)'] || '-'}</span></div>
          </div>
          <div class="photos">
            <div class="label" style="text-align: left; margin-bottom: 12px; font-size: 12px;">Fotos do Equipamento</div>
            ${photosHtml}
          </div>
        </div>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Equipamentos</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; margin: 0; background: #fff; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .title { font-size: 28px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; font-weight: 500; }
          
          .item { page-break-inside: avoid; border: 1px solid #ddd; border-radius: 12px; padding: 24px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .item-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 16px; }
          .model { font-size: 20px; font-weight: 700; margin: 0; }
          .serial { font-family: monospace; background: #f4f4f5; padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #555; border: 1px solid #e4e4e7; }
          
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
          .field { font-size: 14px; }
          .label { font-size: 10px; text-transform: uppercase; color: #71717a; font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
          .val { font-weight: 600; color: #18181b; }
          
          .status { display: inline-block; padding: 4px 10px; background: #f4f4f5; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid #e4e4e7; text-transform: uppercase; }
          .status.assigned { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
          .status.warehouse { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
          .status.under-repair { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
          .status.awaiting-repair { background: #fef3c7; color: #92400e; border-color: #fde68a; }
          .status.scrap-trash { background: #ffe4e6; color: #991b1b; border-color: #fecdd3; }
          
          .photos { margin-top: 20px; border-top: 1px dashed #e4e4e7; padding-top: 20px; text-align: center; }
          .photos img { max-width: 100%; max-height: 500px; border-radius: 8px; border: 1px solid #e4e4e7; margin-bottom: 10px; padding: 4px; }
          .no-photo { padding: 20px; background: #f9fafb; border-radius: 8px; color: #a1a1aa; font-size: 14px; font-style: italic; text-align: center; border: 1px dashed #e4e4e7; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Relatório de Equipamentos</div>
          <div class="subtitle">Data: ${new Date().toLocaleDateString('pt-BR')} | Total de Itens: ${filteredAssets.length}</div>
        </div>
        ${itemsHtml}
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  const getDriveImageThumbnail = (photoUrl: string) => {
    if (!photoUrl) return '';
    const urls = photoUrl.split(',').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (urls.length === 0) return '';
    
    let finalUrl = urls[0];
    const matchId = finalUrl.match(/id=([a-zA-Z0-9_-]+)/) || finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchId) {
      finalUrl = 'https://drive.google.com/thumbnail?id=' + matchId[1] + '&sz=w200';
    }
    return finalUrl;
  };

  const getDriveAllImageUrls = (photoUrl: string): string[] => {
    if (!photoUrl) return [];
    return photoUrl.split(',').map(u => u.trim()).filter(u => u.startsWith('http'));
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div className="bg-neutral-50 min-h-screen font-sans antialiased text-neutral-900 pb-12">
      
      {/* Login Modal */}
      {showLoginModal && (
        <div className="no-print fixed inset-0 bg-neutral-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm overflow-hidden shadow-2xl rounded-2xl p-6 text-center animate-scale-up">
            <h2 className="text-xl font-bold text-neutral-900 mb-2 flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" />
              Acesso ao Inventário
            </h2>
            <p className="text-sm text-neutral-500 mb-6">Insira a senha de administrador para alterar registros, ou acesse em modo visualização.</p>
            
            <form onSubmit={handleLogin}>
              <input 
                type="password" 
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                autoFocus
                className="w-full p-3 border border-neutral-300 rounded-xl focus:border-black focus:outline-none text-center mb-4 tracking-widest text-lg font-mono" 
                placeholder="••••••"
              />
              
              <div className="space-y-3">
                <button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3 rounded-xl text-sm font-bold shadow-sm transition">
                  Entrar como Administrador
                </button>
                <button type="button" onClick={loginAsViewer} className="w-full bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 py-3 rounded-xl text-sm font-medium shadow-sm transition">
                  Apenas Visualizar (Read-Only)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Top Navbar */}
      <div className="no-print border-b border-neutral-200 bg-white px-6 py-3.5 flex items-center justify-between text-sm shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="text-neutral-900 font-extrabold text-base tracking-tight flex items-center gap-2">
            <span className="bg-black text-white w-6 h-6 rounded-md flex items-center justify-center font-mono font-black text-xs">G</span>
            Growatt Assets Manager
          </div>
          {isAdmin && (
            <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Admin Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {spreadsheetUrl && (
            <a 
              href={spreadsheetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1.5 text-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Acessar Planilha
            </a>
          )}
          {isAdmin ? (
            <button 
              onClick={handleLogout}
              className="text-neutral-500 hover:text-neutral-900 text-xs font-semibold flex items-center gap-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="text-neutral-500 hover:text-neutral-900 text-xs font-semibold flex items-center gap-1 transition"
            >
              <Key className="w-3.5 h-3.5" /> Login Admin
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen">
        
        {/* Header Actions */}
        <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 flex items-center gap-2 tracking-tight">
              Itens de Inventário
            </h1>
            <p className="text-neutral-500 text-xs mt-1">Gestão, rastreabilidade e visualização de ativos corporativos da Growatt.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {isAdmin && (
              <>
                <button 
                  onClick={() => handleOpenFormModal('new')} 
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Novo Item
                </button>
              </>
            )}

            <button 
              onClick={handleExportCSV} 
              className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              Excel
            </button>

            <button 
              onClick={handleExportPDF} 
              className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-4 h-4 text-neutral-500" />
              PDF
            </button>

            <button 
              onClick={handleZipDownload} 
              disabled={downloadingZip}
              className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              title="Baixar todas as fotos (ZIP)"
            >
              {downloadingZip ? (
                <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500">
                  <path d="M21 8v13H3V8" />
                  <path d="M10 12h4" />
                  <path d="M12 12v4" />
                  <path d="M3 8l9-5 9 5" />
                </svg>
              )}
              ZIP Fotos
            </button>

            <button 
              onClick={loadAssets} 
              className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 p-2 rounded-lg shadow-sm transition" 
              title="Recarregar Dados"
            >
              <RefreshCw className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* MAIN PANEL */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          
          {/* Filters Toolbar */}
          <div className="no-print p-4 border-b border-neutral-100 flex flex-wrap gap-3 items-center text-sm relative z-20">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-2.5 text-neutral-400 w-4 h-4" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, modelo, responsável..." 
                className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-black transition" 
              />
            </div>
            
            {/* Filter Dropdowns */}
            {(['type', 'status', 'location', 'company', 'trademark'] as const).map(category => {
              const labelMapping = {
                type: 'Tipo',
                status: 'Status',
                location: 'Setor (Local)',
                company: 'Empresa',
                trademark: 'Marca'
              };
              
              const isSelected = selectedFilters[category].size > 0;
              const values = uniqueValues[category === 'company' ? 'company' : category];

              return (
                <div key={category} className="relative filter-dropdown">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === category ? null : category);
                    }}
                    className={`bg-white hover:bg-neutral-50 border px-3 py-2 rounded-lg flex items-center gap-2 transition ${
                      isSelected ? 'border-neutral-900 bg-neutral-50 text-neutral-900 font-semibold' : 'border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <span>{labelMapping[category]}</span>
                    {isSelected && (
                      <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {selectedFilters[category].size}
                      </span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </button>

                  {activeDropdown === category && (
                    <div className="absolute left-0 mt-1 bg-white border border-neutral-200 shadow-xl rounded-xl w-60 max-h-64 overflow-y-auto p-2 z-50 animate-fade-in">
                      {values.length === 0 ? (
                        <p className="text-xs text-neutral-400 px-3 py-2">Sem dados</p>
                      ) : (
                        values.map(val => {
                          const v = val || '(Vazio)';
                          return (
                            <label key={val} className="flex items-center gap-2.5 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer text-sm transition">
                              <input 
                                type="checkbox" 
                                checked={selectedFilters[category].has(val)}
                                onChange={() => toggleFilter(category, val)}
                                className="rounded border-neutral-300 text-neutral-900 focus:ring-black h-4 w-4" 
                              />
                              <span className="truncate text-neutral-700 font-medium">{v}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* View Mode Toggle Buttons */}
            <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner ml-auto">
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('dashboard')} 
                className={`p-1.5 rounded-md transition ${viewMode === 'dashboard' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-neutral-900 animate-spin mb-4" />
              <p className="text-neutral-500 font-medium text-sm">Sincronizando banco de dados com Google Sheets...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredAssets.length === 0 && (
            <div className="text-center py-20 text-neutral-500">
              <Info className="mx-auto h-12 w-12 mb-3 text-neutral-300" />
              <p className="font-semibold text-neutral-600">Nenhum equipamento encontrado.</p>
              <p className="text-xs text-neutral-400 mt-1">Verifique os filtros selecionados ou digite um novo termo de busca.</p>
            </div>
          )}

          {/* TABLE HEADER (List mode only) */}
          {!loading && viewMode === 'list' && filteredAssets.length > 0 && (
            <div className="hidden md:flex px-6 py-3 border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/50">
              <div className="w-[70%]">Ativo / Equipamento</div>
              <div className="w-[15%] text-right">Custo / Valor</div>
              <div className="w-[15%] text-right">Ações</div>
            </div>
          )}

          {/* ASSET CONTAINER */}
          {!loading && filteredAssets.length > 0 && (
            <>
              {viewMode === 'list' && (
                <div className="flex flex-col divide-y divide-neutral-100">
                  {filteredAssets.map(asset => {
                    const model = asset['EQUIPMENT MODEL'] || 'Item sem nome';
                    const type = asset['EQUIPMENT TYPE'] || 'N/A';
                    const serial = asset['SERIAL NUMBER'] || asset['ID'] || 'Sem Serial';
                    const status = asset['EQUIPMENT STATUS'] || 'N/A';
                    const responsible = asset['CURRENT ASSIGNED RESPONSIBLE'] || 'N/A';
                    const location = asset['EQUIPMENT LOCATION'] || 'N/A';
                    const costStr = formatCurrency(parseCost(asset['COST']));
                    const origin = asset['Asset Origin'] || 'ANYGRID';
                    const trademark = asset['EQUIPMENT TRADEMARK'] || '-';
                    const thumbUrl = getDriveImageThumbnail(asset['PHOTO LINKS'] || asset['PHOTO URL']);

                    return (
                      <div key={asset._rowIndex} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 text-sm hover:bg-neutral-50/50 transition">
                        {/* Equipment column */}
                        <div className="w-full md:w-[70%] flex gap-4 items-center">
                          {thumbUrl ? (
                            <a 
                              href={getDriveAllImageUrls(asset['PHOTO LINKS'] || asset['PHOTO URL'])[0]} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-200/80 shadow-sm block hover:opacity-80 transition flex-shrink-0 bg-white"
                            >
                              <img src={thumbUrl} alt={model} className="w-full h-full object-cover" onError={handleImgError} />
                            </a>
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-300 flex-shrink-0">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx={2} ry={2} />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          )}
                          
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-base text-neutral-900 truncate max-w-sm">{model}</span>
                              <span className="bg-white border border-neutral-200 text-neutral-500 px-2 py-0.5 rounded-md text-xs font-mono shadow-sm">{serial}</span>
                              <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md text-xs font-medium">{type}</span>
                            </div>
                            
                            <div className="flex items-center gap-2.5 text-xs text-neutral-500 flex-wrap">
                              <span className="font-medium text-neutral-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                                {responsible}
                              </span>
                              <span className="text-neutral-300 font-thin">|</span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                                {location}
                              </span>
                              <span className="text-neutral-300 font-thin">|</span>
                              
                              {/* Custom Colored Status Pill */}
                              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wide ${getStatusClass(status)}`}>
                                {status}
                              </span>
                            </div>

                            <div className="flex gap-2">
                              <span className="bg-white border border-neutral-200 px-2 py-0.5 rounded-md text-[10px] text-neutral-400 uppercase tracking-wide">Brand: <span className="font-bold text-neutral-700">{trademark}</span></span>
                              <span className="bg-white border border-neutral-200 px-2 py-0.5 rounded-md text-[10px] text-neutral-400 uppercase tracking-wide">Origem: <span className="font-bold text-neutral-700">{origin}</span></span>
                            </div>
                          </div>
                        </div>

                        {/* Cost */}
                        <div className="w-full md:w-[15%] text-left md:text-right font-extrabold text-emerald-600 bg-emerald-50/40 p-2 rounded-lg self-center border border-emerald-100/30">
                          {costStr}
                        </div>

                        {/* Actions */}
                        <div className="w-full md:w-[15%] flex justify-start md:justify-end gap-1.5 text-neutral-400 no-print self-center">
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => handleOpenFormModal('movement', asset)} 
                                className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                                title="Nova Movimentação"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500">
                                  <path d="M17 3v18" />
                                  <path d="m21 17-4 4-4-4" />
                                  <path d="M7 21V3" />
                                  <path d="m3 7 4-4 4 4" />
                                </svg>
                                Movimentar
                              </button>
                              <button 
                                onClick={() => handleOpenFormModal('edit', asset)} 
                                className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition" 
                                title="Editar Cadastro"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleOpenHistoryModal(asset)} 
                            className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition" 
                            title="Histórico de Rastreabilidade"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteAsset(asset)} 
                              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                              title="Excluir Permanente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                  {filteredAssets.map(asset => {
                    const model = asset['EQUIPMENT MODEL'] || 'Item sem nome';
                    const type = asset['EQUIPMENT TYPE'] || 'N/A';
                    const serial = asset['SERIAL NUMBER'] || asset['ID'] || 'Sem Serial';
                    const status = asset['EQUIPMENT STATUS'] || 'N/A';
                    const responsible = asset['CURRENT ASSIGNED RESPONSIBLE'] || 'N/A';
                    const location = asset['EQUIPMENT LOCATION'] || 'N/A';
                    const costStr = formatCurrency(parseCost(asset['COST']));
                    const origin = asset['Asset Origin'] || 'ANYGRID';
                    const trademark = asset['EQUIPMENT TRADEMARK'] || '-';
                    const thumbUrl = getDriveImageThumbnail(asset['PHOTO LINKS'] || asset['PHOTO URL']);

                    return (
                      <div key={asset._rowIndex} className="bg-white border border-neutral-200/80 rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          {thumbUrl ? (
                            <a 
                              href={getDriveAllImageUrls(asset['PHOTO LINKS'] || asset['PHOTO URL'])[0]} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 shadow-sm block hover:opacity-80 transition bg-white"
                            >
                              <img src={thumbUrl} alt={model} className="w-full h-full object-cover" onError={handleImgError} />
                            </a>
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-300">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx={2} ry={2} />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          )}

                          <div className="flex gap-1.5 print:hidden">
                            {isAdmin && (
                              <button 
                                onClick={() => handleOpenFormModal('edit', asset)} 
                                className="text-neutral-400 hover:text-black p-1.5 hover:bg-neutral-50 rounded-lg border border-neutral-100 transition" 
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenHistoryModal(asset)} 
                              className="text-neutral-400 hover:text-black p-1.5 hover:bg-neutral-50 rounded-lg border border-neutral-100 transition" 
                              title="Histórico"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button 
                                onClick={() => handleDeleteAsset(asset)} 
                                className="text-neutral-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg border border-neutral-100 transition" 
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-base leading-tight text-neutral-900 truncate">{model}</h3>
                          <div className="text-[10px] text-neutral-400 font-mono mt-1 bg-neutral-50 inline-block px-1.5 py-0.5 rounded border border-neutral-200/50">{serial}</div>
                        </div>

                        <div className="text-xs space-y-2 bg-neutral-50/50 p-3 rounded-lg border border-neutral-200/50">
                          <div className="flex items-center justify-between text-neutral-600">
                            <span className="font-semibold text-neutral-800">{type}</span> 
                            <span className="text-[10px] uppercase font-bold text-neutral-400">{trademark}</span>
                          </div>
                          <div className="text-neutral-600 flex items-center gap-1.5">
                            <span className="font-bold text-neutral-700">Responsável:</span> 
                            <span className="truncate text-neutral-800">{responsible}</span>
                          </div>
                          <div className="flex items-center justify-between text-neutral-600">
                            <span><span className="font-bold text-neutral-700">Setor:</span> {location}</span> 
                            <span className="text-[9px] font-bold text-neutral-400 border border-neutral-200 px-1.5 py-0.5 rounded bg-white">{origin}</span>
                          </div>
                        </div>

                        <div className="mt-auto pt-3 flex justify-between items-center border-t border-neutral-100">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wide ${getStatusClass(status)}`}>
                            {status}
                          </span>
                          <span className="font-extrabold text-emerald-600 bg-emerald-50/60 border border-emerald-100 px-2.5 py-0.5 rounded text-sm">
                            {costStr}
                          </span>
                        </div>

                        {isAdmin && (
                          <button 
                            onClick={() => handleOpenFormModal('movement', asset)} 
                            className="w-full mt-1 bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3v18" />
                              <path d="m21 17-4 4-4-4" />
                              <path d="M7 21V3" />
                              <path d="m3 7 4-4 4 4" />
                            </svg> Movimentar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === 'dashboard' && (
                <Dashboard assets={filteredAssets} />
              )}
            </>
          )}

        </div>

      </div>

      {/* React Form Modal */}
      <FormModal 
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        mode={formModalMode}
        asset={selectedAsset}
        adminPassword={adminPassword}
        uniqueValues={uniqueValues}
        onSuccess={() => {
          setFormModalOpen(false);
          loadAssets();
        }}
      />

      {/* React History Modal */}
      {selectedHistoryAsset && (
        <HistoryModal 
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setSelectedHistoryAsset(null);
          }}
          serialNumber={selectedHistoryAsset['SERIAL NUMBER'] || ''}
          modelName={selectedHistoryAsset['EQUIPMENT MODEL'] || ''}
        />
      )}

    </div>
  );
}
