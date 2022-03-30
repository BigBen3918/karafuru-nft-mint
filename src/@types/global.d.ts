
declare interface JsonType {
	jsonrpc:string
	id:string|number
	method:string
	params:Array<string>
}

declare interface TX {
	address:    	string
	txid: 	    	string
	height:     	number
	confirmations:  number
	vout?: 	   		number
	rbf?: 	    	boolean
	coin: 	    	string
	amount:     	string
	spenttx?:    	string
	error?:    		boolean
	created:    	number
}

declare interface TxType {
	txid:string
	height: number
	blocktime: number
	rbf?:		boolean
	error?:		boolean
	ins: Array<{
		coin:		string
		contract?:	string
		address: 	string
		txid?: 	    string
		height?:	number	
		vout?: 	    number
		value:     	string
		created?:	number
	}>
	outs: Array<{
		coin:		string
		contract?:	string
		address:	string
		value:		string
		vout?: 	    number
	}>
}
declare interface BalanceType {
	address:string
	coin:string
	balance:string
}
declare interface BlockType {
	timestamp: number,
	txs: Array<TxType>
	balances?: Array<BalanceType>
}

declare interface NetworkConfig {
	title: 			string
	scan: 			boolean
	scanPeriod:		number
	mempool:		boolean
	evm?: 			boolean
	utxo?: 			boolean
	blockTime: 		number
	confirmations: 	number
	rpc: 			string[]
	coin: 			string
	decimals: 		number
}
declare interface NetworkType extends NetworkConfig {
	scanPosition?: number
	height: number
	tokens: {
		[address:string]: {
			symbol: 	string
			decimals: 	number
		}
	}
	addrs: {
		[address:string]: {
			uid: string
			txs: {
				[key:string]:{ // key=txid-vout
					txid:		string
					height: 	number
					vout: 		number
					rbf: 	    boolean
					coin: 		string
					amount: 	string
					created:	number
				}
			}
		}
	}
	txs: {
		[key:string]:string // address
	},
	pending: {
		[txid:string]:TxType
	}
}


declare interface ActionType {
	pending(chain:string, add:{[txid:string]:TxType}, del:Array<string>): Promise<void>
	update(chain:string, height:number, txs:Array<TX>, addrs?:Array<{address:string, coin:string, balance:string}>): Promise<void>
	event(chain:string, height:number, progress:number, total:number, blocktime:number, spent:number): Promise<void>
}