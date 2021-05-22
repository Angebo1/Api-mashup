const fs = require("fs");
const url =require("url");
const http = require("http");
const https = require("https");
const { parse } = require("path");
const querystring = require("querystring");
const coinGecko = require("coingecko-api");

const coinGeckoClient = new coinGecko();

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
        err(res);
    } 
}

function err(res){
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end(`<h1>404 Not Found</h1>`);
}

function process_stream(stream, callback, ...args){
    let body = "";
    stream.on("data", chunk => body += chunk);
    stream.on("end", () => callback(body, ...args));
}

function crypto_info(name, res){
    const gecko_endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${name}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`;
    https.request(gecko_endpoint, 
    {method:"GET"}, 
    (crypto_stream) => process_stream(crypto_stream, display_results, name, res))
    .end();
}

function display_results(crypto_data, name, res){
    const crypto = JSON.parse(crypto_data);
    let price, market_cap, volume;
    for (let name in crypto){
        price = crypto[name]["usd"];
        market_cap = crypto[name]["usd_market_cap"];
        volume = crypto[name]["usd_24h_vol"];
        
    }
    pastebin(price, market_cap, volume, res);
    function pastebin(price, market_cap, volume, res){
        const pb_url = 'https://pastebin.com/api/api_post.php';
        var options = {
            'method': 'POST',
            'headers': {
            'Content-Type': 'application/x-www-form-urlencoded',
            },
            form: {
                'api_dev_key': 'tCAlea81xIVy6_16M0qY98LVGOTEcIaA',
                'api_paste_code': `${name}\n${price}\n${market_cap}\n${volume}`,
                'api_option': 'paste'
            }
        };
        https.request(pb_url, options, (pb_stream) => redirect_to_pb(pb_stream, res)).end(); 
  
    }
    
}

function redirect_to_pb (response, res){ 
    res.writeHead(302, {Location: `${response.body}`}).end();
}
