const fs = require("fs");
const puppeteer = require('puppeteer');

function sleep(time) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time)
  });
}

(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args:['--start-maximized', '--lang=pl-PL,pl'],
    ignoreDefaultArgs: ['--enable-automation'], 
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const isIncognito = true;
  if(isIncognito){
    browser = await browser.createIncognitoBrowserContext();
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 4750});
  await page.setDefaultNavigationTimeout(0);
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pl'
  });

  // Set the language forcefully on javascript
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "language", {
        get: function() {
            return "pl-PL";
        }
    });
    Object.defineProperty(navigator, "languages", {
        get: function() {
            return ["pl-PL", "pl"];
        }
    });
  });
    
  // Pass the Webdriver Test.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // Pass the Permissions Test.
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    return window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
    
  // Pass the Plugins Length Test.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  let producent;
  let articleNum;
  let ean;
  let name;
  let jm;
  let sztuk = '?';
  let zlotowki;
  let grosze;
  let price;
  let stream = 'Kod, Marka, Nazwa, EAN, J.m., szt., Cena \n';
  let searchFor = 'brembo';
  let pageNum = 1;
  let pageFlag = true;
  let url;
  let startDate = new Date();

  async function getProductData(produkctsAmount){
    producent = await page.$eval('a.css-2uf2gb:nth-child('+ produkctsAmount +') .product-attribute:nth-child(1) span', el => el.innerText);
    if(producent == 'BREMBO'){
      articleNum = await page.$eval('a.css-2uf2gb:nth-child('+ produkctsAmount +') .product-attribute:nth-child(2) span', el => el.innerText);
      ean = await page.$eval('a.css-2uf2gb:nth-child('+ produkctsAmount +') .product-attribute:nth-child(3) span', el => el.innerText);
      name = await page.$eval('a.css-2uf2gb:nth-child('+ produkctsAmount +') .product-name', el => el.innerText.replace(',', '^'));
      jm = await page.$eval('a.css-2uf2gb:nth-child('+ produkctsAmount +') .product-price-container .product-price-label', el => el.innerText);
      if(jm === '1 komplet (2 szt.):' || jm === '1 set (2 pcs.) :'){
        sztuk = '2';
        jm = 'komplet';
      }else if(jm === '1 sztuka:' || jm === ' 1 piece :'){
        jm = 'sztuka';
        sztuk = '1';
      } else if(jm === ' 1 zestaw (1 szt.):' || jm === '1 zestaw (1 szt.):'){
        jm = 'zestaw';
        sztuk = '1';
      } else if(jm === ' 1 zestaw (2 szt.):' || jm === '1 zestaw (2 szt.):'){
        jm = 'zestaw';
        sztuk = '2';
      } else if (jm === ' 1 komplet (1 szt.):' || jm === '1 komplet (1 szt.):'){
        jm = 'komplet';
        sztuk = '1';
      }
      zlotowki = await page.$eval('a.css-2uf2gb:nth-child('+ produkctsAmount +') .product-price-container .MuiBox-root .MuiTypography-root', el => el.innerText.match(/\d+/)[0]);
      grosze = await page.$eval('a.css-2uf2gb:nth-child('+ produkctsAmount +') .product-price-container .MuiBox-root .MuiTypography-root p', el => el.innerText.match(/\d+/)[0]);
      price = zlotowki + ',' + grosze;
      return articleNum +', '+ producent +', '+ name +', '+ ean +', '+ jm +', '+ sztuk +', '+ zlotowki +'.'+ grosze +'\n';
    }
  }

  while(pageFlag){
    url = 'https://pl.autofixer.com/szukaj?q=' + searchFor +'&page='+ pageNum;
    await page.goto(url);
    await sleep(1000);
    if(await page.$('.MuiDialog-root.modal-mobile-position-bottom.MuiModal-root.css-f27a6a') != null){
      await page.$eval('.MuiDialog-root.modal-mobile-position-bottom.MuiModal-root.css-f27a6a', el => el.remove());
    }
    

    if(await page.$('a.css-2uf2gb') != null){
      let produkctsAmount = (await page.$$('a.css-2uf2gb')).length + 1;
      console.log('page: '+ pageNum +' products: '+ produkctsAmount);

      while (produkctsAmount > 1){
        stream += await getProductData(produkctsAmount);

        if(await page.$('a.css-2uf2gb:nth-child('+ produkctsAmount +') .css-1o3hon1') != null){
          await page.click('a.css-2uf2gb:nth-child('+ produkctsAmount +') .css-1o3hon1');
          stream += await getProductData(produkctsAmount);
        }
        produkctsAmount--;
      }
      pageNum++;
    } else{
      pageFlag = false;
    }
  }

  let filename = searchFor +'-'+ startDate.getDate() +'-'+ (startDate.getMonth()+1) +'.csv';
  fs.writeFile(filename, stream, function (err) {
    if (err) return console.log(err);
  });

  await browser.close();

  let endDate = new Date();
  const diffTime = Math.abs(endDate - startDate) / 60000;
  console.log("time: "+ diffTime + " min");
})();


