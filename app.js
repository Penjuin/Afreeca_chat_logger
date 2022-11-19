let browserPath = '엣지 실행 프로그램 주소(~/edge.exe 형태)';

const puppeteer = require('puppeteer');
const fs = require('fs');
const id = "비제이 아이디";
const url = `https://bj.afreecatv.com/${id}`;

let endTimer;

if (browserPath === '엣지 실행 프로그램 주소(~/edge.exe 형태)') {
    browserPath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
}

async function writeLog() {
    console.log('Connecting...');
    const broad_no = await getBroadNo();
    console.log(broad_no);
    if (!broad_no) {
        console.log('BroadCast is offline');
        setTimeout(() => writeLog(), 6000);
        return;
    }
    clearTimeout(endTimer);
    const pageUrl = `https://play.afreecatv.com/${id}/${broad_no}`;

    const browser = await puppeteer.launch(
        {
            headless: true,
            executablePath: browserPath,
            defaultViewport: {
                width: 1920,
                height: 1080,
            }
        }
    );
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    
    // const client = await page.target().createCDPSession();
    // await client.send('Network.enable');
    // client.on('Network.webSocketFrameReceived', ({ requestId, timestamp, response }) => {
    // });

    page.on('request', request => {
        const url = request.url().toLowerCase();
        const resourceType = request.resourceType();

        if (resourceType == 'media' ||
          url.includes('.mp4') ||
          url.includes('.avi') ||
          url.includes('.flv') ||
          url.includes('.mov') ||
          url.includes('.wmv') ||
          url.includes('stream') ||
          url.includes('localhost')) {
            console.log(`ABORTING: video`)
            request.abort();
        }
        else
          request.continue();
      });
    await page.goto(pageUrl, {
        load: true,
    });
    console.log("loaded");

    await page.mouse.move(500, 500);
    await page.mouse.down();
    await page.mouse.up();

    setTimeout(() =>{
        page.$eval('#videoLayer', (video) => {
            video.remove();
        });
    }, 10000);

    setInterval(async () => {
        const isLive = await page.$('#chat_area > div.box_Vend');
        if (isLive) {
            endTimer = setTimeout(() => {
                browser.close();
                writeLog();
                return;
            }, 360000);
        }
        const chatLogs = await page.$$eval('#chat_area > dl', (chatList) => {
            const rawDate = new Date();
            let Year = String(rawDate.getFullYear());
            let Month = String(rawDate.getMonth() + 1);
            let Day = String(rawDate.getDate());
            let Hour = String(rawDate.getHours());
            let Min = String(rawDate.getMinutes());
            let Sec = String(rawDate.getSeconds());
            if (Month.length === 1) {
                Month = `0${Month}`;
            };
            if (Day.length === 1) {
                Day = `0${Day}`;
            };
            if (Hour.length === 1) {
                Hour = `0${Hour}`;
            };
            if (Min.length === 1) {
                Min = `0${Min}`;
            };
            if (Sec.length === 1) {
                Sec = `0${Sec}`;
            };
            const chatLogs = [];
            const date = `${Year}-${Month}-${Day} ${Hour}:${Min}:${Sec}`;
            for (const chat of chatList) {
                const nick = chat.querySelector('a').attributes.user_nick.value;
                const id = chat.attributes.user_id.value;
                const msg = chat.querySelector('dd').textContent;
                const log = `[${date}] <${nick} (${id})> ${msg}`;
                chatLogs.push(log);
                chat.remove();
            }
            return chatLogs;
        });
        if (chatLogs.length === 0) {
            return;
        }
        console.log(chatLogs);
        const rawDate = new Date();
        let Year = String(rawDate.getFullYear());
        let Month = String(rawDate.getMonth() + 1);
        if (Month.length === 1) {
            Month = `0${Month}`;
        };
        const date = `${Year}-${Month}`;
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
        }
        if (!fs.existsSync(`logs/${date}.txt`)) {
            const createStream = fs.createWriteStream(`logs/${date}.txt`);
            // fs.appendFileSync(`logs${date}.txt`);
            createStream.end();
        }
        const writeStream = fs.createWriteStream(`logs/${date}.txt`, {flags: 'a'});
        chatLogs.forEach(chat => {
            writeStream.write(chat + '\n');
        });
        writeStream.end();
    }, 500);
}

async function getBroadNo() {
    const browser = await puppeteer.launch({
    });
    const page = await browser.newPage();
    await page.goto(url, {
        load: true
    });
    let isLive = await page.$('.onAir_box');
    if (!isLive) {
        return;
    }
    let broad_no = await page.$eval('div.onAir_box > a > span > img', async (img) => {
        const src = img?.src;
        const broad_no = src?.split('/')[4].split('.')[0];
        return broad_no;
    })
    if (!broad_no) {
        return;
    }
    await browser.close();
    return broad_no;
}

writeLog();