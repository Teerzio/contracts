const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers} = require("hardhat");


const main = {
    addresses:{
        base:{
            UniswapV2Factory: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
            UniswapV2Router: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
            WETH_USDC_PAIR: '0x88A43bbDF9D098eEC7bCEda4e2494615dfD9bB9C',
            factory: '',
            eventHandler:''
        },
        mainnet:{
            UniswapV2Factory: '0xB7f907f7A9eBC822a80BD25E224be42Ce0A698A0',
            UniswapV2Router: '0x425141165d3DE9FEC831896C016617a52363b687',
            WETH_USDC_PAIR: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc'

        }
    },
    deploy:
        async () => {
            try {
                const initialFee = ethers.utils.parseUnits("0.002", "ether")
                const a = ethers.utils.parseUnits("0.000000001", "ether")
                const b = ethers.utils.parseUnits("0.0000000001", "ether")

                const Factory = ethers.utils.getContractFactory("Factory")
                const factory = await Factory.deploy(initialFee)
                await factory.deployed()
                console.log("factory address", factory.address)

                const EventHandler = ethers.utils.getContractFactory("EventHandler")
                const eventHandler = await EventHandler.deploy(factory.address)
                await eventHandler.deployed()
                console.log("event handler address", eventHandler.address)

                await factory.setEventHandler(eventHandler.address)
                await factory.setA(a)
                await factory.setB(b)
            }
            catch (error){
                console.log("error", error)
            }
    }

    
}



main.deploy();