// SPDX-License-Identifier: Unlicensed (C)


pragma solidity ^0.8.19;


contract EventHandler {

    mapping (address => bool) public callers;

    address public factory;

    constructor(address _factory) {
        factory = _factory;
        callers[_factory] = true;
    }

    event Created(address owner, address tokenAddress, string name, string symbol, string description, uint256 timestamp);
    event Bought(address buyer, address tokenAddress, uint256 amountToken, uint256 amountETH, uint256 marketCap, uint256 tokenPrice, uint256 contractETHBalance, uint256 timestamp);
    event Sold(address seller, address tokenAddress, uint256 amountToken, uint256 amountETH, uint256 marketCap, uint256 tokenPrice, uint256 contractETHBalance, uint256 timestamp);
    event LaunchedOnUniswap(address tokenAddress, address pairAddress, uint256 timestamp);

    function emitCreationEvent(address owner, address tokenAddress, string memory name, string memory symbol, string memory description) external {
        require(callers[msg.sender], "you are not allowed to call this function");

        emit Created(owner, tokenAddress, name, symbol, description, block.timestamp);
    }

    function emitBuyEvent(address buyer, address tokenAddress, uint256 amountToken, uint256 amountETH, uint256 marketCap, uint256 tokenPrice, uint256 contractETHBalance) external {
        require(callers[msg.sender], "you are not allowed to call this function");

        emit Bought(buyer, tokenAddress, amountToken, amountETH, marketCap, tokenPrice, contractETHBalance, block.timestamp);
    }

    function emitSellEvent(address seller, address tokenAddress, uint256 amountToken, uint256 amountETH, uint256 marketCap, uint256 tokenPrice, uint256 contractETHBalance) external {
        require(callers[msg.sender], "you are not allowed to call this function");

        emit Sold(seller, tokenAddress, amountToken, amountETH, marketCap, tokenPrice, contractETHBalance, block.timestamp);
    }

    function emitLaunchedOnUniswap(address tokenAddress, address pairAddress) external {
        require(callers[msg.sender], "you are not allowed to call this function");

        emit LaunchedOnUniswap(tokenAddress, pairAddress, block.timestamp);
    }

    function updateCallers(address newCaller) external {
        require(msg.sender == factory, "you are not allowed to call this function");
        callers[newCaller] = true;
    }
}