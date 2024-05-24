const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers} = require("hardhat");


  describe("Factory", function () {
    async function fixture(){

      const initialFee = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
      const a = ethers.utils.parseUnits("0.0001", "ether"); // This equals 10 ** 17 wei
      const b = ethers.utils.parseUnits("0.00001", "ether"); // This equals 10 ** 17 wei

      const [factoryOwner, tokenCreator] = await ethers.getSigners();

      const Factory = await ethers.getContractFactory("Factory");
      const factory = await Factory.deploy(initialFee);
      console.log("Factory Address:", factory.address);
      const ownerConnect = factory.connect(factoryOwner);
      const tokenCreatorConnect = factory.connect(tokenCreator);
      const setA = await ownerConnect.setA(a);
      const setB = await ownerConnect.setB(b)


      
      const EventHandler = await ethers.getContractFactory("EventHandler");
      const eventHandler = await EventHandler.deploy(factory.address);
      const setEventHandler = await factory.setEventHandler(eventHandler.address);
      console.log("EventHandler Address:", eventHandler.address);

      const params = [eventHandler.address, "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc", "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"]


      return { params, factoryOwner, tokenCreator, factory, eventHandler, initialFee, ownerConnect, tokenCreatorConnect, a, b };

    }

    describe("Deployment", function () {
      it("should successfully set the owner", async function () {
        const { factoryOwner, factory } = await loadFixture(fixture);
        const ownerAddress = await factory.owner();
        expect(factoryOwner.address).to.equal(ownerAddress);
      });
      it("should successfully set the Eventhandler address", async function(){
        const { factory, eventHandler} = await loadFixture(fixture);
        const eventHandlerAddress = await factory.eventHandler();
        expect(eventHandler.address).to.equal(eventHandlerAddress);
      });
      it("should set the appropriate fee", async function(){
        const { factory, initialFee } = await loadFixture(fixture);
        const creatorFee = await factory.fee();
        //const parsedFee = ethers.utils.parseEther(creatorFee.toString())
        expect(initialFee.toString()).to.equal(creatorFee.toString());
        console.log("initialFee",initialFee);
        console.log("creatorFee",creatorFee)
      });
      it("should set the a and b values correctly", async function(){
        const { factory, a, b } = await loadFixture(fixture);
        const aContract = await factory._a();
        const bContract = await factory._b();
        expect(a.toString()).to.equal(aContract.toString());
        expect(b.toString()).to.equal(bContract.toString());
        console.log("a", a);
        console.log("aContract",aContract);
        console.log("b", b);
        console.log("bContract",bContract);
      });
    });

    describe("Creation of a new Token", function(){
      it("Should create a Token successfully", async function(){
        const { params, factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        const raise = ethers.utils.parseUnits("1", "ether"); // This equals 10 ** 17 wei
        const txValue = raise.add(initialFee)
        const active = await ownerConnect.setActive();
        const txResponse = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", raise, {value: txValue.toString()});
        const receipt = await txResponse.wait();

        const eventFilter = eventHandler.filters.Created();
        const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);

        if (events.length > 0) {
          const tokenAddress = events[0].args.tokenAddress; // Adjust based on how your event arguments are structured
          console.log("Token address:", tokenAddress);
      } else {
          console.error("No CreationEvent found");
      }
      });
     /* it("Should create a Token successfully and buy supply", async function(){
        const { factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        const raise = ethers.utils.parseUnits("1", "ether"); // This equals 10 ** 17 wei
        const buyAmount = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
        const txValue = buyAmount.add(initialFee)
        const active = await ownerConnect.setActive();
        const txResponse = await tokenCreatorConnect.deployNewToken(100, eventHandler.address, "Token", "TKN", "description", raise, {value: txValue.toString()});
        const receipt = await txResponse.wait();

        const eventFilter = eventHandler.filters.Created();
        const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);

        if (events.length > 0) {
          const tokenAddress = events[0].args.tokenAddress; // Adjust based on how your event arguments are structured
          console.log("Token address:", tokenAddress);
      } else {
          console.error("No Creation Event found");
      }

      });*/
    });
    it("should send the fee to the owner", async function (){
      const { params, factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
      const active = await ownerConnect.setActive();
      const ownerBalanceBefore = await ethers.provider.getBalance(factoryOwner.address);
      const txResponse = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", 100, {value: initialFee.toString()});
      const ownerBalanceAfter = ownerBalanceBefore.add(initialFee)
      const fetchOwnerBalanceAfter = await ethers.provider.getBalance(factoryOwner.address)
      expect(fetchOwnerBalanceAfter).to.equal(ownerBalanceAfter)
      console.log("ownerBalanceBefore", ownerBalanceBefore)
      console.log("ownerBalanceAfterCalc", ownerBalanceAfter)
      console.log("ownerBalanceAfterFetch", await ethers.provider.getBalance(factoryOwner.address))
      console.log("transferredFee", ethers.utils.formatUnits((fetchOwnerBalanceAfter.sub(ownerBalanceBefore)).toString()))
    })
    

    describe("Initial Parameters", function(){
      it("should set the owner to the message sender", async function(){
        const {factoryOwner, factory} = await loadFixture(fixture);
        const ownerVar = await factory.owner()
        expect(factoryOwner.address).to.equal(ownerVar)
      })
      it("should set the new Token as a valid caller of the EventHandler", async function(){
        const { params, factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        const raise = ethers.utils.parseUnits("1", "ether"); // This equals 10 ** 17 wei
        const txValue = raise.add(initialFee)

        const active = await ownerConnect.setActive();
        const txResponse = await tokenCreatorConnect.deployNewToken(params , "Token", "TKN", "description", raise, {value: txValue.toString()});
        const receipt = await txResponse.wait();

        const eventFilter = eventHandler.filters.Created();
        const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);

        if (events.length > 0) {
          const tokenAddress = events[0].args.tokenAddress; // Adjust based on how your event arguments are structured
          console.log("Token address:", tokenAddress);
          const validCaller = await eventHandler.callers(tokenAddress)
          expect(validCaller).to.equal(true)
      } else {
          console.error("No CreationEvent found");
      }
      })
      it("should enforce owner restrictions accordingly", async function(){
        const { factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        await expect(tokenCreatorConnect.changeOwner("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")).to.be.revertedWith("only the owner can call this function")
        await expect(tokenCreatorConnect.setActive()).to.be.revertedWith("only the owner can call this function")
        await expect(tokenCreatorConnect.setA(ethers.utils.parseUnits("0.000001", "ether"))).to.be.revertedWith("only the owner can call this function")
        await expect(tokenCreatorConnect.setB(ethers.utils.parseUnits("0.000001", "ether"))).to.be.revertedWith("only the owner can call this function")
      })
    }) 
  })

