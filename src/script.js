// TODO add crash reporter
// TODO use heavyTable.js?

// perform setup of loggerand db
var nodeConsole = require('console');
var LOG = new nodeConsole.Console(process.stdout, process.stderr);

var datastore = require('nedb');
var mkdirp = require('mkdirp');
var ADDR_DIR = process.env.HOME + "/.cryptolio";
var ADDR_FILE = ADDR_DIR + "/transactions.db";
db = null;

// TODO dynamically load this from an exchange or something
var CRYPTO_TICKER_MAP = {
   "xrp": "ripple",
   "ltc": "litecoin",
   "eth": "ethereum",
   "xem": "nem",
   "dash": "dash",
   "xlm": "stellar",
   "steem": "steem",
   "xmr": "monero",
   "btc": "bitcoin",
   "etc": "ethereum-classic",
   "bcn": "bytecoin-bcn",
   "waves": "waves",
   "sia": "siacoin",
   "dgb": "digibyte",
   "sjcx": "storjcoin-x",
   "nxt": "nxt",
   "zec": "zcash",
   "rep": "augur",
   "gnt": "golem-network-tokens",
   "ubq": "ubiq",
   "strat": "stratis",
   "gno": "gnosis-gno",
   "wings": "wings",
   "dcr": "decred",
   "mln": "melon",
   "hmq": "humaniq",
   "icn": "iconomi",
   "miota": "iota",
   "ardr": "ardor",
   "bts": "bitshares",
   "fct": "factom",
   "maid": "maidsafecoin"
};

// curl -X GET -H "content-type:application/json" "https://crypto-wallet-dev.appspot.com/transactions?address=<addr>&key=<key>&currency=XRP"
//var URL = "https://crypto-wallet-dev.appspot.com";
var API_URL = "http://localhost:5000";
var API_URL_KEY = "key=AIzaSyAoEpj7vskFz--n-AMwTQyk_e9OE0sKFsE";
var CMC_GLOBAL_URL = "https://api.coinmarketcap.com/v1/global";
var CMC_TICKER_URL = "https://api.coinmarketcap.com/v1/ticker";
var CC_PRICE_URL = "https://min-api.cryptocompare.com/data/price?tsyms=USD";
var CC_HIST_URL = "https://min-api.cryptocompare.com/data/histoday?limit=1";

// perform initial window load
window.onload = function() {
    // click listeners for main currency type
    for (var cell of document.querySelectorAll('.crypto-entry')) {
      cell.addEventListener('click',cryptoCallback,false);
    }

    // initial load of db, create if it does not exist
    mkdirp(ADDR_DIR, function (err) {
        if (err) {
            LOG.log("error loading db: " + ADDR_DIR + ", " + err);
        }
        else {
            LOG.log("success loading db: " + ADDR_FILE);
            db = new datastore({ filename: ADDR_FILE, autoload: true });

            if (db == null) {
                alert("error failed to load db: " + ADDR_FILE);
            }
            loadBalance("dash");
        }
    });
}


// Load account information for a currency
function cryptoCallback(event) {
    var currencyType = event.target.id;
    loadBalance(currencyType);
}

function loadBalance(currencyType) {
    LOG.log('loadBalance for currency: ' + currencyType);
    removeActive();
    addActive(currencyType);
    loadDb(currencyType);
    document.querySelector('#addrType').innerHTML = currencyType;
}

// Set inner html of an element given the id
function setInnerHtml(id, html) {
    document.getElementById(id).innerHTML = html;
}


// generate key/value table row with special number formatting
function nfTableRow(key, value) {
    var nf = new Intl.NumberFormat();
    return generateTableRow(key, nf.format(value));
}

// generate key/value table row
function generateTableRow(key, value) {
    return "<tr><td>" + key + "</td><td>" + value + "</td></tr>";
}

// generate a transactions table row
function createTxnRow(date, balance, closePrice, costBasis, currValue, profitNum, profilePct) {
    // TODO final upper and lower for day, give cost basis range?
    var str = "<tr>";
    str += "<td>" + date + "</td>";
    str += "<td>" + balance + "</td>";
    str += "<td>" + closePrice + "</td>";
    str += "<td>" + costBasis + "</td>";
    str += "<td>" + currValue + "</td>";
    str += "<td>" + profitNum + "</td>";
    str += "<td>" + profilePct + "</td>"; // TODO colorize as red if negative
    str += "</tr>";
    return str;
}

// load crypto type from database
function loadDb(cryptoType) {
    // load market cap data
    var globalMarketCapData = httpGet(CMC_GLOBAL_URL);
    var globalMarketCap = globalMarketCapData.total_market_cap_usd;

    // TODO completely remove empty tables, only show when populated
    var idList = ["addrBalance", "txnTable", "summaryTable", "marketSummaryTable"];
    for (index in idList) {
        setInnerHtml(idList[index], "");
    }

    // TODO: save historical prices for a particular transactions, likely won't change unless manually changed
    // TODO: add npm install node-cache, 5 minute auto refresh on items
    // TODO: better manage periodic updates using last load times

    // load each address from db, populate table
    db.find({}, function (err, docs) {
        LOG.log("loading addresses stored in db for currency: " + cryptoType);

        // table data
        var sectionAddrBalance = "";
        var sectionTxnTable = "";

        // for summary calculations
        var totCostBasis = 0;
        var totBalance = 0; // ie number of shares

        // get current crypto price for profit/loss calculations
        var currentPriceData = httpGet(CC_PRICE_URL + "&fsym=" + cryptoType.toUpperCase());
        var currentPrice = currentPriceData.USD;

        // load general market data for the currency
        var currMarketData = httpGet(CMC_TICKER_URL + "/" + CRYPTO_TICKER_MAP[cryptoType.toLowerCase()])[0];
        var sectionMarketSummary = "";

        sectionMarketSummary += generateTableRow("Name", currMarketData.name);
        sectionMarketSummary += generateTableRow("Symbol", currMarketData.symbol);
        sectionMarketSummary += generateTableRow("Rank", currMarketData.rank);
        sectionMarketSummary += generateTableRow("Price USD", currMarketData.price_usd);
        sectionMarketSummary += nfTableRow("24h Volume USD", currMarketData['24h_volume_usd']);
        sectionMarketSummary += nfTableRow("Market Cap USD", currMarketData.market_cap_usd);
        sectionMarketSummary += nfTableRow("Available Supply", currMarketData.available_supply);
        sectionMarketSummary += nfTableRow("Total Supply", currMarketData.total_supply);
        var marketPercent = (currMarketData.market_cap_usd/globalMarketCap*100);
        sectionMarketSummary += generateTableRow("Market Percent", marketPercent.toFixed(2));
        sectionMarketSummary += nfTableRow("Percent Change 1h", currMarketData.percent_change_1h);
        sectionMarketSummary += nfTableRow("Percent Change 24h", currMarketData.percent_change_24h);
        sectionMarketSummary += nfTableRow("Percent Change 7d", currMarketData.percent_change_7d);

        if (docs != null) {
            docs.forEach(function callback(grouping, index, array) {
                grouping.addresses.forEach(function callback(record, recordIndex, recordArray) {
                    if (record.type !== cryptoType) {
                        // record type does not equal the currency we are current processing
                        return;
                    }

                    // load balance data
                    LOG.log("processing type: " + cryptoType + ", addr: " + record.address);
                    var balanceUrl = API_URL + "/addressBalance?" + API_URL_KEY + "&address=" + record.address
                        + "&currency=" + cryptoType;
                    var balanceData = httpGet(balanceUrl);
                     if (!balanceData.apiBalance) {
                        // failed to load balance data from api, might be down
                        sectionAddrBalance += "error processing " + record.address + "\n<br />";
                        return;
                    }

                    totBalance = balanceData.apiBalance;
                    sectionAddrBalance += "addr: " + record.address + " bal: " + balanceData.apiBalance + "\n<br />";

                    // load transaction data
                    var transactionUrl = API_URL + "/transactions?" + API_URL_KEY + "&address=" + record.address
                        + "&currency=" + cryptoType;
                    var transactionData = httpGet(transactionUrl);
                    //LOG.log("dumping transaction data: " + JSON.stringify(transactionData.transactions));

                    // process each transaction
                    transactionData.transactions.forEach(function(item)
                    {
                        var timeInMillis = Date.parse(item.date) / 1000;

                        // TODO move this to its own docker api image

                        // price apis available:
                        // https://www.cryptocompare.com/api/#-api-data-coinsnapshot-
                        // https://opendata.stackexchange.com/questions/6884/cryptocurrency-historical-prices
                        // https://min-api.cryptocompare.com/data/histoday?fsym=XRP&tsym=USD&toTs=1493694697

                        // load price data on the day of the transactions
                        var CC_HIST_URL = "https://min-api.cryptocompare.com/data/histoday?limit=1"
                            + "&fsym=" + cryptoType.toUpperCase() + "&tsym=USD&toTs=" + timeInMillis;
                        var histData = httpGet(CC_HIST_URL);
                        var closePrice = histData.Data[0].close;
                        //LOG.log("dumping history data: " + JSON.stringify(histData));

                        // NOTE: long/unadjusted amount 'item.tx.Amount'
                        var txnBalance = item.tx.Amount / 1000000;
                        var txnCostBasis = txnBalance * closePrice;
                        var txnCurrValue = (txnBalance * currentPrice).toFixed(2);
                        var txnProfitNum = (txnCurrValue - txnCostBasis).toFixed(2);
                        var tnxProfitPct = ((txnCurrValue - txnCostBasis)/txnCostBasis*100).toFixed(2);

                        totCostBasis += txnCostBasis;
                        sectionTxnTable += createTxnRow(item.date, txnBalance, closePrice, txnCostBasis.toFixed(2),
                            txnCurrValue, txnProfitNum, tnxProfitPct);
                    });
                });
            });
        }

        // TODO use prices endpoint?
        // TODO allow user to select currency
        var sectionAccountSummary = "";
        sectionAccountSummary += "<tr><td>Shares</td><td>" + totBalance + "</td>";
        sectionAccountSummary += "<tr><td>Cost Basis</td><td>" + totCostBasis.toFixed(2) + "</td>";
        sectionAccountSummary += "<tr><td>Current Value ($)</td><td>" + (totBalance * currentPrice).toFixed(2) + "</td>";

        var totProfitNum = ((totBalance * currentPrice) - totCostBasis).toFixed(2);
        sectionAccountSummary += "<tr><td>Profit/Loss ($)</td><td>" + totProfitNum + "</td>";
        sectionAccountSummary += "<tr><td>Profit/Loss (%)</td><td>" + (totProfitNum/totCostBasis*100).toFixed(2) + "</td>";
        sectionAccountSummary += "<tr><td>Portfolio Percentage</td><td>" + "n/a" + "</td>";
        sectionAccountSummary += "<tr><td>Deviation</td><td>" + "n/a" + "</td>";

        if (sectionAddrBalance.length > 0) {
            setInnerHtml("addrBalance", sectionAddrBalance);
        }

        if (sectionTxnTable.length > 0) {
            setInnerHtml("txnTable", sectionTxnTable);
            setInnerHtml("summaryTable", sectionAccountSummary);
        }

        setInnerHtml("marketSummaryTable", sectionMarketSummary);
    });
}

// clear active class
function removeActive() {
    document.getElementById("dash").classList.remove('active');
    document.getElementById("xrp").classList.remove('active');
    document.getElementById("btc").classList.remove('active');
    document.getElementById("eth").classList.remove('active');
}

// add active class
function addActive(className) {
    document.getElementById(className).classList.add('active');
}

function getBalance() {
    var addr = document.getElementById('addrField').value;
    var cryptoType = document.getElementById('addrType').innerHTML;
    LOG.log("getBalance addr: " + addr + ", type: " + cryptoType);

    // save address to db
    var doc = {addresses: [{address: addr, type: cryptoType}]};
    //   addresses: [{address: addr, type: dash}, {....}]
    // or
    //   addresses: {dash: [], bitcoin: []}
    db.insert(doc, function (err, newDoc) {
      // Callback is optional
      // newDoc is the newly inserted document, including its _id
      // newDoc has no key called notToBeSaved since its value was undefined
      loadDb();
    });
}

function httpGet(theUrl) {
    // TODO move to it's own thread
    LOG.log("-- performing query: " + theUrl)
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return JSON.parse(xmlHttp.responseText);
}




// NOTE logging
// https://stackoverflow.com/questions/31759367/using-console-log-in-electron-app

// electron notes
// open dev tool: Ctrl+Shift+I
// auto reload: https://medium.com/@jimmco/electron-apps-and-live-reload-2a4d621a9fcd

// TODO: this calculates the scrollbar width for the table
// window.resize = function() {
//   var scrollWidth = $('.tbl-content').width() - $('.tbl-content table').width();
//   $('.tbl-header').css({'padding-right':scrollWidth});
// }).resize();