// ==========================================
// GENERAL SETTINGS
// ==========================================
// If your script is standalone, insert the spreadsheet ID below.
// The ID is the long code in the spreadsheet URL:
// Ex: https://docs.google.com/spreadsheets/d/YOUR_ID_HERE/edit
const SPREADSHEET_ID = '1pTmz2Wue9Xzfv5PBQS6B211dol3bbttSIMeNnRkvN2o'; // Ex: '1A2B3C4D5E6F7G8H9I0J'

// Sheet names
const SHEET_ASSETS_NAME = 'Assets';
const SHEET_LOGS_NAME = 'TrackingLogs';

const ADMIN_PASSWORD = '110220';

/**
 * Utility function to get the correct spreadsheet.
 */
function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Checks if the provided password is valid
 */
function checkPassword(pwd: string): void {
  if (pwd !== ADMIN_PASSWORD) {
    throw new Error('Access denied: Incorrect administrator password.');
  }
}

/**
 * Gets the current root folder name.
 */
function getRootFolderName(): string {
  const props = PropertiesService.getDocumentProperties();
  return props.getProperty('ROOT_FOLDER_NAME') || "Inventory_Photos";
}

/**
 * Sets the root folder name.
 */
function setRootFolderName(newName: string, pwd: string): { success: boolean; message: string } {
  checkPassword(pwd);
  const props = PropertiesService.getDocumentProperties();
  const oldName = props.getProperty('ROOT_FOLDER_NAME') || "Inventory_Photos";
  props.setProperty('ROOT_FOLDER_NAME', newName);
  
  // Log this action
  const ss = getSpreadsheet();
  let logSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOGS_NAME);
  }
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow(['Timestamp', 'User Email', 'Equipment Type', 'Serial Number', 'Action/Remarks', 'Previous Status', 'New Status', 'Previous Resp', 'New Resp', 'Previous Loc', 'New Loc', 'Photo Links']);
  }

  logSheet.appendRow([
    new Date(),
    Session.getActiveUser().getEmail() || 'Unknown User',
    'System Settings',
    '',
    `Changed Root Folder Name from ${oldName} to ${newName}`,
    '', '', '', '', '', '', ''
  ]);
  
  return { success: true, message: `Folder name changed to ${newName}` };
}

/**
 * Serve the HTML frontend
 */
function doGet(e: any): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Asset Inventory Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Gets all assets from the "Assets" sheet.
 * Returns an array of objects.
 */
function getAssets(): string {
  const ss = getSpreadsheet();
  if (!ss) {
    throw new Error("Spreadsheet not found. Check if you inserted the SPREADSHEET_ID correctly in Code.js or if the script is bound to a spreadsheet.");
  }
  
  const sheet = ss.getSheetByName(SHEET_ASSETS_NAME);
  if (!sheet) {
    throw new Error("The sheet '" + SHEET_ASSETS_NAME + "' was not found in the spreadsheet.");
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return JSON.stringify([]); // Only headers or empty
  
  const headers = data[0] as string[];
  const rows = data.slice(1);
  
  const mapped = rows.map((row, index) => {
    let obj: Record<string, any> = { _rowIndex: index + 2 }; // to know which row to update
    headers.forEach((header, i) => {
      // Force date to string if it's a date object
      let val = row[i];
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      obj[header] = val;
    });
    return obj;
  });
  
  // Return stringified JSON to prevent google.script.run from returning null on complex types
  return JSON.stringify(mapped);
}

/**
 * Updates an asset and logs the tracking.
 */
function updateAsset(rowIndex: number, updates: any, userRemarks: string, pwd: string): { success: boolean; message: string } {
  checkPassword(pwd);
  const ss = getSpreadsheet();
  if (!ss) {
    throw new Error("Spreadsheet not found. Check if you inserted the SPREADSHEET_ID correctly in Code.js or if the script is bound to a spreadsheet.");
  }
  
  const assetSheet = ss.getSheetByName(SHEET_ASSETS_NAME);
  const logSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  
  if (!assetSheet) throw new Error("The sheet '" + SHEET_ASSETS_NAME + "' was not found in the spreadsheet.");
  
  const headers = assetSheet.getDataRange().getValues()[0] as string[];
  
  // Find column indexes
  const statusCol = headers.indexOf('EQUIPMENT STATUS') + 1;
  const respCol = headers.indexOf('CURRENT ASSIGNED RESPONSIBLE') + 1;
  const locationCol = headers.indexOf('EQUIPMENT LOCATION') + 1;
  const typeCol = headers.indexOf('EQUIPMENT TYPE') + 1;
  const serialCol = headers.indexOf('SERIAL NUMBER') + 1;
  const photoCol = headers.indexOf('PHOTO LINKS');
  
  // Read previous state for logging
  const prevStatus = assetSheet.getRange(rowIndex, statusCol).getValue();
  const prevResp = assetSheet.getRange(rowIndex, respCol).getValue();
  const prevLocation = assetSheet.getRange(rowIndex, locationCol).getValue();
  
  const equipmentType = typeCol > 0 ? assetSheet.getRange(rowIndex, typeCol).getValue() : '';
  const serialNumber = serialCol > 0 ? assetSheet.getRange(rowIndex, serialCol).getValue() : '';
  const folderNameCol = headers.indexOf('FOLDER NAME') + 1;
  const folderNameRaw = folderNameCol > 0 ? assetSheet.getRange(rowIndex, folderNameCol).getValue() : '';
  const folderName = folderNameRaw ? String(folderNameRaw).trim() : (serialNumber || 'SEM_SERIAL');
  
  let archivedCount = 0;
  if (updates.deletedPhotoUrls && updates.deletedPhotoUrls.length > 0) {
    archiveSpecificPhotos(folderName, updates.deletedPhotoUrls);
    archivedCount = updates.deletedPhotoUrls.length;
  }

  // Handle Photo Upload (Multiple)
  let finalPhotoUrls = updates.remainingPhotoUrls ? [...updates.remainingPhotoUrls] : [];
  if (updates.base64Photos && updates.base64Photos.length > 0) {
    for (let i = 0; i < updates.base64Photos.length; i++) {
      const url = uploadPhotoToDrive(updates.base64Photos[i], `${equipmentType}_${folderName}_${Date.now()}_${i}`, folderName);
      if (url) finalPhotoUrls.push(url);
    }
  }
  
  const joinedUrls = finalPhotoUrls.length > 0 ? finalPhotoUrls.join(', ') : null;
  
  // Add Photo Col if it doesn't exist and we have a photo
  let targetPhotoCol = photoCol > -1 ? photoCol + 1 : headers.indexOf('PHOTO LINKS') + 1;
  if (targetPhotoCol === 0 && joinedUrls) {
    targetPhotoCol = headers.length + 1;
    assetSheet.getRange(1, targetPhotoCol).setValue('PHOTO LINKS');
  }
  
  // Update new values
  if (updates.status) assetSheet.getRange(rowIndex, statusCol).setValue(updates.status);
  if (updates.responsible) assetSheet.getRange(rowIndex, respCol).setValue(updates.responsible);
  if (updates.location) assetSheet.getRange(rowIndex, locationCol).setValue(updates.location);
  if (joinedUrls !== null && targetPhotoCol > 0) {
    assetSheet.getRange(rowIndex, targetPhotoCol).setValue(joinedUrls);
  } else if (joinedUrls === null && targetPhotoCol > 0) {
    assetSheet.getRange(rowIndex, targetPhotoCol).setValue(''); // Clear if all deleted
  }
  
  // Write to tracking log
  if (!logSheet) {
    // Create it if it doesn't exist
    const newLogSheet = ss.insertSheet(SHEET_LOGS_NAME);
    newLogSheet.appendRow(['Timestamp', 'User Email', 'Equipment Type', 'Serial Number', 'Action/Remarks', 'Previous Status', 'New Status', 'Previous Resp', 'New Resp', 'Previous Loc', 'New Loc', 'Photo Links']);
  }
  
  const activeLogSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  if (activeLogSheet) {
    if (activeLogSheet.getLastRow() === 0) {
      activeLogSheet.appendRow(['Timestamp', 'User Email', 'Equipment Type', 'Serial Number', 'Action/Remarks', 'Previous Status', 'New Status', 'Previous Resp', 'New Resp', 'Previous Loc', 'New Loc', 'Photo Links']);
    }

    const fullRemarks = (archivedCount > 0 ? `[Archived ${archivedCount} photo(s)] ` : '') + (userRemarks || 'Updated via Web App');
    
    activeLogSheet.appendRow([
      new Date(),
      Session.getActiveUser().getEmail() || 'Unknown User',
      equipmentType,
      serialNumber,
      fullRemarks,
      prevStatus,
      updates.status || prevStatus,
      prevResp,
      updates.responsible || prevResp,
      prevLocation,
      updates.location || prevLocation,
      joinedUrls || ''
    ]);
  }
  
  return { success: true, message: "Asset updated successfully!" };
}

/**
 * Completely edits an asset's data.
 */
function editAsset(rowIndex: number, assetData: any, pwd: string): { success: boolean } {
  checkPassword(pwd);
  const ss = getSpreadsheet();
  const assetSheet = ss.getSheetByName(SHEET_ASSETS_NAME);
  if (!assetSheet) throw new Error("Sheet not found");
  
  const headers = assetSheet.getDataRange().getValues()[0] as string[];
  
  // Ensure FOLDER NAME header exists
  let folderNameCol = headers.indexOf('FOLDER NAME');
  if (folderNameCol === -1) {
    folderNameCol = headers.length;
    assetSheet.getRange(1, folderNameCol + 1).setValue('FOLDER NAME');
    headers.push('FOLDER NAME');
  }

  // Get old folder name
  const serialCol = headers.indexOf('SERIAL NUMBER');
  const oldSerial = serialCol > -1 ? assetSheet.getRange(rowIndex, serialCol + 1).getValue() : 'SEM_SERIAL';
  const oldFolderNameRaw = assetSheet.getRange(rowIndex, folderNameCol + 1).getValue();
  const oldFolderName = oldFolderNameRaw ? String(oldFolderNameRaw).trim() : (oldSerial || 'SEM_SERIAL');
  
  const newFolderName = assetData['FOLDER NAME'] ? String(assetData['FOLDER NAME']).trim() : (assetData['SERIAL NUMBER'] || 'SEM_SERIAL');
  
  // If FOLDER NAME changed, rename in Google Drive
  if (oldFolderName !== newFolderName) {
    try {
      const rootFolderName = getRootFolderName();
      const rootFolders = DriveApp.getFoldersByName(rootFolderName);
      if (rootFolders.hasNext()) {
        const rootFolder = rootFolders.next();
        const oldFolders = rootFolder.getFoldersByName(oldFolderName);
        if (oldFolders.hasNext()) {
          oldFolders.next().setName(newFolderName);
        }
      }
    } catch (e) {
      console.warn("Could not rename folder: " + e);
    }
  }

  let archivedCount = 0;
  if (assetData.deletedPhotoUrls && assetData.deletedPhotoUrls.length > 0) {
    archiveSpecificPhotos(newFolderName, assetData.deletedPhotoUrls);
    archivedCount = assetData.deletedPhotoUrls.length;
  }

  // Handle Photo Upload (Multiple)
  let finalPhotoUrls = assetData.remainingPhotoUrls ? [...assetData.remainingPhotoUrls] : [];
  if (assetData.base64Photos && assetData.base64Photos.length > 0) {
    for (let i = 0; i < assetData.base64Photos.length; i++) {
      const url = uploadPhotoToDrive(assetData.base64Photos[i], `EDIT_${assetData['EQUIPMENT TYPE'] || 'ITEM'}_${Date.now()}_${i}`, newFolderName);
      if (url) finalPhotoUrls.push(url);
    }
  }
  
  const joinedUrls = finalPhotoUrls.length > 0 ? finalPhotoUrls.join(', ') : null;
  const photoCol = headers.indexOf('PHOTO LINKS');
  if (photoCol > -1) {
    assetData['PHOTO LINKS'] = joinedUrls || '';
  } else {
    assetData['PHOTO LINKS'] = joinedUrls || '';
    if (joinedUrls) {
      assetSheet.getRange(1, headers.length + 1).setValue('PHOTO LINKS');
      headers.push('PHOTO LINKS');
    }
  }

  // Update FOLDER NAME in assetData explicitly so it gets saved
  assetData['FOLDER NAME'] = newFolderName;

  // Update cells
  headers.forEach((header, index) => {
    if (assetData[header] !== undefined) {
      assetSheet.getRange(rowIndex, index + 1).setValue(assetData[header]);
    }
  });
  
  // Log Edit
  const logSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  if (logSheet) {
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(['Timestamp', 'User Email', 'Equipment Type', 'Serial Number', 'Action/Remarks', 'Previous Status', 'New Status', 'Previous Resp', 'New Resp', 'Previous Loc', 'New Loc', 'Photo Links']);
    }
    let actionStr = oldFolderName !== newFolderName ? `Full Edit (Renamed folder from ${oldFolderName} to ${newFolderName})` : 'Full Edit';
    if (archivedCount > 0) actionStr += ` [Archived ${archivedCount} photo(s)]`;
    
    logSheet.appendRow([
      new Date(),
      Session.getActiveUser().getEmail(),
      assetData['EQUIPMENT TYPE'] || '',
      assetData['SERIAL NUMBER'] || '',
      actionStr,
      '', assetData['EQUIPMENT STATUS'] || '',
      '', assetData['CURRENT ASSIGNED RESPONSIBLE'] || '',
      '', assetData['EQUIPMENT LOCATION'] || '',
      joinedUrls || ''
    ]);
  }
  
  return { success: true };
}

/**
 * Deletes an asset.
 */
function deleteAsset(rowIndex: number, serialNumber: string, equipmentType: string, pwd: string): { success: boolean } {
  checkPassword(pwd);
  const ss = getSpreadsheet();
  const assetSheet = ss.getSheetByName(SHEET_ASSETS_NAME);
  if (!assetSheet) throw new Error("Sheet not found");
  
  assetSheet.deleteRow(rowIndex);
  
  // Log Delete
  const logSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  if (logSheet) {
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(['Timestamp', 'User Email', 'Equipment Type', 'Serial Number', 'Action/Remarks', 'Previous Status', 'New Status', 'Previous Resp', 'New Resp', 'Previous Loc', 'New Loc', 'Photo Links']);
    }
    logSheet.appendRow([
      new Date(),
      Session.getActiveUser().getEmail(),
      equipmentType || '',
      serialNumber || '',
      'Asset Deleted',
      '', '', '', '', '', '', ''
    ]);
  }
  
  return { success: true };
}

/**
 * Retrieves the tracking history for a specific serial number.
 */
function getAssetHistory(serialNumber: string | number): any[] {
  const ss = getSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  if (!logSheet) return [];
  
  const data = logSheet.getDataRange().getValues();
  if (data.length === 0) return [];
  const headers = data.shift() as string[];
  
  const serialCol = headers.indexOf('Serial Number');
  if (serialCol === -1) return [];
  
  const history = data.filter(row => String(row[serialCol]) === String(serialNumber)).map(row => {
    return {
      timestamp: row[headers.indexOf('Timestamp')],
      user: row[headers.indexOf('User Email')],
      action: row[headers.indexOf('Action/Remarks')],
      oldStatus: row[headers.indexOf('Previous Status')],
      newStatus: row[headers.indexOf('New Status')],
      oldResp: row[headers.indexOf('Previous Resp')],
      newResp: row[headers.indexOf('New Resp')],
      oldLoc: row[headers.indexOf('Previous Loc')],
      newLoc: row[headers.indexOf('New Loc')]
    };
  });
  
  // Sort descending by timestamp
  return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Creates a new asset.
 */
function createAsset(assetData: any, pwd: string): { success: boolean; message: string } {
  checkPassword(pwd);
  const ss = getSpreadsheet();
  if (!ss) throw new Error("Spreadsheet not found.");
  
  const assetSheet = ss.getSheetByName(SHEET_ASSETS_NAME);
  if (!assetSheet) throw new Error("The sheet '" + SHEET_ASSETS_NAME + "' was not found.");
  
  const headers = assetSheet.getDataRange().getValues()[0] as string[];
  
  // Ensure FOLDER NAME header exists
  if (headers.indexOf('FOLDER NAME') === -1) {
    assetSheet.getRange(1, headers.length + 1).setValue('FOLDER NAME');
    headers.push('FOLDER NAME');
  }

  const folderName = assetData['FOLDER NAME'] ? String(assetData['FOLDER NAME']).trim() : (assetData['SERIAL NUMBER'] || 'SEM_SERIAL');
  assetData['FOLDER NAME'] = folderName;
  
  // Handle Photo Upload (Multiple)
  let finalPhotoUrls = [];
  if (assetData.base64Photos && assetData.base64Photos.length > 0) {
    for (let i = 0; i < assetData.base64Photos.length; i++) {
      const url = uploadPhotoToDrive(assetData.base64Photos[i], `NEW_${assetData['EQUIPMENT TYPE'] || 'ITEM'}_${Date.now()}_${i}`, folderName);
      if (url) finalPhotoUrls.push(url);
    }
  }
  
  const joinedUrls = finalPhotoUrls.length > 0 ? finalPhotoUrls.join(', ') : null;
  if (joinedUrls) {
    assetData['PHOTO URL'] = joinedUrls;
  }
  
  // Build new row based on headers
  const newRow = headers.map(header => {
    return assetData[header] || '';
  });
  
  assetSheet.appendRow(newRow);
  
  // Log creation
  const logSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  if (logSheet) {
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(['Timestamp', 'User Email', 'Equipment Type', 'Serial Number', 'Action/Remarks', 'Previous Status', 'New Status', 'Previous Resp', 'New Resp', 'Previous Loc', 'New Loc', 'Photo Links']);
    }
    logSheet.appendRow([
      new Date(),
      Session.getActiveUser().getEmail() || 'Unknown User',
      assetData['EQUIPMENT TYPE'] || '',
      assetData['SERIAL NUMBER'] || '',
      `New Item Created (Folder: ${folderName})`,
      '', assetData['EQUIPMENT STATUS'] || '',
      '', assetData['CURRENT ASSIGNED RESPONSIBLE'] || '',
      '', assetData['EQUIPMENT LOCATION'] || '',
      joinedUrls || ''
    ]);
  }
  
  return { success: true, message: "New asset created successfully!" };
}

/**
 * Saves a base64 image to Google Drive and returns public URL.
 */
function uploadPhotoToDrive(base64Data: string, filename: string, folderName: string): string | null {
  try {
    const rootFolderName = getRootFolderName();
    let rootFolder: GoogleAppsScript.Drive.Folder;
    const rootFolders = DriveApp.getFoldersByName(rootFolderName);
    if (rootFolders.hasNext()) {
      rootFolder = rootFolders.next();
    } else {
      rootFolder = DriveApp.createFolder(rootFolderName);
      rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    const snFolder = folderName ? String(folderName).trim() : 'SEM_SERIAL';
    let folder: GoogleAppsScript.Drive.Folder;
    const subFolders = rootFolder.getFoldersByName(snFolder);
    if (subFolders.hasNext()) {
      folder = subFolders.next();
    } else {
      folder = rootFolder.createFolder(snFolder);
    }
    
    const splitBase = base64Data.split(',');
    const dataType = splitBase[0];
    const base64String = splitBase[1];
    
    let mimeType = MimeType.JPEG;
    if (dataType.includes('png')) mimeType = MimeType.PNG;
    
    const blob = Utilities.newBlob(Utilities.base64Decode(base64String), mimeType, filename);
    const file = folder.createFile(blob);
    
    // Set sharing if needed (optional)
    try {
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    } catch (sharingError) {
      console.warn("Could not set public sharing (possibly restricted by Workspace): " + sharingError);
    }
    
    // Return direct viewer/embed link (this natively supports =IMAGE() in Sheets)
    return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w500';
  } catch (e) {
    console.error("Photo upload failed: " + e);
    return null;
  }
}

/**
 * Archives existing photos to an "old" subfolder.
 */
function archiveOldPhotos(folderName: string): void {
  try {
    if (!folderName) return;
    const rootFolderName = getRootFolderName();
    const rootFolders = DriveApp.getFoldersByName(rootFolderName);
    if (!rootFolders.hasNext()) return;
    
    const rootFolder = rootFolders.next();
    const snFolderStr = String(folderName).trim();
    const snFolders = rootFolder.getFoldersByName(snFolderStr);
    if (!snFolders.hasNext()) return;
    
    const snFolder = snFolders.next();
    const files = snFolder.getFiles();
    
    if (files.hasNext()) {
      let oldFolder: GoogleAppsScript.Drive.Folder;
      const oldFolders = snFolder.getFoldersByName("old");
      if (oldFolders.hasNext()) {
        oldFolder = oldFolders.next();
      } else {
        oldFolder = snFolder.createFolder("old");
      }
      
      while (files.hasNext()) {
        const file = files.next();
        file.moveTo(oldFolder);
      }
    }
  } catch (e) {
    console.warn("Error archiving old photos: " + e);
  }
}

/**
 * Archives specific photos by their Google Drive file ID.
 */
function archiveSpecificPhotos(folderName: string, photoUrlsArray: string[]): void {
  try {
    if (!folderName || !photoUrlsArray || photoUrlsArray.length === 0) return;
    const rootFolderName = getRootFolderName();
    const rootFolders = DriveApp.getFoldersByName(rootFolderName);
    if (!rootFolders.hasNext()) return;
    
    const rootFolder = rootFolders.next();
    const snFolderStr = String(folderName).trim();
    const snFolders = rootFolder.getFoldersByName(snFolderStr);
    if (!snFolders.hasNext()) return;
    
    const snFolder = snFolders.next();
    
    let oldFolder: GoogleAppsScript.Drive.Folder | null = null;
    
    photoUrlsArray.forEach(url => {
      const matchId = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (matchId) {
        const fileId = matchId[1];
        try {
          const file = DriveApp.getFileById(fileId);
          if (file) {
            if (!oldFolder) {
              const oldFolders = snFolder.getFoldersByName("old");
              if (oldFolders.hasNext()) {
                oldFolder = oldFolders.next();
              } else {
                oldFolder = snFolder.createFolder("old");
              }
            }
            file.moveTo(oldFolder);
          }
        } catch (fileErr) {
          console.warn("Could not archive specific file " + fileId + ": " + fileErr);
        }
      }
    });
  } catch (e) {
    console.warn("Error archiving specific photos: " + e);
  }
}

/**
 * Zips all photos in the root folder and returns the download URL.
 */
function downloadAllPhotosAsZip(): { url?: string; error?: string } {
  try {
    const rootFolderName = getRootFolderName();
    const folders = DriveApp.getFoldersByName(rootFolderName);
    if (!folders.hasNext()) return { error: `Folder ${rootFolderName} not found.` };
    
    const rootFolder = folders.next();
    const blobs: GoogleAppsScript.Base.Blob[] = [];
    
    // Helper function to recursively get files
    function getBlobs(folder: GoogleAppsScript.Drive.Folder, path: string): void {
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const blob = file.getBlob();
        blob.setName(path + file.getName());
        blobs.push(blob);
      }
      const subFolders = folder.getFolders();
      while (subFolders.hasNext()) {
        const subFolder = subFolders.next();
        getBlobs(subFolder, path + subFolder.getName() + '/');
      }
    }
    
    getBlobs(rootFolder, '');
    
    if (blobs.length === 0) {
      return { error: "No photos found to zip." };
    }
    
    const zipBlob = Utilities.zip(blobs, 'Inventory_Photos.zip');
    
    const existing = rootFolder.getFilesByName('Inventory_Photos.zip');
    while (existing.hasNext()) existing.next().setTrashed(true);
    
    const zipFile = rootFolder.createFile(zipBlob);
    zipFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { url: zipFile.getDownloadUrl() };
  } catch (e: any) {
    return { error: "Error generating ZIP: " + e.toString() };
  }
}
