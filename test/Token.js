const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers} = require("hardhat");


  describe("Initialization", function () {
    async function fixture(){
        //set up factory
      const initialFee = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
      const a = ethers.utils.parseUnits("0.000001", "ether"); // This equals 10 ** 17 wei
      const b = ethers.utils.parseUnits("0.0000002", "ether"); // This equals 10 ** 17 wei

      const [factoryOwner, tokenCreator, randomBuyer, trader1, trader2, trader3] = await ethers.getSigners();

      const Factory = await ethers.getContractFactory("Factory");
      const factory = await Factory.deploy(initialFee);
      console.log("Factory Address:", factory.address);
      const ownerConnect = factory.connect(factoryOwner);
      const tokenCreatorConnect = factory.connect(tokenCreator);
      const setA = await ownerConnect.setA(a);
      const setB = await ownerConnect.setB(b)
      
      // deploy and set up EventHandler
      const EventHandler = await ethers.getContractFactory("EventHandler");
      const eventHandler = await EventHandler.deploy(factory.address);
      const setEventHandler = await factory.setEventHandler(eventHandler.address);

      const params = [eventHandler.address, "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc", "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"]



      //deploy new tokenContract
      let tokenAddress;
      const raise = ethers.utils.parseUnits("1", "ether"); // This equals 10 ** 17 wei
      const txValue = raise.add(initialFee)

      const active = await ownerConnect.setActive();
      const txResponse = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", raise, {value: txValue.toString()});
      const receipt = await txResponse.wait();
      

      const eventFilter = eventHandler.filters.Created();
      const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);

      if (events.length > 0) {
        tokenAddress = events[0].args.tokenAddress; // Adjust based on how your event arguments are structured
        console.log("Token address:", tokenAddress);
        const validCaller = await eventHandler.callers(tokenAddress)
        
        expect(validCaller).to.equal(true)
    } else {
        console.error("No CreationEvent found");
    }

      return { trader1, trader2, trader3, params, factoryOwner, tokenCreator, factory, eventHandler, initialFee, ownerConnect, tokenCreatorConnect, randomBuyer, a, b, tokenAddress };

    }

    describe("Buy", function(){
        it("should return a Token Amount", async function(){
            const {tokenAddress, randomBuyer, eventHandler} = await loadFixture(fixture)
            
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseUnits("0.01","ether")
            const tokenAmount = await TokenContract.calcTokenAmount(buyAmountETH);
            console.log("Calculated Token Amount:", tokenAmount.toString());
    
        })
        it("should allow a random user to call the buy function", async function(){
            const {tokenAddress, randomBuyer, eventHandler} = await loadFixture(fixture)

            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseUnits("0.1","ether")
            const response = await randomBuyerConnect.buy("20", {value: buyAmountETH.toString()})
            const receipt = await response.wait()

            const eventFilter = eventHandler.filters.Bought()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            
            if(events.length > 0){
                const buyer = events[0].args.buyer
                const tokenAddress = events[0].args.tokenAddress
                const amountToken = events[0].args.amountToken
                const amountETH = events[0].args.amountETH
                const marketCap = events[0].args.marketCap
                const tokenPrice = events[0].args.tokenPrice
                const contractETHBalance = events[0].args.contractETHBalance
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                console.log("buyer", buyer)
                console.log("tokenAddress", tokenAddress)
                console.log("amountToken", amountToken)
                console.log("amountETH", ethers.utils.formatUnits(amountETH.toString()))
                console.log("marketCap", ethers.utils.formatUnits(marketCap.toString()))
                console.log("tokenPrice", ethers.utils.formatUnits(tokenPrice.toString()))
                console.log("contractETHBalance", ethers.utils.formatUnits(contractETHBalance.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))

            }
        })
        it("should allow a random user to call the buy and sell function", async function(){
            const {tokenAddress, randomBuyer, eventHandler} = await loadFixture(fixture)
            console.log("initiate buy")
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseUnits("0.1","ether")
            const response = await randomBuyerConnect.buy("20", {value: buyAmountETH.toString()})
            const receipt = await response.wait()

            const eventFilter = eventHandler.filters.Bought()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            
            if(events.length > 0){
                const buyer = events[0].args.buyer
                const tokenAddress = events[0].args.tokenAddress
                const amountToken = events[0].args.amountToken
                const amountETH = events[0].args.amountETH
                const marketCap = events[0].args.marketCap
                const tokenPrice = events[0].args.tokenPrice
                const contractETHBalance = events[0].args.contractETHBalance
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                console.log("buyer", buyer)
                console.log("tokenAddress", tokenAddress)
                console.log("amountToken", amountToken)
                console.log("amountETH", ethers.utils.formatUnits(amountETH.toString()))
                console.log("marketCap", ethers.utils.formatUnits(marketCap.toString()))
                console.log("tokenPrice", ethers.utils.formatUnits(tokenPrice.toString()))
                console.log("contractETHBalance", ethers.utils.formatUnits(contractETHBalance.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))
            }
            
            console.log("initiate sell")

            const sellAmountToken = "900";
            const minSellETH = ethers.utils.parseUnits("0.005", "ether")

            const sellResponse = await randomBuyerConnect.sell(sellAmountToken, minSellETH)
            const sellReceipt = await sellResponse.wait()

            const sellEventFilter = eventHandler.filters.Sold()
            const sellEvent = await eventHandler.queryFilter(sellEventFilter, sellReceipt.blockNumber, sellReceipt.blockNumber)

            if(sellEvent.length > 0){
            
                const seller = sellEvent[0].args.seller
                const tokenAmount = sellEvent[0].args.amountToken
                const ETHAmount = sellEvent[0].args.amountETH
                const marketCapAfterSell = sellEvent[0].args.marketCap
                const priceAfterSell = sellEvent[0].args.tokenPrice
                const ETHBalanceAfterSell = sellEvent[0].args.contractETHBalance
                const fetchedContractBalanceAfter = await ethers.provider.getBalance(TokenContract.address)

                console.log("seller", seller)
                console.log("tokenAmount", tokenAmount)
                console.log("ETHAmount", ethers.utils.formatUnits(ETHAmount.toString()))
                console.log("marketCapAfterSell", ethers.utils.formatUnits(marketCapAfterSell.toString()))
                console.log("priceAfterSell", ethers.utils.formatUnits(priceAfterSell.toString()))
                console.log("ETHBalanceAfterSell", ethers.utils.formatUnits(ETHBalanceAfterSell.toString()))
                console.log("ETHBalanceAfterSell", ethers.utils.formatUnits(fetchedContractBalanceAfter.toString()))

            }

        })
        it("should create a Uniswap pair and provide liquidity when goal is met", async function(){
            const {tokenAddress, randomBuyer, eventHandler} = await loadFixture(fixture)
            console.log("initiate buy")
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseUnits("1.1","ether")
            const response = await randomBuyerConnect.buy("20", {value: buyAmountETH.toString()})
            const receipt = await response.wait()

            
            const logFilter = TokenContract.filters.LogUints()
            const logs = await TokenContract.queryFilter(logFilter, receipt.blockNumber, receipt.blockNumber)
            
            if(logs.length > 0){
                const calcedETH = logs[0].args.amountETHToLiq
                const calcedTokens = logs[0].args.amountTokensToLiq

                console.log("calcedETH", ethers.utils.formatUnits(calcedETH.toString()))
                console.log("calcedTokens", ethers.utils.formatUnits(calcedTokens.toString()))

            }

            const eventFilter = eventHandler.filters.LaunchedOnUniswap()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const tokenPrice = await randomBuyerConnect.tokenPrice()
            const marketCap = await randomBuyerConnect.marketCap()

            if(events.length > 0){
                const tokenAddress = events[0].args.tokenAddress
                const pairAddress = events[0].args.pairAddress
                const amountETHToLiq = events[0].args.amountETHToLiq
                const amountTokensToLiq = events[0].args.amountTokensToLiq
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                console.log("tokenAddress",tokenAddress)
                console.log("pairAddress", pairAddress)
                console.log("amountTokensToLiq", amountTokensToLiq)
                console.log("amountETHToLiq", ethers.utils.formatUnits(amountETHToLiq.toString()))
                console.log("tokenPrice", ethers.utils.formatUnits(tokenPrice.toString()))
                console.log("marketCap", ethers.utils.formatUnits(marketCap.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))
            }


        })
        it("should allow multiple buyers to buy and sell the token", async function(){
            const {tokenAddress, randomBuyer, eventHandler, trader1, trader2, trader3} = await loadFixture(fixture)
            console.log("initiate buy")
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const trader1Connect = TokenContract.connect(trader1);
            const trader2Connect = TokenContract.connect(trader2);
            const trader3Connect = TokenContract.connect(trader3);

            const buyAmountETH = ethers.utils.parseUnits("0.3","ether")
            const buyAmountETH1 = ethers.utils.parseUnits("0.4","ether")
            const buyAmountETH2 = ethers.utils.parseUnits("0.3","ether")
            
            const response = await randomBuyerConnect.buy("10", {value: buyAmountETH.toString()})
            const receipt = await response.wait()
            const response1 = await trader1Connect.buy("100", {value: buyAmountETH1.toString()})
            await response1.wait()

            const response2 = await trader2Connect.buy("0", {value: buyAmountETH2.toString()})
            await response2.wait()

            const response3 = await trader3Connect.buy("0", {value: buyAmountETH2.toString()})
            await response3.wait()

            const response4 = await trader3Connect.buy("0", {value: buyAmountETH2.toString()})
            await response4.wait()

            const response5 = await trader2Connect.buy("0", {value: buyAmountETH2.toString()})
            await response5.wait()


            const balance = await randomBuyerConnect._balances(randomBuyer.address)
            const balance1 = await trader1Connect._balances(trader1.address)
            const balance2 = await trader2Connect._balances(trader2.address)
            const balance3 = await trader3Connect._balances(trader3.address)
            const isLaunched = await trader3Connect.isLaunched()


            console.log ("balance random buyer", balance)
            console.log ("balance trader1", balance1)
            console.log ("balance trader2", balance2)
            console.log ("balance trader3", balance3)
            console.log ("isLaunched", isLaunched)





            const eventFilter = eventHandler.filters.LaunchedOnUniswap()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const tokenPrice = await randomBuyerConnect.tokenPrice()
            const marketCap = await randomBuyerConnect.marketCap()
            const totalSupply = await randomBuyerConnect._totalSupply()

            const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)
            console.log ("tokenPrice", ethers.utils.formatEther(tokenPrice.toString()))
            console.log ("marketCap",  ethers.utils.formatEther(marketCap))
            console.log ("fetchedContractBalance",  ethers.utils.formatEther(fetchedContractBalance))
            console.log ("totalSupply",  totalSupply)



            if(events.length > 0){
                const tokenAddress = events[0].args.tokenAddress
                const pairAddress = events[0].args.pairAddress
                const amountETHToLiq = events[0].args.amountETHToLiq
                const amountTokensToLiq = events[0].args.amountTokensToLiq
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                console.log("tokenAddress",tokenAddress)
                console.log("pairAddress", pairAddress)
                console.log("amountTokensToLiq", amountTokensToLiq)
                console.log("amountETHToLiq", ethers.utils.formatUnits(amountETHToLiq.toString()))
                console.log("tokenPrice", ethers.utils.formatUnits(tokenPrice.toString()))
                console.log("marketCap", ethers.utils.formatUnits(marketCap.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))
            }

        })
    })

}) 