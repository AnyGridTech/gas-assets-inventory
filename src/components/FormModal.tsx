import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, DollarSign, Calendar, FileText } from 'lucide-react';

interface Asset {
  _rowIndex: number;
  [key: string]: any;
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'new' | 'edit' | 'movement';
  asset: Asset | null;
  adminPassword: string;
  uniqueValues: {
    model: string[];
    type: string[];
    location: string[];
    resp: string[];
    company: string[];
    trademark: string[];
    charger: string[];
  };
  onSuccess: () => void;
}

export default function FormModal({
  isOpen,
  onClose,
  mode,
  asset,
  adminPassword,
  uniqueValues,
  onSuccess,
}: FormModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [origin, setOrigin] = useState('');
  const [trademark, setTrademark] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [serial, setSerial] = useState('');
  const [folderName, setFolderName] = useState('');
  const [charger, setCharger] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceNum, setInvoiceNum] = useState('');
  const [cost, setCost] = useState('');
  const [invoiceKey, setInvoiceKey] = useState('');
  
  const [status, setStatus] = useState('WAREHOUSE');
  const [location, setLocation] = useState('');
  const [responsible, setResponsible] = useState('');
  const [remarks, setRemarks] = useState('');

  // Photos state
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<string[]>([]);
  const [newPhotosFiles, setNewPhotosFiles] = useState<File[]>([]);
  const [newPhotosPreviews, setNewPhotosPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setNewPhotosFiles([]);
    setNewPhotosPreviews([]);
    setDeletedPhotos([]);
    setExistingPhotos([]);

    if (mode === 'new') {
      setOrigin('');
      setTrademark('');
      setModel('');
      setType('');
      setSerial('');
      setFolderName('');
      setCharger('');
      setPurchaseDate('');
      setInvoiceNum('');
      setCost('');
      setInvoiceKey('');
      setStatus('WAREHOUSE');
      setLocation('');
      setResponsible('');
      setRemarks('Cadastro Inicial');
    } else if (asset) {
      setOrigin(asset['Asset Origin'] || '');
      setTrademark(asset['EQUIPMENT TRADEMARK'] || '');
      setModel(asset['EQUIPMENT MODEL'] || '');
      setType(asset['EQUIPMENT TYPE'] || '');
      setSerial(asset['SERIAL NUMBER'] || '');
      setFolderName(asset['FOLDER NAME'] || asset['SERIAL NUMBER'] || '');
      setCharger(asset['CHARGER/DC SOURCE?'] || '');
      setPurchaseDate(asset['PURCHASE DATE (IN-VOICE)'] || '');
      setInvoiceNum(asset['IN-VOICE NUMBER'] || '');
      setCost(asset['COST'] || '');
      setInvoiceKey(asset['IN-VOICE KEY'] || '');
      setStatus(asset['EQUIPMENT STATUS'] || 'WAREHOUSE');
      setLocation(asset['EQUIPMENT LOCATION'] || '');
      setResponsible(asset['CURRENT ASSIGNED RESPONSIBLE'] || '');
      setRemarks(mode === 'edit' ? 'Edição Completa de Cadastro' : '');

      const photoColData = asset['PHOTO LINKS'] || asset['PHOTO URL'] || '';
      if (photoColData) {
        const urls = photoColData.split(',').map((u: string) => u.trim()).filter((u: string) => u.startsWith('http'));
        setExistingPhotos(urls);
      }
    }
  }, [isOpen, mode, asset]);

  if (!isOpen) return null;

  // File to Base64 helper
  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setNewPhotosFiles(prev => [...prev, ...filesArr]);
      
      filesArr.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewPhotosPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotosFiles(prev => prev.filter((_, i) => i !== index));
    setNewPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (url: string) => {
    setDeletedPhotos(prev => [...prev, url]);
    setExistingPhotos(prev => prev.filter(u => u !== url));
  };

  const getDriveThumbnail = (url: string) => {
    const matchId = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchId) {
      return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w200`;
    }
    return url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Convert new photos to Base64
      const base64Photos: string[] = [];
      for (const file of newPhotosFiles) {
        const b64 = await getBase64(file);
        base64Photos.push(b64);
      }

      const remainingPhotoUrls = existingPhotos;
      const deletedPhotoUrls = deletedPhotos;

      if (mode === 'movement' && asset) {
        // Send movement update
        const updates = {
          status,
          location,
          responsible,
          base64Photos,
          remainingPhotoUrls, // for Code.ts
          deletedPhotoUrls,   // for Code.ts
          remPhotos: remainingPhotoUrls, // alias back-compatibility
          delPhotos: deletedPhotoUrls    // alias back-compatibility
        };

        (window as any).google.script.run
          .withSuccessHandler(() => {
            setLoading(false);
            onSuccess();
          })
          .withFailureHandler((err: Error) => {
            alert(err.message);
            setLoading(false);
          })
          .updateAsset(asset._rowIndex, updates, remarks, adminPassword);

      } else {
        // Send edit or create
        const formData = {
          'EQUIPMENT TRADEMARK': trademark,
          'EQUIPMENT MODEL': model,
          'SERIAL NUMBER': serial,
          'FOLDER NAME': folderName || serial || 'SEM_SERIAL',
          'EQUIPMENT TYPE': type,
          'EQUIPMENT STATUS': status,
          'CHARGER/DC SOURCE?': charger,
          'EQUIPMENT LOCATION': location,
          'PURCHASE DATE (IN-VOICE)': purchaseDate,
          'COST': cost,
          'IN-VOICE NUMBER': invoiceNum,
          'IN-VOICE KEY': invoiceKey,
          'Asset Origin': origin,
          'CURRENT ASSIGNED RESPONSIBLE': responsible,
          'REMARKS': remarks,
          base64Photos,
          remainingPhotoUrls, // for Code.ts
          deletedPhotoUrls,   // for Code.ts
          remPhotos: remainingPhotoUrls, // alias
          delPhotos: deletedPhotoUrls    // alias
        };

        if (mode === 'edit' && asset) {
          (window as any).google.script.run
            .withSuccessHandler(() => {
              setLoading(false);
              onSuccess();
            })
            .withFailureHandler((err: Error) => {
              alert(err.message);
              setLoading(false);
            })
            .editAsset(asset._rowIndex, formData, adminPassword);
        } else {
          (window as any).google.script.run
            .withSuccessHandler(() => {
              setLoading(false);
              onSuccess();
            })
            .withFailureHandler((err: Error) => {
              alert(err.message);
              setLoading(false);
            })
            .createAsset(formData, adminPassword);
        }
      }
    } catch (err: any) {
      alert("Erro ao ler arquivos de imagem: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Autocomplete Datalists */}
      <datalist id="formDlModel">{uniqueValues.model.map(v => <option key={v} value={v} />)}</datalist>
      <datalist id="formDlType">{uniqueValues.type.map(v => <option key={v} value={v} />)}</datalist>
      <datalist id="formDlCompany">{uniqueValues.company.map(v => <option key={v} value={v} />)}</datalist>
      <datalist id="formDlTrademark">{uniqueValues.trademark.map(v => <option key={v} value={v} />)}</datalist>
      <datalist id="formDlCharger">{uniqueValues.charger.map(v => <option key={v} value={v} />)}</datalist>
      <datalist id="formDlResp">{uniqueValues.resp.map(v => <option key={v} value={v} />)}</datalist>

      <div className="bg-white w-full max-w-3xl overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <h3 className="text-lg font-bold text-neutral-900">
            {mode === 'new' && 'Cadastrar Novo Equipamento'}
            {mode === 'edit' && `Editar Equipamento: ${asset?.['EQUIPMENT MODEL']}`}
            {mode === 'movement' && `Movimentar Equipamento: ${asset?.['EQUIPMENT MODEL']}`}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-800 bg-white rounded-full p-1.5 shadow-sm border border-neutral-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {mode !== 'movement' && (
            <>
              {/* Identificação */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-wider border-b pb-1 mb-2">Identificação</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Empresa (Asset Origin)</label>
                    <input
                      list="formDlCompany"
                      value={origin}
                      onChange={e => setOrigin(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                      placeholder="Ex: ANYGRID"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Marca (Trademark)</label>
                    <input
                      list="formDlTrademark"
                      value={trademark}
                      onChange={e => setTrademark(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                      placeholder="Ex: DELL"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Modelo</label>
                    <input
                      list="formDlModel"
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      required
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                      placeholder="Ex: Latitude 5420"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block font-medium text-neutral-700 mb-1">Tipo de Equipamento</label>
                    <input
                      list="formDlType"
                      value={type}
                      onChange={e => setType(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                      placeholder="Ex: LAPTOP"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Número de Série</label>
                    <input
                      type="text"
                      value={serial}
                      onChange={e => setSerial(e.target.value)}
                      required
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none font-mono uppercase"
                      placeholder="Serial Number"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Charger/Fonte DC?</label>
                    <input
                      list="formDlCharger"
                      value={charger}
                      onChange={e => setCharger(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                      placeholder="S/N"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Nome da Pasta (Google Drive)</label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={e => setFolderName(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                      placeholder="Opcional (Usa serial por padrão)"
                    />
                  </div>
                </div>
              </div>

              {/* Financeiro */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-wider border-b pb-1 mb-2 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Financeiro
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" /> Data Compra (NF)
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" /> Número da Fatura
                    </label>
                    <input
                      type="text"
                      value={invoiceNum}
                      onChange={e => setInvoiceNum(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Custo (R$)</label>
                    <input
                      type="text"
                      value={cost}
                      onChange={e => setCost(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Chave da Nota Fiscal (In-Voice Key)</label>
                  <input
                    type="text"
                    value={invoiceKey}
                    onChange={e => setInvoiceKey(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none font-mono text-xs"
                    placeholder="Chave de acesso com 44 dígitos"
                  />
                </div>
              </div>
            </>
          )}

          {/* Status & Localização */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-wider border-b pb-1 mb-2">Status & Localização</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg focus:border-black focus:outline-none bg-white"
                >
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="WAREHOUSE">WAREHOUSE</option>
                  <option value="UNDER REPAIR">UNDER REPAIR</option>
                  <option value="AWAITING REPAIR">AWAITING REPAIR</option>
                  <option value="SCRAP/TRASH">SCRAP/TRASH</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Local / Setor</label>
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg focus:border-black focus:outline-none bg-white"
                >
                  <option value="">Selecione...</option>
                  {uniqueValues.location.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Responsável Atual</label>
                <input
                  list="formDlResp"
                  value={responsible}
                  onChange={e => setResponsible(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-neutral-700 mb-1">Observações / Justificativa</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                className="w-full p-2 border border-neutral-300 rounded-lg focus:border-black focus:outline-none"
                placeholder="Insira detalhes sobre esta movimentação ou observações de cadastro..."
              />
            </div>
          </div>

          {/* Fotos */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <label className="block font-bold text-neutral-800 mb-2">Fotos</label>
            
            {/* Existing photos */}
            {existingPhotos.length > 0 && (
              <div className="mb-4">
                <span className="text-xs text-neutral-500 block mb-2">Fotos Atuais (Salvas no Drive):</span>
                <div className="flex flex-wrap gap-2.5">
                  {existingPhotos.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 border border-neutral-200 rounded-lg overflow-hidden group shadow-sm bg-white">
                      <img
                        src={getDriveThumbnail(url)}
                        alt="Drive thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(url)}
                        className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md transition"
                        title="Excluir do Drive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New photos previews */}
            {newPhotosPreviews.length > 0 && (
              <div className="mb-4">
                <span className="text-xs text-neutral-500 block mb-2">Novas Fotos (A carregar):</span>
                <div className="flex flex-wrap gap-2.5">
                  {newPhotosPreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-16 h-16 border border-neutral-200 rounded-lg overflow-hidden shadow-sm bg-white">
                      <img
                        src={preview}
                        alt="Local preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewPhoto(idx)}
                        className="absolute -top-1 -right-1 bg-neutral-800 hover:bg-neutral-900 text-white rounded-full p-0.5 shadow-md transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new photo input */}
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer transition shadow-sm font-medium">
                <Upload className="w-4 h-4 text-neutral-500" />
                <span>Anexar Fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-neutral-500">Selecione uma ou mais imagens para upload.</span>
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-neutral-300 rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 transition shadow-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition shadow-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>Salvar Registro</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
