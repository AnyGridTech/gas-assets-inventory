// Mock implementation of google.script.run for local development

const mockAssets = [
  {
    _rowIndex: 2,
    "ID": "GW-001",
    "EQUIPMENT MODEL": "Dell Latitude 5420",
    "EQUIPMENT TYPE": "LAPTOP",
    "SERIAL NUMBER": "DELL5420SN123",
    "EQUIPMENT STATUS": "ASSIGNED",
    "CURRENT ASSIGNED RESPONSIBLE": "João Silva",
    "EQUIPMENT LOCATION": "Development",
    "Asset Origin": "ANYGRID",
    "EQUIPMENT TRADEMARK": "DELL",
    "CHARGER/DC SOURCE?": "S/N",
    "PURCHASE DATE (IN-VOICE)": "2024-01-15",
    "COST": "5500.00",
    "PHOTO LINKS": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500"
  },
  {
    _rowIndex: 3,
    "ID": "GW-002",
    "EQUIPMENT MODEL": "MacBook Pro M2 16\"",
    "EQUIPMENT TYPE": "LAPTOP",
    "SERIAL NUMBER": "C02F23G8Q05D",
    "EQUIPMENT STATUS": "WAREHOUSE",
    "CURRENT ASSIGNED RESPONSIBLE": "-",
    "EQUIPMENT LOCATION": "Warehouse",
    "Asset Origin": "GROWATT",
    "EQUIPMENT TRADEMARK": "APPLE",
    "CHARGER/DC SOURCE?": "S/N",
    "PURCHASE DATE (IN-VOICE)": "2024-03-20",
    "COST": "18000.00",
    "PHOTO LINKS": ""
  },
  {
    _rowIndex: 4,
    "ID": "GW-003",
    "EQUIPMENT MODEL": "LG UltraWide 29\"",
    "EQUIPMENT TYPE": "MONITOR",
    "SERIAL NUMBER": "LG29UW99823",
    "EQUIPMENT STATUS": "UNDER REPAIR",
    "CURRENT ASSIGNED RESPONSIBLE": "Felipe Souza",
    "EQUIPMENT LOCATION": "IT Support",
    "Asset Origin": "ANYGRID",
    "EQUIPMENT TRADEMARK": "LG",
    "CHARGER/DC SOURCE?": "S/N",
    "PURCHASE DATE (IN-VOICE)": "2023-08-10",
    "COST": "1200.00",
    "PHOTO LINKS": ""
  },
  {
    _rowIndex: 5,
    "ID": "GW-004",
    "EQUIPMENT MODEL": "ThinkPad E14",
    "EQUIPMENT TYPE": "LAPTOP",
    "SERIAL NUMBER": "PF2B34X5",
    "EQUIPMENT STATUS": "AWAITING REPAIR",
    "CURRENT ASSIGNED RESPONSIBLE": "Maria Oliveira",
    "EQUIPMENT LOCATION": "Operations",
    "Asset Origin": "GROWATT",
    "EQUIPMENT TRADEMARK": "LENOVO",
    "CHARGER/DC SOURCE?": "S/N",
    "PURCHASE DATE (IN-VOICE)": "2023-11-05",
    "COST": "4800.00",
    "PHOTO LINKS": ""
  },
  {
    _rowIndex: 6,
    "ID": "GW-005",
    "EQUIPMENT MODEL": "iPhone 13 128GB",
    "EQUIPMENT TYPE": "SMARTPHONE",
    "SERIAL NUMBER": "G67F2HG88QGD",
    "EQUIPMENT STATUS": "SCRAP/TRASH",
    "CURRENT ASSIGNED RESPONSIBLE": "-",
    "EQUIPMENT LOCATION": "Trash",
    "Asset Origin": "ANYGRID",
    "EQUIPMENT TRADEMARK": "APPLE",
    "CHARGER/DC SOURCE?": "N/A",
    "PURCHASE DATE (IN-VOICE)": "2022-05-18",
    "COST": "4500.00",
    "PHOTO LINKS": ""
  }
];

const mockHistory = [
  {
    timestamp: "2026-06-25T13:00:00.000Z",
    user: "admin@growatt.com",
    action: "Movimentado para manutenção",
    oldStatus: "ASSIGNED",
    newStatus: "UNDER REPAIR",
    oldResp: "Felipe Souza",
    newResp: "Felipe Souza",
    oldLoc: "Development",
    newLoc: "IT Support"
  },
  {
    timestamp: "2024-01-15T09:00:00.000Z",
    user: "admin@growatt.com",
    action: "Cadastro Inicial",
    oldStatus: "",
    newStatus: "ASSIGNED",
    oldResp: "",
    newResp: "Felipe Souza",
    oldLoc: "",
    newLoc: "Development"
  }
];

if (typeof window !== 'undefined' && typeof (window as any).google === 'undefined') {
  console.log("Initializing mock google.script.run for local environment...");
  
  (window as any).google = {
    script: {
      run: {
        withSuccessHandler: function (successCallback: Function) {
          return {
            withFailureHandler: function (failureCallback: Function) {
              return {
                getAssets: function () {
                  setTimeout(() => {
                    successCallback(JSON.stringify(mockAssets));
                  }, 400);
                },
                getSpreadsheetUrl: function () {
                  setTimeout(() => {
                    successCallback("https://docs.google.com/spreadsheets/d/1pTmz2Wue9Xzfv5PBQS6B211dol3bbttSIMeNnRkvN2o/edit");
                  }, 100);
                },
                updateAsset: function (rowIndex: number, updates: any, userRemarks: string, pwd: string) {
                  setTimeout(() => {
                    if (pwd !== '110220') {
                      failureCallback(new Error("Acesso negado: Senha administrativa incorreta."));
                      return;
                    }
                    console.log("[MOCK] updateAsset", rowIndex, updates, userRemarks);
                    const idx = mockAssets.findIndex(a => a._rowIndex === rowIndex);
                    if (idx > -1) {
                      mockAssets[idx] = { ...mockAssets[idx], ...updates };
                    }
                    successCallback({ success: true, message: "Asset updated successfully! (MOCK)" });
                  }, 400);
                },
                editAsset: function (rowIndex: number, assetData: any, pwd: string) {
                  setTimeout(() => {
                    if (pwd !== '110220') {
                      failureCallback(new Error("Acesso negado: Senha administrativa incorreta."));
                      return;
                    }
                    console.log("[MOCK] editAsset", rowIndex, assetData);
                    const idx = mockAssets.findIndex(a => a._rowIndex === rowIndex);
                    if (idx > -1) {
                      mockAssets[idx] = { ...mockAssets[idx], ...assetData };
                    }
                    successCallback({ success: true });
                  }, 400);
                },
                deleteAsset: function (rowIndex: number, serialNumber: string, equipmentType: string, pwd: string) {
                  setTimeout(() => {
                    if (pwd !== '110220') {
                      failureCallback(new Error("Acesso negado: Senha administrativa incorreta."));
                      return;
                    }
                    console.log("[MOCK] deleteAsset", rowIndex, serialNumber, equipmentType);
                    const idx = mockAssets.findIndex(a => a._rowIndex === rowIndex);
                    if (idx > -1) {
                      mockAssets.splice(idx, 1);
                    }
                    successCallback({ success: true });
                  }, 400);
                },
                getAssetHistory: function (serialNumber: string) {
                  console.log("[MOCK] getAssetHistory for", serialNumber);
                  setTimeout(() => {
                    successCallback(mockHistory);
                  }, 300);
                },
                createAsset: function (assetData: any, pwd: string) {
                  setTimeout(() => {
                    if (pwd !== '110220') {
                      failureCallback(new Error("Acesso negado: Senha administrativa incorreta."));
                      return;
                    }
                    console.log("[MOCK] createAsset", assetData);
                    const newRowIndex = mockAssets.length > 0 ? Math.max(...mockAssets.map(a => a._rowIndex)) + 1 : 2;
                    mockAssets.push({
                      _rowIndex: newRowIndex,
                      "ID": assetData.ID || `GW-${String(mockAssets.length + 1).padStart(3, '0')}`,
                      "EQUIPMENT MODEL": assetData["EQUIPMENT MODEL"] || "",
                      "EQUIPMENT TYPE": assetData["EQUIPMENT TYPE"] || "",
                      "SERIAL NUMBER": assetData["SERIAL NUMBER"] || "",
                      "EQUIPMENT STATUS": assetData["EQUIPMENT STATUS"] || "WAREHOUSE",
                      "CURRENT ASSIGNED RESPONSIBLE": assetData["CURRENT ASSIGNED RESPONSIBLE"] || "-",
                      "EQUIPMENT LOCATION": assetData["EQUIPMENT LOCATION"] || "",
                      "Asset Origin": assetData["Asset Origin"] || "ANYGRID",
                      "EQUIPMENT TRADEMARK": assetData["EQUIPMENT TRADEMARK"] || "",
                      "CHARGER/DC SOURCE?": assetData["CHARGER/DC SOURCE?"] || "",
                      "PURCHASE DATE (IN-VOICE)": assetData["PURCHASE DATE (IN-VOICE)"] || "",
                      "COST": assetData["COST"] || "0.00",
                      "PHOTO LINKS": assetData["PHOTO LINKS"] || ""
                    });
                    successCallback({ success: true, message: "New asset created successfully! (MOCK)" });
                  }, 400);
                },
                downloadAllPhotosAsZip: function () {
                  setTimeout(() => {
                    successCallback({ url: "https://mock-drive.google.com/photos.zip" });
                  }, 500);
                },
                setRootFolderName: function (newName: string, pwd: string) {
                  setTimeout(() => {
                    if (pwd !== '110220') {
                      failureCallback(new Error("Acesso negado: Senha administrativa incorreta."));
                      return;
                    }
                    successCallback({ success: true, message: `Folder name changed to ${newName} (MOCK)` });
                  }, 300);
                }
              };
            }
          };
        }
      }
    }
  } as any;
}
