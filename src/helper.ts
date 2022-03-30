require("dotenv").config();
import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const colors = require('colors')
const secret = process.env.APP_SECRET || ''

export const now = () => Math.round(new Date().getTime()/1000)
export const hmac256 = (message:string) => crypto.createHmac('SHA256', secret).update(message).digest('hex')

export const setlog = function(title:string,msg?:any,noWrite?:boolean) {
	const date = new Date();
	const datetext:string = [date.getUTCFullYear(), ('0' + (date.getUTCMonth() + 1)).slice(-2), ('0' + date.getUTCDate()).slice(-2)].join('-')
	const timetext:string = [('0' + date.getUTCHours()).slice(-2), ('0' + date.getUTCMinutes()).slice(-2), ('0' + date.getUTCSeconds()).slice(-2)].join(':')
	let isError = false
	if (msg instanceof Error) {
		msg = msg.stack || msg.message
		isError = true
	}
	if (msg) msg = msg.split(/\r\n|\r|\n/g).map((v:any)=>'\t' + String(v)).join('\r\n')
	if (!noWrite) fs.appendFileSync(__dirname + '/../logs/' + datetext+'.log', colors.stripColors(`[${timetext}] ${title}\r\n${msg ? msg + '\r\n' : ''}`))
	if (msg && isError) msg = colors.red(msg)
	console.log(
		colors.gray('[' + timetext + ']'),
		colors.white(title),
		msg ? '\r\n' + msg : ''
	)
}

export const callRpc = async (chain:string, url:string, json:any) => {
	try {
		const response = await axios.post(url, json, {timeout: 60000, headers: {'Content-Type': 'application/json'}})
		return response.data
	} catch(error:any) {
		setlog(chain, error)
		return null
	}
}