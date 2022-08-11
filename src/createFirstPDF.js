function createFirstPDF() {
  const sheet = SpreadsheetApp.openById('1EbfFgpYKPp6rKe0dYHeu4C6Ntsa8820HqEdSXK8xHdE').getSheetByName('管理シート')
  const values = sheet.getDataRange().getValues()
  const firstPdfFolder = DriveApp.getFolderById('1n6jXNDdI44pjRiq1v3BTexQsuyG5x1DJ') //初稿PDFフォルダ
  const firstHtmlFolder = DriveApp.getFolderById('1KHWurWOZnShS5YS7NPnvJ_O6ODGOb-0S') //初稿HTMLフォルダ
  const firstPdfFiles = firstPdfFolder.getFiles()
  const firstHtmlFiles = firstHtmlFolder.getFiles()

  const checkExists = (number, name) => {
    let ret = false

    while (firstPdfFiles.hasNext()) {
      const file = firstPdfFiles.next()

      if (file.getName() === `${number}_${name}.pdf`) {
        ret = true
      }
    }
    return ret
  }

  const urlToHtml = (contentUrl, number, name) => {
    try {
      const response = UrlFetchApp.fetch(contentUrl)
      const html = response.getContentText('UTF-8')
      const file = firstHtmlFolder.createFile(`${number}_${name}_初稿.html`, html, MimeType.HTML)

      Logger.log(`HTML URL: ${file.getUrl()}`)
    } catch (e) {
      Logger.log(`HTML Error: ${e}`)
    }
  }

  const urlToBackupAndPdf = (contentUrl, number, name) => {
    const requestUrl = 'https://api.sejda.com/v2/html-pdf'

    const body = {
      url: contentUrl,
    }
    const header = {
      'Content-Type': 'application/json',
      Authorization: 'Token: api_7FFA97D5A4E94B48BF7FCFC13EB7BD3F',
    }
    const option = {
      method: 'post',
      payload: JSON.stringify(body),
      headers: header,
    }

    try {
      const response = UrlFetchApp.fetch(requestUrl, option)
      const pdfBlob = response.getBlob()
      const folder = DriveApp.getFolderById('1n6jXNDdI44pjRiq1v3BTexQsuyG5x1DJ')
      const file = folder.createFile(pdfBlob)

      file.setName(`${number}_${name}_初稿.pdf`)

      urlToHtml(contentUrl, number, name)

      Logger.log(`PDF URL: ${file.getUrl()}`)
    } catch (e) {
      Logger.log(`PDF Error: ${e}`)
    }
  }

  values.forEach((row, index) => {
    if (row[2] === '初稿') {
      const contentUrl = row[5]
      const number = row[0]
      const name = row[3]

      if (!checkExists(number, name)) {
        urlToBackupAndPdf(contentUrl, number, name)
      }
    }
  })
}
