require('colors')
require('dotenv').config()

async function main() {
	const netId = 'ropsten'
	const [signer] = await ethers.getSigners()
	console.log(`deploying #${netId.red} bridge by ${signer.address.yellow}`)
	const Contract = await ethers.getContractFactory("Karafuru")
	const contract = await Contract.deploy()
	/* await contract.setPublicSalesTime(new Date().getTime()+600) */
	/* await tx.wait() */
	console.log('\Karafuru\t' + contract.address.green)
}

main().then(() => {
}).catch((error) => {
	console.error(error)
	process.exit(1)
})
