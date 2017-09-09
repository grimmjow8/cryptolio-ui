// TODO add crash reporter

// TODO use heavyTable.js?
var nodeConsole = require('console');
var LOG = new nodeConsole.Console(process.stdout, process.stderr);

var Datastore = require('nedb');
var mkdirp = require('mkdirp');
var ADDR_DIR = process.env.HOME + "/.cryptolio";
var ADDR_FILE = ADDR_DIR + "/transactions.db";
db = null;

// curl -X GET -H "content-type:application/json" "https://crypto-wallet-dev.appspot.com/transactions?address=rJ9z6DD5nFjc2L9AoYZA66nuWA46msab6K&key=AIzaSyAoEpj7vskFz--n-AMwTQyk_e9OE0sKFsE&currency=XRP"
//var URL = "https://crypto-wallet-dev.appspot.com";
var URL = "http://localhost:5000"
var URL_KEY = "key=AIzaSyAoEpj7vskFz--n-AMwTQyk_e9OE0sKFsE"

window.onload = function() {
    var pad = document.getElementById('pad');

    document.querySelector('#dash').addEventListener('click', loadBalance1)
    document.querySelector('#xrp').addEventListener('click', loadBalance2)
    document.querySelector('#btc').addEventListener('click', loadBalance3)
    document.querySelector('#eth').addEventListener('click', loadBalance4)

    mkdirp(ADDR_DIR, function (err) {
        if (err) {
            LOG.log("error loading db: " + ADDR_DIR);
            LOG.log(err)
        } else {
            LOG.log("success loading db: " + ADDR_FILE);
            db = new Datastore({ filename: ADDR_FILE, autoload: true });

            if (db == null) {
                alert("FAILED TO LOAD DB");
            }
        }
    });


}

// TODO: this calculates the scrollbar with for the table
// window.resize = function() {
//   var scrollWidth = $('.tbl-content').width() - $('.tbl-content table').width();
//   $('.tbl-header').css({'padding-right':scrollWidth});
// }).resize();

var CRYPTO_TICKER_MAP = {
   "xrp": "ripple"
};

function loadBalance1() {
    LOG.log('loadBalance dash');
    removeActive();
    addActive("dash");
    loadDb("dash");
    setType("dash");
}


function loadBalance2() {
    LOG.log('loadBalance xrp');
    removeActive();
    addActive("xrp");
    loadDb("xrp");
    setType("xrp");
}

function loadBalance3() {
    LOG.log('loadBalance btc');
    removeActive();
    addActive("btc");
    loadDb("btc");
    setType("btc");
}

function loadBalance4() {
    LOG.log('loadBalance eth');
    removeActive();
    addActive("eth");
    loadDb("eth");
    setType("eth");
}

function setType(cryptoType) {
    document.querySelector('#addrType').innerHTML = cryptoType;
}

function loadDb(cryptoType) {
    var url7 = "https://api.coinmarketcap.com/v1/global";
    var response7 = httpGet2(url7);
    var globalMartketCap = response7.total_market_cap_usd;


     var answerArea = document.getElementById('addrBalance');
     answerArea.innerHTML = "";

     db.find({}, function (err, docs) {
        var cnt = 1;
        LOG.log("loading addresses stored in db: " + cryptoType);
     //   var str = "<br />Reloading addresses stored in db: \n<br />"
        var str = "";
        var str3 = "";
        var finalStr = "";

// TODO: save historical prices for a particular transactions, likely won't change unless manually changed
// TODO: add npm install node-cache, 5 minute auto refresh on items
// TODO: better manage periodic updates using last load times

        // TODO create module for this
        var costBasis = 0;
        var balance = 0;
        var bal2 = 0;

        var url5 = "https://min-api.cryptocompare.com/data/price?fsym=" + cryptoType.toUpperCase() + "&tsyms=USD";
        var response4 = httpGet2(url5);


        if (docs != null) {
            docs.forEach(function callback(currentValue, index, array) {
                currentValue.addresses.forEach(function callback(currV, i, a) {
                    // answerArea.innerHTML = JSON.stringify(currV);

                    if (currV.type !== cryptoType) {
               //         LOG.log("type: " + cryptoType + " != " + currV.type + " addr: " + currV.address);
                        return;
                    }

                    LOG.log("processing type: " + cryptoType + ", addr: " + currV.address);
                    var url2 = URL + "/addressBalance?" + URL_KEY + "&address=" + currV.address + "&currency=" + cryptoType;
                    var response = httpGet2(url2);
                    cnt++;
                    LOG.log(" completed request #1");

                    str += "addr: " + currV.address + " bal: " + response.apiBalance + "\n<br />";
                    balance = response.apiBalance;

                    var url3 = URL + "/transactions?" + URL_KEY + "&address=" + currV.address + "&currency=" + cryptoType;
                    var response2 = httpGet2(url3);
                    LOG.log("sdsfsdfsdfsdf " + JSON.stringify(response2.transactions));
                    LOG.log(" completed request #2");

                    response2.transactions.forEach(function(item)
                    {
                        //str2 += JSON.stringify(item);
                        var timeInMillis = Date.parse(item.date) / 1000;

                        // TODO move this to its own docker api image
                        var url4 = "https://min-api.cryptocompare.com/data/histoday?fsym=" + cryptoType.toUpperCase() + "&tsym=USD&toTs=" + timeInMillis + "&limit=1";
                        var response3 = httpGet2(url4);
                        LOG.log("url: " + url4 + " data: " + JSON.stringify(response3));

                        var adjustend = item.tx.Amount / 1000000;

                        var localCost = adjustend * response3.Data[0].close;

                        costBasis += localCost;
                        bal2 += adjustend;

                        finalStr += "<tr>";
                        finalStr += "<td>" + item.date + "</td>";
                        finalStr += "<td>" + adjustend + "</td>";
                   //     finalStr += "<td>" + item.tx.Amount + "</td>";
                        finalStr += "<td>" + response3.Data[0].close + "</td>";

                        // TODO final upper and lower for day, give cost basis range?
                        finalStr += "<td>" + localCost.toFixed(2) + "</td>";
                        var localVal = (adjustend * response4.USD).toFixed(2);
                        finalStr += "<td>" + (localVal) + "</td>";

                        var currVal = (localVal - localCost).toFixed(2);
                        finalStr += "<td>" + (currVal) + "</td>";
                        finalStr += "<td>" + ((localVal - localCost)/localCost*100).toFixed(2) + "</td>"; // TODO colorize as red if negative

                        finalStr += "</tr>";

                    });

                    LOG.log(" completed request #3");

                    // prices:
                    // https://www.cryptocompare.com/api/#-api-data-coinsnapshot-
                    // https://opendata.stackexchange.com/questions/6884/cryptocurrency-historical-prices

                    // https://min-api.cryptocompare.com/data/histoday?fsym=XRP&tsym=USD&toTs=1493694697
                });
            });
        }

        // TODO use prices endpoint?
        // TODO allow user to select currency
        var summaryStr = "";
        summaryStr += "<tr><td>Shares</td><td>" + bal2 + "</td>";
        summaryStr += "<tr><td>Cost Basis</td><td>" + costBasis.toFixed(2) + "</td>";
        summaryStr += "<tr><td>Current Value ($)</td><td>" + (balance * response4.USD).toFixed(2) + "</td>";

        var rrr = ((balance * response4.USD) - costBasis).toFixed(2);
        summaryStr += "<tr><td>Profit/Loss ($)</td><td>" + rrr + "</td>";
        summaryStr += "<tr><td>Profit/Loss (%)</td><td>" + (rrr/costBasis*100).toFixed(2) + "</td>";
        summaryStr += "<tr><td>Portfolio Percentage</td><td>" + "n/a" + "</td>";
        summaryStr += "<tr><td>Deviation</td><td>" + "n/a" + "</td>";

        var url6 = "https://api.coinmarketcap.com/v1/ticker/" + CRYPTO_TICKER_MAP[cryptoType.toLowerCase()];
        var response6 = httpGet2(url6)[0];
        var marketStr = "";
        LOG.log("\n\n\n\n" + Object.keys(response6));

        marketStr += "<tr><td>Name</td><td>" + response6.name + "</td>";
        marketStr += "<tr><td>Symbol</td><td>" + response6.symbol + "</td>";
        marketStr += "<tr><td>Rank</td><td>" + response6.rank + "</td>";
        marketStr += "<tr><td>Price USD</td><td>" + response6.price_usd + "</td>";

        var nf = new Intl.NumberFormat();
        marketStr += "<tr><td>24h Volume USD</td><td>" + nf.format(response6['24h_volume_usd']) + "</td>";
        marketStr += "<tr><td>Market Cap USD</td><td>" + nf.format(response6.market_cap_usd) + "</td>";
        marketStr += "<tr><td>Available Supply</td><td>" + nf.format(response6.available_supply) + "</td>";
        marketStr += "<tr><td>Total Supply</td><td>" + nf.format(response6.total_supply) + "</td>";
        marketStr += "<tr><td>Market Percent</td><td>" + (response6.market_cap_usd/globalMartketCap*100).toFixed(2) + "</td>";
        marketStr += "<tr><td>Percent Change 1h</td><td>" + response6.percent_change_1h + "</td>";
        marketStr += "<tr><td>Percent Change 24h</td><td>" + response6.percent_change_24h + "</td>";
        marketStr += "<tr><td>Percent Change 7d</td><td>" + response6.percent_change_7d + "</td>";

        LOG.log("url: " + url6 + " data: " + JSON.stringify(response6));

        if (cnt > 1) {
            answerArea.innerHTML = str;
            document.getElementById("txnTable").innerHTML = finalStr;
            document.getElementById("summaryTable").innerHTML = summaryStr;
            document.getElementById("marketSummaryTable").innerHTML = marketStr;
        }
    });
}

function removeActive() {
    document.getElementById("dash").classList.remove('active');
    document.getElementById("xrp").classList.remove('active');
    document.getElementById("btc").classList.remove('active');
    document.getElementById("eth").classList.remove('active');
}

function addActive(className) {
    document.getElementById(className).classList.add('active');
}

function getBalance() {
    var answerArea = document.getElementById('answer');
    var submitBtn = document.getElementById('submitBtn');
    var addr = document.getElementById('addrField').value;

    // var e = document.getElementById("addrFieldList");
    // var cryptoType1 = e.options[e.selectedIndex].value;
    // var cryptoType2 = e.options[e.selectedIndex].text;
    var cryptoType = document.getElementById('addrType').innerHTML;


    LOG.log("getBalance addr: " + addr + ", type: " + cryptoType);


    var url2 = URL + "/addressBalance?" + URL_KEY + "&address=" + addr + "&currency=" + cryptoType;

    // var response = httpGet(url2);
    // var display = "entered addr: " + addr + "\n<br />"
    //    + "url: " + url2 + "\n <br />"
    //    + "response: " + response
    // answerArea.innerHTML = display;

    // save address in db
    // cache results - allow refresh every 5 minutes
    //   monitor app activite, disable refresh is inactive for 30 minutes or window minimized
    // start off with manual refresh???
    // var doc = { hello: 'world'
//           , n: 5
//           , today: new Date()
//           , nedbIsAwesome: true
//           , notthere: null
//           , notToBeSaved: undefined  // Will not be saved
//           , fruits: [ 'apple', 'orange', 'pear' ]
//           , infos: { name: 'nedb' }
// };


    /*
        save address to db
    */
    var doc = {addresses: [{address: addr, type: cryptoType}]};
    //   addresses: [{address: addr, type: dash}, {....}]
    // or
    //   addresses: {dash: [], bitcoin: []}
    db.insert(doc, function (err, newDoc) {
      // Callback is optional
      // newDoc is the newly inserted document, including its _id
      // newDoc has no key called notToBeSaved since its value was undefined
    });
}

function httpGet(theUrl) {
  // TODO move to it's own thread
  // TOD
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function httpGet2(theUrl) {
  return JSON.parse(httpGet(theUrl));
}




// NOTE logging
// https://stackoverflow.com/questions/31759367/using-console-log-in-electron-app

// electron notes
// open dev tool: Ctrl+Shift+I
// auto reload: https://medium.com/@jimmco/electron-apps-and-live-reload-2a4d621a9fcd
