const fs = require("fs");
const url =require("url");
const http = require("http");
const https = require("https");
const { parse } = require("path");
const coinGecko = require("coingecko-api");

const coinGeckoClient = new coinGecko();
const credentials = require("./auth/credentials.json");

const port = 3000;
const server = http.createServer();

server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
    console.log(`Now listening on port ${port}`);
}


server.on("request", request_handler);
function request_handler(req, res){
    console.log(`Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){
        const form = fs.createReadStream("main.html");
        res.writeHead(200, {"Content-Type": "text/html"});
        form.pipe(res);
    }
    else if(req.url.startsWith("/crypto")){
        res.writeHead(200, {"Content-Type": "text/html"});
        let {name} = url.parse(req.url, true).query;
        crypto_info(name, res);
    }
    else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end(`<h1>404 Not Found</h1>`);
    } 
}


async function crypto_info(name, res){
    const gecko_endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${name}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`;
    https.request(gecko_endpoint, {method:"GET"}, process_stream)
    .end();
    function process_stream(crypto_stream){
        let crypto_data = "";
        crypto_stream.on("data", chunk => crypto_data += chunk);
        crypto_stream.on("end", () => display_results(crypto_data, name, res));
    }
}

function display_results(crypto_data, name, res){
    const crypto = JSON.parse(crypto_data);
    let arr = Object.keys(crypto);
    let price= arr[0].usd;
    let market_cap = crypto.usd_market_cap;
    let volume= crypto.usd_24h_vol;
    let id = name.charAt(0).toUpperCase() + name.slice(1);
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(`<h1>Your crypto's information: </h1>${id}<p>${price}</p><p>${market_cap}</p><p>${volume}`);
}

   
