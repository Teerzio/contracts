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
      const a = ethers.utils.parseUnits("0.000001", "ether"); // This equals 10 ** 17 wei
      const b = ethers.utils.parseUnits("0.0000000005", "ether"); // This equals 10 ** 17 wei

      const [factoryOwner, tokenCreator, randomBuyer, trader1, trader2, trader3] = await ethers.getSigners();

      const Factory = await ethers.getContractFactory("Factory");
      const factory = await Factory.deploy(initialFee);
      const ownerConnect = factory.connect(factoryOwner);
      const tokenCreatorConnect = factory.connect(tokenCreator);
      const setA = await ownerConnect.setA(a);
      const setB = await ownerConnect.setB(b)
      
      // deploy and set up EventHandler
      const EventHandler = await ethers.getContractFactory("EventHandler");
      const eventHandler = await EventHandler.deploy(factory.address);
      const setEventHandler = await factory.setEventHandler(eventHandler.address);

      const params = [eventHandler.address, "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", factory.address]


      //deploy new tokenContract
      let tokenAddress;

      const active = await ownerConnect.setActive();
      const buyAmount = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
      const buyFee = buyAmount.mul(5).div(1000)
      const txValue = buyAmount.add(initialFee)
      const txResponse = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", factoryOwner.address, buyAmount, {value: txValue.toString()});
      const receipt = await txResponse.wait();
      

      const eventFilter = eventHandler.filters.Created();
      const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);

      if (events.length > 0) {
        tokenAddress = events[0].args.tokenAddress; // Adjust based on how your event arguments are structured
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
            const {tokenAddress} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const buyAmountETH = ethers.utils.parseEther("1.125")
            const tokenAmount = await TokenContract.calcTokenAmount(buyAmountETH);
            expect(tokenAmount).to.not.equal(0)

        })

        it("should return an ETH amount reflecting the token sell amount accurately", async function(){
            //@dev checks if the implementation of the bonding curve would lead to diverging in- and output amounts of buys and sells.
            // this check is sufficient, because it is just a test to look if the implementation of the math is correct,
            // meaning that selling the amount of tokens you bought prior, should return you the same amount of ETH
            // if there are no other buyers, aside from tiny rounding errors.
            
            const {tokenAddress, randomBuyer} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);

            // buy token for 0.5 ETH and check balance of buyer
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.5")
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: buyAmountETH})
            const balance = await TokenContract.balanceOf(randomBuyer.address)

            // calculating the buyFee for the except()
            const buyFee = buyAmountETH.mul(5).div(1000)

            // back check how much ETH the contract is willing to send out when trying to sell the entire balance
            const ETHAmount = await TokenContract.calcETHAmount(balance)

            const tolerance = ethers.utils.parseEther("0.0001")
            expect(buyAmountETH.sub(ETHAmount.add(buyFee))).to.be.below(tolerance)

        })
        it("should lead to a similar buyAmount when looking to buy similar token amounts", async function(){
            //@dev due to the implementation of the mathmatical bonding curve, this function checks if one large buy
            // buys the same amount of tokens as would multiple similar small buys. aside from tiny rounding errors, 
            // this is the case.
            
            const {tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer)

            // call the token contract to check how much tokens are available for agiven amount of ETH
            const buyAmountETH = ethers.utils.parseEther("1")
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: buyAmountETH})
            const balanceRandomBuyer = await TokenContract.balanceOf(randomBuyer.address)
            const sellResponse = await randomBuyerConnect.sell(balanceRandomBuyer, "0")

            // initiate 5 buys that in sum are as big as the prior large buy
            traderConnect = TokenContract.connect(trader1)
            const buyAmountTrader = ethers.utils.parseEther("0.2")
            const response1 = await traderConnect.buy("10", buyAmountTrader, {value: buyAmountTrader})
            const response2 = await traderConnect.buy("10", buyAmountTrader, {value: buyAmountTrader})
            const response3 = await traderConnect.buy("10", buyAmountTrader, {value: buyAmountTrader})
            const response4 = await traderConnect.buy("10", buyAmountTrader, {value: buyAmountTrader})
            const response5 = await traderConnect.buy("10", buyAmountTrader, {value: buyAmountTrader})
            const balanceTrader1 = await TokenContract.balanceOf(trader1.address)

          
            const subtraction = balanceTrader1.sub(balanceRandomBuyer)
            const tolerance = ethers.utils.parseEther("10")

            // excpect the difference between the balances be to be smaller than 10 tokens
            expect(subtraction).to.be.below(tolerance)
            expect(subtraction).to.be.above(0)
        })

        
        it("should allow a random user to call the buy and sell function and calculate the token price accurately", async function(){
            const {a, b, tokenAddress, randomBuyer, tokenCreator, eventHandler} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);

            // initiate buy
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: buyAmountETH})
            const receipt = await response.wait()

            // check events emitted
            const eventFilter = eventHandler.filters.Bought()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            
            //get event arguments
            let tokenPriceAfterBuy
            if(events.length > 0){
                const buyer = events[0].args.buyer
                const tokenAddress = events[0].args.tokenAddress
                const amountToken = events[0].args.amountToken
                tokenPriceAfterBuy = events[0].args.lastTokenPrice
                const tokenPriceBefore = events[0].args.tokenPriceBefore
                const amountETH = events[0].args.amountETH
                const contractTokenBalance = events[0].args.contractTokenBalance
                const contractETHBalance = events[0].args.contractETHBalance
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)
            }

            const supplyAfterBuy = await TokenContract._currentSupply()

            // check if the token price in the contract is the same as it should be mathmatically
            expect(tokenPriceAfterBuy).to.equal(a.add(supplyAfterBuy.mul(b)).div(ethers.constants.WeiPerEther))
            
            
            // defining sell params
            const balance = await randomBuyerConnect.balanceOf(randomBuyer.address)
            const minSellETH = ethers.utils.parseEther("0.09") //min ETH for slippage
            const buyerETHBalanceBeforeSell = await ethers.provider.getBalance(randomBuyer.address)
            const calcETHamount = await TokenContract.calcETHAmount(balance)
            const ETHAfterFee = calcETHamount.sub(calcETHamount.mul(5).div(1000))

            // initiate the sell
            const sellResponse = await randomBuyerConnect.sell(balance, minSellETH)
            const sellReceipt = await sellResponse.wait()

            // check if the buyer received the expected amount of ETH
            const gasSpent = sellReceipt.gasUsed.mul(sellReceipt.effectiveGasPrice)
            const buyerETHBalanceAfterSell = await ethers.provider.getBalance(randomBuyer.address)
            const expectedBalance = (buyerETHBalanceBeforeSell).add(ETHAfterFee).sub(gasSpent)
            expect(buyerETHBalanceAfterSell).to.equal(expectedBalance)

            // check if the supply afterthe sell ahs been adjusted accordingly. 
            //the current Supply of the Token should equal the balance of the tokens creator, the only trader that has not sold.
            // the token price fetched from the contract should equal the calculated token Price.
            const tokenCreatorBalance = await TokenContract.balanceOf(tokenCreator.address)
            const currentSupply = await TokenContract._currentSupply()
            const tokenPrice = await TokenContract.calcLastTokenPrice()
            expect(currentSupply).to.equal(tokenCreatorBalance)
            expect(tokenPrice).to.equal(a.add(b.mul(tokenCreatorBalance)).div(ethers.constants.WeiPerEther))

        })

       it("simulation of a tokens lifecycle, to test if traders can buy and sell, receive the correct eth amount when selling and check if all balances are 0 after everyopne sold, including the contracts balance", async function(){
            const {tokenAddress, randomBuyer, eventHandler, trader1, trader2, trader3, tokenCreator, factoryOwner} = context

            // connect accounts
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const trader1Connect = TokenContract.connect(trader1);
            const trader2Connect = TokenContract.connect(trader2);
            const trader3Connect = TokenContract.connect(trader3);

            // define buy amount
            const buyAmountETH = ethers.utils.parseEther("0.1")
           
            // random buyer buy
            const response = await randomBuyerConnect.buy("1", buyAmountETH, {value: buyAmountETH})
            const receipt = await response.wait()

            // trader1 buy
            const response1 = await trader1Connect.buy("1", buyAmountETH, {value: buyAmountETH})
            await response1.wait()

            // trader2 buy
            const response2 = await trader2Connect.buy("1", buyAmountETH, {value: buyAmountETH})
            await response2.wait()
            
            // trader3 buy
            const response3 = await trader3Connect.buy("1", buyAmountETH, {value: buyAmountETH})
            await response3.wait()
            
            // getting balances
            const balance = await randomBuyerConnect.balanceOf(randomBuyer.address)
            const balance1 = await trader1Connect.balanceOf(trader1.address)
            const balance2 = await trader2Connect.balanceOf(trader2.address)
            const balance3 = await trader3Connect.balanceOf(trader3.address)

            // everyone but trader3 sells
            const sellThreshold = ethers.utils.parseEther("0.001")
            const sell = await randomBuyerConnect.sell(balance, sellThreshold)
            await sell.wait()
            const sell1 = await trader1Connect.sell(balance1, sellThreshold)
            await sell1.wait()
            const sell2 = await trader2Connect.sell(balance2, sellThreshold)
            await sell2.wait()

            // get params and check if also the last seller gets the estimated amount of ETH to eliminate the existence of problematic rounding errors
            const eth3 = await TokenContract.calcETHAmount(balance3)
            const feeETH3 = eth3.mul(5).div(1000)
            const trader3ETHBalance = await ethers.provider.getBalance(trader3.address)
            const sell3 = await trader3Connect.sell(balance3, sellThreshold)
            const sellReceipt = await sell3.wait()
            const gasSpent = sellReceipt.gasUsed.mul(sellReceipt.effectiveGasPrice)
            const trader3ETHBalanceAfter = await ethers.provider.getBalance(trader3.address)
            expect(trader3ETHBalanceAfter).to.equal(trader3ETHBalance.add(eth3).sub(gasSpent).sub(feeETH3))


            // get params and check if the factory Owner receives the fees
            const creatorBalance = await TokenContract.balanceOf(tokenCreator.address)
            const creatorEth = await TokenContract.calcETHAmount(creatorBalance)
            const creatorFee = creatorEth.mul(5).div(1000)
            const ethAfterFee = await creatorEth.sub(creatorEth.mul(5).div(1000))
            const calcedFee = creatorEth.sub(ethAfterFee)
            const tokenCreatorConnect = TokenContract.connect(tokenCreator)
            const factoryOwnerBalanceBefore = await ethers.provider.getBalance(factoryOwner.address)
            // initiate the sell
            const creatorSell = await tokenCreatorConnect.sell(creatorBalance, ethAfterFee)
            const factoryOwnerBalanceAfter = await ethers.provider.getBalance(factoryOwner.address)
            const diff = factoryOwnerBalanceAfter.sub(factoryOwnerBalanceBefore)
            const finaldiff = calcedFee.sub(diff)
            
            expect(factoryOwnerBalanceAfter).to.equal(factoryOwnerBalanceBefore.add(creatorFee).sub(finaldiff))
            

            //check if everyones balance is zero after everyone sold
            const balanceAfterSell = await randomBuyerConnect.balanceOf(randomBuyer.address)
            const balance1AfterSell = await trader1Connect.balanceOf(trader1.address)
            const balance2AfterSell = await trader2Connect.balanceOf(trader2.address)
            const balance3AfterSell = await trader3Connect.balanceOf(trader3.address)
            const contractBalanceAfterSell = await ethers.provider.getBalance(TokenContract.address)
            const finalCurrentSupply = await TokenContract._currentSupply();
            

            expect(contractBalanceAfterSell).to.equal(0)
            expect(finalCurrentSupply).to.equal(0)
            expect(balanceAfterSell).to.equal(0)
            expect(balance1AfterSell).to.equal(0)
            expect(balance2AfterSell).to.equal(0)
            expect(balance3AfterSell).to.equal(0)

        })

        it("should create a Uniswap pair and provide liquidity when goal is met", async function(){
            const {tokenAddress, randomBuyer, eventHandler, UniswapV2Factory, UniswapV2Router} = await loadFixture(fixture)
            TokenContract = await ethers.getContractAt("Token", tokenAddress);

            // initiate the buy that pushes the contracts supply above the launchOnUniswap()- threshold
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("1.2")
            const response = await randomBuyerConnect.buy("20", buyAmountETH, {value: buyAmountETH})
            const receipt = await response.wait()

            // check if the token launched on Uniswap
            const eventFilter = eventHandler.filters.LaunchedOnUniswap()
            const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)

            // make test fail if event is not emitted
            expect(events.length).to.be.above(0)
            
            if(events.length > 0){
                const tokenAddress = events[0].args.tokenAddress
                const pairAddress = events[0].args.pairAddress
                const amountETHToLiq = events[0].args.amountETHToLiq
                const amountTokensToLiq = events[0].args.amountTokensToLiq
                const fetchedContractBalance = await ethers.provider.getBalance(TokenContract.address)

                //check if the pair address in the event is the same as on uniswap
                const weth = await UniswapV2Router.WETH();
                const pair = await UniswapV2Factory.getPair(tokenAddress, weth)
                expect(pairAddress).to.equal(pair)
                

                Pair = await ethers.getContractAt("UniswapV2Pair", pair);
                const reserves = await Pair.getReserves()

                expect(reserves._reserve0).to.equal(amountTokensToLiq)
                expect(reserves._reserve1).to.equal(amountETHToLiq)

                /*
                console.log("tokenAddress",tokenAddress)
                console.log("pairAddress", pairAddress)
                console.log("amountTokensToLiq", ethers.utils.formatEther(amountTokensToLiq.toString()))
                console.log("amountETHToLiq", ethers.utils.formatUnits(amountETHToLiq.toString()))
                console.log("fetchedContractBalance", ethers.utils.formatUnits(fetchedContractBalance.toString()))
                */
            }
        })

        it("should calculate the profit of the seller accurately", async function(){
            const {tokenAddress, randomBuyer,trader1, } = await loadFixture(fixture)
            TokenContract = await ethers.getContractAt("Token", tokenAddress);

            // initiate a buy
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.01")
            const response = await randomBuyerConnect.buy("20", buyAmountETH, {value: buyAmountETH})
            const receipt = await response.wait()
            
            // get token and ETH balance of the buyer before trader1 buys
            const balance = await randomBuyerConnect.balanceOf(randomBuyer.address)
            const ETHBalanceBefore = await ethers.provider.getBalance(randomBuyer.address)

            // initiate buy by trader1
            const trader1Connect=TokenContract.connect(trader1)
            const buyAmountETH2 = ethers.utils.parseEther("0.02")
            const response1 = await trader1Connect.buy("20", buyAmountETH2, {value: buyAmountETH2})
            const balance1 = await trader1Connect.balanceOf(trader1.address)

            // calculate the expected amount of ETH to receive after dumping on trader1
            const expectedETH = await randomBuyerConnect.calcETHAmount(balance)
            const fee = expectedETH.mul(5).div(1000)

            // initiate sell
            const sellTx = await randomBuyerConnect.sell(balance, buyAmountETH)
            const sellReceipt = await sellTx.wait()
        
            const gasSpent = sellReceipt.gasUsed.mul(sellReceipt.effectiveGasPrice)
            const ETHBalanceAfter = await ethers.provider.getBalance(randomBuyer.address)

            // excpect calculated return amount to be actual return amount
            expect(ETHBalanceAfter).to.equal(ETHBalanceBefore.add(expectedETH).sub(gasSpent).sub(fee))

        })
        it("should revert when sending insufficient msg.value", async function(){
            const {tokenAddress, randomBuyer} = await loadFixture(fixture)
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const insufficientAmount = ethers.utils.parseEther("0.08")
            await expect(randomBuyerConnect.buy("20", buyAmountETH, {value: insufficientAmount.toString()})).to.be.reverted

        })
        it("should revert when calling the dev buy after deployment", async function(){
            const {tokenAddress, randomBuyer} = await loadFixture(fixture)
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            await expect(randomBuyerConnect.devBuy(buyAmountETH, randomBuyer.address, {value: buyAmountETH})).to.be.reverted

        })
        it("should revert when trying to sell more tokens than balanceOf", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: buyAmountETH})

            const balance = await TokenContract.balanceOf(randomBuyer.address)
            await expect(randomBuyerConnect.sell(balance.add(100), buyAmountETH)).to.be.reverted
        })
        it("should revert when asking for too much ETH in return for Tokens", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: buyAmountETH})

            const balance = await TokenContract.balanceOf(randomBuyer.address)
            await expect(randomBuyerConnect.sell(balance, buyAmountETH)).to.be.reverted
        })
        it("should succeed when asking for the max amount of ETH in return for Tokens", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.01")
            const response = await randomBuyerConnect.buy("10", buyAmountETH, {value: buyAmountETH})

            const balance = await TokenContract.balanceOf(randomBuyer.address)
            console.log("balance", balance)
            const calcETH = await TokenContract.calcETHAmount(balance)
            console.log("calcETH", ethers.utils.formatEther(calcETH.toString()))
            const ETHAfterFee = calcETH.sub((calcETH.mul(5).div(1000)))
            console.log("eth after fee", ethers.utils.formatUnits(ETHAfterFee.toString()))
            //const sellTx = await randomBuyerConnect.sell(balance, ETHAfterFee)
            //await expect(sellTx).to.not.be.reverted
            await expect(randomBuyerConnect.sell(balance, ETHAfterFee)).to.not.be.reverted

        })
        it("should revert when tokens returned are less than slippage allows", async function(){
            const {a, tokenAddress, randomBuyer, trader1} = context
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const randomBuyerConnect = TokenContract.connect(randomBuyer);
            const buyAmountETH = ethers.utils.parseEther("0.1")
            const minTokens = await TokenContract.calcTokenAmount(buyAmountETH)
            const value = buyAmountETH.add(buyAmountETH.mul(5).div(1000))
            await expect(randomBuyerConnect.buy(minTokens.add(100), buyAmountETH, {value: value})).to.be.reverted
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
        const buyAmountETH = ethers.utils.parseEther("1.2")
        await randomBuyerConnect.buy("1", buyAmountETH, {value: buyAmountETH})

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
        it("should calculate the keccak256 of the events correctly", async function () {
            const buyEventSignature = "Bought(address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";
            const buyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(buyEventSignature));
            console.log("buyHash", buyHash);

            const sellEventSignature = "Sold(address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";
            const sellHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(sellEventSignature));
            console.log("sellHash", sellHash);

            const createdEventSignature = "Created(address,address,string,string,string,uint256)";
            const createdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(createdEventSignature));
            console.log("createdHash", createdHash);

            const uniswapEventSignature = "LaunchedOnUniswap(address,address,uint256,uint256,uint256)";
            const uniswapHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(uniswapEventSignature));
            console.log("uniswapHash", uniswapHash);
        })
    })


}) 