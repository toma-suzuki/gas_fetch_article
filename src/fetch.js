function fetch() {
  const sheet = SpreadsheetApp.openById('1EbfFgpYKPp6rKe0dYHeu4C6Ntsa8820HqEdSXK8xHdE').getSheetByName('管理シート')
  const values = sheet.getDataRange().getValues()
  const observationHtmlFolder = DriveApp.getFolderById('1uhY69tH_navhxIGN_jzqnTcwQH-TR1nf') //定期観測HTMLフォルダ
  const observationPdfFolder = DriveApp.getFolderById('1KitsrbMPx9ly7Dn5kZLpEGHI3JhxaU1j') //定期観測PDFフォルダ
  const checkPdfFolder = DriveApp.getFolderById('1hUtnj17NgQ5yTf0ZaOMXOvymrmKf8YrL') //比較用PDFフォルダ
  const observationHtmlFiles = observationHtmlFolder.getFiles()
  const observationPdfFiles = observationPdfFolder.getFiles()

  let oldPdfId = ''

  const checkExists = (number, name) => {
    let ret = false

    while (observationPdfFiles.hasNext()) {
      const file = observationPdfFiles.next()

      if (file.getName() === `${number}_${name}.pdf`) {
        oldPdfId = file.getId()
        ret = true
      }
    }

    return ret
  }

  const urlToHtml = (contentUrl, number, name) => {
    try {
      const response = UrlFetchApp.fetch(contentUrl)
      const html = response.getContentText('UTF-8')
      const file = observationHtmlFolder.createFile(`${number}_${name}.html`, html, MimeType.HTML)

      Logger.log(`定期観測HTML作成完了。 URL: ${file.getUrl()}`)
    } catch (e) {
      Logger.log(`定期観測HTML作成失敗。 Error: ${e}`)
    }
  }

  const urlToBackupAndPdf = (contentUrl, number, name) => {
    const requestUrl = 'https://api.sejda.com/v2/html-pdf'

    const body = {
      url: contentUrl,
    }
    const header = {
      'Content-Type': 'application/json',
      Authorization: 'Token: api_7FFA97D5A4E94B48BF7FCFC13EB7BD3F', //APIのトークン
    }
    const option = {
      method: 'post',
      payload: JSON.stringify(body),
      headers: header,
    }

    try {
      const response = UrlFetchApp.fetch(requestUrl, option)
      const pdfBlob = response.getBlob()
      const file = observationPdfFolder.createFile(pdfBlob)

      file.setName(`${number}_${name}.pdf`)

      urlToHtml(contentUrl, number, name)

      Logger.log(`定期観測PDF作成完了。URL：${file.getUrl()}`)

      return file.getUrl()
    } catch (e) {
      Logger.log(`定期観測PDF作成失敗。 Error: ${e}`)
    }
  }

  const diffHtml = (contentUrl, number, name) => {
    Logger.log(`${number}_${name}の差分チェック開始`)
    let oldHtml = ''
    let oldHtmlId = ''

    while (observationHtmlFiles.hasNext()) {
      const file = observationHtmlFiles.next()

      if (file.getName() === `${number}_${name}.html`) {
        oldHtml = file.getBlob().getDataAsString('utf-8')
        oldHtmlId = file.getId()

        Logger.log(`バックアップから${number}_${name}.htmlを取得完了。`)
      }
    }

    try {
      const response = UrlFetchApp.fetch(contentUrl)
      const newHtml = response.getBlob().getDataAsString('UTF-8')
      Logger.log(`現在の記事から${number}_${name}.htmlを取得完了。`)

      const oldArticle = Parser.data(oldHtml).from('<article').to('</article>').build()
      const newArticle = Parser.data(newHtml).from('<article').to('</article>').build()

      if (oldArticle != newArticle) {
        Logger.log('記事に更新があったので定期観測PDFを比較用に移動。')
        const oldPdf = DriveApp.getFileById(oldPdfId)
        oldPdf.moveTo(checkPdfFolder)

        Logger.log('新しい定期観測PDFとHTMLを作成')
        DriveApp.getFileById(oldHtmlId).setTrashed(true)

        urlToBackupAndPdf(contentUrl, number, name)

        Logger.log(`定期観測の更新＆比較用PDF作成完了。現在の記事URL：${contentUrl}  比較用PDFのURL：${oldPdf.getUrl()}`)
      } else {
        Logger.log(`記事に更新がありませんでした。`)
      }
    } catch (e) {
      Logger.log(`差分チェック中エラー Error: ${e}`)
    }
  }

  values.forEach((row, index) => {
    if (row[2] === '定期観測') {
      const contentUrl = row[5]
      const number = row[0]
      const name = row[3]

      if (checkExists(number, name)) {
        Logger.log(`${number}_${name}の定期観測PDFが存在します、差分チェックを行います`)

        diffHtml(contentUrl, number, name)
      } else {
        Logger.log(`${number}_${name}の定期観測PDFが存在しません、作成します。`)

        urlToBackupAndPdf(contentUrl, number, name)
      }
    }
  })
}
