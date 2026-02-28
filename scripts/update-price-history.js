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

  const lastCandle = candleEntries[candleEntries.length - 2];
  const lastCandleTimestamp = Number(lastCandle[0]);

  let newEntries = await getNewPriceData(lastCandleTimestamp);
  if (!newEntries || newEntries.length === 0) {
    throw new Error("Price data not retrieved or is empty");
  }

  newEntries = newEntries.map(entry => entry.map(val => Number(val)));

  // ✅更稳：删掉所有 >= since 的旧数据，确保完全覆盖重叠区间
  candleEntries = candleEntries.filter(candle => Number(candle[0]) < lastCandleTimestamp);

  // ✅兜底：如果 Kraken 返回里仍有重复时间戳，用 Map 去重（可选但推荐）
  const merged = new Map(candleEntries.map(e => [Number(e[0]), e]));
  for (const e of newEntries) merged.set(Number(e[0]), e);

  candleEntries = Array.from(merged.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);

  candleData.candles = candleEntries;
  writeCandleData(candleData);

  console.log("Added new entries. Total candles count:", candleEntries.length);
}

getNewCandles();
