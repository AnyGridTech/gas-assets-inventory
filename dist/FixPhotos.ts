function fillPhotoLinksBySN(): void {

  const FOLDER_ID = '1ZSWUAAJH5qPjGc8GETS_QNOC1WS_tB9Y';
  const SPREADSHEET_ID = '1pTmz2Wue9Xzfv5PBQS6B211dol3bbttSIMeNnRkvN2o';
  const SHEET_NAME = 'Assets';

  const rootFolder = DriveApp.getFolderById(FOLDER_ID);
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) return;

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return;

  const snValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();

  const snMap: Record<string, number> = {};

  snValues.forEach((row, index) => {
    const sn = String(row[0] || '').trim();

    if (sn) {
      snMap[sn] = index;
    }
  });

  const output: string[][] = Array(lastRow - 1)
    .fill(null)
    .map(() => ['']);

  let folderCount = 0;
  let matchedCount = 0;

  const folders = rootFolder.getFolders();

  while (folders.hasNext()) {

    const folder = folders.next();
    folderCount++;

    const folderName = folder.getName().trim().toUpperCase();

    const matchedSNs = Object.keys(snMap).filter(sn =>
      folderName.includes(sn.toUpperCase())
    );

    if (!matchedSNs.length) {
      continue;
    }

    matchedCount++;

    Logger.log(
      `Processing ${matchedCount} | Folder ${folderCount} | Folder: ${folder.getName()} | Matches: ${matchedSNs.join(', ')}`
    );

    const links: string[] = [];
    const files = folder.getFiles();

    while (files.hasNext()) {

      const file = files.next();

      if (file.getMimeType().startsWith('image/')) {
        links.push(
          `https://drive.google.com/file/d/${file.getId()}/view`
        );
      }
    }

    const linksString = links.join(', ');

    matchedSNs.forEach(sn => {
      output[snMap[sn]][0] = linksString;
    });
  }

  sheet.getRange(2, 16, output.length, 1).setValues(output);

  Logger.log(`Folders scanned: ${folderCount}`);
  Logger.log(`Matching folders: ${matchedCount}`);
}
