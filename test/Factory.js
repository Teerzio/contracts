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


      return { factoryOwner, tokenCreator, factory, eventHandler, initialFee, ownerConnect, tokenCreatorConnect, a, b };

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
        const { factoryOwner, factory, tokenCreator, tokenCreatorConnect, ownerConnect, eventHandler, initialFee } = await loadFixture(fixture);
        const raise = ethers.utils.parseUnits("1", "ether"); // This equals 10 ** 17 wei
        const txValue = raise.add(initialFee)
        const active = await ownerConnect.setActive();
        const token = await tokenCreatorConnect.deployNewToken(0, eventHandler.address, "Token", "TKN", "description", raise, {value: txValue.toString()});
        console.log("token address", token.address)
      });
    });
  })

