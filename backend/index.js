const express = require('express')
const rp = require('request-promise')
const cheerio = require('cheerio')
const bodyParser = require('body-parser')
const puppeteer = require('puppeteer');

let app = express()
let url_list = [];
let headline_list = []
let area_list = []
let data_list = []
let status_scrape = 0
app.use(bodyParser.json())

app.post('/status',(req,res)=>{
  if(status_scrape){
    res.send(data_list)
  }else
  res.send(data_list)
})
app.post('/scrape', async (req, res) => {
  let body = req.body
  let page_num = 0;
  let status = true
  status_scrape = 0
  data_list = []
  url_list = []
  while (status) {
    let url = `https://${body.location}.craigslist.org/search/off?query=${body.query}&availabilityMode=0&s=${page_num}`
    let html_page = await rp(url)
    const $ = cheerio.load(html_page)
    let page_count = $('span[class="button pagenum"]').first().text()
    if (page_count == 'no results') {
      status = false
    }else{
      scraping1(url)
      page_num += 120
    }
  }
  scraping2(url_list)
  res.send('job is on progress')
})

let scraping1 = async (url) => {
  
  try {
    let html = await rp(url)
    const $ = cheerio.load(html)

    $('a[class="result-title hdrlnk"]').each(function (index, element) {
      let el = $(element)
      url_list.push(el.attr('href'));
      headline_list.push(el.text())
    });

    $('span[class="result-hood"]').each(function (index, element) {
      let el = $(element)
      area_list.push(el.text())
    })
    $('span[class="nearby"]').each(function (index, element) {
      let el = $(element)
      area_list.push(el.text())
    })
    // console.dir(url_list);
    // console.dir(headline_list)
    // console.dir(area_list)
    // let data = await scraping2(url_list)
    // console.log(data)
    // return data
  } catch (error) {
    console.log(error)
  }
}

let scraping2 = async (urls) => {
  const browser = await puppeteer.launch({headless:false})
  let page = await browser.newPage()
  console.log(urls)
  for (let i = 0; i < urls.length; ++i){
    await page.goto(urls[i],{ waitUntil: 'networkidle0' })
    let data = await page.evaluate(async()=>{
      await document.querySelector('button[class="reply-button js-only"]').click()
      await new Promise(r => setTimeout(r, 10000))
      document.querySelector('div[class="print-information print-qrcode-container"').remove()
      return [document.querySelector('a[class="mailapp"]').innerHTML,document.querySelector('p[class="postinginfo"').innerHTML,document.querySelector('section[id=postingbody').innerHTML]
    })
    data_list.push(data)
  }
  status_scrape = 1
  return data_list
}

app.listen(3000)