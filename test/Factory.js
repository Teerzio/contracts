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
      const a = ethers.utils.parseUnits("0.00001", "ether"); // This equals 10 ** 17 wei
      const b = ethers.utils.parseUnits("0.000001", "ether"); // This equals 10 ** 17 wei
      const [factoryOwner, tokenCreator] = await ethers.getSigners();

      // deploy factory
      const Factory = await ethers.getContractFactory("Factory");
      const factory = await Factory.deploy(initialFee);
      const ownerConnect = factory.connect(factoryOwner);
      const tokenCreatorConnect = factory.connect(tokenCreator);
      const setFix = await ownerConnect.setFix(a);
      const setMultiplicator = await ownerConnect.setMultiplicator(b)

      // deploy eventhandler
      const EventHandler = await ethers.getContractFactory("EventHandler");
      const eventHandler = await EventHandler.deploy(factory.address);
      const setEventHandler = await factory.setEventHandler(eventHandler.address);
      console.log("EventHandler Address:", eventHandler.address);

      const params = [eventHandler.address, "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", factory.address]
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
        
      });
      it("should set the fix and multiplicator values correctly", async function(){
        const { factory, a, b } = await loadFixture(fixture);
        const aContract = await factory._fix();
        const bContract = await factory._multiplicator();
        expect(a.toString()).to.equal(aContract.toString());
        expect(b.toString()).to.equal(bContract.toString());
      });
      it("should revert when setting fix to 0", async function(){
        const { factory} = await loadFixture(fixture);
        await expect(factory.setFix("0")).to.be.revertedWith("fix has to be above 0");
      });
      it("should revert when setting multiplicator to 0", async function(){
        const { factory} = await loadFixture(fixture);
        await expect(factory.setMultiplicator("0")).to.be.revertedWith("multiplicator has to be above 0");
      });
    });

    describe("Creation of a new Token", function(){
      it("Should create a Token successfully", async function(){
        const { params, factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        const active = await ownerConnect.setActive();

        //create a new token
        const buyAmount = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
        const txValue = buyAmount.add(initialFee)
        const txResponse = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", factoryOwner.address, 0, {value: txValue});
        const receipt = await txResponse.wait();
        expect(txResponse).to.not.be.reverted

        // make test fail if the creation event was not emitted
        const eventFilter = eventHandler.filters.Created();
        const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);
        expect(events.length).to.be.above(0)
        
      });
     it("Should create a Token successfully and let dev buy supply", async function(){
        const { factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee, params } = await loadFixture(fixture);
        const buyAmount = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
        const value = buyAmount.add(initialFee)
        const active = await ownerConnect.setActive();
        const response = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", factoryOwner.address, buyAmount, {value: value});
        const receipt = await response.wait();

        // expect the xreation to succeed
        expect(response).to.not.be.reverted

        // check if event was emitted
        const eventFilter = eventHandler.filters.Created();
        const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);
        expect(events.length).to.be.above(0)

      });
    
      it("should send the fee to the owner", async function (){
        const { params, factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        const active = await ownerConnect.setActive();
        const ownerBalanceBefore = await ethers.provider.getBalance(factoryOwner.address);
        
        // define params
        const buyAmount = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
        const buyFee = buyAmount.mul(5).div(1000)
        const value = buyAmount.add(initialFee)

        // deploy token
        const txResponse = await tokenCreatorConnect.deployNewToken(params, "Token", "TKN", "description", factoryOwner.address, buyAmount, {value: value});
        await txResponse.wait()

        // check if owner received the fees
        const ownerBalanceAfter = ownerBalanceBefore.add(initialFee).add(buyFee)
        const fetchOwnerBalanceAfter = await ethers.provider.getBalance(factoryOwner.address)
        expect(fetchOwnerBalanceAfter).to.equal(ownerBalanceAfter)
      })
    });
    
    describe("Initial Parameters", function(){
      it("should set the owner to the message sender", async function(){
        const {factoryOwner, factory} = await loadFixture(fixture);
        const ownerVar = await factory.owner()
        expect(factoryOwner.address).to.equal(ownerVar)
      })
      it("should set the new Token as a valid caller of the EventHandler", async function(){
        const { params, factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);

        const active = await ownerConnect.setActive();
        const buyAmount = ethers.utils.parseUnits("0.1", "ether"); // This equals 10 ** 17 wei
        const buyFee = buyAmount.mul(5).div(1000)
        const txValue = buyAmount.add(initialFee).add(buyFee)

        const txResponse = await tokenCreatorConnect.deployNewToken(params , "Token", "TKN", "description", factoryOwner.address, buyAmount, {value: txValue.toString()});
        const receipt = await txResponse.wait();

        const eventFilter = eventHandler.filters.Created();
        const events = await eventHandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);

        // make test fail if events are empty
          expect(events.length).to.be.above(0)

        if (events.length > 0) {
          const tokenAddress = events[0].args.tokenAddress; // Adjust based on how your event arguments are structured
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
        await expect(tokenCreatorConnect.setFix(ethers.utils.parseUnits("0.000001", "ether"))).to.be.revertedWith("only the owner can call this function")
        await expect(tokenCreatorConnect.setMultiplicator(ethers.utils.parseUnits("0.000001", "ether"))).to.be.revertedWith("only the owner can call this function")
      })
      it("should successfully set the eventhandler if it is a contract", async function(){
        const { factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        await expect(ownerConnect.setEventHandler(eventHandler.address)).to.not.be.reverted
      })
      it("should revert if the eventhandler is not a contract", async function(){
        const { factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        await expect(ownerConnect.setEventHandler(factoryOwner.address)).to.be.revertedWith("eventHandler must be a contract")
      })
    }) 
  })

