const fs = require("fs");
const url =require("url");
const http = require("http");
const https = require("https");
const { parse } = require("path");
const querystring = require("querystring");
const coinGecko = require("coingecko-api");

const coinGeckoClient = new coinGecko();
const pb_apikey = "CK6pMm9Z7DIy2r3YZEVHGKi01YNYhC_-";

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
        const state = crypto.randomBytes(20).toString("hex");
        crypto_info(name, res);
    }
    else if(req.url.startsWith("/receive_code")){
		const {state} = url.parse(req.url, true).query;
		let session = all_sessions.find(session => session.state === state);
        if(code === undefined || state === undefined || session === undefined){
			not_found(res);
			return;
		}
		const {description, location} = session;
		send_access_token_request(code, {description, location}, res);
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
    pastebin(price, market_cap, volume);
    function pastebin(price, market_cap, volume){
        const pb_url = "https://pastebin.com/api/api_post.php";
        const options = {
            method: "POST",
            headers:{
                "Content-Type": "application/x-www-form-urlencoded",
                api_dev_key: pb_apikey,
                api_option: "paste",
                api_paste_code: `<h1>${name}</h1><p>${price}</p><p>${market_cap}</p><p>${volume}</p>`,
                api_paste_private: "0",
                api_paste_format: "php"
            }
        }
        https.request(pb_url, options, (pb_stream)=>process_stream(pb_stream, results, res)).end();
    }
}

function results(body, res){
    const results = JSON.stringify(body);
    done(results, res);
}
function done (body, res){
    const end = JSON.parse(body);
    res.writeHead(302, {Location: `${end.url}`}).end();
}
