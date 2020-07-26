const express = require('express')
const rp = require('request-promise')
const cheerio = require('cheerio')
const { Options } = require('selenium-webdriver/firefox');
const { head, post } = require('request-promise');
require('geckodriver')
const bodyParser = require('body-parser')
const puppeteer = require('puppeteer');

let app = express()
app.use(bodyParser.json())

app.get('/', async (req, res) => {
  let url = 'https://boston.craigslist.org/search/off?query=wanted&availabilityMode=0'
  // url = 'https://boston.craigslist.org/gbs/off/d/boston-modeling-beauty-spa-office-space/7157832724.html'

  scraping3(url)
  res.send('hellow')
})

app.post('/scrape',(req,res)=>{
  let body = req.body
  let url = `https://${body.location}.craigslist.org/search/off?query=${body.query}`
  scraping1(url)
  res.send(url)
})

let scraping1 = async (url) => {
  try {
    let html = await rp(url)
    const $ = cheerio.load(html)
    let url_list = [];
    let headline_list = []
    let area_list = []
    $('a[class="result-title hdrlnk"]').each(function (index, element) {
      let el = $(element)
      url_list.push(el.attr('href'));
      headline_list.push(el.text())
    });

    $('span[class="result-hood"]').each(function (index, element) {
      let el = $(element)
      area_list.push(el.text())
    });
    $('span[class="nearby"]').each(function (index, element) {
      let el = $(element)
      area_list.push(el.text())
    });
    console.dir(url_list);
    console.dir(headline_list)
    console.dir(area_list)
    console.log(await scraping2(url_list))
  } catch (error) {
    console.log(error)
  }
}

let scraping2 = async (url_list) => {
  let email_list = []
  let post_list = []
  await url_list.forEach(async url => {
    try {
      const { Builder, By, Key, until } = require('selenium-webdriver');
      let option = new Options()
      let driver = await new Builder().forBrowser('firefox').setFirefoxOptions(option.headless()).build();
      await driver.get(url)
      var btn = await driver.findElement(By.className('reply-button js-only')).click()
      await new Promise(r => setTimeout(r, 5000))
      let email = await driver.findElement(By.xpath('/html/body/section/section/header/div[2]/div/div[1]/aside/ul/li[1]/p/a'))
      let post_id = await driver.findElement(By.xpath('/html/body/section/section/section/div[2]/p[1]'))
      email_list.push(email.getText())
      post_list.push(post_id.getText())
    } catch (err) {
      console.log(err)
    }
  });
  console.log(post_list)
  return [email_list,post_list]
}

let scraping3 = async (url)=>{
  const browser = await puppeteer.launch({headless: false})
  let page = await browser.newPage()
  await page.goto('https://www.google.com')
}

app.listen(3000)