// SPDX-License-Identifier: Unlicensed (C)


pragma solidity ^0.8.19;


contract EventHandler {

    mapping (address => bool) public callers;
    address [] launchedOnUniswap;

    address public factory;

    constructor(address _factory) {
        factory = _factory;
        callers[_factory] = true;
    }

    event Created(address owner, address tokenAddress, string name, string symbol, string description, uint256 timestamp);
    event Bought(address buyer, address tokenAddress, uint256 amountToken, uint256 tokenPriceBefore, uint256 lastTokenPrice, uint256 amountETH, uint256 contractTokenBalance, uint256 contractETHBalance, uint256 userTokenBalance, uint256 timestamp);
    event Sold(address seller, address tokenAddress, uint256 amountToken, uint256 tokenPriceBefore, uint256 lastTokenPrice, uint256 amountETH, uint256 contractTokenBalance, uint256 contractETHBalance, uint256 userTokenBalance, uint256 timestamp);
    event LaunchedOnUniswap(address tokenAddress, address pairAddress, uint256 amountETHToLiq, uint256 amountTokensToLiq, uint256 timestamp);

    function emitCreationEvent(address owner, address tokenAddress, string memory name, string memory symbol, string memory description) external {
        require(callers[msg.sender], "you are not allowed to call this function");

        emit Created(owner, tokenAddress, name, symbol, description, block.timestamp);
    }

    function emitBuyEvent(address buyer, address tokenAddress, uint256 amountToken, uint256 tokenPriceBefore, uint256 lastTokenPrice, uint256 amountETH, uint256 contractTokenBalance, uint256 contractETHBalance, uint256 userTokenBalance) external {
        require(callers[msg.sender], "you are not allowed to call this function");

        emit Bought(buyer, tokenAddress, amountToken, tokenPriceBefore, lastTokenPrice, amountETH, contractTokenBalance, contractETHBalance, userTokenBalance, block.timestamp);
    }

    function emitSellEvent(address seller, address tokenAddress, uint256 amountToken, uint256 tokenPriceBefore, uint256 lastTokenPrice, uint256 amountETH, uint256 contractTokenBalance, uint256 contractETHBalance, uint256 userTokenBalance) external {
        require(callers[msg.sender], "you are not allowed to call this function");

        emit Sold(seller, tokenAddress, amountToken, tokenPriceBefore, lastTokenPrice, amountETH, contractTokenBalance, contractETHBalance, userTokenBalance, block.timestamp);
    }

    function emitLaunchedOnUniswap(address tokenAddress, address pairAddress, uint256 amountETHToLiq, uint256 amountTokensToLiq ) external {
        require(callers[msg.sender], "you are not allowed to call this function");
        launchedOnUniswap.push(pairAddress);

        emit LaunchedOnUniswap(tokenAddress, pairAddress, amountETHToLiq, amountTokensToLiq, block.timestamp);
    }

    function updateCallers(address newCaller) external {
        require(msg.sender == factory, "you are not allowed to call this function");
        callers[newCaller] = true;
    }
}