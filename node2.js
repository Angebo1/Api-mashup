const fs = require("fs");
const url =require("url");
const http = require("http");
const https = require("https");
const { parse } = require("path");
const crypto = require("crypto");
const querystring = require("querystring");
const coinGecko = require("coingecko-api");

const coinGeckoClient = new coinGecko();
const {consumer_key}= require("./auth/credentials.json");

const port = 3000;
const all_sessions = [];
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
        let user_input = url.parse(req.url, true).query;
        if(user_input == null){
            err(res);
        }
        const{name}= user_input;
        const state = crypto.randomBytes(20).toString("hex");
        all_sessions.push({name, state});
        redirect_to_pocket(state, res);
    }
    else if(req.url.startsWith("/receive_code")){
        const {code, state} = url.parse(req.url, true).query;
        let session = all_sessions.find(session => session.state === state);
        if (code === undefined || state === undefined || session === undefined){
            err(res);
            return;
        }
        const {name} = session;
        send_access_token_req(code, {name}, res);
    }
    else{
        err(res);
    } 
}

function err(res){
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end(`<h1>404 Not Found</h1>`);
}

function redirect_to_pocket(state, res){
    const auth_endpoint = "https://getpocket.com/v3/oauth/authorize";
    let uri = querystring.stringify({consumer_key, state});
    res.writeHead(302, {Location: `${auth_endpoint}?${uri}`}).end();
}
    
    
function send_access_token_req(code, name, res){
    const token_endpoint = "https://getpocket.com/v3/oauth/request";
    let post = querystring.stringify({consumer_key, code});
    let options = {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            consumer_key:
        }
    }
    https.request(
        token_endpoint,
        options,
        (token_stream) => process_stream(token_stream, receive_access_token, name, res)
    ).end(post);   
}

function process_stream(stream, callback, ...args){
    let body = "";
    stream.on("data", chunk => body += chunk);
    stream.on("end", () => callback(body, ...args));
}

function receive_access_token(body, name, res){
	const {access_token} = JSON.parse(body);
	get_coingecko_info(name, access_token, res);
}


function get_coingecko_info(name, access_token, res){
    const gecko_endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${name}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`;
    https.request(
        gecko_endpoint, 
        {method:"GET"}, 
        (crypto_stream) => process_stream(crypto_stream, receive_coin_results, name, access_token, res)
    ).end();
}

function receive_coin_results(body, name, access_token, res){
    const crypto = JSON.parse(body);
    create_pocket(crypto, name, access_token, res);
}

function create_pocket(crypto, name, access_token, res){
    let price, market_cap, volume;
    for (let name in crypto){
        price = crypto[name]["usd"];
        market_cap = crypto[name]["usd_market_cap"];
        volume = crypto[name]["usd_24h_vol"];
    }
    const task_endpoint = "https://getpocket.com/v3/add";
    const options = {
        method:"POST",
        headers: {
            "Content-Type": "application/json",
            consumer_key: `${access_token}`
        }
    }
    const post_data = JSON.stringify({content: 
        `<h2>${name}</h2>
        <p>Price: $ ${price}</p>
        <p>Market cap: ${market_cap}</p>
        <p>Volume: ${volume}`}
    );
    
    https.request(
        task_endpoint,
        options,
        (task_stream) => process_stream(task_stream, receive_pocket_response, crypto, acess_token, res)
        ).end(post_data);
}

function receive_pocket_response(body, crypto, access_token, res){
    const results = JSON.parse(body);
    create_pocket(crypto, results.items.id, access_token, res);
}
function create_pocket(crypto, parent, access_token, res){
    const task2_endpoint = "https://getpocket.com/v3/add";
    const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			consumer_key: `${access_token}`
		}
	}
	let tasks_added_count = 0;
	crypto.forEach(create_task);
    function create_task({name, url}){
        const post_data = JSON.stringify({content:`${name}\n${url}`, parent});
		https.request(
			task_endpoint, 
			options, 
			(task_stream) => process_stream(task_stream, receive_task_response, res)
		).end(post_data);
    }
    function receive_task_response(body, res){
        tasks_added_count++;
		if(tasks_added_count === crypto.length){
			res.writeHead(302, {Location: `https://getpocket.com/read/${parent}`})
			   .end();
		}
    }
}
