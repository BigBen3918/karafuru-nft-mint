import * as ethers from 'ethers'
import * as abi from './abis/karafuru.json'
import { setlog, callRpc, now } from './helper'

const isTest = Number(process.env.TEST || 0) === 1
require('dotenv').config()
const colors = require('colors')

const ownerKey = process.env.PRIVATEKEY || ''
const keys = [
    process.env.KEY1 || '',
    process.env.KEY2 || '',
]
const chain = "eth"
let chainId = 0

const MAX_QTY_PER_MINTER = 2
const MAX_GAS = 400

const rpcApi = process.env[ 'RPC' + (isTest ? '_TEST' : '')] || ''
const nftTokenAddress = process.env[ 'KARAFURU' + (isTest ? '_TEST' : '')] || ''
const provider = new ethers.providers.JsonRpcProvider(rpcApi)

const ws = {} as {
    [address:string]:{
        key:string
        tx?:string
        gasPrice?:number
        balance:number
        nonce:number
        complete?:boolean
    }
}
let pools = {} as {[txid:string]:boolean}


let basePrice = 0;
let poolPrice = 0;

const initialize = async ():Promise<void> => {
	try {
        setlog("app " + colors.yellow('started'))
        for(let key of keys) {
            if ( key ) {
                const wallet = new ethers.Wallet(key, provider)
                const address = wallet.address.toLowerCase()
                const nonce = await provider.getTransactionCount(address)
                const balance = Number(ethers.utils.formatEther(await provider.getBalance(address)))
                if (typeof nonce==='number') {
                    ws[address] = { key, nonce, balance }
                    setlog('\t' + colors.green(address) + ' balance=' + balance + 'ETH, nonce #' + nonce)
                }
            }
        }
	} catch (error) {
		setlog("initialize", error)
	}
}
/* const getTxsJson = (txs: string[]): JsonType[] => {
    return txs.map((i,k) => ({"jsonrpc":"2.0", "id":k, "method":"eth_getTransactionReceipt", "params":[i]}))
}

const getLatestBlockNumber = async (): Promise<number> => {
    const response = await callRpc(chain, rpcApi, {"jsonrpc":"2.0", "method":"eth_blockNumber", "params":[], "id":1});
    if (response) return Number(response.result)
    return 0
} */
const getMemPool = async (): Promise<void> => {
    let count = 0;
    const response = await callRpc(chain, rpcApi, {"jsonrpc":"2.0", "method":"txpool_content", "params":[], "id":1});
    if (response && response.result && response.result.pending) {
        poolPrice = 0
        const {queued, pending} = response.result
        const timestamp = now()
        const txlist = [] as Array<string>
        for(let addr in pending) {
            for(let k in pending[addr]) {
                getTransactionFromRaw(pending[addr][k], 0, timestamp)
                /* let hash=pending[addr][k].hash;
                if (pools[hash]===undefined) txlist.push(pending[addr][k]); */
            }
        }
        /* for(let addr in queued) {
            for(let k in queued[addr]) {
                getTransactionFromRaw(pending[addr][k], 0, timestamp)
                let hash=queued[addr][k].hash;
                if (pools[hash]===undefined) txlist.push(queued[addr][k]);
            }
        } */
        setlog("\tpoolPrice： " + poolPrice + 'GWEI', null, true)
        count = txlist.length
        /* pools = {}
        for (let i of txlist) pools[getTransactionFromRaw(i, 0, timestamp)]=true */
    }
    setlog("checking pool: " + (Object.keys(pools).length) + ' / ' + count, null, true)
}

const getTransactionFromRaw = (tx:any,height:number,created:number):string => {
    try {
        const to = tx.to ? tx.to.toLowerCase() : ''

        let from = tx.from.toLowerCase()
        
        if (to === nftTokenAddress)  {
            if (ws[from]===undefined) {
                const gas = Number(ethers.utils.formatUnits(tx.gasPrice, 9))
                if (gas > poolPrice) {
                    poolPrice = gas
                }
            }
            if (tx.input!=='0x') {
                /* let c = this.net.tokens[to]
                if (c!==undefined) {
                    const method = tx.input.slice(2,34)
                    if (method==='a9059cbb000000000000000000000000') {
                        contract = to
                        coin = c.symbol
                        to = '0x' + tx.input.slice(34, 74).toLowerCase()
                        value = '0x' + BigInt('0x' + tx.input.slice(74)).toString(16)
                        // console.log('method', method, 'to', to, 'value', value)
                    }
                } */
            }
        }
    } catch (error:any) {
        setlog(error)
    }
    return tx.hash
}

const readPool = async () => {
    try {

        await getMemPool()
    } catch (error:any) {
        setlog(chain, error)
    }
    setTimeout(()=>readPool(),100);
}

const cronMint = async () => {
    try {
        const time = now()
        const nft = new ethers.Contract(nftTokenAddress, abi, provider)
        const price = await provider.getGasPrice()
        if (price) {
            basePrice = Number(ethers.utils.formatUnits(price, 9))
        }
        const started = await nft.isPublicSalesActivated()
        if (started) {
            setlog(`\t PublicSale started`, null, true)
            const lists = [] as any[]
            for(let address in ws) {
                if (!ws[address].complete===true) {
                    if (ws[address].balance > 1.3) {
                        lists.push(mintProcess(address))
                    } else {
                        setlog(`\t No enough balance to paricipate PublicSale (Including gas fee, min 1.2ETH )`, null, true)           
                    }
                }
            }
            if (lists.length) await Promise.all(lists)
        } else {
            const saleTime = Number(await nft.publicSalesStartTime())
            if (saleTime===0) {
                setlog(`\t PublicSaleTime did not setup yet.`, null, true)
            } else {
                const diff = saleTime - time
                if (diff > 0) {
                    const hh = Math.floor(diff / 3600)
                    const mm = Math.floor((diff%3600) / 60)
                    const ss = Math.floor(diff%60)
                    setlog(`\t sale time:  ${hh}:${mm}:${ss}`, null, true)
                }
            }
        }
    } catch (error:any) {
        setlog(chain, error)
    }
    setTimeout(()=>cronMint(), 100);
}

const mintProcess = async (address:string) => {
    const w = ws[address]
    try {
        if (w.tx && w.gasPrice) {
            let res=await callRpc(chain, rpcApi, {"jsonrpc":"2.0", "method":"eth_getTransactionReceipt", "params":[w.tx], "id":1})
            if (res) {
                w.complete = true
                setlog(address, 'complete [' + w.tx + ']')
            } else {
                
                if (w.gasPrice < poolPrice) {
                    setlog("publicSalesMint remint " + address + ' price: ' + (poolPrice + 10))
                    await publicSalesMint(w.key, w.nonce, poolPrice + 10)
                }
            }
        } else {
            const price = basePrice > poolPrice ? basePrice : poolPrice
            await publicSalesMint(w.key, w.nonce, price + 10)
            setlog("publicSalesMint first mint " + address )
        }
    } catch (error) {
        setlog("mintProcess", error)
    }
}

const publicSalesMint = async (key:string, nonce:number,  gas:number):Promise<void> => {
	try {
        const wallet = new ethers.Wallet(key, provider)
        const multiTransfer = new ethers.Contract(nftTokenAddress, abi, wallet)
        if (gas>MAX_GAS) gas = MAX_GAS
        const gasPrice = ethers.utils.parseUnits(String(gas), 9).toHexString();
        const value = ethers.utils.parseEther(String(0.5 * MAX_QTY_PER_MINTER)).toHexString();
        const options = { value, gasPrice , gasLimit: String(1e6), nonce };
        const gasLimit = await multiTransfer.estimateGas.publicSalesMint(MAX_QTY_PER_MINTER, options)
        options.gasLimit = gasLimit.toHexString()
        const response = await multiTransfer.publicSalesMint(MAX_QTY_PER_MINTER, options)
        if (response && response.hash) {

            ws[wallet.address.toLowerCase()].gasPrice = gas
            ws[wallet.address.toLowerCase()].tx = response.hash
            setlog("publicSalesMint success " + colors.yellow(response.hash))
            return response.hash
        }
	} catch (error) {
		setlog("publicSalesMint", error)
	}
}

const publicSalesStart = async (time:number):Promise<void> => {
	try {
        const wallet = new ethers.Wallet(ownerKey, provider)
        const nft = new ethers.Contract(nftTokenAddress, abi, wallet)
        const response = await nft.setPublicSalesTime(time)
        if (response && response.hash) {
            setlog("publicSales start", response.hash)
        }
	} catch (error) {
		setlog("publicSalesMint", error)
	}
}

(async ()=>{
    const res = await provider.getNetwork()
    chainId = res.chainId
    setlog("Chain ID: " + chainId)
    await initialize()
    await readPool()
    if (isTest) {
        await publicSalesStart(now() + 60)
    }
    await cronMint()
})()
