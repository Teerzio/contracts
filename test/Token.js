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
      const b = ethers.utils.parseUnits("0.00000001", "ether"); // This equals 10 ** 17 wei

      const [factoryOwner, tokenCreator, randomBuyer] = await ethers.getSigners();

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

      //deploy new tokenContract
      let tokenAddress;
      const raise = ethers.utils.parseUnits("1", "ether"); // This equals 10 ** 17 wei
      const txValue = raise.add(initialFee)

      const active = await ownerConnect.setActive();
      const txResponse = await tokenCreatorConnect.deployNewToken(eventHandler.address, "Token", "TKN", "description", raise, {value: txValue.toString()});
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

      return { factoryOwner, tokenCreator, factory, eventHandler, initialFee, ownerConnect, tokenCreatorConnect, randomBuyer, a, b, tokenAddress };

    }

    describe("Buy", function(){
        it("should return a Token Amount", async function(){
            const {tokenAddress, randomBuyer} = await loadFixture(fixture)
            
            TokenContract = await ethers.getContractAt("Token", tokenAddress);
            const eventHandlerAddress = await TokenContract.eventHandler()
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
            const response = await randomBuyerConnect.buy("4372", {value: buyAmountETH.toString()})
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
    })

}) 