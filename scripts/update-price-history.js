import * as fs from "fs";
import fetch from "node-fetch";

const dataPath = "./public/data/price-candles.json";
const newDataPath = "./public/data/price-candles.json";

function getCandleData() {
  const priceCandlesFileBuffer = fs.readFileSync(dataPath);
  return JSON.parse(priceCandlesFileBuffer);
}

function writeCandleData(candleData) {
  const stringCandleData = JSON.stringify(candleData, null, 2);
  fs.writeFileSync(newDataPath, stringCandleData);
}

async function getNewPriceData(sinceTimestamp) {
  const queryUrl = "https://api.kraken.com/0/public/OHLC?";
  const queryParams = {
    pair: "BTCUSD",
    interval: 1440, // Interval in minutes; 1440 per day
    since: sinceTimestamp,
  };
  const res = await fetch(queryUrl + new URLSearchParams(queryParams));
  const data = await res.json();
  return data.result && data.result["XXBTZUSD"];
}

async function getNewCandles() {
  const candleData = getCandleData();
  let candleEntries = candleData.candles;
  
  // 拿倒数第二个值作为起点是很好的做法，能确保最后一个未收盘的 K 线被更新
  const lastCandle = candleEntries[candleEntries.length-2]; 
  const lastCandleTimestamp = lastCandle[0];
  let newEntries = await getNewPriceData(lastCandleTimestamp);

  if (!newEntries || newEntries.length === 0) {
    throw "Price data not retrieved or is empty";
  }

  // Convert string values to numbers.
  newEntries = newEntries.map(entry => entry.map(val => Number(val)));

  // 获取新抓取的数据第一条的时间戳
  const firstNewTimestamp = newEntries[0][0];

  // 过滤掉所有与新数据产生重叠的旧 K 线数据
  candleEntries = candleEntries.filter(candle => candle[0] < firstNewTimestamp);
  
  // 拼接新数据
  candleEntries = candleEntries.concat(newEntries);
  candleData.candles = candleEntries;

  // Write the new data.
  writeCandleData(candleData);

  console.log('Added new entries. Total candles count:', candleEntries.length);
}

getNewCandles();
