const express = require('express')
const rp = require('request-promise')
const cheerio = require('cheerio')
const bodyParser = require('body-parser')
const puppeteer = require('puppeteer')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

let app = express()
let url_list = []
let data_list = []
let status_scrape = 1;

app.use(cors())
app.use(bodyParser.json())

app.use(express.static(path.join(__dirname, '../frontend'))); //  "public" off of current is root

app.post('/content', (req, res) => {
  let resp = 
  {
    'status': status_scrape,
    'data': data_list 
  }
  res.send(resp)
})

app.post('/',(req,res)=>{
  res.send('your request is success')
})

app.post('/scrape', async(req, res) => {
  let body = req.body
  status_scrape = 0
  data_list = []
  url_list = []
  try {
    filter(body).then(async () => {
    scraping2(url_list)
  }) 
  res.send({message:'success'})
  } catch (error) {
    res.send({message:'failed'})
  }
})

let filter = async (body) => {
  let status = true
  let page_num = 0;
  while (status) {
    let html_page,url
    url = `${body.location}search/off?query=${body.query}&availabilityMode=0&s=${page_num}`
    html_page = await rp(url)

    const $ = cheerio.load(html_page)
    let page_count = $('span[class="button pagenum"]').first().text()
    if (page_count == 'no results') {
      status = false
    } else {
      try {
        scraping1(url)
      } catch (error) {
        console.log(error)
      }
      page_num += 120
    }
  }
}
let scraping1 = async (url) => {
  try {
    let html = await rp(url)
    const $ = cheerio.load(html)
    $('a[class="result-title hdrlnk"]').each(function (index, element) {
      let el = $(element)
      url_list.push(el.attr('href'));
    });
  } catch (error) {
    console.log(error)
  }
}

let scraping2 = async (urls) => {
  const browser = await puppeteer.launch()
  let page = await browser.newPage()
  for (let i = 0; i < urls.length; ++i) {
    try {
      await page.goto(urls[i], { waitUntil: 'networkidle0' })
      let data = await page.evaluate(async () => {
        let list = []
        await document.querySelector('button[class="reply-button js-only"]').click()
        await new Promise(r => setTimeout(r, 8000))
        document.querySelector('div[class="print-information print-qrcode-container"').remove()
        try {
          let email = { email: document.querySelector('a[class="mailapp"]').innerHTML }
          list.push(email)
        } catch (error) {
          try {
            await document.querySelector('button[class="show-phone"]').click()
            await new Promise(r => setTimeout(r, 8000))
            let email = {email: document.querySelector('span[id="reply-tel-number"]').innerHTML}
            list.push(email)
          } catch (error) {
            list.push({ email: "" })
          }
        }
        try {
          let headlines = { title: document.querySelector('span[class=postingtitletext]').textContent }
          list.push(headlines)
        } catch (error) {
          list.push({ title: "" })
        }
        try {
          let area = { address: document.querySelector('div[class=mapaddress]').innerHTML }
          list.push(area)
        } catch (error) {
          list.push({ address: "" })
        }
        try {
          let desc = { desc: document.querySelector('section[id=postingbody').innerHTML }
          list.push(desc)
        } catch (error) {
          list.push({ desc: "" })
        }
        try {
         
          let post_id = { post_id: document.querySelector('p[class="postinginfo"]').innerHTML }
          list.push(post_id)
        } catch (error) {
          list.push({ post_id: "" })
        }
        return list
      })
      data_list.push(data)
    } catch (error) {
      continue
    }
  }
  status_scrape = 1
  return data_list
}

app.get('/test',async(req,res)=>{
  // let url_list = ['https://boston.craigslist.org/nos/off/d/newburyport-office-space-available/7167099745.html']
  // res.send(await scraping2(url_list))
  res.send(await scraping_location())
})

let scraping_location = async()=>{
  const browser = await puppeteer.launch()
  let page = await browser.newPage()
  await page.goto('https://newyork.craigslist.org/',{ waitUntil: 'networkidle0' })

  
  let data = page.evaluate(async()=>{
    let cities_list = []
    let parent_el =  document.querySelector('#rightbar > ul > li:nth-child(2) > ul').getElementsByClassName('s')
        // for(let i = 0; i < parent_el.length; ++i){
    //   try {
    //     cities_list.push(
    //       { 
    //         display_name : parent_el[i].textContent,
    //         value : toString(parent_el[i].href)
    //       }
    //     )
    //   } catch (error) {
    //     console.log(error)
    //   }
    // }
    // return cities_list

    for(let i = 1; i <= parent_el.length; ++i){
      let el = document.querySelector(`#rightbar > ul > li:nth-child(2) > ul > li:nth-child(${i}) > a`)
      try {
        cities_list.push(
          { 
            display_name : el.textContent,
            value : el.getAttribute('href')
          }
        )
      } catch (error) {
        console.log(error)
      }
    }
    return cities_list
  })
  console.log(await data)
  fs.writeFile("../frontend/countries.json",JSON.stringify(await data),'utf8',(er)=>{
    if(er){
      return console.log(er)
    }
    console.log('success')
  })


  return data
}
app.listen(3000)