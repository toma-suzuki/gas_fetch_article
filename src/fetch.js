function fetch() {
  const sheet = SpreadsheetApp.openById('1EbfFgpYKPp6rKe0dYHeu4C6Ntsa8820HqEdSXK8xHdE').getSheetByName('管理シート')
  const values = sheet.getDataRange().getValues();
  const observationHtmlFolder = DriveApp.getFolderById('1uhY69tH_navhxIGN_jzqnTcwQH-TR1nf'); //定期観測HTMLフォルダ
  const observationPdfFolder = DriveApp.getFolderById('1KitsrbMPx9ly7Dn5kZLpEGHI3JhxaU1j'); //定期観測PDFフォルダ
  const observationHtmls = observationHtmlFolder.getFiles();
  const observationPdfs = observationPdfFolder.getFiles();

  let oldPdfUrl = '';

  const checkExists = (number, name) => {
    let ret = false;

    while (observationPdfs.hasNext()) {
      const file = observationPdfs.next()

      if (file.getName() === `${number}_${name}.pdf`) {
        oldPdfUrl = file.getUrl();
        ret = true;
      }
    }

    return ret;
  }

  const urlToHtml = (contentUrl, number, name) => {
    try {
      const response = UrlFetchApp.fetch(contentUrl)
      const html = response.getContentText('UTF-8')
      const file = observationHtmlFolder.createFile(`${number}_${name}.html`, html, MimeType.HTML)

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

      Logger.log(`定期観測PDFを作成しました。URL：${file.getUrl}`);

      return (file.getUrl());
    } catch (e) {
      Logger.log(`PDF作成 Error: ${e}`)
    }
  }

  const diffHtml = (contentUrl, number, name) => {
    let oldHtml = ''

    while (observationHtmls.hasNext()) {
      const file = observationHtmls.next()

      if (file.getName() === `${number}_${name}.html`) {
        oldHtml = file.getBlob().getDataAsString('utf-8');
      }
    }

    try {
      const response = UrlFetchApp.fetch(contentUrl)
      const newHtml = response.getBlob().getDataAsString('UTF-8')

      const oldArticle = Parser.data(oldHtml).from('<article').to('</article>').build()
      const newArticle = Parser.data(newHtml).from('<article').to('</article>').build()

      if (oldArticle != newArticle) {
        Logger.log(`記事に更新がありました。現在の記事URL：${contentUrl}  更新前の記事PDF：${oldPdfUrl}`)
      } else {
        Logger.log(`記事に更新がありませんでした。`)
      }
    } catch (e) {
      Logger.log(`HTML Error: ${e}`)
    }
  }

  values.forEach((row, index) => {
    if (row[2] === '定期観測') {
      const contentUrl = row[5]
      const number = row[0]
      const name = row[3]

      if (checkExists(number, name)) {
        Logger.log('定期観測PDFが存在します、差分チェックを行います')

        diffHtml(contentUrl, number, name)
      } else {
        Logger.log('定期観測PDFが存在しません、作成します。')

        urlToBackupAndPdf(contentUrl, number, name);
      }
    }
  })
}