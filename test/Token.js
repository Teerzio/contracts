const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers} = require("hardhat");


  describe("Bonding curve functions", function () {
    let context;

    async function fixture(){
        //set up factory
      const initialFee = ethers.utils.parseUnits("0.01", "ether"); // This equals 10 ** 17 wei
      const a = ethers.utils.parseUnits("0.000000001", "ether"); // This equals 10 ** 17 wei
      const b = ethers.utils.parseUnits("0.0000000005", "ether"); // This equals 10 ** 17 wei

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

      const active = await ownerConnect.setActive();
      const buyAmount = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
    const buyFee = buyAmount.mul(5).div(1000)
      const txValue = buyAmount.add(initialFee).add(buyFee)
      const txResponse = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", factoryOwner.address, buyAmount, {value: txValue.toString()});
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

    UniswapV2Factory = await ethers.getContractAt("UniswapV2Factory", "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f");
    UniswapV2Router = await ethers.getContractAt("UniswapV2Router02", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");



      return {UniswapV2Factory, UniswapV2Router, trader1, trader2, trader3, params, factoryOwner, tokenCreator, factory, eventHandler, initialFee, ownerConnect, tokenCreatorConnect, randomBuyer, a, b, tokenAddress };

    }

    beforeEach(async function () {
        context = await loadFixture(fixture);
    });

    describe("Buy and Sell", function(){
        it("should return a Token Amount", async function(){
            const {tokenAddress, randomBuyer, eventHandler} = context
            
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const tokenAmount = await TokenContract.calcTokenAmount(buyAmountETH);
            console.log("Calculated Token Amount:", ethers.utils.formatUnits(tokenAmount.toString(), 18));

    
        })
        it("should allow a random user to call the buy function", async function(){
            const {tokenAddress, randomBuyer, tokenCreator, eventHandler} = context

            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))

            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: value.toString()})
            const receipt = await response.wait()

            const eventFilter = eventHandler.filters.Bought()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            
            const fetchedBalance = await randomBuyerConnect._balances(randomBuyer.address)
            console.log("random Buyer Token _balance", ethers.utils.formatUnits(fetchedBalance.toString()))

            const tokenCreatorBalance = await TokenContract._balances(tokenCreator.address)

            const fetchedContractTokenBalance = await randomBuyerConnect._currentSupply()
            console.log("Token _currentSupply", ethers.utils.formatUnits(fetchedContractTokenBalance.toString()))

            expect(fetchedBalance).to.equal(fetchedContractTokenBalance.sub(tokenCreatorBalance))
            expect(response).to.not.be.reverted

            if(events.length > 0){
                const buyer = events[0].args.buyer
                const tokenAddress = events[0].args.tokenAddress
                const amountToken = events[0].args.amountToken
                const amountETH = events[0].args.amountETH
                const contractTokenBalance = events[0].args.contractTokenBalance
                const contractETHBalance = events[0].args.contractETHBalance
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                console.log("buyer", buyer)
                console.log("tokenAddress", tokenAddress)
                console.log("amountToken", ethers.utils.formatUnits(amountToken.toString()))
                console.log("amountETH", ethers.utils.formatUnits(amountETH.toString()))
                console.log("contractTokenBalance", ethers.utils.formatUnits(contractTokenBalance.toString()))
                console.log("contractETHBalance", ethers.utils.formatUnits(contractETHBalance.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))

            }
        })
        it("should allow a random user to call the buy and sell function", async function(){
            const {a, b, tokenAddress, randomBuyer, tokenCreator, eventHandler} = context
            console.log("initiate buy")
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const value = ethers.utils.parseEther("0.1005")
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: value})
            const receipt = await response.wait()

            const eventFilter = eventHandler.filters.Bought()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            
            if(events.length > 0){
                const buyer = events[0].args.buyer
                const tokenAddress = events[0].args.tokenAddress
                const amountToken = events[0].args.amountToken
                const lastTokenPrice = events[0].args.lastTokenPrice
                const amountETH = events[0].args.amountETH
                const contractTokenBalance = events[0].args.contractTokenBalance
                const contractETHBalance = events[0].args.contractETHBalance
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                console.log("buyer", buyer)
                console.log("tokenAddress", tokenAddress)
                console.log("amountTokenBought", ethers.utils.formatUnits(amountToken.toString()))
                console.log("amountETHSpent", ethers.utils.formatUnits(amountETH.toString()))
                console.log("lastTokenPrice", ethers.utils.formatUnits(lastTokenPrice.toString()))
                console.log("contractTokenBalance", ethers.utils.formatUnits(contractTokenBalance.toString()))
                console.log("contractETHBalance", ethers.utils.formatUnits(contractETHBalance.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))
            }

            const supplyAfterBuy = await TokenContract._currentSupply()
            const tokenPriceAfterBuy = await TokenContract.calcLastTokenPrice()

            expect(tokenPriceAfterBuy).to.equal(a.add(supplyAfterBuy.mul(b)))
            console.log("tokenPriceAfterBuy",tokenPriceAfterBuy)
            
            console.log("initiate sell")
            
            const balance = await randomBuyerConnect._balances(randomBuyer.address)
            console.log("balance", ethers.utils.formatEther(balance.toString()))
            const sellAmountToken = ethers.utils.formatUnits(balance.toString());
            const minSellETH = ethers.utils.parseEther("0.09")
            const buyerETHBalanceBeforeSell = await ethers.provider.getBalance(randomBuyer.address)
            const calcETHamount = await TokenContract.calcETHAmount(balance)
            const ETHAfterFee = calcETHamount.sub(calcETHamount.mul(5).div(1000))
            console.log("calcETHamount", ethers.utils.formatEther(calcETHamount.toString()))
            console.log("ETHAfterFee", ethers.utils.formatEther(ETHAfterFee.toString()))


            const sellResponse = await randomBuyerConnect.sell(balance, minSellETH)
            const sellReceipt = await sellResponse.wait()

            const buyerETHBalanceAfterSell = await ethers.provider.getBalance(randomBuyer.address)

            const tokenCreatorBalance = await TokenContract._balances(tokenCreator.address)


            const currentSupply = await TokenContract._currentSupply()
            const tokenPrice = await TokenContract.calcLastTokenPrice()

            expect(currentSupply).to.equal(tokenCreatorBalance)
            console.log("currentSupply = 0?", currentSupply, tokenCreatorBalance)
            console.log("token creator balance", ethers.utils.formatEther(tokenCreatorBalance))

            expect(tokenPrice).to.equal(a.add(b.mul(tokenCreatorBalance)))
            console.log("tokenPrice = 0?", ethers.utils.formatUnits(tokenPrice), a)

            const gasSpent = sellReceipt.gasUsed.mul(sellReceipt.effectiveGasPrice)
            console.log("gasSpent", gasSpent)
            
            const expectedBalance = (buyerETHBalanceBeforeSell).add(ETHAfterFee).sub(gasSpent)

            expect(buyerETHBalanceAfterSell).to.equal(expectedBalance)

            const sellEventFilter = eventHandler.filters.Sold()
            const sellEvent = await eventHandler.queryFilter(sellEventFilter, sellReceipt.blockNumber, sellReceipt.blockNumber)

            if(sellEvent.length > 0){
            
                const seller = sellEvent[0].args.seller
                const tokenAmount = sellEvent[0].args.amountToken
                const ETHAmount = sellEvent[0].args.amountETH
                //const contractTokenBalanceAfterSell = sellEvent[0].args.marketCap
                const ETHBalanceAfterSell = sellEvent[0].args.contractETHBalance
                const fetchedContractBalanceAfter = await ethers.provider.getBalance(TokenContract.address)

                console.log("seller", seller)
                console.log("tokenAmount", tokenAmount)
                console.log("ETHAmount", ethers.utils.formatUnits(ETHAmount.toString()))
                //console.log("contractTokenBalanceAfterSell", ethers.utils.formatUnits(contractTokenBalanceAfterSell.toString()))
                console.log("ETHBalanceAfterSell", ethers.utils.formatUnits(ETHBalanceAfterSell.toString()))
                console.log("ETHBalanceAfterSell", ethers.utils.formatUnits(fetchedContractBalanceAfter.toString()))

            }

        })

       it("should allow multiple buyers to buy and sell the token", async function(){
            const {tokenAddress, randomBuyer, eventHandler, trader1, trader2, trader3, tokenCreator, factoryOwner} = context
            console.log("initiate buy")


            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const trader1Connect = TokenContract.connect(trader1);
            const trader2Connect = TokenContract.connect(trader2);
            const trader3Connect = TokenContract.connect(trader3);

            const buyAmountETH = ethers.utils.parseEther("0.1")
            const buyAmountETH1 = ethers.utils.parseEther("0.1")
            const buyAmountETH2 = ethers.utils.parseEther("0.1")
            const value = buyAmountETH.add(buyAmountETH.mul(5).div(1000)).toString()
            
            const response = await randomBuyerConnect.buy("1", buyAmountETH, {value: value.toString()})
            const receipt = await response.wait()

            const currentSupply = await randomBuyerConnect._currentSupply();
            console.log("currentSupply", ethers.utils.formatEther(currentSupply.toString()))


            const response1 = await trader1Connect.buy("1", buyAmountETH1, {value: value.toString()})
            await response1.wait()
            const currentSupply1 = await randomBuyerConnect._currentSupply();
            console.log("currentSupply", ethers.utils.formatEther(currentSupply1.toString()))

            const response2 = await trader2Connect.buy("1", buyAmountETH1, {value: value.toString()})
            await response2.wait()
            const currentSupply2 = await randomBuyerConnect._currentSupply();
            console.log("currentSupply", ethers.utils.formatEther(currentSupply2.toString()))


            const response3 = await trader3Connect.buy("1", buyAmountETH2, {value: value.toString()})
            await response3.wait()
            const currentSupply3 = await randomBuyerConnect._currentSupply();
            console.log("currentSupply", ethers.utils.formatEther(currentSupply3.toString()))


            const balance = await randomBuyerConnect._balances(randomBuyer.address)
            const balance1 = await trader1Connect._balances(trader1.address)
            const balance2 = await trader2Connect._balances(trader2.address)
            const balance3 = await trader3Connect._balances(trader3.address)
            const isLaunched = await trader3Connect.isLaunched()


            console.log ("balance random buyer", ethers.utils.formatUnits(balance.toString()))
            console.log ("balance trader1", ethers.utils.formatUnits(balance1.toString()))
            console.log ("balance trader2", ethers.utils.formatUnits(balance2.toString()))
            console.log ("balance trader3", ethers.utils.formatUnits(balance3.toString()))
            console.log ("isLaunched", isLaunched)



            const eventFilter = eventHandler.filters.LaunchedOnUniswap()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const totalSupply = await randomBuyerConnect._totalSupply()

            const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)
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
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))
            }

            const sellThreshold = ethers.utils.parseEther("0.001")
            const sell = await randomBuyerConnect.sell(balance, sellThreshold)
            await sell.wait()
            const sell1 = await trader1Connect.sell(balance1, sellThreshold)
            await sell1.wait()
            const sell2 = await trader2Connect.sell(balance2, sellThreshold)
            await sell2.wait()


            const eth3 = await TokenContract.calcETHAmount(balance3)
            const feeETH3 = eth3.mul(5).div(1000)
            console.log("estimated sell trader 3 eth", ethers.utils.formatEther(eth3))
            const trader3ETHBalance = await ethers.provider.getBalance(trader3.address)
            console.log("trader3 eth balance before sell",ethers.utils.formatEther(trader3ETHBalance))
            const sell3 = await trader3Connect.sell(balance3, sellThreshold)
            const sellReceipt = await sell3.wait()

            const gasSpent = sellReceipt.gasUsed.mul(sellReceipt.effectiveGasPrice)
            const trader3ETHBalanceAfter = await ethers.provider.getBalance(trader3.address)
            expect(trader3ETHBalanceAfter).to.equal(trader3ETHBalance.add(eth3).sub(gasSpent).sub(feeETH3))

            const creatorBalance = await TokenContract._balances(tokenCreator.address)
            const creatorEth = await TokenContract.calcETHAmount(creatorBalance)
            const creatorFee = creatorEth.mul(5).div(1000)
            const ethAfterFee = await creatorEth.sub(creatorEth.mul(5).div(1000))
            const calcedFee = creatorEth.sub(ethAfterFee)
            const tokenCreatorConnect = TokenContract.connect(tokenCreator)
            const factoryBalanceBefore = await ethers.provider.getBalance(factoryOwner.address)
            const creatorSell = await tokenCreatorConnect.sell(creatorBalance, ethAfterFee)
            const factoryBalanceAfter = await ethers.provider.getBalance(factoryOwner.address)
            const diff = factoryBalanceAfter.sub(factoryBalanceBefore)
            const finaldiff = calcedFee.sub(diff)
            

        
            console.log("creatorEth", creatorEth)
            console.log("ethAfterFee", ethAfterFee)
            console.log("calcedFee", calcedFee)
            console.log("diff", diff)
            console.log("ultimatediff", ethers.utils.formatEther(finaldiff.toString()))
            expect(factoryBalanceAfter).to.equal(factoryBalanceBefore.add(creatorFee).sub(finaldiff))
            


            const balanceAfterSell = await randomBuyerConnect._balances(randomBuyer.address)
            const balance1AfterSell = await trader1Connect._balances(trader1.address)
            const balance2AfterSell = await trader2Connect._balances(trader2.address)
            const balance3AfterSell = await trader3Connect._balances(trader3.address)
            const contractBalanceAfterSell = await ethers.provider.getBalance(TokenContract.address)
            const ethBalanceAfterSell = await ethers.provider.getBalance(randomBuyer.address)
            const ethBalance1AfterSell = await ethers.provider.getBalance(trader1.address)
            const ethBalance2AfterSell = await ethers.provider.getBalance(trader2.address)
            const ethBalance3AfterSell = await ethers.provider.getBalance(trader3.address)
            const finalCurrentSupply = await TokenContract._currentSupply();

            expect(contractBalanceAfterSell).to.equal(0)
            expect(finalCurrentSupply).to.equal(0)


            console.log("random Buyer Balance", ethers.utils.formatEther(balanceAfterSell.toString()))
            console.log("trader1 Balance after sell", ethers.utils.formatEther(balance1AfterSell.toString()))
            console.log("trader2 Balance after sell", ethers.utils.formatEther(balance2AfterSell.toString()))
            console.log("trader3 Balance after sell", ethers.utils.formatEther(balance3AfterSell.toString()))
            console.log("contract balance after sell", ethers.utils.formatEther(contractBalanceAfterSell.toString()))
            console.log("random buyer eth after sell", ethers.utils.formatEther(ethBalanceAfterSell.toString()))
            console.log("trader1 eth after sell", ethers.utils.formatEther(ethBalance1AfterSell.toString()))
            console.log("trader2 eth after sell", ethers.utils.formatEther(ethBalance2AfterSell.toString()))
            console.log("trader3 eth after sell", ethers.utils.formatEther(ethBalance3AfterSell.toString()))


        })

        it("should create a Uniswap pair and provide liquidity when goal is met", async function(){
            const {tokenAddress, randomBuyer, eventHandler, UniswapV2Factory, UniswapV2Router} = await loadFixture(fixture)
            console.log("initiate buy")
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("1")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            const response = await randomBuyerConnect.buy("20", buyAmountETH, {value: value.toString()})
            const receipt = await response.wait()

            const balance = await randomBuyerConnect._balances(randomBuyer.address)
            console.log("buyer balance", ethers.utils.formatEther(balance.toString()))


            const currentSupply = await TokenContract._currentSupply();
            console.log("currentSupply", ethers.utils.formatEther(currentSupply.toString()))

            const eventFilter = eventHandler.filters.LaunchedOnUniswap()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            

            if(events.length > 0){
                const tokenAddress = events[0].args.tokenAddress
                const pairAddress = events[0].args.pairAddress
                const amountETHToLiq = events[0].args.amountETHToLiq
                const amountTokensToLiq = events[0].args.amountTokensToLiq
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                const weth = await UniswapV2Router.WETH();
                const pair = await UniswapV2Factory.getPair(tokenAddress, weth)

                expect(pairAddress).to.equal(pair)
                
                Pair = await ethers.getContractAt("UniswapV2Pair", pair);
                const reserves = await Pair.getReserves()

                expect(reserves._reserve0).to.equal(amountTokensToLiq)
                expect(reserves._reserve1).to.equal(amountETHToLiq)


                console.log("tokenAddress",tokenAddress)
                console.log("pairAddress", pairAddress)
                console.log("amountTokensToLiq", ethers.utils.formatEther(amountTokensToLiq.toString()))
                console.log("amountETHToLiq", ethers.utils.formatUnits(amountETHToLiq.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))
            }
                expect(response).to.not.be.reverted

        })
        it("should calculate the profit of the seller accurately", async function(){
            const {tokenAddress, randomBuyer,trader1, } = await loadFixture(fixture)
            console.log("initiate buy")
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.01")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            const response = await randomBuyerConnect.buy("20", buyAmountETH, {value: value.toString()})
            const receipt = await response.wait()
            
            const balance = await randomBuyerConnect._balances(randomBuyer.address)
            console.log("buyer balance", ethers.utils.formatEther(balance.toString()))
            const ETHBalanceBefore =await ethers.provider.getBalance(randomBuyer.address)

            const trader1Connect=TokenContract.connect(trader1)
            const buyAmountETH2 = ethers.utils.parseEther("0.02")
            const value2= buyAmountETH2.add(buyAmountETH2.mul(5).div(1000))
            const response2 = await trader1Connect.buy("20", buyAmountETH2, {value: value2.toString()})
            const balance2 = await trader1Connect._balances(trader1.address)


            const getETH = await randomBuyerConnect.calcETHAmount(balance)
            const fee = getETH.mul(5).div(1000)
            const sellTx = await randomBuyerConnect.sell(balance, buyAmountETH)
            const sellReceipt = await sellTx.wait()
            console.log("getETH", ethers.utils.formatUnits(getETH))
            const getETH2 = await randomBuyerConnect.calcETHAmount(balance2)
            console.log("getETH2", ethers.utils.formatUnits(getETH2))

            const gasSpent = sellReceipt.gasUsed.mul(sellReceipt.effectiveGasPrice)

            const ETHBalanceAfter = await ethers.provider.getBalance(randomBuyer.address)

            expect(ETHBalanceAfter).to.equal(ETHBalanceBefore.add(getETH).sub(gasSpent).sub(fee))

        })
        it("should revert when sending insufficient msg.value", async function(){
            const {tokenAddress, randomBuyer} = await loadFixture(fixture)
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            await expect(randomBuyerConnect.buy("20", buyAmountETH, {value: buyAmountETH.toString()})).to.be.revertedWithCustomError

        })
        it("should revert when calling the dev buy after deployment", async function(){
            const {tokenAddress, randomBuyer} = await loadFixture(fixture)
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            await expect(randomBuyerConnect.devBuy(buyAmountETH, randomBuyer.address, {value: buyAmountETH.toString()})).to.be.revertedWithCustomError

        })
        it("should revert when trying to sell more tokens than balanceOf", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: value})

            const balance = await TokenContract._balances(randomBuyer.address)
            await expect(randomBuyerConnect.sell(balance.add(100), buyAmountETH)).to.be.reverted
        })
        it("should revert when asking for too much ETH in return for Tokens", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: value})

            const balance = await TokenContract._balances(randomBuyer.address)
            await expect(randomBuyerConnect.sell(balance, buyAmountETH)).to.be.revertedWithCustomError
        })
        it("should succeed when asking for the max amount of ETH in return for Tokens", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.01")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: value})

            const balance = await TokenContract._balances(randomBuyer.address)
            console.log("balance", balance)
            const calcETH = await TokenContract.calcETHAmount(balance)
            console.log("calcETH", ethers.utils.formatEther(calcETH.toString()))
            const ETHAfterFee = calcETH.sub((calcETH.mul(5).div(1000)))
            console.log("eth after fee", ethers.utils.formatUnits(ETHAfterFee.toString()))
            const sellTx = await randomBuyerConnect.sell(balance, ETHAfterFee)
            await expect(sellTx).to.not.be.reverted
        })
        it("should revert when tokens returned are less than slippage allows", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const minTokens = await TokenContract.calcTokenAmount(buyAmountETH)
            const value = buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            await expect(randomBuyerConnect.buy(minTokens.add(100), buyAmountETH, {value: value})).to.be.revertedWithCustomError
        })
        it("should revert when someone is trying to buy more supply than is available", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);

            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("2")
            const value= buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            await expect(randomBuyerConnect.buy("10", buyAmountETH, {value: value})).to.be.reverted



        })



    })

    describe("Presale vs DEX Trading functions", function(){
       it("should prohibit a transfer before launch on DEX", async function(){
        const {a, tokenAddress, randomBuyer, trader1} = context
        TokenContract = await ethers.getContractAt("Token", tokenAddress);
        const randomBuyerConnect = TokenContract.connect(randomBuyer);
        const buyAmountETH = ethers.utils.parseEther("0.1")
        const value = buyAmountETH.add(buyAmountETH.mul(5).div(1000))
        await randomBuyerConnect.buy("1", buyAmountETH, {value: value})

        await expect(randomBuyerConnect.transfer(trader1.address, 100)).to.be.reverted
       })
       it("should allow a transfer after launch on DEX", async function(){
        const {a, tokenAddress, randomBuyer, trader1} = context
        TokenContract = await ethers.getContractAt("Token", tokenAddress);
        const randomBuyerConnect = TokenContract.connect(randomBuyer);
        const buyAmountETH = ethers.utils.parseEther("1")
        const value = buyAmountETH.add(buyAmountETH.mul(5).div(1000))
        await randomBuyerConnect.buy("1", buyAmountETH, {value: value})

        await expect(randomBuyerConnect.transfer(trader1.address, 100)).to.not.be.reverted
       })
        
       it("should prohibit a buy and sell on the bonding curve after launch on DEX", async function(){
        const {a, tokenAddress, randomBuyer, trader1} = context
        TokenContract = await ethers.getContractAt("Token", tokenAddress);
        const randomBuyerConnect = TokenContract.connect(randomBuyer);
        const buyAmountETH = ethers.utils.parseEther("0.9")
        const value = buyAmountETH.add(buyAmountETH.mul(5).div(1000))
        await randomBuyerConnect.buy("1", buyAmountETH, {value: value})

        await expect(randomBuyerConnect.buy("1", buyAmountETH, {value: value})).to.be.reverted
        await expect(randomBuyerConnect.sell("1", "1")).to.be.reverted
       })
      
       it("Token Ownership should be renounced", async function(){
        const {a, tokenAddress, } = context
        TokenContract = await ethers.getContractAt("Token", tokenAddress);
        const owner = await TokenContract._owner();
        console.log("owner", owner)

        expect(owner).to.equal("0x0000000000000000000000000000000000000000")

        })
    })


}) 